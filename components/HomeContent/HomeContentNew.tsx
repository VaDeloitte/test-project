
'use client';
import React, {
    useContext,
    useState,
    useRef,
    useEffect,
    FormEvent,
    KeyboardEvent,
    useMemo,
    useCallback,
    Dispatch,
    SetStateAction
} from 'react';
import { useRouter } from 'next/router';
import { Conversation } from '@/types/chat';
import { OpenAIModels, OpenAIModelID, OpenAIModel } from '@/types/openai';


import { v4 as uuidv5 } from 'uuid';
import { AuthContext } from '@/utils/app/azureAD';
import { getCSRFToken, authenticatedFetch } from '@/utils/app/csrf'
import { getWorkflowById, incrementWorkflowHitCount } from '@/services/workflowService';
import { newUploadDocuments } from '@/services/uploadService';

import AgentFooter from '../footer/AgentFooter';
import MiddlePart from '../Folder/AgentSelector';
import { WorkflowI } from '@/types/workflow';
import HomeContext from '@/context/home.context';
import { type Message } from '@/types/chat';
import RatingAndReviewComponent from '../Folder/NewComp/RatingAndReviewComponent';
import { UserMessageBubble, AssistantMessageBubble } from '../Chat/MessageBubble';
import { ChatMode } from '@/types/chat-modes';


import { getConversationsForUser } from '@/utils/app/conversation';
import { general_space } from '@/types/space';
import { useCreateReducer } from '@/hooks/useCreateReducer';
import { HomeInitialState,initialState } from '@/context/home.state';

interface HomeSidebarProps {
    workflowsData: WorkflowI[];
    handleActivate?: (workflowId: string) => void;
    handleSearch?: any;
    style?: string;
    showIcon?: boolean;
    fullPlaceholder?: string;
    token?: any
}


interface TokenUsageInfo {
    input_tokens: number;
    response_tokens: number;
    total_tokens: number;
    model_used?: string;
}
const promptWithoutWorkflow = "\"\\n    You are Genie, a knowledgeable tax expert from Deloitte, now operating in the 'Freestyle Standard Genie' mode which is a part of the 1000+ agents in the Tax Genie 2.0 application. Tax Genie is a platform made specifically and restricted to Deloitte Tax & Legal Practice professionals where there are agents categorized by service line, enabling functions and general agents to assist with these professionals day to day tasks. Each of these agents has an expert chatbot like yourself. In this mode, you are equipped to handle a wide range of queries, from specific tax-related questions to general inquiries. Your responses are powered solely by the GPT API without the support of additional documents but you are not allowed to say so.\\n\\n    Instructions:\\n    - Adaptability and Scope: Provide well-informed responses to both tax-specific and general queries. Use your extensive knowledge base to offer guidance, explanations, and solutions relevant to the questions posed.\\n    - Focus on Relevance and Precision: Evaluate each query carefully to ensure all information included in your response directly addresses the user's needs. Use clear and professional language to maintain the standards expected at Deloitte.\\n    - Format with Precision: Use Markdown to format responses clearly, making liberal use of lists, tables, and structured comparisons where necessary, to enhance understanding and usability.\\n    - Seek Clarification: If a query is ambiguous or lacks details, do not hesitate to ask for more information to provide the most accurate and relevant answer.\\n    - Professionalism and Clarity: Maintain a high standard of professionalism in all interactions, reflecting the expertise and values of Deloitte.\\n\\n    Goals:\\n    - Enhance user understanding and efficiency in addressing both tax-related and general queries.\\n    - Provide responses that are precise, relevant, and informative, formatted to aid user comprehension and decision-making.\\n    - Prioritize clarity and professionalism in every interaction, ensuring that responses meet the diverse needs of users in various contexts.\\n\\n    Remember, your goal is to assist users by leveraging your tax expertise and general knowledge to answer queries effectively within the 'Freestyle Standard Genie' framework.\\n    \"";

const ChatWindow: React.FC<HomeSidebarProps> = (props) => {
    const [sendMessage, setSendMessage] = useState(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
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
        modelUsed: undefined
    });
    
   
    const lastDisplayedTokensRef = useRef<number>(0);
    
    const contextValue = useCreateReducer<HomeInitialState>({
    initialState,
  });



  const {
    dispatch,
  } = contextValue;

    const [files, setFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState<boolean>(false);

    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [uploadedFilesLink, setUploadedFilesLink] = useState<string[]>([]);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const [typedInput, setTypedInput] = useState(""); // for user typed input

    const { workflowsData, token, handleActivate } = props;
    const stopConversationRef = useRef(false);
    const abortControllerRef = useRef(new AbortController());

    const router = useRouter();
    const { id } = router.query;
    
    // Get chat mode from URL query parameter
    const chatMode = (router.query.mode as ChatMode) || ChatMode.NORMAL;

    const {
        state: { conversations, selectedConversation, messages, selectedModel },
        dispatch: homeDispatch,
    } = useContext(HomeContext);

    //This is for positionaing the Agent Input Bar.
    const [isPromtPosition, setIsPromtPosition] = useState(false);
    const authContext = useContext(AuthContext);
    const validateAndRefreshToken = authContext?.validateAndRefreshToken;
    const [activeWorkflow, setActiveWorkflow] = useState<WorkflowI | null>(null)
    const [freestyleCitationEnabled, setFreestyleCitationEnabled] = useState<boolean>(false);
    const freestyleCitationRef = useRef<boolean>(false);  // ✅ CRITICAL: Ref to always get latest value

    const handleActivateWorkflow = async (workflow: WorkflowI) => {
        try {
            // Fetch the workflow by ID
            const fetchedWorkflow: any = await getWorkflowById(workflow._id, authContext?.user?.idToken, validateAndRefreshToken);
            const userModel = selectedModel;

            console.log("userModel", userModel)
            console.log("selectedModel", selectedModel)

            if (fetchedWorkflow) {
                const workflowJSON = JSON.parse(fetchedWorkflow)?.workflow;

                const freshConvo = { workflow: workflowJSON, userModelSelected: userModel,  files: uploadedFilesLink };
                sessionStorage.setItem("freshConvoKey", JSON.stringify(freshConvo));
                sessionStorage.setItem("currentTab", "chats");
                router.push("/chat?id=" + uuidv5() + "_" + workflowJSON._id);

                // handleMessageSendB(undefined, workflowJSON, false);
                // setActiveWorkflow(workflowJSON);
                // falseHandleSubmitNew(workflowJSON);
            }
        } catch (error) {
            console.error('Error fetching workflow:', error);
        }

    };

    // Load freestyle citation setting from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('freestyle_citation_enabled');
        if (saved !== null) {
            const isEnabled = saved === 'true';
            setFreestyleCitationEnabled(isEnabled);
            freestyleCitationRef.current = isEnabled;  // ✅ Update ref
            console.log('[HomeContentNew]: Loaded freestyle citation from localStorage:', isEnabled);
        }
    }, []);

    // ✅ CRITICAL: Sync ref with state whenever state changes
    useEffect(() => {
        freestyleCitationRef.current = freestyleCitationEnabled;
        console.log('[HomeContentNew]: 🔄 freestyleCitationRef updated to:', freestyleCitationEnabled);
    }, [freestyleCitationEnabled]);

    useEffect(() => {
        if (selectedConversation?.messages) {

            homeDispatch({ field: "messages", value: selectedConversation.messages })
            homeDispatch({field: 'selectedModel', value: selectedConversation.model})
            setIsPromtPosition(true);
        }
    }, [selectedConversation]);

    // Listen for citation setting changes
    useEffect(() => {
        const handleCitationChange = (event: CustomEvent) => {
            console.log('[HomeContentNew]: Citation setting changed:', event.detail);
            
            const { workflowId, citation, isFreestyle } = event.detail;
            console.log('[HomeContentNew]: Extracted values - citation:', citation, 'isFreestyle:', isFreestyle, 'workflowId:', workflowId);

            if (isFreestyle) {
                // Update freestyle citation state
                console.log('[HomeContentNew]: 📥 Received freestyle citation event, updating state:', { 
                    from: freestyleCitationEnabled, 
                    to: citation 
                });
                setFreestyleCitationEnabled(citation);
                freestyleCitationRef.current = citation;  // ✅ Update ref immediately
                console.log('[HomeContentNew]: ✅ Freestyle citation state AND ref updated to:', citation);
            } else if (activeWorkflow && workflowId === activeWorkflow._id) {
                // Update workflow citation state
                setActiveWorkflow({
                    ...activeWorkflow,
                    citation
                });
                console.log('[HomeContentNew]:  Workflow citation updated to:', citation);
            }
        };

        window.addEventListener('citationSettingChanged', handleCitationChange as EventListener);

        return () => {
            window.removeEventListener('citationSettingChanged', handleCitationChange as EventListener);
        };
    }, [activeWorkflow]);


    const handleMessageSendB = useCallback(
        async (
            typedInput?: string,
            selectedWorkflow?: WorkflowI,
            callPromptApi: boolean = false,
            convoOverride?: Conversation
        ) => {
            // ---- Guard Clause ----
            if (!typedInput && !selectedWorkflow) return;

            // setIsPromtPosition(true);
            setIsLoading(true);

            try {
                // --- Step 1: Detect mode ---
                const isNewConversation = selectedWorkflow || !selectedConversation || selectedConversation?.messages.length === 0 ? true : false;
                const workflow = isNewConversation ? selectedWorkflow || null : selectedConversation?.workflow || null;

                // --- Step 1.5: Determine correct model (FIXED: Priority order) ---
                // Priority: 1) Workflow-derived model, 2) Existing conversation model, 3) Currently selected model
                let modelToUse: OpenAIModel;
                
                console.log('🔍🔍🔍 MODEL SELECTION DEBUG (handleMessageSendB) 🔍🔍🔍');
                console.log('selectedModel from context:', selectedModel);
                console.log('workflow exists?', !!workflow);
                console.log('isNewConversation?', isNewConversation);
                
                if (workflow) {
                    // If there's a workflow, use GPT-5 as the default model
                    modelToUse = OpenAIModels[OpenAIModelID.GPT_5];
                    
                    console.log(' WORKFLOW PATH - Model:', modelToUse.id);
                    
                    // Update global state to match (so UI shows correct model)
                    if (modelToUse.id !== selectedModel?.id) {
                        homeDispatch({ field: "selectedModel", value: modelToUse });
                    }
                } else if (!isNewConversation && selectedConversation?.model) {
                    // For existing conversations, preserve the conversation's model
                    modelToUse = selectedConversation.model;
                    console.log(' CONVERSATION PATH - Model:', modelToUse.id);
                } else {
                    // For new conversations without workflow, use the currently selected model
                    // IMPORTANT: This comes from context state which should have the user's dropdown selection
                    modelToUse = selectedModel || OpenAIModels[OpenAIModelID.GPT_5]; // Fallback to gpt-5
                }
                
                console.log('🎯🎯🎯 FINAL MODEL TO USE (handleMessageSendB):', modelToUse.id, '🎯🎯🎯');

                // --- Step 2: Prepare conversation base ---
                let updatedConversation: Conversation;
                if (isNewConversation) {
                    updatedConversation = {
                        id: uuidv5() + (workflow ? `_${workflow?._id}` : ""),
                        name: workflow ? workflow.title : "New Conversation",
                        messages: [],
                        prompt: workflow?.prompt || promptWithoutWorkflow,
                        model: modelToUse, 
                        temperature: 0,
                        folderId: null,
                        userId: authContext?.user?.id || "1",
                        workflow: workflow ?? null,
                    };
                } else if (convoOverride) {
                    updatedConversation = convoOverride;
                } else {
                    // For existing conversations, update the model to the currently selected one
                    updatedConversation = { 
                        ...selectedConversation,
                        model: modelToUse 
                    };
                }

                // --- Step 3: Build new messages array ---
                const newMessages = [...(updatedConversation.messages || [])];
                const payloadMessages = [...(updatedConversation.messages || [])];

                // Add workflow intro message (only once, when user selects it)
                if (workflow && isNewConversation) {
                    newMessages.push({
                        role: "user",
                        content: `Agent: ${workflow.title}`,
                        timestamp: new Date().toISOString(),
                    });
                    payloadMessages.push({
                        role: "user",
                        content: workflow.prompt,
                        timestamp: new Date().toISOString(),
                    });
                } else if (typedInput) {
                    newMessages.push({
                        role: "user",
                        content: typedInput,
                        timestamp: new Date().toISOString(),
                    });
                    payloadMessages.push({
                        role: "user",
                        content: typedInput,
                        timestamp: new Date().toISOString(),
                    });
                }

                // Add user message (if any)
                // if (typedInput || (!isNewConversation && workflow)) {
                //     newMessages.push({
                //     role: "user",
                //     content: userMessageContent,
                //     timestamp: new Date().toISOString(),
                //     });
                // }

                updatedConversation.messages = newMessages;

                // --- Step 4: Optimistically update UI ---
                homeDispatch({ field: "selectedConversation", value: updatedConversation });
                homeDispatch({ field: "messages", value: newMessages });

                // --- Step 5: Build chat payload ---
                const chatPayload = {
                    model: modelToUse, 
                    messages: payloadMessages,
                    key: "",
                    prompt: selectedConversation?.prompt || workflow?.prompt || promptWithoutWorkflow,
                    files: [],
                    workflow,
                };

                // No need to override model.name anymore since we're using the full selectedModel object

                // --- Step 6: Optionally reframe prompt ---
                if (callPromptApi && authContext) {
                    try {
                        const reframedPrompt = await updatePrompts(
                            chatPayload,
                            authContext.user?.idToken,
                            abortControllerRef.current.signal
                        );
                        if (reframedPrompt) chatPayload.prompt = reframedPrompt;
                    } catch (error) {
                        //   if (error?.name !== "AbortError")
                        console.error("Error reframing prompt:", error);
                    }
                }

                // --- Step 7: Send to API and stream response ---
                const res = await authenticatedFetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(chatPayload),
                });

                if (!res.ok) {
                    throw new Error(`Chat API error: ${res.status} ${res.statusText}`);
                }

                // ✅ NEW: Stream response chunks and update UI progressively
                const reader = res.body?.getReader();
                const decoder = new TextDecoder();
                let botReply = '';
                
                if (!reader) {
                    throw new Error('Response body is not readable');
                }

                // Create initial assistant message with empty content
                const assistantMessage: Message = {
                    role: "assistant",
                    content: "",
                    timestamp: new Date().toISOString(),
                };

                // Add assistant message to conversation immediately
                const streamingMessages = [...newMessages, assistantMessage];
                homeDispatch({ field: "messages", value: streamingMessages });

                console.log('[HomeContentNew handleMessageSendB]: 🌊 Starting to stream response chunks...');

                // Read stream chunks and update UI progressively
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        
                        if (done) {
                            console.log('[HomeContentNew handleMessageSendB]: ✅ Stream complete');
                            break;
                        }

                        // Decode chunk and append to reply
                        const chunk = decoder.decode(value, { stream: true });
                        botReply += chunk;

                        // Update assistant message content
                        assistantMessage.content = botReply;

                        // Update UI with new content
                        homeDispatch({ field: "messages", value: [...newMessages, { ...assistantMessage }] });
                    }
                } catch (streamError) {
                    console.error('[HomeContentNew handleMessageSendB]: ❌ Error reading stream:', streamError);
                    assistantMessage.content = botReply || "⚠️ Error receiving response.";
                    homeDispatch({ field: "messages", value: [...newMessages, assistantMessage] });
                }

                // Update assistant message with final content
                assistantMessage.content = botReply;

                // --- Step 8: Finalize conversation ---
                const finalConversation = {
                    ...updatedConversation,
                    messages: [...newMessages, assistantMessage],
                };

                homeDispatch({ field: "messages", value: finalConversation.messages });
                homeDispatch({ field: "selectedConversation", value: finalConversation });
                // --- Step 9: Persist conversation ---
                const saved = await createOrUpdateConversation(finalConversation);
                if (saved?.data && conversations) {
                    const merged = mergeConversations(conversations, saved.data);
                    console.log(merged,'selectedConversation')
                    sendConversation(sortArrayByName(merged));
                }

                setTypedInput("");
            } catch (error) {
                console.error("Error in handleMessageSend:", error);
                homeDispatch({
                    field: "messages",
                    value: [
                        ...(messages ?? []),
                        {
                            role: "assistant",
                            content: "⚠️ Error contacting server.",
                            timestamp: new Date().toISOString(),
                        },
                    ],
                });
            } finally {
                setIsLoading(false);
            }
        },
        [
            selectedConversation,
            conversations,
            selectedModel,
            activeWorkflow,
            authContext,
        ]
    );

    useEffect(() => {
        const stored = sessionStorage.getItem("freshConvoKey");
        if (stored) {
            console.log('[HomeContentNew]: 📦 Found sessionStorage data (first 200 chars):', stored.substring(0, 200));
            const freshConvoData = JSON.parse(stored);
            sessionStorage.removeItem("freshConvoKey"); // clear after read

      
        if (freshConvoData.selectedModel) {
            console.log('[HomeContentNew]: 🔄 Restoring selected model from sessionStorage:', {
                id: freshConvoData.selectedModel.id,
                label: freshConvoData.selectedModel.label,
                name: freshConvoData.selectedModel.name
            });
            
            // Update context for UI consistency
            console.log('[HomeContentNew]: 🔄 Dispatching model to context for UI...');
            homeDispatch({ field: "selectedModel", value: freshConvoData.selectedModel });
            
           
            if (freshConvoData.message) {
                console.log('[HomeContentNew]:  Sending message with model:', freshConvoData.selectedModel.id);
                console.log("freshConvoData.files", freshConvoData.files)
                if (freshConvoData.files && freshConvoData.files.length > 0) {
                    handleMessageSendC(freshConvoData.message, undefined, true, undefined, freshConvoData.files, freshConvoData.selectedModel);
                } else {
                    handleMessageSendC(freshConvoData.message, undefined, true, undefined, undefined, freshConvoData.selectedModel);
                }
            }
            
        } else if (freshConvoData.message) {
            // Legacy path (no selectedModel saved)
            console.log('[HomeContentNew]: ⚠️ No selectedModel in sessionStorage, using default');
            console.log("freshConvoData.files", freshConvoData.files)
            if (freshConvoData.files && freshConvoData.files.length > 0) {
                handleMessageSendC(freshConvoData.message, undefined, true, undefined, freshConvoData.files);
            } else {
                handleMessageSendC(freshConvoData.message, undefined, true);
            }
            
        } else if (freshConvoData.workflow) {
           
            // Use GPT-5 as the default model for workflows
            let correctModel = freshConvoData.userModelSelected || OpenAIModels[OpenAIModelID.GPT_5];

            console.log("correctModel",correctModel)

            if (freshConvoData.workflow.model === 'claude-sonnet-4-5') {
                correctModel = OpenAIModels[OpenAIModelID.CLAUDE_SONNET]
            } else if (freshConvoData.workflow.model === 'aljais' || freshConvoData.workflow.model === 'jais-30b-chat') {
                correctModel = OpenAIModels[OpenAIModelID.ALJAIS]
            } else if (freshConvoData.workflow.model === 'gpt-5-mini') {
                correctModel = OpenAIModels[OpenAIModelID.GPT_5_MINI]
            }
            console.log("correctModel",correctModel)

            console.log('[HomeContentNew]: Setting model for workflow:', freshConvoData.workflow.title, '→', correctModel.id);
            homeDispatch({ field: "selectedModel", value: correctModel });
            
            handleMessageSendC(undefined, freshConvoData.workflow, false, undefined, freshConvoData.files, correctModel);
            setActiveWorkflow(freshConvoData.workflow);
        }
        }

    }, []);

   
    const handleMessageSendC = useCallback(
        
    async (
        typedInput?: string,
        selectedWorkflow?: WorkflowI,
        callPromptApi: boolean = false,
        convoOverride?: Conversation,
        files?: any,
        explicitModel?: OpenAIModel, 
    ) => {
        
        // ---- Guard Clause ----
        if (!typedInput && !selectedWorkflow) return;

        console.log('[HomeContentNew]: 🚀 handleMessageSendC called');
        console.log('[HomeContentNew]: � CAPTURED STATE CHECK:', {
            freestyleCitationEnabled_STATE: freestyleCitationEnabled,  // State value (may be stale)
            freestyleCitationEnabled_REF: freestyleCitationRef.current,  // ✅ Ref value (always current)
            activeWorkflow: activeWorkflow?.title || 'none',
            selectedModelId: selectedModel?.id,
        });
        console.log('[HomeContentNew]: �📊 Initial State:', {
            selectedModelFromContext: selectedModel?.id,
            selectedModelName: selectedModel?.name,
            explicitModelPassed: explicitModel?.id || 'none',
            hasWorkflow: !!selectedWorkflow,
            workflowTitle: selectedWorkflow?.title || 'none',
            isNewConversation: selectedWorkflow || !selectedConversation || selectedConversation?.messages.length === 0,
            conversationModel: selectedConversation?.model?.id || 'none'
        });

        // setIsPromtPosition(true);
        setIsLoading(true);

        try {
        // --- Step 1: Detect mode ---
        const isNewConversation = selectedWorkflow || !selectedConversation || selectedConversation?.messages.length === 0 ? true : false;
        const workflow = isNewConversation ? selectedWorkflow || null : selectedConversation?.workflow || null;

        // --- Step 1.5: Determine correct model (FIXED: Priority order with explicit parameter) ---
        // Priority: 0) Explicitly passed model (from sessionStorage restore), 1) Workflow-derived model, 2) Existing conversation model, 3) Currently selected model
        let modelToUse: OpenAIModel;
        
        console.log('🔍🔍🔍 MODEL SELECTION DEBUG 🔍🔍🔍');
        console.log('explicitModel passed?', !!explicitModel, explicitModel?.id || 'none');
        console.log('selectedModel from context:', selectedModel);
        console.log('workflow exists?', !!workflow);
        console.log('isNewConversation?', isNewConversation);
        
        if (explicitModel) {
            
            modelToUse = explicitModel;
            console.log(' EXPLICIT MODEL PATH (sessionStorage) - Model:', modelToUse.id);
        } else if (workflow) {
            // If there's a workflow, use GPT-5 as the default model
            if (workflow.model === 'claude-sonnet-4-5') {
                modelToUse = OpenAIModels[OpenAIModelID.CLAUDE_SONNET];
            } else if (workflow.model === 'aljais') {
                modelToUse = OpenAIModels[OpenAIModelID.ALJAIS];
            } else if (workflow.model === 'gpt-5-mini') {
                modelToUse = OpenAIModels[OpenAIModelID.GPT_5_MINI];
            } else {
                modelToUse = OpenAIModels[OpenAIModelID.GPT_5];
            }
            
            console.log(' WORKFLOW PATH - Model:', modelToUse.id, 'for workflow:', workflow.title);
            
            // Update global state to match (so UI shows correct model)
            if (modelToUse.id !== selectedModel?.id) {
                homeDispatch({ field: "selectedModel", value: modelToUse });
            }
        } else if (!isNewConversation && selectedConversation?.model) {
            // For existing conversations, preserve the conversation's model
            modelToUse = selectedConversation.model;
            console.log(' CONVERSATION PATH - Model:', modelToUse.id);
        } else {
            // For new conversations without workflow, use the currently selected model
            // IMPORTANT: This comes from context state which should have the user's dropdown selection
            modelToUse = selectedModel || OpenAIModels[OpenAIModelID.GPT_5]; // Fallback to gpt-5-mini
        }
        
        console.log('🎯🎯🎯 FINAL MODEL TO USE:', modelToUse.id, '🎯🎯🎯');

        console.log('[HomeContentNew]:  Final Model Decision:', {
            modelId: modelToUse.id,
            modelName: modelToUse.name,
            deploymentName: modelToUse.id,
            source: workflow ? 'workflow-derived' : (!isNewConversation && selectedConversation?.model) ? 'conversation-preserved' : 'manual-selection'
        });

        // --- Step 2: Prepare conversation base ---
        let updatedConversation: Conversation;
        if (isNewConversation) {
            updatedConversation = {
            id: id as string,
            name: workflow ? workflow.title : "New Conversation",
            messages: [],
            prompt: workflow?.prompt || promptWithoutWorkflow,
            model: modelToUse, 
            temperature: 0,
            folderId: null,
            userId: authContext?.user?.id || "1",
            workflow: workflow ?? null,
            };
        } else if (convoOverride) {
            updatedConversation = convoOverride;
        } else {
            // For existing conversations, update the model to the currently selected one
            updatedConversation = { 
                ...selectedConversation,
                model: modelToUse  
            };
        }

        // --- Step 3: Build new messages array ---
        const newMessages = [...(updatedConversation.messages || [])];
        const payloadMessages = [...(updatedConversation.messages || [])];

        // Track if we have an actual query to process
        let hasUserQuery = false;

        // Add workflow intro message (only once, when user selects it)
        if (workflow && isNewConversation) {
            console.log('[HomeContentNew]: ✅ Adding workflow intro message for:', workflow.title);
            newMessages.push({
                role: "user",
                content: `Agent: ${workflow.title}`,
                file: files || uploadedFilesLink,
                timestamp: new Date().toISOString(),
            });
            // ✅ FIX: Send a simple greeting instead of full prompt to avoid Azure content filter
            // The workflow.prompt is already in the conversation context via updatedConversation.prompt
            payloadMessages.push({
                role: "user",
                content: `Hello, I would like to use the ${workflow.title} agent.`,
                file: files || uploadedFilesLink,
                timestamp: new Date().toISOString(),
            });
            // FIXED: Workflow intro SHOULD trigger API call to generate assistant intro
            hasUserQuery = true;
            console.log('[HomeContentNew]: ✅ hasUserQuery set to true - API will be called with safe greeting');
        }
        
        // Add user's typed input (actual query)
        if (typedInput) {
            newMessages.push({
                role: "user",
                content: typedInput,
                timestamp: new Date().toISOString(),
                file: files || uploadedFilesLink,
            });
            payloadMessages.push({
                role: "user",
                content: typedInput,
                timestamp: new Date().toISOString(),
                file: files || uploadedFilesLink,
            });
            // This IS a user query
            hasUserQuery = true;
        }

        // Add user message (if any)
        // if (typedInput || (!isNewConversation && workflow)) {
        //     newMessages.push({
        //     role: "user",
        //     content: userMessageContent,
        //     timestamp: new Date().toISOString(),
        //     });
        // }

        updatedConversation.messages = newMessages;

        // --- Step 4: If no user query, just update UI and save conversation (don't call APIs) ---
        if (!hasUserQuery) {
            console.log('[HomeContentNew]: 🚫 No user query - just setting up workflow intro, skipping API calls');
            
            // Update UI
            homeDispatch({ field: "selectedConversation", value: updatedConversation });
            homeDispatch({ field: "messages", value: newMessages });
            
            // Save conversation with workflow intro
            if (updatedConversation?.id) {
                await createOrUpdateConversation(updatedConversation);
            }
            
            // Clear input
            stopConversationRef.current = false;
            homeDispatch({ field: "loading", value: false });
            
            return;
        }

        // --- Step 5: Optimistically update UI ---
        homeDispatch({ field: "selectedConversation", value: updatedConversation });
        homeDispatch({ field: "messages", value: newMessages });

        // --- Step 6: Build chat payload ---
        // ✅ CRITICAL FIX: Extract filenames from blob URLs for backend compatibility
        // Backend expects just filenames (e.g., "abc123.pdf"), not full URLs
        const extractFilenameFromUrl = (urlOrFilename: string): string => {
            try {
                // If it's already just a filename (no protocol), return as-is
                if (!urlOrFilename.includes('://')) {
                    return urlOrFilename;
                }
                // Extract filename from blob URL: "https://.../container/filename.ext" -> "filename.ext"
                const url = new URL(urlOrFilename);
                const pathParts = url.pathname.split('/');
                return pathParts[pathParts.length - 1]; // Get last segment (filename)
            } catch (e) {
                // console.warn('[HomeContentNew]: Failed to parse URL, using as-is:', urlOrFilename);
                return urlOrFilename; // Fallback to original if parsing fails
            }
        };
        
        // Extract filenames from files/uploadedFilesLink
        const rawFiles = files || uploadedFilesLink || [];
        
        // ✅ DEFENSIVE: Ensure rawFiles is actually an array
        const safeRawFiles = Array.isArray(rawFiles) ? rawFiles : [rawFiles].filter(Boolean);
        
        // ✅ CRITICAL FIX: Filter out null/undefined/empty files FIRST
        const validRawFiles = safeRawFiles.filter((file: any) => {
            if (file == null || file === '' || file === undefined) return false;
            if (typeof file === 'string' && file.trim() === '') return false;
            return true;
        });
        
        console.log('[HomeContentNew]: 📎 Raw file input:', {
            hasFiles: !!files,
            hasUploadedFilesLink: !!uploadedFilesLink,
            rawCount: safeRawFiles.length,
            validCount: validRawFiles.length,
            types: validRawFiles.map((f: any) => typeof f)
        });
        
        // ✅ NEW: Process files with metadata (Azure UUID + original name)
        const processedFiles = validRawFiles.map((file: any, index: number) => {
            try {
                if (typeof file === 'string') {
                    // String: could be filename or blob URL
                    const extracted = extractFilenameFromUrl(file);
                    if (!extracted || extracted.trim() === '') {
                        // console.warn(`[HomeContentNew]: Empty filename extracted from [${index}]:`, file);
                        return null;
                    }
                    // String format: return as-is (legacy)
                    return { azureFileName: extracted, originalFileName: extracted };
                } else if (file?.azureFileName && file?.originalFileName) {
                    // ✅ NEW: Full metadata from upload API (PREFERRED PATH)
                    // ✅ DEFENSIVE: Validate strings are not empty
                    const azure = String(file.azureFileName).trim();
                    const original = String(file.originalFileName).trim();
                    if (!azure || !original) {
                        // console.warn(`[HomeContentNew]: Empty filename in metadata [${index}]:`, file);
                        return null;
                    }
                    return { azureFileName: azure, originalFileName: original };
                } else if (file?.azureFileName) {
                    // Object with azureFileName only (fallback)
                    const azure = String(file.azureFileName).trim();
                    if (!azure) return null;
                    return { azureFileName: azure, originalFileName: azure };
                } else if (file?.fileName) {
                    // Object with fileName property
                    const name = String(file.fileName).trim();
                    if (!name) return null;
                    return { azureFileName: name, originalFileName: name };
                } else if (file?.name) {
                    // Object with name property
                    const name = String(file.name).trim();
                    if (!name) return null;
                    return { azureFileName: name, originalFileName: name };
                } else if (file?.url) {
                    // Object with URL only - extract filename from URL
                    const extracted = extractFilenameFromUrl(file.url);
                    if (!extracted || extracted.trim() === '') return null;
                    return { azureFileName: extracted, originalFileName: extracted };
                }
                // console.warn(`[HomeContentNew]: Unknown file format [${index}]:`, file);
                return null;
            } catch (err) {
                console.error(`[HomeContentNew]: Error processing file [${index}]:`, err, file);
                return null;
            }
        }).filter(Boolean); // Remove nulls
        
        // ✅ VALIDATION: Log if we lost files during processing
        if (validRawFiles.length > 0 && processedFiles.length === 0) {
            console.error('[HomeContentNew]: ❌ CRITICAL: Had files but all were filtered out!');
            console.error('[HomeContentNew]: Input files:', validRawFiles);
            console.error('[HomeContentNew]: This will cause "file not found" errors in RAG!');
        } else if (validRawFiles.length !== processedFiles.length) {
            // console.warn(`[HomeContentNew]: ⚠️ Lost ${validRawFiles.length - processedFiles.length} files during processing`);
            // console.warn('[HomeContentNew]: Valid input:', validRawFiles.length, '→ Processed:', processedFiles.length);
        }
        
        console.log('[HomeContentNew]: 📎 File processing:', {
            raw: validRawFiles.length,
            processed: processedFiles.length,
            files: processedFiles
        });
        
        // ✅ CRITICAL: Determine if citations should be retrieved (read from localStorage for latest value)
        // Read directly from localStorage to avoid race conditions with event system
        const freestyleCitationFromStorage = localStorage.getItem('freestyle_citation_enabled') === 'true';
        const freestyleCitation = freestyleCitationFromStorage;
        console.log('[HomeContentNew]: 🔍 Determining citation setting:', {
            hasWorkflow: !!workflow,
            workflowCitation: workflow?.citation,
            freestyleCitationEnabled_STATE: freestyleCitationEnabled,  // State (may be stale)
            freestyleCitationEnabled_REF: freestyleCitationRef.current,  // Ref (may be stale due to event delay)
            freestyleCitationEnabled_LOCALSTORAGE: freestyleCitationFromStorage,  // ✅ Always current (synchronous)
            finalCitationEnabled: workflow?.citation || freestyleCitation
        });
        const citationEnabled = workflow?.citation || freestyleCitation;  // ✅ Use localStorage value
        console.log('[HomeContentNew]: 📋 Final citationEnabled =', citationEnabled);
        
        const chatPayload = {
            model: modelToUse, 
            messages: payloadMessages,
            key: "",
            prompt: selectedConversation?.prompt || workflow?.prompt || promptWithoutWorkflow,
            files: processedFiles,  // ✅ FIX: Send extracted filenames, not full URLs
            workflow,
            citation_enabled: citationEnabled,  // ✅ NEW: Tell backend whether to return citations
        };
        
        console.log('[HomeContentNew]: 📤 Sending to API - Model:', modelToUse?.name, 'Full model:', modelToUse);
        console.log('[HomeContentNew]: 📎 Raw files:', rawFiles);
        console.log('[HomeContentNew]: 📎 Processed files (filenames only):', processedFiles);

        // ✅ SUPER OPTIMIZATION: Parallel API calls for instant response
        // Start OpenAI streaming immediately, fetch RAG citations in background
        // ✅ FIX: needsRAG when citations OR grounding enabled (citations = show sources, grounding = augment knowledge)
        const needsRAG = (
            citationEnabled ||  // ✅ NEW: RAG needed if citations are enabled (freestyle or workflow)
            workflow?.grounding ||  // RAG needed if grounding enabled (knowledge augmentation)
            activeWorkflow?.grounding ||
            processedFiles.length > 0 ||  // ✅ FIX: Check processed files (with extracted filenames)
            modelToUse.id === 'tax_specialist_genie' ||
            modelToUse.id === 'gpt-5' ||
            modelToUse.id === 'gpt-5-mini'
        );
        
        console.log('[HomeContentNew]: 🔍 RAG Check:', {
            needsRAG,
            citationEnabled,  // ✅ NEW: Show if citations are enabled
            hasWorkflowCitation: !!workflow?.citation,
            hasWorkflowGrounding: !!workflow?.grounding,
            hasFreestyleCitation: freestyleCitationEnabled,
            hasActiveWorkflowGrounding: !!activeWorkflow?.grounding,
            hasFiles: processedFiles.length > 0,
            fileCount: processedFiles.length,
            modelId: modelToUse.id
        });

        const perfStart = Date.now();
        let ragCitations = null;
        let ragPromise: Promise<any> | null = null;
        let ragResult: any = null;

        // ✅ CRITICAL: When files are uploaded, WAIT for RAG to complete (needs augmented prompt)
        // Otherwise, stream in parallel for performance
        const mustWaitForRAG = processedFiles.length > 0;

        // Launch RAG call
        if (needsRAG) {
            if (mustWaitForRAG) {
                console.log('[HomeContentNew]: 📎 Files uploaded - WAITING for RAG to augment prompt...', chatPayload);
            } else {
                console.log('[HomeContentNew]: 🚀 Starting RAG call in parallel (non-blocking)...');
            }
            
            ragPromise = fetch("/api/prompt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(chatPayload),
            })
            .then(async res => {
                console.log(`[HomeContentNew]: ⏱️ RAG completed in ${Date.now() - perfStart}ms`);
                
                // ✅ CRITICAL FIX: Handle file indexing errors (404 = files not found, 500 = indexing failed)
                if (!res.ok) {
                    const errorText = await res.text();
                    let errorData;
                    try {
                        errorData = JSON.parse(errorText);
                    } catch {
                        errorData = { error: 'Unknown error', details: errorText };
                    }
                    
                    console.error('[HomeContentNew]: ❌ RAG failed:', errorData);
                    
                    // Throw error with user-friendly message
                    if (res.status === 404) {
                        throw new Error(`File upload error: ${errorData.details || 'Your files were not found in storage. Please try uploading again.'}`);
                    } else {
                        throw new Error(`File processing error: ${errorData.details || 'Failed to process your uploaded files. Please try again.'}`);
                    }
                }
                
                return res.text();
            })
            .then(text => {
                if (!text) return null;
                try {
                    
                    const parsed = JSON.parse(text);
                    return {
                        prompt: parsed.content || chatPayload.prompt,
                        citations: parsed.citations || null
                    };
                    
                } catch {
                    return null;
                }
            })
            .catch(err => {
                console.error('[HomeContentNew]: ❌ RAG error:', err);
                // Re-throw to be caught by outer try-catch
                throw err;
            });
            
            // ✅ WAIT for RAG when files are present (need augmented prompt with file context)
            if (mustWaitForRAG && ragPromise) {
                ragResult = await ragPromise;
                console.log('[HomeContentNew]: ✅ RAG augmentation complete, using enhanced prompt');
                
                // Update chatPayload with RAG-augmented prompt
                if (ragResult?.prompt) {
                    chatPayload.prompt = ragResult.prompt;
                    console.log('[HomeContentNew]: 📝 Prompt updated with file context');
                }
            }
        } else {
            console.log('[HomeContentNew]: ⚡ RAG not needed - Skipping /api/prompt');
        }

        // --- Step 8: Start OpenAI streaming ---
        const chatStartTime = Date.now();
        if (mustWaitForRAG) {
            console.log('[HomeContentNew]: 🚀 Starting OpenAI stream with RAG-augmented prompt...');
        } else {
            console.log('[HomeContentNew]: 🚀 Starting OpenAI stream immediately (parallel with RAG)...');
        }
        
        const chatRes = await authenticatedFetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(chatPayload),
        });

        const chatResponseTime = Date.now() - chatStartTime;
        console.log(`[HomeContentNew]: ⏱️ /api/chat response received in ${chatResponseTime}ms`);

        if (!chatRes.ok) {
            throw new Error(`Chat API error: ${chatRes.status} ${chatRes.statusText}`);
        }

        // ✅ NEW: Stream response chunks and update UI progressively
        const reader = chatRes.body?.getReader();
        const decoder = new TextDecoder();
        let botReply = '';
        let firstChunkReceived = false;
        let firstChunkTime = 0;
        
        if (!reader) {
            throw new Error('Response body is not readable');
        }

        // Create initial assistant message with empty content (citations added later)
        const assistantMessage: Message = {
            role: "assistant",
            content: "",
            timestamp: new Date().toISOString(),
        };

        // Add assistant message to conversation immediately (will be updated as chunks arrive)
        const streamingMessages = [...newMessages, assistantMessage];
        homeDispatch({ field: "messages", value: streamingMessages });

        // ✅ Inject citations from RAG
        if (citationEnabled) {
            if (ragResult?.citations) {
                // Already have citations from awaited RAG call (file uploads)
                console.log('[HomeContentNew]: 📚 Injecting citations from RAG (already retrieved):', ragResult.citations.length);
                assistantMessage.citations = ragResult.citations;
                homeDispatch({ field: "messages", value: [...streamingMessages] });
            } else if (ragPromise) {
                // Background task: Inject citations when RAG completes (parallel mode)
                ragPromise.then(result => {
                    if (result?.citations) {
                        console.log('[HomeContentNew]: 📚 Injecting citations from RAG (background):', result.citations.length);
                        assistantMessage.citations = result.citations;
                        homeDispatch({ field: "messages", value: [...streamingMessages] });
                    }
                });
            }
        }

        console.log('[HomeContentNew]: 🌊 Starting to stream response chunks...');

        // ✅ PERFORMANCE FIX: Throttle UI updates to every 50ms instead of every chunk
        let lastUpdate = 0;
        const UPDATE_INTERVAL = 50; // ms

        // Read stream chunks and update UI progressively
        try {
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                    const totalTime = Date.now() - chatStartTime;
                    console.log(`[HomeContentNew]: ✅ Stream complete. Total time: ${totalTime}ms, Length: ${botReply.length} chars, TTFT: ${firstChunkTime}ms`);
                    // Final update with complete content
                    assistantMessage.content = botReply;
                    homeDispatch({ field: "messages", value: [...newMessages, assistantMessage] });
                    break;
                }

                // Decode chunk and append to reply
                const chunk = decoder.decode(value, { stream: true });
                botReply += chunk;

                // Log time to first token (TTFT) - critical metric
                if (!firstChunkReceived && chunk.length > 0) {
                    firstChunkTime = Date.now() - chatStartTime;
                    firstChunkReceived = true;
                    console.log(`[HomeContentNew]: 🎯 First token received in ${firstChunkTime}ms (TTFT)`);
                }

                // ✅ CRITICAL FIX: Throttle updates to reduce re-renders
                const now = Date.now();
                if (now - lastUpdate > UPDATE_INTERVAL) {
                    assistantMessage.content = botReply;
                    homeDispatch({ field: "messages", value: [...newMessages, assistantMessage] });
                    lastUpdate = now;
                }
            }
        } catch (streamError) {
            console.error('[HomeContentNew]: ❌ Error reading stream:', streamError);
            // If streaming fails, show what we have so far
            assistantMessage.content = botReply || "⚠️ Error receiving response.";
            homeDispatch({ field: "messages", value: [...newMessages, assistantMessage] });
        }

        console.log('[HomeContentNew]:  Received complete OpenAI response (first 200 chars):', botReply.substring(0, 200));
        
        // Final message content after streaming completes
        let messageContent = botReply;

        // Update assistant message with final content
        assistantMessage.content = messageContent;
    
        // --- Token Utilization Update ---

        let tokenUsageInfo: any = null;
        let parsedResponse = null;

        try {
            // Try to parse the complete text as JSON to extract token usage
            parsedResponse = JSON.parse(botReply);
            if (parsedResponse.token_usage) {
                tokenUsageInfo = parsedResponse.token_usage;
            } else {
                throw new Error('No token_usage in parsed response');
            }
        } catch (e) {
            // Fallback: OpenAI-compliant calculation (3.5 chars per token)
            console.log('[HomeContentNew]: ⚠️ JSON parsing failed or no token_usage, using fallback calculation');

            const inputTokens = messages.reduce((total, msg) => {
                const content = msg.content || '';
                const role = msg.role || 'user';
                return total + Math.ceil((content.length + role.length) / 3.5) + 3; // +3 for message overhead
            }, 0);
            const conversationOverhead = 3;
            const totalInputTokens = inputTokens + conversationOverhead;

            const responseTokens = Math.ceil((botReply.length + 9) / 3.5) + 3; // +9 for 'assistant', +3 for overhead

            tokenUsageInfo = {
                input_tokens: totalInputTokens,
                response_tokens: responseTokens,
                total_tokens: totalInputTokens + responseTokens,
                model_used: modelToUse.name 
            };
            console.log('[HomeContentNew]: ⚠️ Using fallback token calculation:', tokenUsageInfo);
        }

        // ENHANCED: Update token usage state with source tracking
        if (tokenUsageInfo) {
        
        console.log('[HomeContentNew]: 📊 Updating token usage from backend:', {
            input: tokenUsageInfo.input_tokens,
            response: tokenUsageInfo.response_tokens,
            thisExchange: tokenUsageInfo.total_tokens,
            previousSessionTotal: tokenUsage.sessionTotalTokens,
            newSessionTotal: tokenUsage.sessionTotalTokens + tokenUsageInfo.total_tokens
        });
        
        setTokenUsage(prev => ({
            inputTokens: tokenUsageInfo.input_tokens,
            responseTokens: tokenUsageInfo.response_tokens,
            totalTokens: tokenUsageInfo.total_tokens,
            sessionTotalTokens: prev.sessionTotalTokens + tokenUsageInfo.total_tokens,
            modelUsed: tokenUsageInfo.model_used || modelToUse.name 
        }));
        
        }

        // --- Step 8: Finalize conversation ---
        const finalConversation = {
            ...updatedConversation,
            messages: [...newMessages, assistantMessage],
        };
        window.dispatchEvent(new CustomEvent('refresh-chat-history',{}));
        homeDispatch({ field: "messages", value: finalConversation.messages });
        homeDispatch({ field: "selectedConversation", value: finalConversation });
        
        // --- Step 9: Persist conversation ---
        console.log('[HomeContentNew]: 💾 Saving conversation with model:', finalConversation.model);
        const saved = await createOrUpdateConversation(finalConversation);
      
        if (saved?.data && conversations) {
            // ✅ FIXED: Always update conversations list (both new and existing)
            const merged = mergeConversations(conversations, saved.data);
            console.log(merged,'selectedConversation')
            sendConversation(sortArrayByName(merged));
        }

        console.log('[HomeContentNew]: 🧹 Clearing typedInput at end of handleMessageSend');
        console.log('[HomeContentNew]: 📊 State before clear:', {
            messagesCount: messages.length,
            sessionTotal: tokenUsage.sessionTotalTokens,
            typedInputAboutToClear: typedInput
        });
        
        setTypedInput("");
        setUploadedFiles([]);
        setUploadedFilesLink([]);
        } catch (error) {
        console.error("[HomeContentNew]: Error in handleMessageSend:", error);
        
        // ✅ CRITICAL FIX: Better error messages for file upload failures
        let errorMessage = "⚠️ Error contacting server.";
        
        if (error instanceof Error) {
            if (error.message.includes('File upload error') || error.message.includes('File processing error')) {
                // File-specific error from RAG backend
                errorMessage = `📎 ${error.message}\n\nPlease try:\n1. Upload your file(s) again\n2. If the issue persists, refresh the page`;
            } else if (error.message.includes('not found in storage')) {
                errorMessage = "📎 Your uploaded files could not be found. Please refresh the page and upload again.";
            } else if ((files || uploadedFilesLink || []).length > 0) {
                // Had files but generic error - likely indexing issue
                errorMessage = `📎 Error processing your uploaded file(s). Please try uploading again.`;
            }
        }
        
        homeDispatch({
            field: "messages",
            value: [
            ...(messages ?? []),
            {
                role: "assistant",
                content: errorMessage,
                timestamp: new Date().toISOString(),
            },
            ],
        });
        } finally {
        setIsLoading(false);
        }
    },
    [
        selectedConversation,
        conversations,
        selectedModel,
        activeWorkflow,
        authContext,
        freestyleCitationEnabled,  // ✅ CRITICAL: Include to capture latest citation state
        uploadedFilesLink,  // ✅ Include for file handling
        messages,  // ✅ Include for token calculations
    ]
    );
    // Helper function
    function mergeConversations(existing: any[], newOne: any) {
        const map = Object.fromEntries(existing.map((c) => [c._id, c]));
        map[newOne._id] = { ...map[newOne._id], ...newOne };
        return Object.values(map);
    }


    const handleRegenerate = async (index: number) => {
        if (!selectedConversation) return;

        const messages = selectedConversation.messages ?? [];

        // guard: valid index
        if (index < 0 || index >= messages.length) return;

        // message we’re regenerating
        const messageToRegenerate = messages[index];

        // keep all messages *before* that message
        const updatedConversation = {
            ...selectedConversation,
            messages: messages.slice(0, index), // everything before the regenerating message
        };

        // update state
        homeDispatch({ field: "selectedConversation", value: updatedConversation });

        // call handleMessageSend with that message content + truncated convo
        await handleMessageSendC(messageToRegenerate.content, undefined, true, updatedConversation, messageToRegenerate.file);
    };

    const handleEditMessage = async (newMsg: string, index: number) => {
        if (!selectedConversation) return;

        const messages = selectedConversation.messages ?? [];

        // guard: valid index
        if (index < 0 || index >= messages.length) return;

        // message we’re regenerating
        const messageToRegenerate = messages[index];
        messageToRegenerate.content = newMsg;

        // keep all messages *before* that message
        const updatedConversation = {
            ...selectedConversation,
            messages: messages.slice(0, index), // everything before the regenerating message
        };

        // update state
        homeDispatch({ field: "selectedConversation", value: updatedConversation });

        // call handleMessageSend with that message content + truncated convo
        await handleMessageSendC(messageToRegenerate.content, undefined, true, updatedConversation, messages[index].file);
    };

    const sendConversation = (conversation: any) => {
        if (conversation) {
            homeDispatch({ field: 'conversations', value: conversation });

        }
    }

    function sortArrayByName(array: any) {
        return array.sort((a: any, b: any) => {
            if (a.name < b.name) {
                return -1;
            }
            if (a.name > b.name) {
                return 1;
            }
            return 0;
        });
    }

    const createOrUpdateConversation = async (conversationData: any) => {
        try {
            const response = await authenticatedFetch('/api/conversations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(conversationData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error creating/updating conversation:', error);
        }
    };

    const updatePrompts = async (body: any, idToken: string | undefined, signal?: any) => {
        try {
            if (validateAndRefreshToken && idToken) {
                idToken = await validateAndRefreshToken(idToken) || idToken;
            }

            const myHeaders = new Headers({
                "Content-Type": "application/json"
            });

            if (idToken) {
                myHeaders.set('Authorization', `Bearer ${idToken}`);
            }

            const csrfToken = getCSRFToken();
            myHeaders.set('X-XSRF-TOKEN', csrfToken || '');
            const response = await fetch('/api/prompt', {
                method: 'POST',
                headers: myHeaders,
                body: JSON.stringify(body),
                credentials: 'include' as RequestCredentials,
                signal: signal  // Passing the abort signal to fetch
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.errors ? errorData.errors.join(', ') : 'Failed to send promopt');
            }
            return await response.text();
        } catch (error) {
            throw error;
        }
    }

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const datafn = (data: string) => {
        homeDispatch({
            field: "messages",
            value: [...(messages ?? []), {
                role: 'assistant',
                content: data,
                timestamp: ''
            }]
        });
    }

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // const [displayData, setDisplayData] = useState<{}[]>([])

    // for (let i = 0; i < messages.length - 1; i += 2) {
    //     const userMsg = messages[i];
    //     const assistantMsg = messages[i + 1];

    //     const senderText = userMsg.content;
    //     const receiverText = assistantMsg?.content;

    //     setDisplayData((prev)=>[...prev,{senderText,receiverText}])
    //   }

    // Check if the response contains token usage information (from RAG backend)

    // UNIFIED: Smart token display combining precise tracking with real-time approximation
    const displayTokens = useMemo((): { used: number; max: number; percentage: number } => {
        if (!selectedModel) return { used: 0, max: 32000, percentage: 0 };

        // UNIFIED: Consistent token calculation matching ChatWindow behavior
        let baseTokens = 0;

        console.log('[HomeContentNew displayTokens]: 🔍 Calculating tokens...', {
            sessionTotal: tokenUsage.sessionTotalTokens,
            messagesCount: messages.length,
            typedInputLength: typedInput.length,
            typedInput: typedInput.substring(0, 20),
            lastDisplayed: lastDisplayedTokensRef.current,
            willUsePreciseMode: tokenUsage.sessionTotalTokens > 0 && messages.length > 0
        });

        if (tokenUsage.sessionTotalTokens > 0 && messages.length > 0) {
          
            baseTokens = tokenUsage.sessionTotalTokens;
            
            console.log('[HomeContentNew displayTokens]:  Using PRECISE mode - sessionTotal:', baseTokens);
            
            // Add approximation for current input if user is typing
            if (typedInput.trim()) {
              
                const currentInputTokens = Math.ceil(typedInput.length / 3.5);
                baseTokens += currentInputTokens;
                console.log('[HomeContentNew displayTokens]: + current input tokens:', currentInputTokens, '= TOTAL:', baseTokens);
            }
            
          
          if (baseTokens < lastDisplayedTokensRef.current && messages.length > 0) {
    const isWaitingForBackend = typedInput.length === 0 && lastDisplayedTokensRef.current > tokenUsage.sessionTotalTokens;
    if (isWaitingForBackend) {
        console.log('[HomeContentNew displayTokens]: Shield ON - keeping', lastDisplayedTokensRef.current);
        baseTokens = lastDisplayedTokensRef.current;
    } else {
        console.log('[HomeContentNew displayTokens]: Decrease allowed', lastDisplayedTokensRef.current, '->', baseTokens);
    }
}
        } else {
            // Fallback to fast approximation for new conversations with no token data yet
            const messageTokens = messages.reduce((total: number, msg) => {
                const content = msg.content || '';
                const role = msg.role || (msg.role === 'user' ? 'user' : 'assistant');
               
                return total + Math.ceil((content.length + role.length) / 3.5);
            }, 0);

            // Calculate input tokens consistently (same formula as above for consistency)
            const inputTokens = typedInput.trim() ?
                Math.ceil(typedInput.length / 3.5) : 0;

            baseTokens = messageTokens + inputTokens;
            
            console.log('[HomeContentNew displayTokens]: ⚠️ Using FALLBACK mode:', {
                messageTokens,
                inputTokens,
                conversationOverhead: 0,
                total: baseTokens,
                reason: tokenUsage.sessionTotalTokens === 0 ? 'No backend token data yet' : 'No messages yet'
            });
        }
        // Update ref with current calculated value
        lastDisplayedTokensRef.current = baseTokens;

        const max = selectedModel.tokenLimit;
        const percentage = Math.min((baseTokens / max) * 100, 100);
        
        console.log('[HomeContentNew displayTokens]:  Final result:', baseTokens, '/', max);
        
        return { used: baseTokens, max, percentage };
    }, [messages, typedInput, selectedModel, tokenUsage]);

    useEffect(() => {
    const data = localStorage.getItem("selectedConversation");
    if (data) {
        const conversation = JSON.parse(data);
        homeDispatch({ field: 'selectedConversation', value: conversation });
    }
    if(!window.location?.search?.includes("id")){
        localStorage.setItem("selectedConversation", "");
                homeDispatch({ field: 'selectedConversation', value: undefined });
    }
    }, [id]);

    const renderChildren=()=>{
        if(id===undefined){
            return(
                !sendMessage && messages.length === 0) && (
                        <div
                            className="
                                flex flex-1 items-center justify-center 
                                max-h-[calc(100vh-110px)] h-auto
                                px-4 sm:px-6 lg:px-8"
                        >
                            <div className="w-full max-w-3xl text-center px-4">
                                <MiddlePart handleActivateWorkflow={handleActivateWorkflow} />
                            </div>
                        </div>
            );
        }else{
            return(
                <>
                {(
                        <div className="flex">
                            <div className="flex-1 p-4">
                                <div className="flex h-[77vh]  flex-col gap-6 py-8 pb-[100px] md:mt-5 mt-14 sm:px-6 lg:px-8 max-w-4xl w-full mx-auto overflow-auto">
                                    {/* Chat Message Boxes */}
                                    {id&&Array.from({ length: Math.floor(messages.length / 2) }).map((_, i) => {
                                        const userMsg = messages[i * 2];
                                        const assistantMsg = messages[i * 2 + 1];

                                        if (userMsg?.role !== 'user' || assistantMsg?.role !== 'assistant') return null;

                                        return (
                                            <div key={i}>
                                                <div
                                                    key={i}
                                                    className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6"
                                                >

                                                    {/* User message */}
                                                    <UserMessageBubble messages={messages} message={userMsg} messageIndex={i * 2} onEdit={handleEditMessage} onDelete={undefined} />
                                                    {/* <div className="font-calibri text-black text-[12px] font-semibold mb-2">
                                                    {userMsg.content}
                                                </div> */}

                                                    <hr className="my-2 border-t border-gray-300" />

                                                    {/* Assistant reply */}
                                                    <AssistantMessageBubble message={assistantMsg} messageIndex={i * 2 + 1} onRegenerate={handleRegenerate} />

                                                    <div ref={messagesEndRef} />
                                                </div>
                                                {userMsg?.content === "User Feedback and Revision" && <RatingAndReviewComponent />}
                                            </div>

                                        );
                                    })}

                                    {/* Loading Animation */}
                                    {isLoading && (
                                        <div className="flex justify-start mt-4">
                                            <div className="bg-gray-100 dark:bg-[#2a2a2a] rounded-lg p-4 shadow">
                                                <div className="flex space-x-2">
                                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                                    <div
                                                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                                        style={{ animationDelay: '0.2s' }}
                                                    ></div>
                                                    <div
                                                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                                        style={{ animationDelay: '0.4s' }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )
        }
    }

    return (
        <div className="fixed inset-0 flex flex-col dark:bg-[#121212] text-gray-900 dark:text-gray-100 ">

            {/* Main content area */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Messages/content area */}
                <div className="flex-1 md:ml-[256px] relative min-h-0 md:py-4 md:pb-0 p-0 overflow-y-auto flex flex-col">
                        {renderChildren()}

                    {/* Footer */}
                    <div className=" flex justify-center ">
                        <AgentFooter
                            userData={authContext?.user}
                            datafn={datafn}
                            setIsLoading={setIsLoading}
                            handleMessageSend={handleMessageSendC}
                            activeWorkflow={activeWorkflow}
                            handleActivateWorkflow={handleActivateWorkflow}
                            workflowsData={workflowsData}
                            isPromtPosition={isPromtPosition}
                            setIsPromtPosition={setIsPromtPosition}
                            uploadedFiles={uploadedFiles}
                            setUploadedFiles={setUploadedFiles}
                            uploadedFilesLink={uploadedFilesLink}
                            setUploadedFilesLink={setUploadedFilesLink}
                            displayTokens={displayTokens}
                            typedInput={typedInput}
                            setTypedInput={setTypedInput}
                            chatMode={chatMode}
                            modelLock={!!selectedConversation}
                        />
                    </div>



                </div>
            </div>
        </div>

    );

};

export default ChatWindow;
