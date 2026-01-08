'use client';

import React, { Dispatch, FormEvent, MutableRefObject, SetStateAction, useCallback, useContext, useEffect, useRef, useState } from 'react';
import ToggleButton from '../Buttons/Button';
import useVoiceToText from '../../hooks/useVoiceToText';
import { AuthContext } from '@/utils/app/azureAD';
import { AiOutlineClose } from "react-icons/ai";
import { FiFile } from "react-icons/fi";
import { BsFiletypeDocx, BsFiletypePptx, BsFiletypePdf, BsFiletypeTxt, BsFiletypeXlsx, BsFiletypePng, BsFiletypeJpg, BsFiletypeMp3, BsFiletypeMp4, BsFiletypeWav  } from "react-icons/bs";
import { BiSolidFilePdf } from "react-icons/bi";
import { HiMusicNote } from "react-icons/hi";
import { getCSRFToken } from '@/utils/app/csrf'
import HomeContext from '@/context/home.context';
import { useRouter } from 'next/router';
import { getEndpoint } from '@/utils/app/api';
import { Plugin } from '@/types/plugin';
import Workflow from '../Workflow/WorkflowNew';
import { WorkflowI } from '@/types/workflow';
import FileUploadModal from '../Folder/NewComp/FileUploadModal2';
import { v4 as uuidv5 } from 'uuid';
import { type Message } from '@/types/chat';
import TooltipPopUp from '../Tooltip';
import { OpenAIModels, OpenAIModelID } from '@/types/openai';
import { ChatMode, ChatModeConfig, getChatModeConfig } from '@/types/chat-modes';
import { ChatModeValidator } from '@/utils/chat-validation';
import { getWorkflowById } from '@/services/workflowService';
import { getFileIcon } from '../Icons/FileIcons';


type AgentTesterProps = {
  userData: any;
  datafn: (message: string) => void;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  workflowsData: WorkflowI[];
  activeWorkflow: WorkflowI | null;
  handleActivateWorkflow: any;
  handleMessageSend: any;
  isPromtPosition: boolean;
  setIsPromtPosition: (isPromtPosition: boolean) => void;
  uploadedFiles: File[];
  setUploadedFiles: (files: File[]) => void;
  uploadedFilesLink: string[];
  setUploadedFilesLink: (filesLink: string[]) => void;
  displayTokens: any;
  typedInput: string;
  setTypedInput: Dispatch<SetStateAction<string>>;
  chatMode?: ChatMode;  // NEW: Optional chat mode
  modeConfig?: ChatModeConfig;  // NEW: Optional custom config
  modelLock?: boolean; // use to lock the model selection
};

interface Props {
  stopConversationRef: MutableRefObject<boolean>;
}

const settingItem = [
  { title: "M&A Mode", subtitle: "Security & Privacy" ,label:"M_A_Mode",message:"This feature is in development. A secure operational mode designed to support mergers and acquisitions by isolating sensitive data, restricting access, and maintaining compliance throughout the transaction process.",heading:"M&A Mode"},
  { title: "Citiation", subtitle: "Show Sources",label:"Citiation",message:"Automatically generates accurate references for content produced by AI, ensuring transparency, credibility, and proper attribution of sources.",heading:"Citiation" },
  { title: "Grounding", subtitle: "Connect Tax & Legal knowledge base",label:"Grounding",message:"Grounding connects model output to verifiable sources of information. This is useful in situations where accuracy and reliability are important.",heading:"Grounding" }
];
var callPromptApi: boolean = false;

export default function AgentTester(
  {
    setIsLoading,
    activeWorkflow,
    handleMessageSend,
    handleActivateWorkflow,
    workflowsData,
    isPromtPosition,
    setIsPromtPosition,
    userData,
    uploadedFiles,
    setUploadedFiles,
    uploadedFilesLink,
    setUploadedFilesLink,
    displayTokens,
    typedInput,
    setTypedInput,
    chatMode,
    modeConfig,
    modelLock,
  }: AgentTesterProps
) {
  // Derive configuration for the current mode
  const config = modeConfig || getChatModeConfig(chatMode || ChatMode.NORMAL);
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [viewSubItem, setViewSubItem] = useState(false);
  const authContext = useContext(AuthContext);
  const validateAndRefreshToken = authContext?.validateAndRefreshToken;
  const stopConversationRef = useRef(false);
  const {
    state: {
      selectedConversation,
      conversations,
      messages,
      selectedModel,
      apiKey,
      pluginKeys,
      serverSideApiKeyIsSet,
      messageIsStreaming,
      modelError,
      loading,
      prompts,
      defaultModelId,
    },
    handleUpdateConversation,
    dispatch: homeDispatch,
  } = useContext(HomeContext);
  const router = useRouter();
  const {id}=router.query;
  const abortControllerRef = useRef(new AbortController());
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const { transcript, isListening, startListening, stopListening } = useVoiceToText();
  // const [isPromtPosition, setIsPromtPosition] = useState(false);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<WorkflowI[]>([]);
  const [activeTooltipIndex, setActiveTooltipIndex] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const uploadModalRef = useRef<HTMLDivElement>(null);

  const [showComponent, setShowComponent] = useState(false);
  const [activeTab, setActiveTab] = useState("Upload");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isProactiveAIUpload, setIsProactiveAIUpload] = useState(false); // Track if opened from Proactive AI button

  // NEW: Agent suggestion state for audio/file uploads
  const [suggestedAgents, setSuggestedAgents] = useState<WorkflowI[]>([]);
  const [predefinedWorkflows, setPredefinedWorkflows] = useState<WorkflowI[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [audioSuggestionError, setAudioSuggestionError] = useState<string | null>(null);
  const [suggestionSource, setSuggestionSource] = useState<'audio' | 'file' | null>(null); // Track source of suggestions

  // ✅ NEW: Add toggle states for settings
  const [citationEnabled, setCitationEnabled] = useState(false);
  const [groundingEnabled, setGroundingEnabled] = useState(false);

  // ✅ NEW: Load citation settings from localStorage for freestyle mode
  useEffect(() => {
    const savedCitation = localStorage.getItem('freestyle_citation_enabled');
    const savedGrounding = localStorage.getItem('freestyle_grounding_enabled');
    
    if (savedCitation !== null) {
      setCitationEnabled(savedCitation === 'true');
    }
    if (savedGrounding !== null) {
      setGroundingEnabled(savedGrounding === 'true');
    }
  }, []);

  // ✅ NEW: Sync toggle states with activeWorkflow when it changes
  useEffect(() => {
    if (activeWorkflow) {
      setCitationEnabled(activeWorkflow.citation || false);
      setGroundingEnabled(activeWorkflow.grounding || false);
      console.log('[AgentFooter]: Synced settings from workflow:', {
        citation: activeWorkflow.citation,
        grounding: activeWorkflow.grounding
      });
    }
  }, [activeWorkflow]);

  // ✅ Set GPT-5 as default model on mount if no model is selected
  useEffect(() => {
    if (!selectedModel) {
      const gpt5Model = OpenAIModels[OpenAIModelID.GPT_5];
      if (gpt5Model) {
        console.log('[AgentFooter]: Setting default model to GPT-5');
        homeDispatch({ field: 'selectedModel', value: gpt5Model });
      }
    }
  }, [selectedModel, homeDispatch]);

 const models = OpenAIModels;

  // NEW: Listen for Proactive AI button click to open file upload modal
  useEffect(() => {
    const handleOpenModal = () => {
      console.log('[AgentFooter]: Proactive AI clicked, opening file upload modal with 1-file restriction...');
      setIsProactiveAIUpload(true); // Mark as Proactive AI upload
      setShowUploadModal(true);
    };

    window.addEventListener('openFileUploadModal', handleOpenModal);

    return () => {
      window.removeEventListener('openFileUploadModal', handleOpenModal);
    };
  }, []);

  // useEffect(() => {
  //   if (messages.length === 0) {
  //     if (activeWorkflow) {
  //       handleSubmitNew(activeWorkflow.title)
  //     }
  //   }
  // }, [activeWorkflow]);

  /**
   * NEW: Audio Suggestion Effect (Always Active)
   * 
   * Listens for audio upload events from the Audio Upload button in HomeHeader.
   * When user uploads audio:
   * 1. HomeHeader uploads file to Azure Blob
   * 2. HomeHeader dispatches 'audioUploadedForSuggestions' event with blob URL
   * 3. This effect catches the event and triggers agent suggestions
   * 
   * Flow:
   * 1. Listen for audio upload event
   * 2. Call /api/suggest-agents-audio with blob URL
   * 3. Receive transcription + top 5 agent suggestions
   * 4. Display suggestions in dropdown
   * 
   * Note: Works regardless of Proactive AI mode
   */
  useEffect(() => {
    const handleAudioUpload = async (event: any) => {
      const audioUrl = event.detail?.audioUrl;
      const audioFile = event.detail?.audioFile;
      const eventToken = event.detail?.token;
      
      console.log('[AgentFooter AUDIO]: 🔍 Event received!');
      console.log('[AgentFooter AUDIO]: 🔍 Event detail keys:', Object.keys(event.detail || {}));
      console.log('[AgentFooter AUDIO]: 🔍 eventToken type:', typeof eventToken);
      console.log('[AgentFooter AUDIO]: 🔍 eventToken value (first 20):', eventToken?.substring(0, 20));
      console.log('[AgentFooter AUDIO]: 🔍 eventToken exists?', !!eventToken);
      
      if (!audioUrl) {
        console.error('[AgentFooter]: No audio URL in event');
        return;
      }

      console.log('[AgentFooter]: Audio uploaded, fetching agent suggestions...');
      console.log('[AgentFooter]: Audio URL:', audioUrl);
      
      // ✅ Add audio file to uploadedFiles array so it displays with an icon
      if (audioFile && audioFile instanceof File) {

        const frameAudioFileObject = audioUrl

        console.log("frameAudioFileObject", frameAudioFileObject)

        console.log('[AgentFooter]: Adding audio file to uploaded files:', audioFile.name);
        setUploadedFiles([...uploadedFiles, audioFile]);
        setUploadedFilesLink([...uploadedFilesLink, audioUrl]);
      }
      
      setIsLoadingSuggestions(true);
      setAudioSuggestionError(null);
      setSuggestionSource('audio'); // Set source to audio
      setShowDropdown(true); // Show dropdown immediately with loading state

      try {
        const csrfToken = await getCSRFToken();
        // ✅ FIXED: Extract token from event first, then fallback to context sources
        const token = eventToken || authContext?.user?.idToken || userData?.idToken;
        const refreshedToken = validateAndRefreshToken && token
          ? await validateAndRefreshToken(token)
          : token;

        console.log('[AgentFooter AUDIO]: Token source - event:', !!eventToken, 'authContext:', !!authContext?.user?.idToken, 'userData:', !!userData?.idToken, 'final token:', !!token, 'refreshed:', !!refreshedToken);

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshedToken || ''}`,
        };

        if (csrfToken) {
          headers['X-XSRF-Token'] = csrfToken; // Match the header name expected by auth middleware
        }

        const response = await fetch('/api/suggest-agents-audio', {
          method: 'POST',
          headers,
          credentials: 'include', // Include cookies for authentication
          body: JSON.stringify({
            blob_url: audioUrl.url,
            top_k: 3,
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(error.error || 'Failed to fetch agent suggestions');
        }

        const data = await response.json();
        
        console.log('[AgentFooter]: Received agent suggestions:', data.agents?.length || 0);
        console.log('[AgentFooter]: Transcription:', data.transcription?.substring(0, 100) + '...');
        console.log('[AgentFooter]: From cache:', data.transcription_from_cache);
        console.log('[AgentFooter]: Predefined workflow IDs:', data.predefined_workflows);

        // ✅ NEW: Fetch predefined workflows from existing workflowsData
        const predefinedWorkflowIds = data.predefined_workflows || [];
        const fetchedPredefinedWorkflows: WorkflowI[] = [];
        
        if (predefinedWorkflowIds.length > 0 && workflowsData && Array.isArray(workflowsData)) {
          console.log('[AgentFooter AUDIO]: Matching', predefinedWorkflowIds.length, 'predefined workflows:', predefinedWorkflowIds);
          
          // Simply match workflows from existing workflowsData - no API call needed!
          predefinedWorkflowIds.forEach((workflowId: string) => {
            const matchedWorkflow = workflowsData.find((w) => String(w._id).trim() === String(workflowId).trim());
            if (matchedWorkflow) {
              fetchedPredefinedWorkflows.push(matchedWorkflow);
              console.log('[AgentFooter AUDIO]: Matched:', matchedWorkflow.title);
            } else {
              // console.warn('[AgentFooter AUDIO]: Workflow not found in workflowsData:', workflowId);
            }
          });
          
          console.log('[AgentFooter AUDIO]: Total matched:', fetchedPredefinedWorkflows.length, 'workflows');
        }

        // Set predefined workflows
        setPredefinedWorkflows(fetchedPredefinedWorkflows);

        // Guard check: Ensure workflowsData is loaded before matching
        if (!workflowsData || !Array.isArray(workflowsData)) {
          // console.warn('[AgentFooter AUDIO]: workflowsData not loaded yet, skipping agent matching');
          setAudioSuggestionError('Please wait for agents to load, then try again.');
          return;
        }

        // Robustly match agent IDs (string, trim)
        const agentIds = data.agents.map((a: any) => String(a.agent_id).trim());
        const workflowIds = workflowsData.map((w) => String(w._id).trim());
        const matchedAgents = workflowsData.filter((workflow) =>
          agentIds.includes(String(workflow._id).trim())
        );

        // Debug: Log agent IDs from API and workflowsData
        console.log('[AgentFooter][DEBUG]: API agent_ids:', agentIds);
        console.log('[AgentFooter][DEBUG]: workflowsData _ids:', workflowIds);

        // Warn if no matches found
        if (matchedAgents.length === 0) {
          // console.warn('[AgentFooter][DEBUG]: No agent suggestions matched workflowsData.');
          // Print detailed mismatch info
          agentIds.forEach((id: string) => {
            if (!workflowIds.includes(id)) {
              // console.warn(`[AgentFooter][DEBUG]: agent_id from API not found in workflowsData:`, id);
            }
          });
        }

        // Sort by similarity score from API response (score or similarity_score)
        const sortedAgents = matchedAgents.sort((a, b) => {
          const scoreA = data.agents.find((ag: any) => String(ag.agent_id).trim() === String(a._id).trim())?.similarity_score || data.agents.find((ag: any) => String(ag.agent_id).trim() === String(a._id).trim())?.score || 0;
          const scoreB = data.agents.find((ag: any) => String(ag.agent_id).trim() === String(b._id).trim())?.similarity_score || data.agents.find((ag: any) => String(ag.agent_id).trim() === String(b._id).trim())?.score || 0;
          return scoreB - scoreA;
        });

        setSuggestedAgents(sortedAgents);
        setShowDropdown(sortedAgents.length > 0);

        console.log('[AgentFooter]: Successfully set', sortedAgents.length, 'suggested agents');

      } catch (error) {
        console.error('[AgentFooter]: Error fetching audio agent suggestions:', error);
        setAudioSuggestionError(error instanceof Error ? error.message : 'Unknown error');
        setSuggestedAgents([]);
        setShowDropdown(true); // Keep dropdown open to show error
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    // Listen for audio upload events from HomeHeader (always active)
    window.addEventListener('audioUploadedForSuggestions', handleAudioUpload);

    return () => {
      window.removeEventListener('audioUploadedForSuggestions', handleAudioUpload);
    };
  }, [workflowsData, validateAndRefreshToken, userData, authContext]);


  /**
   * NEW: File Suggestion Effect (Always Active)
   * 
   * Listens for file upload events from FileUploadModal (Proactive AI button).
   * When user uploads a file (PDF, DOCX, XLSX, TXT, PPTX):
   * 1. FileUploadModal uploads file to Azure Blob
   * 2. FileUploadModal dispatches 'fileUploadedForSuggestions' event with blob URL and file type
   * 3. This effect catches the event and triggers agent suggestions
   * 
   * Flow:
   * 1. Listen for file upload event
   * 2. Call /api/suggest-agents-file with blob URL and file type
   * 3. Receive extracted text + top 5 agent suggestions
   * 4. Display suggestions in dropdown
   * 
   * Note: Works for PDF, DOCX, XLSX, TXT, PPTX files
   */
  useEffect(() => {
    const handleFileUpload = async (event: any) => {
      const fileUrl = event.detail?.fileUrl;
      const fileType = event.detail?.fileType;
      const file = event.detail?.file;
      const eventToken = event.detail?.token;
      
      console.log('[AgentFooter FILE]: 🔍 Event received!');
      console.log('[AgentFooter FILE]: 🔍 Event detail keys:', Object.keys(event.detail || {}));
      console.log('[AgentFooter FILE]: 🔍 eventToken type:', typeof eventToken);
      console.log('[AgentFooter FILE]: 🔍 eventToken value (first 20):', eventToken?.substring(0, 20));
      console.log('[AgentFooter FILE]: 🔍 eventToken exists?', !!eventToken);
      
      if (!fileUrl || !fileType) {
        console.error('[AgentFooter]: No file URL or type in event');
        return;
      }

      console.log('[AgentFooter]: File uploaded, fetching agent suggestions...');
      console.log('[AgentFooter]: File URL:', fileUrl);
      console.log('[AgentFooter]: File Type:', fileType);
      
      // Note: File is already added to uploadedFiles by FileUploadModal
      // No need to add it again here
      
      setIsLoadingSuggestions(true);
      setAudioSuggestionError(null);
      setSuggestionSource('file'); // Set source to file
      setShowDropdown(true); // Show dropdown immediately with loading state

      try {
        const csrfToken = await getCSRFToken();
        // ✅ FIXED: Extract token from event first, then fallback to context sources
        const token = eventToken || authContext?.user?.idToken || userData?.idToken;
        const refreshedToken = validateAndRefreshToken && token
          ? await validateAndRefreshToken(token)
          : token;

        console.log('[AgentFooter FILE]: Token source - event:', !!eventToken, 'authContext:', !!authContext?.user?.idToken, 'userData:', !!userData?.idToken, 'final token:', !!token, 'refreshed:', !!refreshedToken);

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshedToken || ''}`,
        };

        if (csrfToken) {
          headers['X-XSRF-Token'] = csrfToken; // Match the header name expected by auth middleware
        }

        const response = await fetch('/api/suggest-agents-file', {
          method: 'POST',
          headers,
          credentials: 'include', // Include cookies for authentication
          body: JSON.stringify({
            blob_url: fileUrl,
            file_type: fileType,
            top_k: 3,
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(error.error || 'Failed to fetch agent suggestions');
        }

        const data = await response.json();
        
        // ✅ CRITICAL: Check if backend returned an error (e.g., vision service unavailable)
        if (data.success === false || data.error) {
          // console.warn('[AgentFooter FILE]: Backend returned error:', data.error);
          
          // Special handling for image vision service unavailable
          if (data.service_status === 'unavailable') {
            throw new Error('Image analysis is temporarily unavailable. Please try again later or upload a text-based file (PDF, DOCX, TXT).');
          }
          
          throw new Error(data.error || 'Failed to process file');
        }
        
        const predefinedWorkflowIds = data.predefined_workflows || [];
        const fetchedPredefinedWorkflows: WorkflowI[] = [];
        
        if (predefinedWorkflowIds.length > 0 && workflowsData && Array.isArray(workflowsData)) {
          console.log('[AgentFooter FILE]: Matching', predefinedWorkflowIds.length, 'predefined workflows:', predefinedWorkflowIds);
          
          // Simply match workflows from existing workflowsData - no API call needed!
          predefinedWorkflowIds.forEach((workflowId: string) => {
            const matchedWorkflow = workflowsData.find((w) => String(w._id).trim() === String(workflowId).trim());
            if (matchedWorkflow) {
              fetchedPredefinedWorkflows.push(matchedWorkflow);
              console.log('[AgentFooter FILE]: Matched:', matchedWorkflow.title);
            } else {
              // console.warn('[AgentFooter FILE]: Workflow not found in workflowsData:', workflowId);
            }
          });
          
          console.log('[AgentFooter FILE]: Total matched:', fetchedPredefinedWorkflows.length, 'workflows');
        }

        // Set predefined workflows
        setPredefinedWorkflows(fetchedPredefinedWorkflows);

        // Guard check: Ensure workflowsData is loaded before matching
        if (!workflowsData || !Array.isArray(workflowsData)) {
          // console.warn('[AgentFooter FILE]: workflowsData not loaded yet, skipping agent matching');
          setAudioSuggestionError('Please wait for agents to load, then try again.');
          return;
        }

        // Robustly match agent IDs (string, trim)
        const agentIds = data.agents.map((a: any) => String(a.agent_id).trim());
        const workflowIds = workflowsData.map((w) => String(w._id).trim());
        const matchedAgents = workflowsData.filter((workflow) =>
          agentIds.includes(String(workflow._id).trim())
        );

        // Debug: Log agent IDs from API and workflowsData
        console.log('[AgentFooter][DEBUG]: API agent_ids:', agentIds);
        console.log('[AgentFooter][DEBUG]: workflowsData _ids:', workflowIds);

        // Warn if no matches found
        if (matchedAgents.length === 0) {
          // console.warn('[AgentFooter][DEBUG]: No agent suggestions matched workflowsData.');
          // Print detailed mismatch info
          agentIds.forEach((id: string) => {
            if (!workflowIds.includes(id)) {
              // console.warn(`[AgentFooter][DEBUG]: agent_id from API not found in workflowsData:`, id);
            }
          });
        }

        // Sort by similarity score from API response (score or similarity_score)
        const sortedAgents = matchedAgents.sort((a, b) => {
          const scoreA = data.agents.find((ag: any) => String(ag.agent_id).trim() === String(a._id).trim())?.similarity_score || data.agents.find((ag: any) => String(ag.agent_id).trim() === String(a._id).trim())?.score || 0;
          const scoreB = data.agents.find((ag: any) => String(ag.agent_id).trim() === String(b._id).trim())?.similarity_score || data.agents.find((ag: any) => String(ag.agent_id).trim() === String(b._id).trim())?.score || 0;
          return scoreB - scoreA;
        });

        setSuggestedAgents(sortedAgents);
        setShowDropdown(sortedAgents.length > 0);

        console.log('[AgentFooter]: Successfully set', sortedAgents.length, 'suggested agents');

      } catch (error) {
        console.error('[AgentFooter]: Error fetching file agent suggestions:', error);
        setAudioSuggestionError(error instanceof Error ? error.message : 'Unknown error');
        setSuggestedAgents([]);
        setShowDropdown(true); // Keep dropdown open to show error
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    // Listen for file upload events from FileUploadModal (always active)
    window.addEventListener('fileUploadedForSuggestions', handleFileUpload);

    return () => {
      window.removeEventListener('fileUploadedForSuggestions', handleFileUpload);
    };
  }, [workflowsData, validateAndRefreshToken, userData, authContext]);


  // ✅ NEW: Handle toggle changes and update workflow in database OR localStorage for freestyle
  const handleToggleChange = async (settingName: string, newValue: boolean) => {
    console.log(`[AgentFooter]: ${settingName} toggled to ${newValue}`);
    
    // Update local state immediately for responsive UI
    if (settingName === 'citation') {
      setCitationEnabled(newValue);
    } else if (settingName === 'grounding') {
      setGroundingEnabled(newValue);
    }
    
    // Update workflow in database if active workflow exists
    if (activeWorkflow?._id) {
      try {
        const csrfToken = await getCSRFToken();
        const refreshedToken = validateAndRefreshToken 
          ? await validateAndRefreshToken(userData?.idToken)
          : userData?.idToken;

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshedToken}`,
        };

        if (csrfToken) {
          headers['X-XSRF-Token'] = csrfToken;
        }

        const response = await fetch('/api/workflows/update', {
          method: 'PATCH',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            workflowId: activeWorkflow._id,
            updates: {
              [settingName]: newValue
            }
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(error.error || 'Failed to update workflow settings');
        }

        console.log(`[AgentFooter]: ✅ Workflow ${settingName} updated in database`);
        
        // ✅ Update the activeWorkflow object locally to avoid needing refresh
        if (activeWorkflow) {
          (activeWorkflow as any)[settingName] = newValue;
          console.log('[AgentFooter]: ✅ Local activeWorkflow updated - changes take effect immediately');
        }
        
        // ✅ Dispatch event to notify ChatWindow of citation change
        window.dispatchEvent(new CustomEvent('citationSettingChanged', { 
          detail: { 
            citation: newValue,
            workflowId: activeWorkflow._id,
            isFreestyle: false
          } 
        }));
        
      } catch (error) {
        console.error(`[AgentFooter]: ❌ Error updating workflow ${settingName}:`, error);
        
        // Revert local state on error
        if (settingName === 'citation') {
          setCitationEnabled(!newValue);
        } else if (settingName === 'grounding') {
          setGroundingEnabled(!newValue);
        }
        
        alert(`Failed to update ${settingName} setting. Please try again.`);
      }
    } else {
      // ✅ FREESTYLE MODE: Save to localStorage
      console.log(`[AgentFooter]: 📝 Freestyle mode - saving ${settingName}=${newValue} to localStorage`);
      localStorage.setItem(`freestyle_${settingName}_enabled`, String(newValue));
      
      // ✅ Dispatch event to notify ChatWindow
      console.log(`[AgentFooter]: 📡 Dispatching citationSettingChanged event:`, {
        settingName,
        newValue,
        citation: newValue,
        isFreestyle: true
      });
      window.dispatchEvent(new CustomEvent('citationSettingChanged', { 
        detail: { 
          citation: newValue,
          isFreestyle: true
        } 
      }));
      
      console.log(`[AgentFooter]: ✅ Freestyle ${settingName} saved to localStorage and event dispatched`);
    }
  };

  const handleMicClick = () => {
    if (isListening) stopListening();
    else startListening();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // setSendMessage(true);
    // const res = await fetch('http://localhost:8080/api/chat', {
    //         method: 'POST',
    //         headers: { 'Content-Type': 'application/json' },
    //         body: JSON.stringify({ prompt: input, chatId: chatId.current }),
    //     });
  };

  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    if (messages.length === 0) {
      setSearchQuery(query);
      if (query.length > 0) {
        // Clear audio suggestions when user starts typing
        setSuggestedAgents([]);
        setAudioSuggestionError(null);
        
        setIsLoading(true); // Start loading
        setTimeout(() => { // Simulate delay for heavy computation or data fetching
          const results = filterWorkflows(query);
          setSearchResults(results);
          setShowDropdown(results.length > 0 && query.length > 0);
          setIsLoading(false); // End loading
        }, 500); // Adjust timeout for real use case
      } else {
        setTimeout(() => {
          setSearchResults([]);
          // Keep dropdown open if we have audio suggestions
          setShowDropdown(suggestedAgents.length > 0);
        }, 500);
      }
    }
  };

 const filterWorkflows = (query?: string): WorkflowI[] => {
  const lowerCaseQuery = query?.toLowerCase() || ""; 
  return workflowsData.filter((workflow: WorkflowI) => {
    const workflowTitle = workflow.title || ""; 
    const isMatch = workflowTitle.toLowerCase().includes(lowerCaseQuery);
 
    const isValidCategory =
      (workflow.subcategory !== "" && workflow.subsubcategory !== "" &&
        (workflow.category === "Service Lines" || workflow.category === "Enabling Functions")) ||
      (workflow.category === "General Use Cases" && workflow.subsubcategory === "" && workflow.subcategory !== "");
 
    return isMatch && isValidCategory;
    });
  };


  const handleSendMessage = async (e: any, callPromptApi:boolean = false) => {
    e.preventDefault();
    setIsPromtPosition(true);
    
    if (typedInput) {
      if (!selectedConversation || !selectedConversation.messages || selectedConversation.messages.length === 0) {
        console.log('[AgentFooter]: New conversation - redirecting to /chat');
        console.log('[AgentFooter]: 💾 Current selectedModel from context:', {
          id: selectedModel?.id,
          label: selectedModel?.label,
          name: selectedModel?.name
        });
        const freshConvo = { 
          message: typedInput, 
          files: uploadedFilesLink,  // ✅ Include uploaded files
          selectedModel: selectedModel // ✅ FIX: Save selected model to sessionStorage
        };
        
        const savedData = JSON.stringify(freshConvo);
        console.log('[AgentFooter]: 💾 SessionStorage data being saved:', savedData.substring(0, 200));
        sessionStorage.setItem("freshConvoKey", savedData);
        
        if (id===undefined) {
          sessionStorage.setItem("currentTab","chats");
          router.push("/chat?id=" + uuidv5());
        }
      } else {
        console.log('[AgentFooter]: Existing conversation - calling handleMessageSend');
        console.log('[AgentFooter]: 📎 Uploaded files being sent:', uploadedFilesLink);
        handleMessageSend(typedInput, undefined, true, undefined, uploadedFilesLink);
      }
    }
    setTypedInput("");
  }

  // Merge typed input + live transcript
  const displayedValue = typedInput + (isListening ? " " + transcript : "");

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const [files, setFiles] = useState<File[]>([]);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  };

  const handleBrowse = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    addFiles(selectedFiles);
  };

  const addFiles = (newFiles: File[]) => {
    // Get max files based on mode configuration
    const maxFilesToAdd = ChatModeValidator.getMaxFilesToAdd(files.length, config);
    
    if (maxFilesToAdd === 0) {
      // Show alert when limit reached
      alert(`Maximum ${config.maxFileUploads} file(s) allowed in ${config.modeLabel || 'this'} mode`);
      return;
    }
    
    // Take only what we can add
    const filesToAdd = newFiles.slice(0, maxFilesToAdd);
    const combined = [...files, ...filesToAdd];
    setFiles(combined);
    
    // Show warning if some files were rejected
    if (filesToAdd.length < newFiles.length) {
      alert(`Only ${filesToAdd.length} file(s) added. Maximum ${config.maxFileUploads} file(s) allowed in ${config.modeLabel || 'this'} mode`);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };



//   useEffect(() => {
//   function handleClickOutside(event: MouseEvent) {
//     // Close model dropdown
//     if (
//       modelDropdownRef.current &&
//       !modelDropdownRef.current.contains(event.target as Node)
//     ) {
//       setIsDropdownOpen(false);
//     }

//     // Close settings panel
//     if (
//       settingsRef.current &&
//       !settingsRef.current.contains(event.target as Node)
//     ) {
//       setViewSubItem(false);
//     }

//     // Close upload modal (optional - depends if modal is overlayed or inline)
//     if (
//       uploadModalRef.current &&
//       !uploadModalRef.current.contains(event.target as Node)
//     ) {
//       setShowUploadModal(false);
//     }
//   }

//   document.addEventListener('mousedown', handleClickOutside);
//   return () => {
//     document.removeEventListener('mousedown', handleClickOutside);
//   };
// }, []);

  // === UTILITY FUNCTIONS ===

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // const getFileIcon = (fileName: string): JSX.Element => {
  //   const extension = fileName.split('.').pop()?.toLowerCase();
    
  //   const iconMap: { [key: string]: JSX.Element } = {
  //     'docx': BsFiletypeDocx({className:"text-blue-600", size:24}) as JSX.Element,
  //     'doc': BsFiletypeDocx({className:"text-blue-600", size:24}) as JSX.Element,
  //     'pptx': BsFiletypePptx({className:"text-orange-600", size:24}) as JSX.Element,
  //     'ppt': BsFiletypePptx({className:"text-orange-600", size:24}) as JSX.Element,
  //     'pdf': BsFiletypePdf({className:"text-red-600", size:24}) as JSX.Element,
  //     'txt': BsFiletypeTxt({className:"text-gray-600", size:24}) as JSX.Element,
  //     'xlsx': BsFiletypeXlsx({className:"text-green-600", size:24}) as JSX.Element,
  //     'xls': BsFiletypeXlsx({className:"text-green-600", size:24}) as JSX.Element,
  //     'png': BsFiletypePng({className:"text-purple-600", size:24}) as JSX.Element,
  //     'jpg': BsFiletypeJpg({className:"text-blue-500", size:24}) as JSX.Element,
  //     'jpeg': BsFiletypeJpg({className:"text-blue-500", size:24}) as JSX.Element,
  //     // Audio file formats
  //     'mp3': BsFiletypeMp3({className:"text-pink-500", size:24}) as JSX.Element,
  //     'mp4': BsFiletypeMp4({className:"text-indigo-500", size:24}) as JSX.Element,
  //     'wav': BsFiletypeWav({className:"text-cyan-500", size:24}) as JSX.Element,
  //     'm4a': HiMusicNote({className:"text-purple-500", size:24}) as JSX.Element,
  //     'webm': HiMusicNote({className:"text-green-500", size:24}) as JSX.Element,
  //     'mpeg': HiMusicNote({className:"text-pink-400", size:24}) as JSX.Element,
  //     'mpga': HiMusicNote({className:"text-pink-400", size:24}) as JSX.Element,
  //   };
    
  //   return iconMap[extension || ''] || FiFile({className:"text-gray-500", size:24}) as JSX.Element;
  // };
  
  const removeUploadedFile = (index: number) => {
    const updatedFiles = uploadedFiles.filter((_, i) => i !== index);
    const updatedFilesLink = uploadedFilesLink.filter((_, i) => i !== index);
    setUploadedFiles(updatedFiles);
    setUploadedFilesLink(updatedFilesLink);
  };

    const dropdownRef:any = useRef(null);
    const dropdownRef1:any=useRef(null);

   useEffect(() => {
  function handleClickOutside(event: any) {
    const isOutsideDropdown =
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target);

    const isOutsideSubDropdown =
      dropdownRef1.current &&
      !dropdownRef1.current.contains(event.target);

    // CLOSE MAIN DROPDOWN ONLY IF CLICKED OUTSIDE BOTH
    if (isOutsideDropdown && isOutsideSubDropdown) {
      setIsDropdownOpen(false);
      setViewSubItem(false);
    }

    // CLOSE ONLY SUB DROPDOWN IF ITS OUTSIDE, BUT STILL INSIDE MAIN DROPDOWN
    if (isOutsideSubDropdown && !isOutsideDropdown) {
      setViewSubItem(false);
    }
  }
 function close() {
    setIsDropdownOpen(false);
    setViewSubItem(false);
  }


  window.addEventListener("mousedown", handleClickOutside);
  window.addEventListener("close-all-dropdowns", close);

  return () =>{
     window.removeEventListener("mousedown", handleClickOutside);
     window.removeEventListener("close-all-dropdowns", close);
  }
}, []);

  return (
    <div className="py-2 mb-8 mx-4 sm:mx-12 md:mx-20  lg:mx-28 bg-gradient-to-b from-transparent to-gray-100/20 " >
      <div
        className={` ${window.innerWidth<1000?'max-w-[28rem]':window.innerWidth<1200?"max-w-[40rem]":id===undefined?"max-w-[40rem]":"w-[52rem]"} h-auto mx-auto bg-[#1E1E1E] rounded-xl p-4 pt-2 pb-2 shadow-lg absolute md:right-0 md:left-0 right-4  left-4 ${
          id===undefined ? searchResults.length===0?uploadedFiles.length>0?'top-[55%]':"top-[62%]":`top-[48%]` : `bottom-[5%]`
        }`}
      >

    {uploadedFiles.length > 0 && (
      <div className='flex flex-wrap gap-1 items-center py-1'>
        {uploadedFiles.map((file, index) => (
          <div key={index} className='flex gap-1 bg-gray-950 p-3 rounded-2xl w-auto max-w-[200px]'>
            <div className="col-span-1 flex items-center justify-center relative">
              {getFileIcon(file.name)}
            </div>
            <div className="col-span-5 min-w-0 relative">
              <p className="text-sm font-medium text-white truncate" title={file.name}>
                {file.name}
              </p>
              <p className="text-xs text-gray-600">
                {formatFileSize(file.size)}
              </p>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => removeUploadedFile(index)}
                className="text-gray-400 hover:text-red-500 transition ml-2"
              >
                {AiOutlineClose({size:16}) as JSX.Element}
              </button>
            </div>
          </div>
        ))}
      </div>
    )}

    {/* Mode Indicator Banner */}
    {chatMode && chatMode !== ChatMode.NORMAL && (
      <div className="bg-blue-900/30 border border-blue-700/50 rounded-md px-3 py-2 mb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-blue-400 text-xs font-semibold">
              {config.modeLabel} Mode
            </span>
            {chatMode === ChatMode.PROACTIVE_AI && (
              <span className="text-gray-400 text-xs">
                • Max {config.maxFileUploads} file, {config.maxAudioUploads} audio
              </span>
            )}
          </div>
        </div>
      </div>
    )}

    <form onSubmit={handleSubmit} className="flex flex-col  mt-1">
      {/* Textarea */}
      <div className="flex-1 w-full ">
        <textarea
          placeholder={config.customPlaceholder || "Start writing or add a file and Genie will suggest appropriate agents"}
          className=" font-calibri w-full scrollable-input bg-transparent  flex  items-center  text-white text-[11px] resize-none outline-none placeholder-gray-400"
          value={displayedValue}
          rows={0}
          style={{height:displayedValue.length===0?"20px":"auto"}}
          onChange={(e:any) => {
            setTypedInput(e.target.value);
            handleSearchChange(e);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              handleSendMessage(e, true);
            }
          }}
          onFocus={() => {
            // Show dropdown with current suggestions (audio or search) when focused
            if (suggestedAgents.length > 0 || searchResults.length > 0) {
              setShowDropdown(true);
            }
          }}
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between space-x-2  pt-1">
        <div className="flex items-center space-x-5 text-gray-400 w-full justify-between">
          {/* Model Dropdown */}
          <div ref={dropdownRef} className="relative bg-black rounded-full">
            <button
              type="button"
              onClick={() => {
                setViewSubItem(false);
                setShowUploadModal(false)
                setIsDropdownOpen(!isDropdownOpen)}}
              className="font-calibri flex model items-center space-x-1 w-max text-white text-xs font-medium bg-transparent hover:bg-[#1e1e1e]  rounded px-2 py-1 transition-colors"
            >
              <span className="text-[11px]">{selectedModel?.label || 'GPT-5'}</span>
              {!id&&<svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>}
            </button>

            {isDropdownOpen &&!id&& (
              <div ref={modelDropdownRef} className="absolute bottom-full left-0 mb-2 w-48 rounded dark:bg-[#1e1e1e] bg-[#1e1e1e]  shadow-lg border border-[#262D30]">
                <div className="py-1">
                  {Object.values(OpenAIModels).map((model,index) => (
                        <TooltipPopUp
                        key={index}
                          id={model.label?.replace('.',"-")}
                          label={model.message}
                          position={"left"}
                          title={model.heading}
                        >
                          <button
                            key={model.label}
                            disabled={selectedModel.id != model.id && modelLock}
                            onClick={() => {
                              if (modelLock) return;
                              homeDispatch({field: "selectedModel", value: model});
                              setIsDropdownOpen(false);
                            }}
                            className="block w-full text-left px-2 py-2 text-[10px] text-gray-300 hover:bg-[#262D30] disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {model.label}
                          </button>
                        </TooltipPopUp>
                      ))}
                </div>
              </div>
            )}
          </div>

          {/* Tokens Info */}
          <div className="flex items-center space-x-1.5">
            <svg
              className="w-3.5 h-3.5"
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
            <span className="font-calibri text-[11px]">
              Tokens: {displayTokens.used.toLocaleString()}/{displayTokens.max.toLocaleString()}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 relative">
            {viewSubItem && (
              <div onMouseDown={(e) => e.stopPropagation()} ref={settingsRef} className="absolute right-12 bottom-6 mt-2 w-56 bg-white dark:bg-[#1E1E1E]  rounded-lg border border-grey-500 dark:border-gray-700  shadow-lg z-50 p-4 flex flex-col space-y-3 dark:text-gray-100 ">
                {settingItem.map((item, index) => (
                   <TooltipPopUp
                   key={index}
                          id={item.label.replace('.',"-")}
                          label={item.message}
                          position={"left"}
                          title={item.heading}
                    >
                  <div
                    key={index}
                    className={`flex justify-between items-center w-full cursor-default ${index === 0 ? "opacity-50": ""}`}
                  >
                    <div className="flex flex-col justify-start items-start w-full">
                      <div className='flex justify-between w-full'>
                      <div className="font-calibri font-semibold text-gray-900 dark:text-white text-sm">
                        {item.title}
                      </div>
                      <div className='pt-[.4px]'>
                       {index === 0 ? (
                         <ToggleButton disabled={true}/>
                       ) : index === 1 ? (
                         <ToggleButton 
                           enabled={citationEnabled}
                           onChange={(value) => handleToggleChange('citation', value)}
                         />
                       ) : (
                         <ToggleButton 
                           enabled={groundingEnabled}
                           onChange={(value) => handleToggleChange('grounding', value)}
                         />
                       )}
                       </div>
                      </div>
                      <div className="font-calibri text-gray-500 text-xs">
                        {item.subtitle}
                      </div>
                    </div>
                   
                  </div>
                  </TooltipPopUp>
                ))}
              </div>
            )}

            {/* Settings Icon */}
            <div ref={dropdownRef1}>
            <button
              onClick={() => {
                setIsDropdownOpen(false);
                setViewSubItem(!viewSubItem);
              }}
              type="button"
              className="p-1.5 bg-black settings rounded-full hover:bg-gray-800 transition-colors"
            >
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
            </div>

            {/* Paperclip Icon */}
            <button
              type="button"
              className="p-1.5 FileUpload  bg-black rounded-full hover:bg-gray-800 transition-colors"
              onClick={() => {
                setIsDropdownOpen(false);
                setViewSubItem(false);
                setShowUploadModal(true)}}
            >
              <svg
                className="w-4 h-4 text-white"
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

            {/* Microphone Icon */}
            <VoiceToText onTranscript={(text) => setTypedInput((prev) => prev + ' ' + text)} closeModal={()=>{
              setIsDropdownOpen(false);
                            setViewSubItem(false);
                            setShowUploadModal(false)
            }}/>
          </div>
        </div>
        {/* Send Button */}
        <button
          onClick={handleSendMessage}
          type="button"
          id="target-button"
          disabled={displayedValue.length===0}
          className={`p-1 rounded-full  ${displayedValue.length===0?"border-gray-400 border bg-[#80808057] text-[#808080]":"border border-gray-600 bg-gray-600  text-white hover:bg-gray-700 transition-colors"}`}
        >
          <svg
            className="w-4 h-4 md:flex hidden"
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
          <svg
            className="w-4 md:hidden flex h-4"
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
        </button>
      </div>

      {messages.length===0 && config.showWorkflowSuggestions && showDropdown && (searchResults.length > 0 || suggestedAgents.length > 0 || predefinedWorkflows.length > 0 || isLoadingSuggestions || audioSuggestionError) && (
        <div>
          <div
            className="bg-transparent z-[9] border-t border-gray-100"
            onClick={() => setShowDropdown(false)}
          ></div>
          
          {/* ✅ NEW: Predefined Workflows Section
          {predefinedWorkflows.length > 0 && (
            <>
              <div className="text-left ps-1 py-2 text-xs text-gray-100">
                <span className="flex items-center gap-2 font-semibold">
                  <svg className="w-3 h-3 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
                  </svg>
                  {suggestionSource === 'audio' ? (
                    <>🎙️ Recommended Agents for Audio</>
                  ) : suggestionSource === 'file' ? (
                    <>📋 Recommended Agents for Documents</>
                  ) : (
                    '📋 Recommended Workflows'
                  )}
                </span>
              </div>
              <ul className="list-none h-auto max-h-[180px] p-0 m-0 text-left overflow-y-auto overflow-x-hidden">
                {predefinedWorkflows.map((workflow, index) => (
                  <Workflow
                    key={workflow._id}
                    workflow={workflow}
                    index={index}
                    activeTooltipIndex={activeTooltipIndex}
                    setActiveTooltipIndex={setActiveTooltipIndex}
                    withExplore={false}
                    handleActivate={handleActivateWorkflow}
                    sideWorkflow={true}
                    type={"predefined"}
                    isWithSubsub={true}
                    tooltipCls={"top"}
                  />
                ))}
              </ul>
            </>
          )} */}
          
          {/* ✅ AI-Suggested Agents Section */}
          <div className="text-left ps-1 py-2 text-xs text-gray-100">
            {isLoadingSuggestions ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-3 w-3 text-gray-100" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {suggestionSource === 'audio' ? 'Analyzing audio...' : 'Analyzing document...'}
              </span>
            ) : audioSuggestionError ? (
              <span className="text-red-400">
                {suggestionSource === 'audio' ? 'Error analyzing audio: ' : 'Error analyzing document: '}{audioSuggestionError}
              </span>
            ) : suggestedAgents.length > 0 ? (
              // <span className="flex items-center gap-2">
                
              //   {suggestionSource === 'audio' ? (
              //     <></>
              //   ) : suggestionSource === 'file' ? (
              //     <></>
              //   ) : (
              //     ''
              //   )}
              // </span>
""
            ) : (
              ""
            )}
          </div>
          {!isLoadingSuggestions && !audioSuggestionError && (suggestedAgents.length > 0 || searchResults.length > 0) && (
             <ul className="list-none h-auto max-h-[100px] p-0 m-0 text-left overflow-y-auto overflow-x-hidden">
             {(suggestedAgents.length > 0 ? suggestedAgents : searchResults).map((workflow, index) => (
                <Workflow
                  key={workflow._id}
                  workflow={workflow}
                  index={index}
                  activeTooltipIndex={activeTooltipIndex}
                  setActiveTooltipIndex={setActiveTooltipIndex}
                  withExplore={false}
                  handleActivate={handleActivateWorkflow}
                  sideWorkflow={true}
                  type={"search"}
                  isWithSubsub={true}
                  tooltipCls={"top"}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  </div>
  <div ref={uploadModalRef}>
    <FileUploadModal
          show={showUploadModal}
          onClose={() => {
            setShowUploadModal(false);
            setIsProactiveAIUpload(false); // Reset flag on close
          } }
          uploadedFiles={uploadedFiles}
          setUploadedFiles={setUploadedFiles}
          uploadedFilesLink={uploadedFilesLink}
          setUploadedFilesLink={setUploadedFilesLink}
          token={authContext?.user?.idToken || userData?.idToken}
          maxFiles={isProactiveAIUpload ? 1 : config.maxFileUploads}
          chatMode={chatMode || ChatMode.NORMAL} selectedFiles={undefined} setSelectedFiles={undefined} selectedFilesLink={undefined} setSelectedFilesLink={undefined}    />
  </div>
    </div>

  );
}




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


const VoiceToText: React.FC<{ onTranscript?: (text: string) => void ,closeModal:()=>void}> = ({ onTranscript ,closeModal}) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Your browser does not support Speech Recognition');
      return;
    }

    navigator.permissions
      ?.query({ name: 'microphone' as PermissionName })
      .then((status) => {
        console.log('Mic permission status:', status.state);
        if (status.state === 'denied') {
          alert('Microphone access is denied. Please enable it in your browser settings.');
        } else if (status.state === 'prompt') {
          // console.warn('Mic permission not yet granted. It will prompt when recognition starts.');
        }
      })
      .catch((err) => {
        console.warn('Permission query not supported or failed:', err);
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
        alert('Microphone access was blocked. Please allow it in your browser settings.');
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
          alert('Microphone permission denied. Please allow access and try again.');
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
        className={`p-1.5 rounded-full voice transition-colors ${isListening ? 'bg-red-600' : 'bg-black hover:bg-gray-800'
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

      {/* Optional display */}
      {/* <div className="mt-4 p-2 bg-gray-100 text-black rounded">
        {transcript ? `You said: "${transcript}"` : 'Click the mic and speak...'}
      </div> */}
    </div>
  );
};



