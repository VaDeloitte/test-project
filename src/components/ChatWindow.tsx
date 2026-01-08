import {
  FileText,
  FileSpreadsheet,
  Presentation,
  Image as FileImage,
  File,
  Upload,
  X,
  XCircle,
  Copy,
  RefreshCw,
} from 'lucide-react';
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useContext,
} from 'react';

import {
  extractAgentFromConversation,
  saveExtractedAgent,
} from '../../services/agentExtractorService';
import { uploadDocuments } from '../../services/uploadService';

import { AuthContext } from '@/utils/app/azureAD';
import { getEndpoint } from '@/utils/app/api';
import { saveFiles, getFiles } from '@/utils/app/conversation';
import { handleFileChange } from '@/utils/app/handleFileChange';

import { Message, ChatBody, Conversation, Role } from '@/types/chat';
import {
  OpenAIModel,
  OpenAIModelID,
  OpenAIModels,
  fallbackModelID,
} from '@/types/openai';

import FileUploadModal from '../../components/Folder/NewComp/FileUploadModal2';
import {
  AssistantMessageBubble,
  UserMessageBubble,
} from '@/components/Chat/MessageBubble';

// Extended interfaces for this component
interface ExtendedMessage extends Message {
  sender: 'user' | 'assistant';
  timestamp: string;
}

interface ExtendedChatBody extends ChatBody {
  files?: string[]; // Array of Azure filenames (matching Chat.tsx pattern)
  workflow?: any;
}

interface ConversationData {
  id: string;
  name: string;
  messages: ExtendedMessage[];
  model: OpenAIModel;
  prompt: string;
  temperature: number;
  folderId: null;
  userId: number;
}

const ChatWindow: React.FC = (): JSX.Element => {
  const HARDCODED_API_KEY: string = 'a8d0a2bcde96415ea589a9a26eda7842';
  
  // Get authenticated user context for API calls
  const authContext = useContext(AuthContext);
  const user = authContext?.user;

  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [displayInput, setDisplayInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedModelId, setSelectedModelId] =
    useState<OpenAIModelID>(fallbackModelID);
  const [isModelDropdownOpen, setIsModelDropdownOpen] =
    useState<boolean>(false);

  // FileUploadModal states - Primary file handling (matching ChatInput pattern)
  const [uploadedFilesForModal, setUploadedFilesForModal] = useState<File[]>(
    [],
  ); // Files uploaded (shown in Upload tab)
  const [uploadedFilesLink, setUploadedFilesLink] = useState<any[]>([]); // Azure file objects/URLs
  const [selectedFilesForChat, setSelectedFilesForChat] = useState<File[]>([]); // Files selected for chat (like ChatInput's 'files')
  const [selectedFilesLink, setSelectedFilesLink] = useState<any[]>([]); // Azure file objects/URLs for selected files
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  // Minimal supporting states (removed legacy duplicates)
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [showPopup, setShowPopup] = useState<boolean>(false);

  const [workflowData, setWorkflowData] = useState<any>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationData, setConversationData] =
    useState<ConversationData | null>(null);
  const [temperature] = useState<number>(1);
  
  //  NEW: Citation state for freestyle mode
  const [freestyleCitationEnabled, setFreestyleCitationEnabled] = useState<boolean>(false);
  
  const [isSavingAgent, setIsSavingAgent] = useState<boolean>(false);
  const [agentSaved, setAgentSaved] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [agentPublished, setAgentPublished] = useState<boolean>(false);
  const [lastSavedWorkflowId, setLastSavedWorkflowId] = useState<string | null>(
    null,
  );

  // Show test button after save
  const [showTestAgentButton, setShowTestAgentButton] =
    useState<boolean>(false);

  //CacheConversation data to avoid repeated API calls
  const ConversationCacheRef = useRef<{
    id: string | null;
    data: any;
    messageCount: number;
    timestamp: number;
  }>({
    id: null,
    data: null,
    messageCount: 0,
    timestamp: 0,
  });

  // TrackCache performance metrics
  const CacheMetrics = useRef({ hits: 0, misses: 0, skips: 0 });

  const [tokenUsage, setTokenUsage] = useState<{
    inputTokens: number;
    responseTokens: number;
    totalTokens: number;
    sessionTotalTokens: number;
    modelUsed?: string;
  }>({
    inputTokens: 0,
    responseTokens: 0,
    totalTokens: 0,
    sessionTotalTokens: 0,
    modelUsed: undefined,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatId = useRef<string>(Date.now().toString());
  const stopConversationRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController>(new AbortController());

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
    setDisplayInput(value);
  }, []);

  const getCurrentConversationId = (): string | null => {
    const sessionId = sessionStorage.getItem('agentBuilderConversationId');
    const stateId = conversationId;

    const currentId = sessionId || stateId;

    if (!currentId) {
      return null;
    }

    if (sessionId && stateId && sessionId !== stateId) {
      setConversationId(sessionId);
    }

    return currentId;
  };

  const fetchConversationById = async (
    conversationId: string,
    forceRefresh: boolean = false,
  ): Promise<any> => {
    try {
      // Use cache if available and not forcing refresh
      const now = Date.now();
      const CACHE_DURATION = 30000; // 30 seconds cache

      if (
        !forceRefresh &&
        ConversationCacheRef.current.id === conversationId &&
        ConversationCacheRef.current.data &&
        now - ConversationCacheRef.current.timestamp < CACHE_DURATION
      ) {
        CacheMetrics.current.hits++;
        console.log(
          'Using cached conversation data (age:',
          Math.round((now - ConversationCacheRef.current.timestamp) / 1000),
          'seconds) | Cache hits:',
          CacheMetrics.current.hits,
        );
        return ConversationCacheRef.current.data;
      }

      CacheMetrics.current.misses++;
      const userId = localStorage.getItem('userId') || '1';
      const url = `/api/conversations?userId=${userId}&id=${conversationId}`;

      console.log(
        'Fetching conversation from API:',
        conversationId,
        '| Cache misses:',
        CacheMetrics.current.misses,
      );
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        let conversationData = null;

        // Handle case where API returns an array of conversations
        if (Array.isArray(result.data)) {
          console.log(
            'API returned array of conversations (count:',
            result.data.length,
            ')',
          );

          // Find the conversation that matches our conversation ID
          const matchedConversation = result.data.find(
            (conversation: any) => conversation.id === conversationId,
          );

          if (matchedConversation) {
            console.log('Found matching conversation:', {
              id: matchedConversation.id,
              messageCount: matchedConversation.messages?.length || 0,
              name: matchedConversation.name?.substring(0, 50) + '...',
            });
            // Only cache the matched conversation, not entire array
            conversationData = matchedConversation;
          } else {
          
            return null;
          }
        } else {
          // Handle case where API returns a single conversation object
          console.log('Received single conversation object');
          conversationData = result.data;
        }

        // Add cache size check before caching
        if (conversationData) {
          const conversationSize = JSON.stringify(conversationData).length;
          const MAX_CACHE_SIZE = 5 * 1024 * 1024; // 5MB limit

          if (conversationSize > MAX_CACHE_SIZE) {
            
            return conversationData; // Don't cache, but return data
          }

          ConversationCacheRef.current = {
            id: conversationId,
            data: conversationData,
            messageCount: conversationData.messages?.length || 0,
            timestamp: now,
          };
          console.log(
            'Conversation cached (messages:',
            ConversationCacheRef.current.messageCount,
            ', size:',
            (conversationSize / 1024).toFixed(2),
            'KB)',
          );
        }

        return conversationData;
      } else {
        console.error(
          'API returned failure:',
          result.message || 'Unknown error',
        );
        return null;
      }
    } catch (error) {
      return null;
    }
  };

  const selectedModel: OpenAIModel = OpenAIModels[selectedModelId];
  const availableModels: OpenAIModel[] = Object.values(OpenAIModels);

  useEffect(() => {
    // Only add styles once to prevent layout shift
    const existingStyle = document.getElementById('chatwindow-styles');
    if (existingStyle) return; // Styles already added

    const style = document.createElement('style');
    style.id = 'chatwindow-styles'; // Add ID to prevent duplicates
    style.textContent = `
      .scrollbar-none {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      .scrollbar-none::-webkit-scrollbar {
        display: none;
      }
      html, body, #__next {
        height: 100%;
      }
      
      .chat-textarea {
        caret-color: #60A5FA !important;
        caret-width: 2px !important;
      }
      
      .chat-textarea:focus {
        caret-color: #3B82F6 !important;
      }
      
      @keyframes blink-caret {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0; }
      }
      
      .chat-textarea::selection {
        background-color: rgba(96, 165, 250, 0.3);
      }
      
      .chat-textarea::-webkit-selection {
        background-color: rgba(96, 165, 250, 0.3);
      }
      
      .chat-textarea::-moz-selection {
        background-color: rgba(96, 165, 250, 0.3);
      }
      
      .chat-textarea:focus {
        caret-color: #60A5FA !important;
        outline: none !important;
      }`;
    document.head.appendChild(style);

    // Don't remove on unmount - keep styles for entire session
    return () => {
      // Cleanup only if component is being permanently removed
      // if (document.head.contains(style)) {
      //   document.head.removeChild(style);
      // }
    };
  }, []);

  //  NEW: Listen for citation setting changes from AgentFooter
  useEffect(() => {
    const handleCitationChange = (event: CustomEvent) => {
      const { settingName, newValue, isFreestyle, workflowId } = event.detail;
      
      console.log('[ChatWindow]: Citation setting changed:', {
        settingName,
        newValue,
        isFreestyle,
        workflowId
      });
      
      if (settingName === 'citation') {
        if (isFreestyle) {
          // Update freestyle citation state
          setFreestyleCitationEnabled(newValue);
          console.log('[ChatWindow]:  Freestyle citation updated to:', newValue);
        } else if (workflowData && workflowData._id === workflowId) {
          // Update workflow data citation field
          setWorkflowData((prev: any) => ({
            ...prev,
            citation: newValue
          }));
          console.log('[ChatWindow]:  Workflow citation updated to:', newValue);
        }
      }
    };
    
    window.addEventListener('citationSettingChanged', handleCitationChange as EventListener);
    
    // Load freestyle citation setting from localStorage on mount
    const savedCitation = localStorage.getItem('freestyle_citation_enabled');
    if (savedCitation !== null) {
      setFreestyleCitationEnabled(savedCitation === 'true');
      console.log('[ChatWindow]: Loaded freestyle citation from localStorage:', savedCitation);
    }
    
    return () => {
      window.removeEventListener('citationSettingChanged', handleCitationChange as EventListener);
    };
  }, [workflowData]);

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (tokenUsage.modelUsed && tokenUsage.modelUsed !== selectedModel.name) {
      setTokenUsage({
        inputTokens: 0,
        responseTokens: 0,
        totalTokens: 0,
        sessionTotalTokens: 0,
        modelUsed: selectedModel.name,
      });
    }
  }, [selectedModelId, selectedModel.name]);

  useEffect(() => {
    const handleBeforeUnload = () => {};

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Listen for header button clicks
  useEffect(() => {
    const handleHeaderSaveClick = () => {
      console.log('Header Save Click - Current State:', {
        messagesCount: messages.length,
        conversationId: conversationId,
        lastSavedWorkflowId: lastSavedWorkflowId,
      });
      handleSaveAgent();
    };

    const handleHeaderPublishClick = () => {
      console.log('Header Publish Click - Current State:', {
        lastSavedWorkflowId: lastSavedWorkflowId,
        hasWorkflowId: !!lastSavedWorkflowId,
      });
      handleSubmitForPublishing();
    };

    // NEW: Listen for agent click from sidebar
    const handleLoadAgentConversation = async (event: any) => {
      const {
        workflowId,
        conversationId: agentConversationId,
        workflowTitle,
      } = event.detail;

      // Clear current messages
      setMessages([]);
      setIsLoading(true);

      try {
        // Fetch the conversation
        if (agentConversationId) {
          const conversationData = await fetchConversationById(
            agentConversationId,
            true,
          );

          if (
            conversationData &&
            conversationData.messages &&
            conversationData.messages.length > 0
          ) {
            // Convert API messages to ExtendedMessage format
            const convertedMessages: ExtendedMessage[] =
              conversationData.messages.map((msg: any) => ({
                role: msg.role,
                content: msg.content,
                sender: msg.role === 'user' ? 'user' : 'assistant',
                timestamp: new Date().toISOString(),
                ...(msg.file && { file: msg.file }),
              }));

            setMessages(convertedMessages);
            console.log(
              '✅ Loaded',
              convertedMessages.length,
              'messages for agent:',
              workflowTitle,
            );

            // Update conversation ID
            setConversationId(agentConversationId);

            // Set workflow data if available
            if (conversationData.prompt) {
              setWorkflowData({ prompt: conversationData.prompt });
            }

            // Store the workflow ID for save/publish operations
            setLastSavedWorkflowId(workflowId);
          } else {
            console.log('⚠️ No messages found for this agent');
          }
        } else {
          console.log('⚠️ No conversation ID provided for agent');
        }
      } catch (error) {
        console.error('❌ Error loading agent conversation:', error);
      } finally {
        setIsLoading(false);
      }
    };

    window.addEventListener('headerSaveClick', handleHeaderSaveClick);
    window.addEventListener('headerPublishClick', handleHeaderPublishClick);
    window.addEventListener(
      'loadAgentConversation',
      handleLoadAgentConversation,
    );

    return () => {
      window.removeEventListener('headerSaveClick', handleHeaderSaveClick);
      window.removeEventListener(
        'headerPublishClick',
        handleHeaderPublishClick,
      );
      window.removeEventListener(
        'loadAgentConversation',
        handleLoadAgentConversation,
      );
    };
  }, [messages, conversationId, lastSavedWorkflowId]); // Add lastSavedWorkflowId to capture latest state

  // Notify parent about state changes
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('chatWindowStateChange', {
        detail: { type: 'messagesUpdate', count: messages.length },
      }),
    );
  }, [messages.length]);

  // Periodic cache status logging
  useEffect(() => {
    const logCacheStatus = () => {
      if (ConversationCacheRef.current.id) {
        const age = Math.round(
          (Date.now() - ConversationCacheRef.current.timestamp) / 1000,
        );
        console.log('Cache Status:', {
          conversationId:
            ConversationCacheRef.current.id.substring(0, 30) + '...',
          messageCount: ConversationCacheRef.current.messageCount,
          age: `${age}s`,
          valid: age < 30,
          metrics: CacheMetrics.current,
        });
      } else {
        console.log('Cache Status: Empty | Metrics:', CacheMetrics.current);
      }
    };

    // Log cache status every 30 seconds
    const interval = setInterval(logCacheStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Initialize conversation on component mount
  useEffect(() => {
    const initializeConversation = async () => {
      // Test mode detection
      const testWorkflowId = sessionStorage.getItem('testAgentWorkflowId');
      const isTestMode = !!testWorkflowId;

      let conversationIdToUse: string;
      const userId = localStorage.getItem('userId') || '1';

      // Use test workflow ID if in test mode, otherwise use Agent Builder workflow
      const workflowId = isTestMode
        ? testWorkflowId
        : '68e6469a1f54bb2a63de2108';

      if (isTestMode) {
        console.log('TEST MODE DETECTED - Loading workflow:', testWorkflowId);
      } else {
        console.log('BUILDER MODE - Using Agent Builder workflow');
      }

      // Check if there's an existing conversation ID in sessionStorage (page refresh)
      const existingConversationId = sessionStorage.getItem(
        'agentBuilderConversationId',
      );
      let messagesRestored = false; // Track if we successfully restored messages

      if (existingConversationId) {
        // Page refresh detected - restore existing conversation
        conversationIdToUse = existingConversationId;
        console.log(
          'Page refresh detected - restoring conversation:',
          conversationIdToUse,
        );

        // Fetch existing conversation data using the helper function (force refresh on page load)
        const conversationData = await fetchConversationById(
          conversationIdToUse,
          true,
        );

        console.log('Fetch result for conversation:', conversationIdToUse, {
          hasData: !!conversationData,
          hasMessages: !!conversationData?.messages,
          messageCount: conversationData?.messages?.length || 0,
        });

        if (
          conversationData &&
          conversationData.messages &&
          conversationData.messages.length > 0
        ) {
          // Convert API messages to ExtendedMessage format
          const convertedMessages: ExtendedMessage[] =
            conversationData.messages.map((msg: any) => ({
              role: msg.role,
              content: msg.content,
              sender: msg.role === 'user' ? 'user' : 'assistant',
              timestamp: new Date().toISOString(),
              ...(msg.file && { file: msg.file }),
            }));

          setMessages(convertedMessages);
          messagesRestored = true; // Mark that we restored messages
          console.log(
            'Restored',
            convertedMessages.length,
            'messages from database',
          );

          // Set workflow data if available
          if (conversationData.prompt) {
            setWorkflowData({ prompt: conversationData.prompt });
          }
        } else {
          console.log(
            'No existing messages found for conversation:',
            conversationIdToUse,
          );
        }
      } else {
        // New session - generate unique conversation ID for each new tab/session
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        conversationIdToUse = `${timestamp}_${random}_${workflowId}`;

        // Store in sessionStorage for this specific tab
        sessionStorage.setItem(
          'agentBuilderConversationId',
          conversationIdToUse,
        );
        console.log(
          'Starting new Agent Builder session:',
          conversationIdToUse,
          '(Each tab gets unique ID)',
        );
      }

      setConversationId(conversationIdToUse);

      // Set localStorage values for API compatibility
      if (!localStorage.getItem('userId')) {
        localStorage.setItem('userId', '1');
      }
      if (!localStorage.getItem('userToken')) {
        localStorage.setItem('userToken', 'dev-id-token');
      }

      // Initialize conversation data
      const initialConversation: ConversationData = {
        id: conversationIdToUse,
        name: 'Agent Builder Session',
        messages: [],
        model: selectedModel,
        prompt: '',
        temperature: 1,
        folderId: null,
        userId: 1,
      };
      setConversationData(initialConversation);

      // Only initialize workflow if no messages were restored (new session or empty conversation)
      if (!messagesRestored) {
        console.log('Initializing workflow for new/empty conversation');
        await initializeAgentBuilderWorkflow(conversationIdToUse, workflowId);
      } else {
        console.log(
          'Skipping workflow initialization - messages already restored',
        );
      }
    };

    initializeConversation();
  }, []);

  // 🧹 MEMORY OPTIMIZATION: Cache cleanup effect
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      const cacheAge = now - ConversationCacheRef.current.timestamp;
      const TTL_MS = 5 * 60 * 1000; // 5 minutes

      if (cacheAge > TTL_MS && ConversationCacheRef.current.data) {
        console.log('🧹 Clearing expired conversation cache');
        ConversationCacheRef.current = {
          id: null,
          data: null,
          messageCount: 0,
          timestamp: 0,
        };
      }
    }, 60000); // Check every minute

    return () => clearInterval(cleanup);
  }, []);

  // 🆕 NEW AGENT SESSION: Listen for new agent button click
  useEffect(() => {
    const handleNewAgentSession = () => {
      console.log('🆕 ChatWindow: New agent session event received');

      // Clear all state to start fresh
      setMessages([]);
      setInput('');
      setDisplayInput('');
      setSelectedFilesForChat([]);
      setSelectedFilesLink([]);
      setUploadedFilesForModal([]);
      setUploadedFilesLink([]);

      // Reset agent builder states
      setIsSavingAgent(false);
      setAgentSaved(false);
      setIsPublishing(false);
      setAgentPublished(false);
      setLastSavedWorkflowId(null);
      setShowTestAgentButton(false);

      // Clear conversation data
      setConversationData(null);
      setWorkflowData(null);

      // Reset token usage
      setTokenUsage({
        inputTokens: 0,
        responseTokens: 0,
        totalTokens: 0,
        sessionTotalTokens: 0,
        modelUsed: selectedModel.name,
      });

      // Clear cache
      ConversationCacheRef.current = {
        id: null,
        data: null,
        messageCount: 0,
        timestamp: 0,
      };

      // Generate new conversation ID
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      const workflowId = '68e6469a1f54bb2a63de2108'; // Agent Builder workflow
      const newConversationId = `${timestamp}_${random}_${workflowId}`;

      // Store new conversation ID
      sessionStorage.setItem('agentBuilderConversationId', newConversationId);
      setConversationId(newConversationId);

      console.log('✅ ChatWindow: New session initialized:', newConversationId);

      // Initialize Agent Builder workflow with new conversation
      setTimeout(() => {
        initializeAgentBuilderWorkflow(newConversationId);
      }, 300);

      // Notify parent about session reset
      window.dispatchEvent(
        new CustomEvent('chatWindowStateChange', {
          detail: { type: 'sessionReset' },
        }),
      );
    };

    window.addEventListener('newAgentSession', handleNewAgentSession);

    return () => {
      window.removeEventListener('newAgentSession', handleNewAgentSession);
    };
  }, [selectedModel.name]);

  // Separate the workflow initialization
  const initializeAgentBuilderWorkflow = async (
    convId: string,
    workflowIdToLoad?: string,
  ) => {
    // 🧪 Use provided workflow ID (for test mode) or default to Agent Builder
    const agentBuilderWorkflowId =
      workflowIdToLoad || '68e6469a1f54bb2a63de2108';
    const isTestMode = !!sessionStorage.getItem('testAgentWorkflowId');

    try {
      const response = await fetch(`/api/workflow/${agentBuilderWorkflowId}`, {
        headers: {
          Authorization: `Bearer ${HARDCODED_API_KEY}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        const workflow = result.workflow;

        setWorkflowData(workflow);

        if (isTestMode) {
          console.log('🧪 TEST MODE: Loaded workflow:', workflow.title);
        } else {
          console.log(
            '📋 BUILDER MODE: Loaded Agent Builder Wizard:',
            workflow.title,
          );
        }
        console.log('Conversation ID:', convId);
        console.log('Requesting AI-generated welcome message...');

        // ✅ NEW: Get AI-generated welcome message
        // Send initialization request directly to LLM
        setTimeout(async () => {
          await getInitialWelcomeMessage(workflow.prompt);
        }, 800);
      }
    } catch (error) {
      console.error('Error loading Agent Builder Wizard:', error);
    }
  };

  // NEW: Get initial welcome message from LLM without showing user message
  const getInitialWelcomeMessage = async (workflowPrompt: string) => {
    try {
      setIsLoading(true);

      const chatBody: ExtendedChatBody = {
        model: selectedModel,
        messages: [
          {
            role: 'system' as Role,
            content:
              'Introduce yourself and ask how you can assist the user. Keep it friendly and concise.',
          },
        ],
        key: HARDCODED_API_KEY,
        prompt: workflowPrompt,
        temperature: temperature,
        files: [],
        workflow: workflowData,
      };

      const endpoint = getEndpoint(null);
      const csrfToken = getCSRFToken();

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer dev-id-token',
          'X-XSRF-TOKEN': csrfToken || '',
        },
        credentials: 'include' as RequestCredentials,
        body: JSON.stringify(chatBody),
      });

      if (!response.ok) {
        throw new Error('Failed to get welcome message');
      }

      const data = response.body;
      if (!data) {
        setIsLoading(false);
        return;
      }

      const reader = data.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let text = '';

      const welcomeMessage: ExtendedMessage = {
        sender: 'assistant',
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      };

      // Add empty assistant message to state
      setMessages([welcomeMessage]);
      setIsLoading(false);

      // ✅ PERFORMANCE FIX: Throttle updates for welcome message streaming
      let lastUpdate = 0;
      const UPDATE_INTERVAL = 50; // ms

      // Stream the response
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        text += chunkValue;

        // Only update UI every 50ms or on completion
        const now = Date.now();
        if (now - lastUpdate > UPDATE_INTERVAL || doneReading) {
          welcomeMessage.content = text;
          setMessages([{ ...welcomeMessage }]);
          lastUpdate = now;
        }
      }

      // Save welcome message toConversation
      await createOrUpdateConversation([welcomeMessage]);

      console.log('✅ AI-generated welcome message received');
    } catch (error) {
      console.error('Error getting welcome message:', error);
      setIsLoading(false);
    }
  };

  const getCSRFToken = (): string => {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'XSRF-TOKEN') {
        return decodeURIComponent(value);
      }
    }
    return '';
  };

  // Utility functions for enhanced file upload
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string): JSX.Element => {
    const extension = fileName.split('.').pop()?.toLowerCase();

    const iconMap: { [key: string]: JSX.Element } = {
      docx: <FileText className="text-blue-600" size={24} />,
      doc: <FileText className="text-blue-600" size={24} />,
      pptx: <Presentation className="text-orange-600" size={24} />,
      ppt: <Presentation className="text-orange-600" size={24} />,
      pdf: <FileText className="text-red-600" size={24} />,
      txt: <FileText className="text-gray-600" size={24} />,
      xlsx: <FileSpreadsheet className="text-green-600" size={24} />,
      xls: <FileSpreadsheet className="text-green-600" size={24} />,
      png: <FileImage className="text-purple-600" size={24} />,
      jpg: <FileImage className="text-blue-500" size={24} />,
      jpeg: <FileImage className="text-blue-500" size={24} />,
    };

    return (
      iconMap[extension || ''] || <File className="text-gray-500" size={24} />
    );
  };

  const removeSelectedFile = (index: number) => {
    const updatedFiles = selectedFilesForChat.filter(
      (_: File, i: number) => i !== index,
    );
    setSelectedFilesForChat(updatedFiles);
  };

  // Simplified file upload function (matching ChatInput pattern)
  const handleFileUpload = async (filesToUpload: File[]): Promise<any[]> => {
    if (!filesToUpload.length) return [];

    const formData = new FormData();
    filesToUpload.forEach((file: File) => {
      formData.append('files', file);
    });
    formData.append('useremail', 'test@example.com');

    try {
      setIsUploading(true);
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'X-XSRF-TOKEN': getCSRFToken(),
        },
        credentials: 'include' as RequestCredentials,
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const result = await response.json();
      setIsUploading(false);
      
      // ✅ DEFENSIVE: Validate upload result structure
      if (!result || typeof result !== 'object') {
        console.error('[ChatWindow]: Invalid upload response');
        return [];
      }
      
      // ✅ CRITICAL FIX: Return file metadata (not just URLs) for RAG to use original filenames
      if (result.files && Array.isArray(result.files) && result.files.length > 0) {
        // ✅ DEFENSIVE: Validate each file object
        const validFiles = result.files.filter((file: any) => 
          file && 
          typeof file === 'object' && 
          file.url && 
          file.azureFileName && 
          file.originalFileName
        );
        
        if (validFiles.length > 0) {
          console.log('[ChatWindow]: ✅ Using file metadata with original names:', validFiles.length, 'files');
          return validFiles;
        }
      }
      
      // Fallback to URLs for backwards compatibility
      if (result.urls && Array.isArray(result.urls) && result.urls.length > 0) {
        const validUrls = result.urls.filter((url: any) => url && typeof url === 'string' && url.trim());
        if (validUrls.length > 0) {
          return validUrls;
        }
      }
      
      console.error('[ChatWindow]: ❌ No valid files or URLs in upload response');
      return [];
    } catch (error) {
      console.error('File upload error:', error);
      setIsUploading(false);
      return [];
    }
  };

  // Removed legacy validateFiles, requestConsent, handleConsentAccept, handleConsentReject,
  // handleFiles, uploadFiles, handleDrop, handleBrowse, removeUploadedFile functions
  // FileUploadModal now handles all file selection and upload logic

  // Paperclip click - opens browse file modal (using FileUploadModal)
  const handleAttachmentClick = (): void => {
    setIsUploadModalOpen(true);
  };

  // Removed legacy handleUpload, handleChangeEvent, removeFile functions
  // All file operations now handled through FileUploadModal

 const updatePrompts = async (body: ExtendedChatBody, idToken: string, signal: AbortSignal): Promise<{prompt: string, citations?: any[]} | null> => {
    try {
      // Get user data from localStorage with proper fallback
      let userId = localStorage.getItem('userId');
      if (!userId) {
        const userDataStr = localStorage.getItem('user');
        if (userDataStr) {
          try {
            const userData = JSON.parse(userDataStr);
            userId = userData.id;
            if (userId) {
              localStorage.setItem('userId', userId);
            }
          } catch (e) {
            console.error('Failed to parse user data:', e);
          }
        }
      }
      
      // If still no userId, log error and use null
      if (!userId) {
        console.error('[updatePrompts] No userId found - cannot track conversation');
        userId = null;
      }

      // FIXED: Add conversation tracking fields to match Python RAG extraction
      const promptBody = {
        files: body.files || [],
        key: HARDCODED_API_KEY, // Must be present, not empty
        messages: body.messages.map((msg: Message) => ({
          role: msg.role,
          content: msg.content,
          prompt: (msg as any).prompt || false, // Required by your API
        })),
        model: body.model, // Full model object
        prompt:
          body.prompt ||
          "You are Genie, a large language model trained by Deloitte. Follow the user's instructions carefully. Respond using markdown.",
        workflow: body.workflow || null,
        conversationId: getCurrentConversationId(), // Use helper function for consistency
        userId: userId,
      };

      console.log('Sending to /api/prompt with conversation tracking:', {
        endpoint: '/api/prompt',
        conversationId: promptBody.conversationId,
        userId: promptBody.userId,
        bodyStructure: {
          files: promptBody.files.length,
          fileNames: promptBody.files, // Show actual file names
          key: promptBody.key ? 'Present' : 'Missing',
          messages: promptBody.messages.length,
          model: promptBody.model.id,
          hasPrompt: !!promptBody.prompt,
          workflow: promptBody.workflow?.title || 'Genie Agent Builder',
        },
      });

      // CRITICAL: Alert if files are expected but missing
      if (
        body.files &&
        body.files.length > 0 &&
        promptBody.files.length === 0
      ) {
        console.error(
          '⚠️WARNING: Files were in request but not in promptBody!',
          {
            bodyFiles: body.files,
            promptBodyFiles: promptBody.files,
          },
        );
      }

      const myHeaders = new Headers({
        'Content-Type': 'application/json',
      });

      // Add authentication if token exists
      if (idToken) {
        myHeaders.set('Authorization', `Bearer ${idToken}`);
      }

      const csrfToken = getCSRFToken();
      if (csrfToken) {
        myHeaders.set('X-XSRF-TOKEN', csrfToken);
      }

      const response = await fetch('/api/prompt', {
        method: 'POST',
        headers: myHeaders,
        body: JSON.stringify(promptBody),
        credentials: 'include' as RequestCredentials,
        signal: signal,
      });

      console.log('/api/prompt response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('/api/prompt error response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });

        // Don't throw error - continue without RAG enhancement
        return null;
      }

      //  Try to parse as JSON first (for citations), fallback to text
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const jsonResult = await response.json();
        console.log('/api/prompt success (JSON):', {
          promptLength: jsonResult.content?.length || jsonResult.system_prompt?.length || 0,
          citationsCount: jsonResult.citations?.length || 0
        });
        
        return {
          prompt: jsonResult.content || jsonResult.system_prompt || '',
          citations: jsonResult.citations || []
        };
      } else {
        const textResult = await response.text();
        console.log('/api/prompt success (text):', textResult.substring(0, 100) + '...');
        return {
          prompt: textResult,
          citations: []
        };
      }
      
    } catch (error: any) {
      console.error('updatePrompts error:', error);

      // Don't throw error - continue without RAG enhancement
      if (error.name !== 'AbortError') {
        // console.warn(
        //   'Continuing without RAG enhancement due to error:',
        //   error.message,
        // );
      }
      return null;
    }
  };

  // FIXED: createOrUpdateConversation with proper message count validation
  const createOrUpdateConversation = async (
    messages: ExtendedMessage[],
  ): Promise<any> => {
    const currentConversationId = getCurrentConversationId(); // Use helper function
    if (!currentConversationId) return null;

    try {
      // Get userId with proper fallback (no dummy value)
      let userId = localStorage.getItem('userId');
      if (!userId) {
        const userDataStr = localStorage.getItem('user');
        if (userDataStr) {
          try {
            const userData = JSON.parse(userDataStr);
            userId = userData.id;
            if (userId) {
              localStorage.setItem('userId', userId);
            }
          } catch (e) {
            console.error('Failed to parse user data:', e);
          }
        }
      }
      
      // If still no userId, log error but continue with conversation save
      if (!userId) {
        console.error('[createOrUpdateConversation] No userId found - saving conversation without user tracking');
        // Use a fallback that won't break the API, but is clearly not a real user
        userId = 'unknown';
      }

      // Use cache to check message count (avoid API call)
      const cachedMessageCount =
        ConversationCacheRef.current.id === currentConversationId
          ? ConversationCacheRef.current.messageCount
          : 0;
      const newMessageCount = messages.length;

      // Only fetch from API if cache doesn't have enough info
      let existingMessageCount = cachedMessageCount;
      let existingConversation = null;

      if (newMessageCount <= cachedMessageCount) {
        console.log('Skipping save - cache shows no new messages:', {
          cached: cachedMessageCount,
          new: newMessageCount,
        });

        // Verify cache is still valid before returning
        const now = Date.now();
        const CACHE_DURATION = 30000;
        if (now - ConversationCacheRef.current.timestamp < CACHE_DURATION) {
          CacheMetrics.current.skips++;
          console.log(
            'Save skipped via cache | Total skips:',
            CacheMetrics.current.skips,
          );
          return ConversationCacheRef.current.data;
        } else {
          console.log('⚠️Cache expired during check, fetching fresh data');
          // Continue to fetch below
        }
      }

      // Only fetch if we really need to verify
      if (
        cachedMessageCount === 0 ||
        newMessageCount === cachedMessageCount + 1
      ) {
        console.log('Checking existing conversation before save...');
        existingConversation = await fetchConversationById(
          currentConversationId,
        );
        existingMessageCount = existingConversation?.messages?.length || 0;

        console.log('Message count comparison:', {
          existing: existingMessageCount,
          new: newMessageCount,
          ConversationId: currentConversationId,
        });

        // Only save if we have more messages than what's already in DB
        if (newMessageCount < existingMessageCount) {
          console.log(
            'Skipping save - new message count is less than existing:',
            {
              existing: existingMessageCount,
              new: newMessageCount,
            },
          );
          return existingConversation; // Return existingConversation instead
        }

        // If message counts are equal, check if content is different
        if (
          newMessageCount === existingMessageCount &&
          existingConversation?.messages
        ) {
          const lastExistingMessage =
            existingConversation.messages[existingMessageCount - 1];
          const lastNewMessage = messages[newMessageCount - 1];

          if (lastExistingMessage?.content === lastNewMessage?.content) {
            console.log('⚡ Messages are identical, skipping unnecessary save');
            return existingConversation;
          }
        }
      }

      // Prepare conversation data matching the API structure exactly
      const conversationBody = {
        id: currentConversationId, // Use the current conversation ID
        userId: parseInt(userId), // Convert to number as expected by API
        model: {
          id: selectedModel.id,
          name: selectedModel.name,
          maxLength: selectedModel.maxLength,
          tokenLimit: selectedModel.tokenLimit,
          label: selectedModel.label,
        },
        messages: messages.map((msg: ExtendedMessage) => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content,
          ...(msg.file && { file: msg.file }),
        })),
        name:
          messages.length > 0
            ? messages[0].content.substring(0, 50)
            : 'Agent Builder Session',
        prompt: workflowData?.prompt || 'You are the Genie Agent Builder...',
        temperature: temperature,
        folderId: null,
      };

      console.log('Proceeding with save - new messages detected:', {
        id: conversationBody.id,
        userId: conversationBody.userId,
        messageCount: conversationBody.messages.length,
        name: conversationBody.name.substring(0, 30) + '...',
      });

      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer dev-id-token`,
          'X-XSRF-TOKEN': getCSRFToken() || '',
        },
        credentials: 'include' as RequestCredentials,
        body: JSON.stringify(conversationBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Conversation save failed:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });

        // Try to parse error response for more details
        try {
          const errorJson = JSON.parse(errorText);
          console.error('Detailed error:', errorJson);
        } catch (e) {
          console.error('Raw error text:', errorText);
        }

        // Invalidate cache on save failure
        if (ConversationCacheRef.current.id === currentConversationId) {
          ConversationCacheRef.current.timestamp = 0; // Force refresh next time
          console.log('Cache invalidated due to save failure');
        }

        return null;
      }

      const result = await response.json();
      console.log('Conversation saved successfully:', result);

      // Update cache after successful save
      ConversationCacheRef.current = {
        id: currentConversationId,
        data: result,
        messageCount: messages.length,
        timestamp: Date.now(),
      };

      return result;
    } catch (error) {
      console.error('Error savingConversation:', error);
      return null;
    }
  };

  // FIXED: Clear chat function that maintains sessionConversation ID
  const handleClearChat = (): void => {
    setMessages((prev) => (prev.length ? [prev[0]] : []));
    setSelectedFilesForChat([]); // Clear selected files
    setSelectedFilesLink([]); // Clear file links

    // Reset token usage for new conversation
    setTokenUsage({
      inputTokens: 0,
      responseTokens: 0,
      totalTokens: 0,
      sessionTotalTokens: 0,
      modelUsed: selectedModel.name,
    });

    // Clear cache when clearing chat
    ConversationCacheRef.current = {
      id: null,
      data: null,
      messageCount: 0,
      timestamp: 0,
    };

    // DO NOT generate new conversation ID - keep the current session ID
    const currentConversationId =
      conversationId || sessionStorage.getItem('agentBuilderConversationId');

    if (currentConversationId) {
      console.log('Clearing chat for existing session:', currentConversationId);
      //----------------- Commented because we need to keep First message as per polina Feedback

      // Reinitialize the workflow with the SAME conversation ID
      // setTimeout(() => {
      //   initializeAgentBuilderWorkflow(currentConversationId);
      // }, 500);
    } else {
      // console.warn('No conversation ID found during clear chat');
    }
  };

  // ADD: New session button handler
  const handleNewSession = (): void => {
    // Clear current session
    sessionStorage.removeItem('agentBuilderConversationId');

    // Clear cache when starting new session
    ConversationCacheRef.current = {
      id: null,
      data: null,
      messageCount: 0,
      timestamp: 0,
    };

    // Reset token usage for new session
    setTokenUsage({
      inputTokens: 0,
      responseTokens: 0,
      totalTokens: 0,
      sessionTotalTokens: 0,
      modelUsed: selectedModel.name,
    });

    // Refresh page to start new session
    // window.location.reload();
  };

  // 🧪 NEW: Handle Test Agent Button Click - Opens new tab
  // const handleTestAgent = (): void => {
  //   if (!lastSavedWorkflowId) {
  //     console.error('No saved workflow to test');
  //     alert('Please save the agent first before testing');
  //     return;
  //   }

  //   console.log('🧪 Opening test agent in new tab with workflow:', lastSavedWorkflowId);

  //   // Open new tab with test-agent page
  //   const testUrl = `/test-agent?workflowId=${lastSavedWorkflowId}`;
  //   window.open(testUrl, '_blank');
  // };

  // NEW: Handle Save Agent Button Click using RAG
  const handleSaveAgent = async (): Promise<void> => {
    const currentConversationId = getCurrentConversationId();

    console.log('Save Agent Debug:', {
      conversationId: currentConversationId,
      messagesCount: messages.length,
      sessionStorageId: sessionStorage.getItem('agentBuilderConversationId'),
      stateConversationId: conversationId,
      currentLastSavedWorkflowId: lastSavedWorkflowId,
    });

    if (!currentConversationId) {
      console.error('Cannot save agent: No conversation ID found');
      alert(
        'Unable to save agent. Please wait for the conversation to initialize and try again.',
      );
      return;
    }

    if (messages.length === 0) {
      console.error('Cannot save agent: No messages in conversation');
      alert(
        'Unable to save agent. Please have at least one conversation exchange before saving.',
      );
      return;
    }

    // Reset saved state when starting a new save
    setAgentSaved(false);
    setIsSavingAgent(true);

    // Notify header about save start
    window.dispatchEvent(
      new CustomEvent('chatWindowStateChange', {
        detail: {
          type: 'saveStart',
          saving: true,
        },
      }),
    );

    try {
      // First save the currentConversation to ensure all messages are in DB
      await createOrUpdateConversation(messages);
      console.log('Conversation saved before extraction');

      // Fetch complete conversation from database for better extraction
      console.log('Fetching complete conversation from database...');
      const completeConversation = await fetchConversationById(
        currentConversationId,
        true,
      ); // Force refresh for save

      let conversationMessages;
      if (
        completeConversation &&
        completeConversation.messages &&
        completeConversation.messages.length > 0
      ) {
        // Use database conversation (more complete and persistent)
        conversationMessages = completeConversation.messages.map(
          (msg: any) => ({
            role: msg.role,
            content: msg.content,
            sender: msg.role === 'user' ? 'user' : 'assistant',
          }),
        );
        console.log(
          'Using database conversation with',
          conversationMessages.length,
          'messages',
        );
      } else {
        // Fallback to in-memory messages
        conversationMessages = messages.map((msg) => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content,
          sender: msg.sender,
        }));
        console.log(
          'Fallback to in-memory messages with',
          conversationMessages.length,
          'messages',
        );
      }

      // NEW: Collect all uploaded files from messages
      const allUploadedFiles: string[] = [];
      const messagesToScan = completeConversation?.messages || messages;

      console.log(
        '🔍 Scanning messages for files. Total messages:',
        messagesToScan.length,
      );

      messagesToScan.forEach((msg: any, idx: number) => {
        // Check both 'file' (singular) and 'files' (plural) for compatibility
        const fileData = msg.file || msg.files;

        if (fileData) {
          console.log(`📎 Message ${idx} has files:`, fileData);

          if (Array.isArray(fileData)) {
            // Handle array of files
            fileData.forEach((f: any) => {
              const fileName =
                typeof f === 'string' ? f : f.azureFileName || f.name;
              if (fileName && !allUploadedFiles.includes(fileName)) {
                console.log(`✅ Adding file: ${fileName}`);
                allUploadedFiles.push(fileName);
              }
            });
          } else if (typeof fileData === 'string') {
            // Handle single file string
            if (!allUploadedFiles.includes(fileData)) {
              console.log(`✅ Adding file: ${fileData}`);
              allUploadedFiles.push(fileData);
            }
          } else if (typeof fileData === 'object') {
            // Handle single file object
            const fileName = fileData.azureFileName || fileData.name;
            if (fileName && !allUploadedFiles.includes(fileName)) {
              console.log(`✅ Adding file: ${fileName}`);
              allUploadedFiles.push(fileName);
            }
          }
        }
      });

      console.log('📁 Collected uploaded files from conversation:', {
        fileCount: allUploadedFiles.length,
        files: allUploadedFiles,
      });

      // Extract agent data using complete conversation (with tgpublish: false)
      console.log(
        '🔄 Calling extractAgentFromConversation with files:',
        allUploadedFiles,
      );
      const extractedAgent = await extractAgentFromConversation(
        currentConversationId,
        conversationMessages,
        user?.idToken || '',
        allUploadedFiles, // NEW: Pass collected files
      );

      if (!extractedAgent) {
        throw new Error('Failed to extract agent data from conversation');
      }

      console.log('✅ Extracted agent data received:', {
        title: extractedAgent.title,
        hasFiles: !!extractedAgent.files,
        filesCount: extractedAgent.files?.length || 0,
        files: extractedAgent.files,
      });

      // Set tgpublish to false for Save (not published yet)
      extractedAgent.tgPublish = 'false';

      console.log('Extracted agent data for Save:', extractedAgent.title);

      // Save as new workflow with tgpublish: false
      const savedWorkflow = await saveExtractedAgent(
        extractedAgent,
        user?.idToken || '',
      );

      console.log('💾 SavedWorkflow response:', {
        hasNewWorkflow: !!savedWorkflow?.newWorkflow,
        workflowId: savedWorkflow?.newWorkflow?._id,
        hasFiles: !!savedWorkflow?.newWorkflow?.files,
        filesCount: savedWorkflow?.newWorkflow?.files?.length || 0,
        files: savedWorkflow?.newWorkflow?.files,
        fullSavedWorkflow: savedWorkflow?.newWorkflow,
      });

      if (savedWorkflow) {
        const workflowId = savedWorkflow.newWorkflow?._id;

        setAgentSaved(true);
        setLastSavedWorkflowId(workflowId); // Store for publishing

        // Show Test Agent button after successful save
        setShowTestAgentButton(true);

        console.log('Agent saved successfully:', {
          title: savedWorkflow.newWorkflow?.title,
          workflowId: workflowId,
          lastSavedWorkflowId: workflowId,
        });

        // NEW: Notify Sidebar to refresh TG Agent workflows
        window.dispatchEvent(
          new CustomEvent('agentSaved', {
            detail: {
              workflowId: workflowId,
              title: savedWorkflow.newWorkflow?.title,
            },
          }),
        );

        // NEW: Notify AgentCreation component to populate form with workflow data
        const workflowDataToSend = {
          title: savedWorkflow.newWorkflow?.title || extractedAgent.title,
          category:
            savedWorkflow.newWorkflow?.category || extractedAgent.category,
          prompt: savedWorkflow.newWorkflow?.prompt || extractedAgent.prompt,
          model: savedWorkflow.newWorkflow?.model || extractedAgent.model,
          description:
            savedWorkflow.newWorkflow?.description ||
            extractedAgent.description,
          subcategory:
            savedWorkflow.newWorkflow?.subcategory ||
            extractedAgent.subcategory,
          workflowType:
            savedWorkflow.newWorkflow?.workflowType ||
            extractedAgent.workflowType,
          tgPublish:
            savedWorkflow.newWorkflow?.tgPublish || extractedAgent.tgPublish,
          triggers:
            savedWorkflow.newWorkflow?.triggers ||
            extractedAgent.triggers ||
            [], // Include triggers
          citation:
            savedWorkflow.newWorkflow?.citation ||
            extractedAgent.citation ||
            false, // NEW: Include citation
          files: savedWorkflow.newWorkflow?.files || extractedAgent.files || [], // NEW: Include uploaded files
        };

        console.log('🚀 Dispatching workflowSaved event with data:', {
          hasFiles: !!workflowDataToSend.files,
          filesCount: workflowDataToSend.files?.length || 0,
          files: workflowDataToSend.files,
          fullWorkflowData: workflowDataToSend,
        });

        window.dispatchEvent(
          new CustomEvent('workflowSaved', {
            detail: { workflowData: workflowDataToSend },
          }),
        );

        // Notify header about save success immediately (no delay)
        window.dispatchEvent(
          new CustomEvent('chatWindowStateChange', {
            detail: {
              type: 'saveEnd',
              saving: false,
              success: true,
              agentSaved: true,
              lastSavedWorkflowId: workflowId,
            },
          }),
        );

        // Reset to default state after 3 seconds
        setTimeout(() => {
          setAgentSaved(false);
          window.dispatchEvent(
            new CustomEvent('chatWindowStateChange', {
              detail: {
                type: 'saveReset',
                agentSaved: false,
              },
            }),
          );
        }, 3000);
      }
    } catch (error) {
      console.error('Error saving agent:', error);
      alert(
        `Failed to save agent: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );

      // Notify header about save failure
      window.dispatchEvent(
        new CustomEvent('chatWindowStateChange', {
          detail: {
            type: 'saveEnd',
            saving: false,
            success: false,
            agentSaved: false,
          },
        }),
      );
    } finally {
      setIsSavingAgent(false);
    }
  };

  // NEW: Handle Submit for Publishing Button Click
  const handleSubmitForPublishing = async (): Promise<void> => {
    console.log('Publish Agent Debug:', {
      lastSavedWorkflowId: lastSavedWorkflowId,
      hasWorkflowId: !!lastSavedWorkflowId,
    });

    if (!lastSavedWorkflowId) {
      console.error('Cannot publish: No saved workflow ID found');
      alert('Please save the agent first before submitting for publishing');
      return;
    }

    // Reset published state when starting a new publish
    setAgentPublished(false);
    setIsPublishing(true);

    // Notify header about publish start
    window.dispatchEvent(
      new CustomEvent('chatWindowStateChange', {
        detail: { type: 'publishStart', publishing: true },
      }),
    );

    try {
      console.log('📤 Submitting workflow for publishing approval:', lastSavedWorkflowId);

      // Get user token
      let currentIdToken = user?.idToken;
      if (!currentIdToken) {
        throw new Error('User not authenticated');
      }

      // Call new submit-for-publishing API
      const response = await fetch('/api/workflow/submit-for-publishing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentIdToken}`,
        },
        body: JSON.stringify({
          workflowId: lastSavedWorkflowId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to submit for publishing: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Workflow submitted for publishing approval:', result);

      setAgentPublished(true);

      // Show success message with more details
      alert(`Agent submitted for publishing approval!\n\nApproval request sent to: ${result.leaderEmail}\n\nYour agent will be published after approval.`);

      // Notify header about publish success immediately (no delay)
      window.dispatchEvent(
        new CustomEvent('chatWindowStateChange', {
          detail: {
            type: 'publishEnd',
            publishing: false,
            success: true,
            agentPublished: true,
          },
        }),
      );

      // Reset to default state after 3 seconds
      setTimeout(() => {
        setAgentPublished(false);
        window.dispatchEvent(
          new CustomEvent('chatWindowStateChange', {
            detail: {
              type: 'publishReset',
              agentPublished: false,
            },
          }),
        );
      }, 3000);
    } catch (error) {
      console.error('❌ Error submitting agent for publishing:', error);
      alert(
        `Failed to submit agent for publishing: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );

      // Notify header about publish failure
      window.dispatchEvent(
        new CustomEvent('chatWindowStateChange', {
          detail: {
            type: 'publishEnd',
            publishing: false,
            success: false,
            agentPublished: false,
          },
        }),
      );
    } finally {
      setIsPublishing(false);
    }
  };

  // // Handle regenerate response - works on any assistant message
  // const handleRegenerate = async (index: number) => {
  //   if (index < 1 || index >= messages.length) {
  //     console.error('Invalid message index for regeneration');
  //     return;
  //   }

  //   const messageToRegenerate = messages[index];
  //   if (messageToRegenerate.sender !== 'assistant') {
  //     console.error('Can only regenerate assistant messages');
  //     return;
  //   }

  //   // Get the user message that prompted this assistant response
  //   const userMessage = messages[index - 1];

  //   // Truncate conversation to the point just before this assistant message
  //   // Keep the user message but remove the assistant response
  //   const updatedMessages = messages.slice(0, index);
  //   setMessages(updatedMessages);
  //   setIsLoading(true);

  //   try {
  //     // Don't add user message again - it's already in updatedMessages
  //     // Just call the API directly with the existing conversation state
      
  //     let requestFiles: string[] = [];
  //     if (userMessage?.file && Array.isArray(userMessage.file)) {
  //       requestFiles = userMessage.file.map((f: any) => f.azureFileName || f);
  //     }

  //     console.log('Regenerating response for user message:', {
  //       content: userMessage.content,
  //       files: requestFiles.length,
  //     });

  //     // Build chat body for regeneration
  //     const chatBody: ExtendedChatBody = {
  //       model: selectedModel,
  //       messages: updatedMessages.map((msg) => ({
  //         role: msg.role,
  //         content: msg.content,
  //       })),
  //       key: HARDCODED_API_KEY,
  //       prompt: workflowData?.prompt || '',
  //       temperature: temperature,
  //       files: requestFiles,
  //       workflow: workflowData,
  //     };

  //     const endpoint = getEndpoint(null);
  //     const csrfToken = getCSRFToken();

  //     // Call RAG prompt enhancement if needed
  //     let enhancedPrompt = chatBody.prompt;
  //     let citations: any[] = [];

  //     try {
  //       const promptResponse = await fetch('/api/prompt', {
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json',
  //           Authorization: 'Bearer dev-id-token',
  //           'X-XSRF-TOKEN': csrfToken || '',
  //         },
  //         credentials: 'include' as RequestCredentials,
  //         body: JSON.stringify(chatBody),
  //       });

  //       if (promptResponse.ok) {
  //         const promptText = await promptResponse.text();
  //         try {
  //           const promptData = JSON.parse(promptText);
  //           if (promptData.augmented_prompt) {
  //             enhancedPrompt = promptData.augmented_prompt;
  //           }
  //           if (promptData.citations && Array.isArray(promptData.citations)) {
  //             citations = promptData.citations;
  //           }
  //         } catch (e) {
  //           enhancedPrompt = promptText;
  //         }
  //       }
  //     } catch (error) {
  //       console.error('Error calling /api/prompt:', error);
  //     }

  //     // Update chatBody with enhanced prompt
  //     chatBody.prompt = enhancedPrompt;

  //     // Call OpenAI API
  //     const response = await fetch(endpoint, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         Authorization: 'Bearer dev-id-token',
  //         'X-XSRF-TOKEN': csrfToken || '',
  //       },
  //       credentials: 'include' as RequestCredentials,
  //       body: JSON.stringify(chatBody),
  //     });

  //     if (!response.ok) {
  //       throw new Error(`API request failed with status ${response.status}`);
  //     }

  //     const data = response.body;
  //     if (!data) {
  //       throw new Error('Response body is empty');
  //     }

  //     const reader = data.getReader();
  //     const decoder = new TextDecoder();
  //     let done = false;
  //     let text = '';

  //     //  FIX: Don't include citations on regenerate - user is regenerating to get a fresh response
  //     const newAssistantMessage: ExtendedMessage = {
  //       role: 'assistant',
  //       content: '',
  //       timestamp: new Date().toISOString(),
  //       sender: 'assistant',
  //       // citations: citations.length > 0 ? citations : undefined, // Removed - don't show citations on regenerate
  //     };

  //     // Stream the response
  //     while (!done) {
  //       const { value, done: doneReading } = await reader.read();
  //       done = doneReading;
  //       const chunkValue = decoder.decode(value);
  //       text += chunkValue;

  //       newAssistantMessage.content = text;
  //       setMessages([...updatedMessages, { ...newAssistantMessage }]);
  //     }

  //     // Save to conversation
  //     await createOrUpdateConversation([...updatedMessages, newAssistantMessage]);

  //     setIsLoading(false);
  //   } catch (error) {
  //     console.error('Error regenerating response:', error);
  //     setIsLoading(false);
      
  //     setMessages([
  //       ...updatedMessages,
  //       {
  //         role: 'assistant',
  //         content: '⚠️ Error regenerating response. Please try again.',
  //         timestamp: new Date().toISOString(),
  //         sender: 'assistant',
  //       },
  //     ]);
  //   }
  // };

  // Handle copy response to clipboard
  const handleCopyResponse = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      // Optional: Add toast notification here
      console.log('Response copied to clipboard');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  // FIXED handleSend function with properConversation management
  const handleSend = async (
    message: ExtendedMessage,
    deleteCount: number = 0,
    plugin: any = null,
    promptWorkflow?: string,
    withPromptCall?: boolean,
    isTyping: boolean = true,
    regenerate: boolean = false,
  ): Promise<void> => {
    if (stopConversationRef.current) {
      console.log('Conversation was stopped before sending.');
      return;
    }

    // Add user message to state immediately
    const updatedMessages = regenerate ? messages.slice(0, -1) : [...messages, message];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      // ✅ Single source of truth for files (matching ChatInput pattern)
      let requestFiles: string[] = [];

      // Only use files from message.file (already uploaded in handleSubmit)
      if (message?.file && Array.isArray(message.file)) {
        requestFiles = message.file.map((f: any) => f.azureFileName || f);

        // Save to localStorage for persistence
        const filesData = JSON.parse(localStorage.getItem('files') || '{}');
        const conversationId = getCurrentConversationId()!;
        filesData[conversationId] = requestFiles;
        saveFiles(filesData);

        console.log('Files from message saved to localStorage:', {
          conversationId,
          fileCount: requestFiles.length,
          files: requestFiles,
        });
      }

      console.log('Files being sent to RAG:', {
        total: requestFiles.length,
        files: requestFiles,
        userMessage: message.content,
      });
      let updatedMessageRequest = updatedMessages.filter(
        (x) => x.content !== '',
      );

      // Prepare chat body with correct structure
      let chatBody: ExtendedChatBody = {
        model: selectedModel,
        messages: updatedMessageRequest.map((msg: ExtendedMessage) => ({
          role:
            msg.role ||
            ((msg.sender === 'user' ? 'user' : 'assistant') as Role),
          content: msg.content,
          file: msg.file,
          prompt: msg.prompt,
        })),
        key: HARDCODED_API_KEY, // Use hardcoded API key
        prompt:
          promptWorkflow ||
          workflowData?.prompt ||
          'You are the Genie Agent Builder...',
        temperature: temperature,
        files: requestFiles || [], // Use files from localStorage (Chat.tsx pattern)
        workflow: workflowData,
      };

      let callPromptApi = false;
      if (workflowData) {
        chatBody.workflow = workflowData;
      } else {
        chatBody.workflow = null;
      }

      // ✅ OPTIMIZATION: Only call RAG when actually needed
      // const modelIdStr = selectedModel.id || '';
      // const needsRAG = (
      //   requestFiles.length > 0 ||  // Has file uploads
      //   workflowData?.grounding ||   // Workflow requires grounding
      //   freestyleCitationEnabled ||  // Citation enabled
      //   modelIdStr === 'tax_specialist_genie' ||  // Specific models need RAG
      //   modelIdStr === 'gpt-5' ||
      //   modelIdStr === 'gpt-5-mini'
      // );

      // if (needsRAG && (isTyping || requestFiles.length > 0)) {
      //   callPromptApi = true;
      // }

      // CRITICAL: Log if files are present to verify RAG will be called
      // if (requestFiles.length > 0) {
      //   console.log(
      //     '📎 FILES DETECTED - RAG will be called for file context:',
      //     {
      //       fileCount: requestFiles.length,
      //       files: requestFiles,
      //       callPromptApi: true,
      //     },
      //   );
      // }

      let currentIdToken: string = 'dev-id-token'; // Use proper token
      let enhancedPromptResult: {prompt: string, citations?: any[]} | null = null;
      let ragCitations: any[] = [];
      let ragPromise: Promise<{prompt: string, citations?: any[]} | null> | null = null;
      const perfStart = Date.now();

      // 🚀 SUPER OPTIMIZATION: Start RAG in parallel (non-blocking)
      if (callPromptApi) {
        console.log('🚀 Starting RAG call in parallel (non-blocking)...', {
          files: chatBody.files?.length || 0,
          messagesCount: chatBody.messages.length,
          model: chatBody.model.id,
        });

        ragPromise = updatePrompts(
          chatBody,
          currentIdToken,
          abortControllerRef.current.signal,
        )
        .then(result => {
          console.log(`⏱️ RAG completed in ${Date.now() - perfStart}ms`);
          if (result) {
            console.log('RAG-enhanced prompt received:', result.prompt.substring(0, 100) + '...');
          }
          return result;
        })
        .catch((error: any) => {
          if (error.name !== 'AbortError') {
            console.error('Error while updating prompts:', error);
          }
          return null;
        });
      } else {
        console.log('⚡ RAG not needed - Skipping /api/prompt');
      }

      // 🚀 OPTIMIZATION: Only wait for RAG if files are present (critical path)
      // For non-file cases, use workflow prompts immediately and update later
      if (ragPromise && requestFiles.length > 0) {
        console.log('⏳ Waiting for RAG (files present - critical)...');
        enhancedPromptResult = await ragPromise;
        if (enhancedPromptResult) {
          ragCitations = enhancedPromptResult.citations || [];
        }
      }

      // ✅ PRIORITY SYSTEM FOR PROMPT SELECTION:
      // 1. RAG-enhanced prompt (when files are present) - HIGHEST PRIORITY
      // 2. RAG-enhanced prompt (when available, no workflow conflict)
      // 3. Workflow prompt from parameter (for initial agent builder message)
      // 4. Workflow prompt from workflowData (fallback)
      // 5. Default prompt

      if (enhancedPromptResult && requestFiles.length > 0) {
        // 🔥 HIGHEST PRIORITY: RAG enhancement when files exist - ALWAYS use this
        chatBody.prompt = enhancedPromptResult.prompt;
        console.log(
          '🎯[PRIORITY 1] UsingRAG-enhanced prompt with file context (files:',
          requestFiles.length,
          ')',
        );
        console.log(
          '   → File upload detected - RAG takes absolute precedence over ALL workflow prompts',
        );
      } else if (
        enhancedPromptResult &&
        !workflowData?.prompt?.includes('Enhanced Specification Collection')
      ) {
        // PRIORITY 2: RAG enhancement available, no Agent Builder conflict
        chatBody.prompt = enhancedPromptResult.prompt;
        console.log(
          '🎯[PRIORITY 2] UsingRAG-enhanced prompt (no files, no workflow conflict)',
        );
      } else if (
        enhancedPromptResult &&
        workflowData?.prompt?.includes('Enhanced Specification Collection') &&
        requestFiles.length === 0
      ) {
        // PRIORITY 3: Agent Builder workflow without files - use workflow
        chatBody.prompt = workflowData.prompt;
        console.log(
          '📋[PRIORITY 3] Using enhanced Agent Builder prompt (no files, workflow takes precedence)',
        );
      } else if (promptWorkflow && isTyping && !enhancedPromptResult) {
        // PRIORITY 4: Initial workflow prompt (only if no RAG)
        chatBody.prompt = promptWorkflow;
        console.log('📋[PRIORITY 4] Using provided promptWorkflow (no RAG)');
      } else if (workflowData?.prompt && !enhancedPromptResult) {
        // PRIORITY 5: Workflow data prompt (only if no RAG)
        chatBody.prompt = workflowData.prompt;
        console.log('📋[PRIORITY 5] Using workflowData prompt (no RAG)');
      }

      // 🚀 Background task: Update citations when RAG completes (for non-file cases)
      if (ragPromise && requestFiles.length === 0) {
        ragPromise.then(result => {
          if (result?.citations) {
            console.log('📚 Injecting citations from background RAG:', result.citations.length);
            // Update the last message with citations
            setMessages((prev: ExtendedMessage[]) => {
              const updated = [...prev];
              const lastMsg = updated[updated.length - 1];
              if (lastMsg && lastMsg.role === 'assistant') {
                lastMsg.citations = result.citations;
              }
              return updated;
            });
          }
        });
      }

      // For /api/chat, remove extra properties from messages
      const chatBodyForChat = {
        ...chatBody,
        messages: chatBody.messages.map((message: Message) => ({
          role: message.role,
          content: message.content,
          file: message.file,
          prompt: message.prompt,
        })),
      };

      const endpoint = getEndpoint(plugin);
      const csrfToken = getCSRFToken();

      // ✅ DEBUG: Log which prompt is being sent and verify RAG was used when files present
      console.log('📤 FINAL PROMPT SELECTION:', {
        promptPreview: chatBodyForChat.prompt?.substring(0, 150) + '...',
        promptLength: chatBodyForChat.prompt?.length || 0,
        hasFiles: requestFiles.length > 0,
        fileCount: requestFiles.length,
        isRAGEnhanced: enhancedPromptResult !== null,
        isAgentBuilder: chatBodyForChat.prompt?.includes('Enhanced Specification Collection'),
        expectedBehavior: requestFiles.length > 0 ? 'Should use RAG-enhanced prompt with file context' : 'Can use workflow prompt'
      });

      console.log('Sending to /api/chat:', {
        endpoint,
        conversationId: getCurrentConversationId(), // Use helper function
        modelId: chatBodyForChat.model.id,
        messageCount: chatBodyForChat.messages.length,
        hasPrompt: !!chatBodyForChat.prompt,
        hasFiles: (chatBody.files?.length ?? 0) > 0,
        fileCount: chatBody.files?.length || 0,
        fileNames: chatBody.files || [], // Show actual file names
        hasKey: !!chatBodyForChat.key,
        keyPreview: chatBodyForChat.key ? `${chatBodyForChat.key.substring(0, 8)}...` : 'none',
        temperature: chatBodyForChat.temperature
      });

      console.log('Final payload being sent to API:', {
        ...chatBodyForChat,
        messages: chatBodyForChat.messages.length + ' messages',
        files: chatBodyForChat.files?.map(f => f) // Files are now strings (azureFileNames)
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentIdToken}`,
          'X-XSRF-TOKEN': csrfToken || '',
        },
        signal: abortControllerRef.current.signal,
        credentials: 'include' as RequestCredentials,
        body: JSON.stringify(chatBodyForChat),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Chat API Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Chat API failed: ${response.status} - ${response.statusText}`);
      }

      const data = response.body;
      if (!data) {
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      const reader = data.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let isFirst = true;
      let text = '';

      let assistantMessage: ExtendedMessage = {
        sender: 'assistant',
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString()
      };

      // ✅ PERFORMANCE FIX: Throttle UI updates to reduce re-renders
      let lastUpdate = 0;
      const UPDATE_INTERVAL = 50; // ms

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        text += chunkValue;

        if (isFirst) {
          isFirst = false;
          setMessages((prev: ExtendedMessage[]) => [...prev, assistantMessage]);
          lastUpdate = Date.now();
        } else {
          // ✅ CRITICAL FIX: Only update UI every 50ms to prevent render thrashing
          const now = Date.now();
          if (now - lastUpdate > UPDATE_INTERVAL || doneReading) {
            assistantMessage.content = text;
            setMessages((prev: ExtendedMessage[]) => {
              const updated = [...prev];
              updated[updated.length - 1] = { ...assistantMessage };
              return updated;
            });
            lastUpdate = now;
          }
        }
      }

      // Check if the response contains token usage information (from RAG backend)
      let tokenUsageInfo: any = null;
      let parsedResponse: any = null;

      try {
        // Try to parse the complete text as JSON to extract token usage and citations
        parsedResponse = JSON.parse(text);

        if (parsedResponse.token_usage) {
          tokenUsageInfo = parsedResponse.token_usage;
          console.log(' Using backend token counts (Python tiktoken):', tokenUsageInfo);

          // Update the assistant message content to just the content part
          assistantMessage.content = parsedResponse.content || text;
          setMessages((prev: ExtendedMessage[]) =>
            prev.map((msg: ExtendedMessage, index: number) => {
              if (index === prev.length - 1) {
                return { ...assistantMessage };
              }
              return msg;
            })
          );
        } else {
          // console.warn('⚠️ Backend response is JSON but missing token_usage');
        }
      } catch (e) {
        // Response is not JSON - cannot calculate tokens without backend
        // console.warn('⚠️ Response is not JSON - no token information available');
        tokenUsageInfo = null;
      }

      // Update token usage state (only if backend provided tokens)
      if (tokenUsageInfo) {
        setTokenUsage((prev) => ({
          inputTokens: tokenUsageInfo?.input_tokens ?? 0,
          responseTokens: tokenUsageInfo?.response_tokens ?? 0,
          totalTokens: tokenUsageInfo?.total_tokens ?? 0,
          sessionTotalTokens: prev.sessionTotalTokens + (tokenUsageInfo?.total_tokens ?? 0),
          modelUsed: tokenUsageInfo?.model_used ?? selectedModel.name,
        }));

        console.log('📊 Token usage updated:', {
          input: tokenUsageInfo.input_tokens,
          response: tokenUsageInfo.response_tokens,
          total: tokenUsageInfo.total_tokens,
          sessionTotal: tokenUsage.sessionTotalTokens + tokenUsageInfo.total_tokens,
          model: tokenUsageInfo.model_used || selectedModel.name,
          source: 'Backend Python tiktoken'
        });
      } else {
        // console.warn('⚠️ No token usage information available for this response');
      }

      // Save completeConversation to database
      const finalMessages = [...updatedMessages, assistantMessage];
      await createOrUpdateConversation(finalMessages);

      console.log('Conversation saved with ID:', getCurrentConversationId()); // Use helper function

    } catch (err: any) {
      console.error('Error sending message:', err);
      setMessages((prev: ExtendedMessage[]) => [
        ...prev,
        {
          sender: 'assistant',
          role: 'assistant',
          content: `Error: ${err.message}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
      //  Clear FileUploadModal selections after sending (matching ChatInput pattern)
      setSelectedFilesLink([]);
      setSelectedFilesForChat([]);
      // 🧹 MEMORY OPTIMIZATION: Clear file buffers to release File objects
      setUploadedFilesForModal([]);
      setUploadedFilesLink([]);
    }
  };

  const handleRegenerate = async (index: number) => {

    // guard: valid index
    if (index < 0 || index >= messages.length) return;
    
    // message we’re regenerating
    const messageToRegenerate = messages[index];
    console.log("messageToRegenerate: ",messageToRegenerate)
    
    // keep all messages *before* that message
    // setMessages(messages.slice(0, index)); // everything before the regenerating message

    await handleSend(messageToRegenerate, 0, null, workflowData?.prompt, true, true, true);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!input.trim() || stopConversationRef.current) return;

    // Check for errors (similar to ChatInput)
    if (uploadError) {
      return;
    }

    if (showPopup) {
      setUploadError(`Upload blocked: found sensitive keywords`);
      return;
    }


    let uploadedUrls = null;
    if (selectedFilesForChat.length > 0) {
      uploadedUrls = await handleFileUpload(selectedFilesForChat);
      console.log('Files uploaded:', uploadedUrls);
    }

    const message: ExtendedMessage = {
      role: 'user',
      content: input,
      //  Simple, consistent format (matching ChatInput)
      file: uploadedUrls && uploadedUrls.length > 0 ? uploadedUrls : undefined,
      timestamp: new Date().toISOString(),
      sender: 'user',
    };

    setInput('');
    setDisplayInput(''); //  FIXED: Also clear displayInput to prevent token count showing old input
    setUploadError(''); // Clear any upload errors
    setSelectedFilesForChat([]); //  Clear files after send
    setSelectedFilesLink([]); //  Clear links after send

    await handleSend(message, 0, null, workflowData?.prompt, true, true);
  };

  const displayTokens = useMemo((): { used: number; max: number; percentage: number } => {
    if (!selectedModel) return { used: 0, max: 32000, percentage: 0 };

    let baseTokens = 0;

    //  UNIFIED: Consistent token calculation regardless of conversation state
    if (tokenUsage.sessionTotalTokens > 0 && messages.length > 0) {
      // Use cumulative session tokens from backend (most accurate)
      baseTokens = tokenUsage.sessionTotalTokens;

      // Add consistent approximation for current input if user is typing (not yet sent)
      if (displayInput.trim()) {
        //  FIXED: More accurate token approximation (~1 token per 3.5 chars)
        const currentInputTokens = Math.ceil(displayInput.length / 3.5);
        baseTokens += currentInputTokens;
      }
    } else {
      // Fallback to fast approximation for new conversations
      const messageTokens = messages.reduce(
        (total: number, msg: ExtendedMessage) => {
          const content = msg.content || '';
          const role =
            msg.role || (msg.sender === 'user' ? 'user' : 'assistant');
          //  FIXED: More accurate approximation (~1 token per 3.5 chars)
          return total + Math.ceil((content.length + role.length) / 3.5);
        },
        0,
      );

      // Calculate input tokens consistently (same formula as above for consistency)
      const inputTokens = displayInput.trim()
        ? Math.ceil(displayInput.length / 3.5)
        : 0;

      //  REMOVED: No conversation overhead - backend provides accurate counts
      baseTokens = messageTokens + inputTokens;

      console.log('[ChatWindow displayTokens]: Using fallback approximation:', {
          messageTokens,
          inputTokens,
        total: baseTokens
        });
    }

    const max = selectedModel.tokenLimit;
    const percentage = Math.min((baseTokens / max) * 100, 100);

    return { used: baseTokens, max, percentage };
  }, [messages, displayInput, selectedModel, tokenUsage]);

  // Initialize displayInput with current input value
  useEffect(() => {
    setDisplayInput(input);
  }, []);

  return (
    <div className="h-full w-full flex flex-col scrollbar-none overflow-hidden bg-[#F2F6F7] dark:bg-[#121212] ">
      {/* Action buttons - Clear chat and Test Agent */}
      <div className="flex justify-between px-4 py-2">
        {/* Test Agent button - Left side (appears after save) */}
        {/* {showTestAgentButton && lastSavedWorkflowId && (
          <button
            onClick={handleTestAgent}
            className="flex items-center px-3 py-1 space-x-1 text-xs text-gray-300 rounded-full bg-gray-900 hover:bg-gray-700 transition-colors"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Test Agent</span>
          </button>
        )} */}

        {/* Spacer if Test Agent button not shown */}
        {!showTestAgentButton && <div></div>}

        {/* Clear chat button - Right side */}
        <button
          onClick={handleClearChat}
          className="flex items-center px-3 py-1 space-x-1 text-xs text-gray-300 rounded-full bg-gray-900 dark:bg-[#1E1E1E] hover:text-gray-200"
        >
          <svg
            className="w-3 h-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          <span>Clear chat</span>
        </button>
      </div>

      <div className="flex-1 min-h-0 p-4 overflow-y-auto scrollbar-none">
        {messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            {/* <div className="text-center">
              <p className="text-base font-medium text-gray-900 dark:text-gray-200 mb-1.5">
                Start typing
              </p>
              <p className="text-xs text-gray-500">
                Testing {selectedModel?.label} with{' '}
                {displayTokens.max.toLocaleString()} token limit
              </p>
            </div> */}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((message: ExtendedMessage, index: number) => (
              <div
                key={`${index}-${message.timestamp}`}
                className={`flex  mb-4`}
              >
                <div className={`flex  items-start w-full`}>
                  {/* Avatar */}
                  <div className={`flex-shrink-0`}>
                    <div
                      className={`w-7 h-7 mr-1 rounded-full flex items-center justify-center text-xs font-bold 
                         bg-black text-white dark:bg-white dark:text-black`}
                    >
                      {message.sender === 'user' ? 'U' : 'A'}
                    </div>
                  </div>

                  {/* Message content */}
                  {message.sender !== 'user' && (
                    <div
                      className={`rounded-lg w-full  px-3 border border-gray-200 py-2 shadow-sm max-w-full 
                  dark:bg-[#1E1E1E]  bg-white  text-gray-800`}
                    >
                      <>
                        {/* <p className="text-sm text-black dark:text-white leading-relaxed whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                        {message.timestamp && (
                          <p
                            className={`text-xs mt-1 text-gray-500 text-right`}
                          >
                            {new Date(message.timestamp).toLocaleTimeString(
                              [],
                              {
                                hour: '2-digit',
                                minute: '2-digit',
                              },
                            )}
                          </p>
                        )} */}
                        <AssistantMessageBubble
                          message={message}
                          messageIndex={index}
                          onRegenerate={handleRegenerate}
                        />
                      </>
                    </div>
                  )}
                  {message.sender === 'user' && (
                    <div className="bg-white w-full   dark:bg-[#1e1e1e] border border-gray-200  rounded-lg shadow-sm p-6 transition-colors duration-200">
                      <UserMessageBubble
                        type="agent"
                        message={message}
                        onDelete={(e: any, index: number) => {
                          const indexToRemove=index;
                          setMessages((prev) => {
                            const newArr = [...prev];
                            newArr.splice(indexToRemove, 1); // remove 1 item at the index
                            return newArr;
                          });
                        }}
                        messageIndex={index}
                        messages={messages}
                        onEdit={(e: any, index: number) => {
                          messages[index / 2]['content'] = e;
                          console.log(e, index / 2, '1234567', messages);
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="flex max-w-[80%] items-start">
                  <div className="flex-shrink-0 mr-2">
                    <div className="w-7 h-7 rounded-full bg-black dark:bg-white dark:text-black text-white flex items-center justify-center text-xs font-bold">
                      A
                    </div>
                  </div>
                  <div className="bg-white dark:bg-[#1E1E1E] rounded-lg px-3 py-2 shadow-sm border border-gray-200">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      ></div>
                      <div
                        className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0.4s' }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      <div className=" mb-10 ">
        <div
          className="p-2 w-full mx-auto rounded-xl shadow-lg  pb-10"
          style={{ width: '60%', backgroundColor: '#1A1F24' }}
        >
          {/* Selected Files Display - shows files from FileUploadModal */}
          {selectedFilesForChat.length > 0 && (
            <div className="flex gap-1 items-center py-1 flex-wrap">
              {selectedFilesForChat.map((file: File, index: number) => (
                <div
                  key={index}
                  className="flex gap-1 bg-gray-950 dark:bg-[#2E2E2E] p-3 rounded-2xl w-auto max-w-[200px]"
                >
                  <div className="col-span-1 flex items-center justify-center relative">
                    {getFileIcon(file.name)}
                  </div>
                  <div className="col-span-5 min-w-0 relative">
                    <p
                      className="text-sm font-medium text-white truncate"
                      title={file.name}
                    >
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <button
                      onClick={() => {
                        // Remove from selectedFilesForChat
                        setSelectedFilesForChat(
                          selectedFilesForChat.filter((_, i) => i !== index),
                        );
                        // Remove from selectedFilesLink
                        setSelectedFilesLink(
                          selectedFilesLink.filter((_, i) => i !== index),
                        );
                      }}
                      className="text-gray-400 hover:text-red-500 transition ml-2"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex  flex-col space-y-0.1">
            <div className="flex-1 w-full relative chat-input-container">
              <textarea
                value={input}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                  handleInputChange(e.target.value); // Optimized handler
                }}
                onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Start testing Agent..."
                className="w-full bg-transparent text-white text-xs resize-none outline-none placeholder-gray-400 min-h-[24px] chat-textarea"
                rows={1}
                style={{
                  minHeight: '20px',
                  maxHeight: '100px',
                  caretColor: '#60A5FA',
                }}
              />
            </div>
            <div
              className="flex items-center justify-center pt-1 w-full flex-1"
              style={{ boxShadow: 'inset 0 1px 0 0 rgba(107, 114, 128, 0.3)' }}
            >
              {/* Left side - Model Dropdown */}
              <div className="flex items-center space-x-2 mr-2 w-full justify-between ">
                {/* <div className="relative bg-black rounded-full"> */}
                {/* <button
                    type="button"
                    onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                    className="flex items-center space-x-1 text-white text-xs font-medium bg-transparent hover:bg-gray-800 dark:hover:bg-[#2E2E2E] rounded px-2 py-1 transition-colors"
                  >
                    <span className="text-[11px]">{selectedModel?.name?.split(' ')[0] || 'Tax'}</span>
      {/* <svg className={`w-3 h-3 transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg> */}
                {/* </button> */}
                {/* {isModelDropdownOpen && (
                    <div className="absolute bottom-full left-0 mb-2 w-48 rounded bg-gray-800 shadow-lg border border-gray-700 z-[100]">
                      <div className="py-1">
                        {Object.entries(OpenAIModels).map(([modelId, model]) => (
                          <button
                            key={modelId}
                            onClick={() => {
                              setSelectedModelId(modelId as OpenAIModelID);
                              setIsModelDropdownOpen(false);
                            }}
                            className={`block w-full text-left px-2 py-2 text-[10px] hover:bg-gray-700`}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                              <div className="text-xs text-gray-500">{model.label}</div>
                         
                              </div>
                              {modelId === selectedModelId && (
                                <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )} */}
                {/* </div> */}

                {/* Center - Tokens Display */}
                <div className="flex items-center space-x-1 text-xs mx-3">
                  <svg
                    className="w-4 h-4 text-gray-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    Tokens: {displayTokens.used.toLocaleString()}/
                    {displayTokens.max.toLocaleString()}
                  </span>
                </div>

                {/* Right side - Action Icons */}
                <div className="flex items-center space-x-1 ml-2">
                  {/* <button
                  type="button"
                  className="p-1.5 bg-black rounded-full  hover:bg-gray-700 transition-colors"
                  title="Settings"
                >
                  <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button> */}

                  <button
                    type="button"
                    onClick={handleAttachmentClick}
                    disabled={isLoading || isUploading}
                    className="p-1.5 rounded-full bg-black dark:bg-[#1E1E1E] hover:bg-gray-700 dark:hover:bg-[#2E2E2E] transition-colors disabled:opacity-50"
                    title="Upload documents for RAG"
                  >
                    <svg
                      className="w-4 h-4 text-gray-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.586-6.586a4 4 0 00-5.656-5.656l-7.07 7.07a6 6 0 008.485 8.485l6.586-6.586"
                      />
                    </svg>
                  </button>

                  {/* Microphone Icon - VoiceToText */}
                  <VoiceToText
                    onTranscript={(text) =>
                      setInput((prev) => prev + ' ' + text)
                    }
                    closeModal={() => {
                      setIsUploadModalOpen(false);
                    }}
                  />

                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className={`p-1.5 rounded-full bg- transition-colors ${
                      input.trim() && !isLoading
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-700 text-white cursor-not-allowed'
                    }`}
                    style={{ backgroundColor: '#6b7280' }}
                  >
                    {isLoading ? (
                      <div className="w-2 h-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        viewBox="0 0 24 24"
                      >
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <polyline points="15 5 22 12 15 19" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Error Messages Display */}
          {uploadError && (
            <p className="text-red-500 relative left-[44px] top-4 text-xs">
              {uploadError}
            </p>
          )}
        </div>
      </div>

      {/* FileUploadModal - Exact flow: paperclip → browse modal → file picked → consent → upload → files shown */}
      <FileUploadModal
        show={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        uploadedFiles={uploadedFilesForModal}
        setUploadedFiles={setUploadedFilesForModal}
        uploadedFilesLink={uploadedFilesLink}
        setUploadedFilesLink={setUploadedFilesLink}
        selectedFiles={selectedFilesForChat}
        setSelectedFiles={setSelectedFilesForChat}
        selectedFilesLink={selectedFilesLink}
        setSelectedFilesLink={setSelectedFilesLink}
        token={user?.idToken || ''}
      />
    </div>
  );
};

// VoiceToText Component Interfaces
interface SpeechRecognition extends EventTarget {
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

// VoiceToText Component
const VoiceToText: React.FC<{
  onTranscript?: (text: string) => void;
  closeModal: () => void;
}> = ({ onTranscript, closeModal }) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Your browser does not support Speech Recognition');
      return;
    }

    navigator.permissions
      ?.query({ name: 'microphone' as PermissionName })
      .then((status) => {
        console.log('Mic permission status:', status.state);
        if (status.state === 'denied') {
          alert(
            'Microphone access is denied. Please enable it in your browser settings.',
          );
        } else if (status.state === 'prompt') {
          // console.warn(
          //   'Mic permission not yet granted. It will prompt when recognition starts.',
          // );
        }
      })
      .catch((err) => {
        // console.warn('Permission query not supported or failed:', err);
      });

    const recognition: SpeechRecognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    (recognition as any).maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const speechResult = event.results[0][0].transcript;
      if (onTranscript) onTranscript(speechResult); // send to input
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        alert(
          'Microphone access was blocked. Please allow it in your browser settings.',
        );
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  const handleMicClick = async () => {
    closeModal();
    if (!recognitionRef.current) return;

    try {
      if (isListening) {
        recognitionRef.current.stop();
      } else {
        // Explicitly request microphone permission before starting recognition
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
          alert(
            'Microphone permission denied. Please allow access and try again.',
          );
          return;
        }

        setTranscript('');
        recognitionRef.current.start();
        setIsListening(true);
      }
    } catch (error) {
      console.error('Error starting speech recognition:', error);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleMicClick}
        className={`p-1.5 rounded-full transition-colors ${
          isListening ? 'bg-red-600' : 'bg-black hover:bg-gray-800'
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 1.5a3 3 0 00-3 3v7a3 3 0 006 0v-7a3 3 0 00-3-3zM19.5 10.5v1a7.5 7.5 0 01-15 0v-1M12 19.5v3"
          />
        </svg>
      </button>
    </div>
  );
};

export default ChatWindow;