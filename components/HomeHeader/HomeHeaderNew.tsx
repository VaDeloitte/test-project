import React, { useContext, useEffect, useState } from 'react';
import { CgMenuGridO } from 'react-icons/cg';
import { FaRobot, FaUpload, FaTools, FaTrophy } from 'react-icons/fa';
import { GiTrophy } from 'react-icons/gi';

import { useRouter } from 'next/router';

import { useCreateReducer } from '@/hooks/useCreateReducer';
import { AuthContext } from '@/utils/app/azureAD';

import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';

import { fallbackModelID, OpenAIModelID, OpenAIModels } from '@/types/openai';

import { HomeInitialState, initialState } from '@/context/home.state';

import AudioUploadModal from '../Folder/NewComp/AudioUploadComponent';
import TooltipPopUp from '../Tooltip';
import { ChatMode } from '@/types/chat-modes';

const TrophyIcon = FaTrophy as React.FC<{ size?: number }>;

const RobotIcon = FaRobot as React.FC<{ size?: number }>;

const UploadIcon = FaUpload as React.FC<{ size?: number }>;
const ToolIcon = FaTools as React.FC<{ size?: number }>;

interface home {
  onClick?: () => void;
  open?: boolean;
  // Agent Builder props
  onSave?: () => void;
  onSubmitForPublishing?: () => void;
  isSavingAgent?: boolean;
  agentSaved?: boolean;
  isPublishing?: boolean;
  agentPublished?: boolean;
  lastSavedWorkflowId?: string | null;
  messagesLength?: number;
}
const Header: React.FC<home> = ({
  onClick,
  open,
  onSave,
  onSubmitForPublishing,
  isSavingAgent,
  agentSaved = false,
  isPublishing = false,
  agentPublished = false,
  lastSavedWorkflowId = null,
  messagesLength = 0,
}) => {
  const router = useRouter();
  const authContext = useContext(AuthContext);
  const [showAudioUploadModal, setShowAudioUploadModal] = useState(false);
  const [currentTab, setCurrentTab] = useState<string | null>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [isAgentEditMode, setIsAgentEditMode] = useState<boolean>(false);
  const [isProactiveAIActive, setIsProactiveAIActive] = useState<boolean>(false);
  
  // Agent Builder state from ChatWindow
  const [chatWindowMessagesLength, setChatWindowMessagesLength] = useState<number>(0);
  const [chatWindowSaving, setChatWindowSaving] = useState<boolean>(false);
  const [chatWindowSaved, setChatWindowSaved] = useState<boolean>(false);
  const [chatWindowPublishing, setChatWindowPublishing] = useState<boolean>(false);
  const [chatWindowPublished, setChatWindowPublished] = useState<boolean>(false);
  const [chatWindowLastSavedWorkflowId, setChatWindowLastSavedWorkflowId] = useState<string | null>(null);
  
  const [enable, setEnable] = useState(sessionStorage.getItem('enableSave'));
  const size = window.innerWidth < 640 ? 20 : 22;
  const defaultModelId: OpenAIModelID =
    (process.env.DEFAULT_MODEL &&
      Object.values(OpenAIModelID).includes(
        process.env.DEFAULT_MODEL as OpenAIModelID,
      ) &&
      (process.env.DEFAULT_MODEL as OpenAIModelID)) ||
    fallbackModelID;

  const contextValue = useCreateReducer<HomeInitialState>({
    initialState,
  });

  const { dispatch } = contextValue;

  const isAdmin = authContext?.user?.isAdmin || false;

  // Handle audio upload completion - Always trigger agent suggestions
  const handleAudioUploaded = async (audioUrl: string, audioFile: File) => {
    console.log('[HomeHeader]: Audio uploaded, triggering agent suggestions...');
    console.log('[HomeHeader]: Audio URL:', audioUrl);
    console.log('[HomeHeader]: Audio File:', audioFile?.name);
    console.log('[HomeHeader]: authContext exists?', !!authContext);
    console.log('[HomeHeader]: authContext.user exists?', !!authContext?.user);
    console.log('[HomeHeader]: Token available?', !!authContext?.user?.idToken);
    console.log('[HomeHeader]: Token value (first 20 chars):', authContext?.user?.idToken?.substring(0, 20));
    
    // Dispatch event for AgentFooter to handle agent suggestions AND add file to uploadedFiles
    window.dispatchEvent(new CustomEvent('audioUploadedForSuggestions', { 
      detail: { 
        audioUrl,
        audioFile,  // Include the File object so it can be displayed in uploaded files
        token: authContext?.user?.idToken
      } 
    }));
  };

  // Check if Proactive AI mode is active based on URL
  useEffect(() => {
    const checkProactiveAIMode = () => {
      const mode = router.query.mode as string;
      setIsProactiveAIActive(mode === ChatMode.PROACTIVE_AI);
    };
    
    checkProactiveAIMode();
  }, [router.query.mode]);

  // Handle Proactive AI button click - Open file upload modal
  const handleProactiveAIClick = () => {
    sessionStorage.setItem('currentTab','chats');
    sessionStorage.setItem("dashboard","false");
    // Dispatch event to open file upload modal in AgentFooter

    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('openFileUploadModal'));
    }, 200);
    console.log('[HomeHeader]: Dispatched openFileUploadModal event');
  };

  // Listen for ChatWindow state changes (Agent Builder)
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleChatWindowStateChange = (event: any) => {
      const { type, count, saving, success, agentSaved, publishing, agentPublished, lastSavedWorkflowId } = event.detail;
      
      console.log('🔔 Header: ChatWindow state change:', event.detail);
      
      switch (type) {
        case 'messagesUpdate':
          setChatWindowMessagesLength(count || 0);
          break;
        case 'saveStart':
          setChatWindowSaving(true);
          setChatWindowSaved(false);
          break;
        case 'saveEnd':
          setChatWindowSaving(false);
          setChatWindowSaved(success || false);
          if (lastSavedWorkflowId) {
            setChatWindowLastSavedWorkflowId(lastSavedWorkflowId);
          }
          break;
        case 'saveReset':
          setChatWindowSaved(false);
          break;
        case 'publishStart':
          setChatWindowPublishing(true);
          setChatWindowPublished(false);
          break;
        case 'publishEnd':
          setChatWindowPublishing(false);
          setChatWindowPublished(success || false);
          break;
        case 'publishReset':
          setChatWindowPublished(false);
          break;
        case 'sessionReset':
          setChatWindowMessagesLength(0);
          setChatWindowSaving(false);
          setChatWindowSaved(false);
          setChatWindowPublishing(false);
          setChatWindowPublished(false);
          setChatWindowLastSavedWorkflowId(null);
          break;
      }
    };

    window.addEventListener('chatWindowStateChange', handleChatWindowStateChange);

    return () => {
      window.removeEventListener('chatWindowStateChange', handleChatWindowStateChange);
    };
  }, []);

  // Listen for agent edit mode changes
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleAgentEditModeChange = (event: any) => {
      console.log(
        '🔒 Header: Agent edit mode changed:',
        event.detail.isEditMode,
      );
      setIsAgentEditMode(event.detail.isEditMode);
    };

    window.addEventListener('agentEditModeChange', handleAgentEditModeChange);

    return () => {
      window.removeEventListener(
        'agentEditModeChange',
        handleAgentEditModeChange,
      );
    };
  }, []);

  // Listen for tab changes
  React.useEffect(() => {
    const updateTab = () => {
      setCurrentTab(sessionStorage.getItem('currentTab'));
    };

    // Initial check
    updateTab();

    // Poll for changes
    const interval = setInterval(updateTab, 200);

    return () => clearInterval(interval);
  }, []);

  // Handle Save button click - dispatch event for ChatWindow
  const handleSaveClick = () => {
    if (onSave) {
      onSave();
    } else {
      window.dispatchEvent(new CustomEvent('headerSaveClick'));
      console.log('Dispatched headerSaveClick event');
    }
  };

  // Handle Submit for Publishing button click - dispatch event for ChatWindow
  const handlePublishClick = () => {
    console.log('Header - Publish Click:', {
      lastSavedWorkflowId: lastSavedWorkflowId,
      hasWorkflowId: !!lastSavedWorkflowId,
      isPublishing: isPublishing,
    });

    if (onSubmitForPublishing) {
      onSubmitForPublishing();
    } else {
      window.dispatchEvent(new CustomEvent('headerPublishClick'));
      console.log('Dispatched headerPublishClick event');
    }
  };

  const isAgentsTab =
    currentTab === 'agents-new' || currentTab === 'agents-edit';

  const [files, setFiles] = useState<File[]>([]);
  useEffect(() => {
    setEnable(sessionStorage.getItem('enableSave'));
  }, [sessionStorage.getItem('enableSave')]);
  return (
    <>
      {/* Header Bar */}
      <div
        className="fixed top-0 left-0 right-0 z-50 w-full h-[50px] 
        bg-white dark:bg-[#1e1e1e] 
        border-b border-gray-200 dark:border-gray-700 
        md:flex block items-center"
      >
        {/* Left Section */}
        <div className="flex-shrink-0 w-64 h-full md:border-r md:border-gray-200 dark:border-gray-700 box-border">
          <div
            className="w-[300px] h-full box-border flex items-center cursor-pointer"
            onClick={() => {
              setCurrentTab('chats');
              sessionStorage.setItem('currentTab', 'chats');
              sessionStorage.setItem('dashboard', 'false');
              router.push('./');
              
            }}
          >
            {/* Deloitte Logo (Dark/Light mode) */}
            <img
              src="/assets/DarkLogo.svg"
              alt="Deloitte Logo"
              loading="eager"
              className="h-[110px] w-auto dark:block hidden mt-3"
            />
            <img
              src="/assets/LightLogo.svg"
              alt="Deloitte Logo"
              loading="eager"
              className="h-[110px] w-auto block dark:hidden mt-3"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex bg-white dark:bg-[#1e1e1e] md:border-0 border-b border-gray-200 dark:border-gray-700 ml-auto space-x-5 pr-4 items-center">
          {/* Conditionally show Agent Builder buttons when in Agents tab */}
          {isAgentsTab ? (
            <>
              {isAgentEditMode ? (
                /* Edit Mode - Show disabled message */
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 dark:bg-[#2e2e2e] rounded-full">
                    <svg
                      className="w-4 h-4 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                      Editing Agent
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Save Agent Button */}
                  <button
                    onClick={handleSaveClick}
                    disabled={
                      (enable === 'true' && chatWindowMessagesLength === 0) || 
                      (messagesLength === 0 && chatWindowMessagesLength === 0)
                    }
                    className={`px-3 py-1 text-xs rounded-full flex items-center space-x-2 transition-all duration-200 ${
                      (enable === 'true' && chatWindowMessagesLength === 0) || 
                      (messagesLength === 0 && chatWindowMessagesLength === 0)
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400 '
                        : (agentSaved || chatWindowSaved)
                        ? 'bg-green-500 text-black'
                        : 'bg-gray-900 text-gray-300 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600'
                    }`}
                  >
                    {(isSavingAgent || chatWindowSaving) ? (
                      <>
                        <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"></div>
                        <span className="font-medium">
                          Saving...
                        </span>
                      </>
                    ) : (agentSaved || chatWindowSaved) ? (
                      <>
                        <svg
                          className="w-4 h-4 "
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span className="text-black font-medium">Saved!</span>
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4 "
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                          />
                        </svg>
                        <span className="">Save</span>
                      </>
                    )}
                  </button>

                  {/* Submit for Publishing Button */}
                  <button
                    onClick={handlePublishClick}
                    disabled={
                      !(lastSavedWorkflowId || chatWindowLastSavedWorkflowId) || 
                      (isPublishing || chatWindowPublishing)
                    }
                    className={`px-3 py-1 text-xs rounded-full flex items-center space-x-2 transition-all duration-200 ${
                      (isPublishing || chatWindowPublishing)
                        ? 'bg-yellow-500 text-black cursor-not-allowed animate-pulse'
                        : (agentPublished || chatWindowPublished)
                        ? 'bg-green-500 text-black'
                        : (lastSavedWorkflowId || chatWindowLastSavedWorkflowId)
                        ? 'bg-white text-black hover:bg-gray-200 dark:bg-gray-200 dark:hover:bg-gray-100 border border-gray-300'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {(isPublishing || chatWindowPublishing) ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-black font-medium">
                          Publishing...
                        </span>
                      </>
                    ) : (agentPublished || chatWindowPublished) ? (
                      <>
                        <svg
                          className="w-4 h-4 text-black"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span className="text-black font-medium">
                          Published!
                        </span>
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        <span>Submit for publishing</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              {/* Regular header buttons (non-Agents tab) */}
              {/* Dashboard */}
              <TooltipPopUp
                position="bottom"
                title={'Dashboard'}
                id={'Dashboard'}
                label="View performance rankings and insights across employees, departments, and regions, Track progress, identify top performers, and monitor performance trends over time."
              >
                <div
                  className="flex items-center gap-1 dashboard px-2 py-1 rounded-md cursor-pointer 
              text-gray-700 dark:text-white 
              hover:bg-gray-100 dark:hover:bg-[#2e2e2e] transition-colors"
                  onClick={() => {
                    sessionStorage.setItem('currentTab', 'dashboard');
                    sessionStorage.setItem('dashboard', 'true');
                    router.push('./');
                  }}
                >
                  <TrophyIcon size={size} />
                  <span className="text-sm font-calibri">
                    Performance Dashboard
                  </span>
                </div>
              </TooltipPopUp>
            </>
          )}

          {/* Proactive AI */}
          {!isAgentsTab&&<TooltipPopUp
            position="bottom"
            title={'Upload File'}
            id={'ProactiveAI'}
            label="Click to upload documents, spreadsheets, presentations, and images. Limit: 1 file in this mode for focused AI assistance."
          >
            <div
              className="flex Proactive items-center gap-1 px-2 py-1 rounded-md cursor-pointer transition-colors text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-[#2e2e2e]"
              onClick={handleProactiveAIClick}
            >
              <RobotIcon size={size} />
              <span className="text-sm font-calibri">Proactive AI</span>
            </div>
          </TooltipPopUp>}

          {/* Audio Upload */}
          {!isAgentsTab && (
            <TooltipPopUp
              position="bottom"
              title={'Audio Upload'}
              id={'AudioUpload'}
              label="Upload audio files to customize your AI agent’s voice and improve performance. Ensure high-quality recordings for optimal results."
            >
              <div
                className="flex Audio items-center gap-1 px-2 py-1 rounded-md cursor-pointer 
              text-gray-700 dark:text-white 
              hover:bg-gray-100 dark:hover:bg-[#2e2e2e] transition-colors"
                onClick={() => {
                  setShowAudioUploadModal(true);
                  sessionStorage.setItem('currentTab', 'chats');
                  sessionStorage.setItem('dashboard', 'false');
                  router.push('./');
                }}
              >
                <UploadIcon size={size} />
                <span className="text-sm font-calibri">Audio Upload</span>
              </div>
            </TooltipPopUp>
          )}

          {/* Agent Builder */}
          {!isAgentsTab && (
            <TooltipPopUp
              position="bottom"
              title={'Agent Builder'}
              id={'AgentBuilder'}
              label="Create and customize your AI agent with easy-to-use tools. Design Agents, set responses, and personalize interactions."
            >
              <div
                className="flex Agent items-center gap-1 px-2 py-1 rounded-md cursor-pointer 
              text-gray-700 dark:text-white 
              hover:bg-gray-100 dark:hover:bg-[#2e2e2e] transition-colors"
                onClick={() => {
                  sessionStorage.setItem('currentTab', 'agents-new');
                  sessionStorage.setItem('dashboard', 'false');
                  router.push('./');
                }}
              >
                <ToolIcon size={size} />
                <span className="text-sm font-calibri">Agent Builder</span>
              </div>
            </TooltipPopUp>
          )}
          {/* Settings Icon */}
          {!isAgentsTab && isAdmin && (
            <TooltipPopUp
              position="bottom"
              title={'Settings'}
              id={'Settings'}
              label="Go to admin workflows and configuration dashboard."
            >
              <div
                className="flex items-center justify-center p-2 rounded-md cursor-pointer
      text-gray-700 dark:text-white 
      hover:bg-gray-100 dark:hover:bg-[#2e2e2e] transition-colors"
                onClick={() =>{
                  sessionStorage.setItem("currentTab",'chats');
                  sessionStorage.setItem("dashboard",'false');
                  router.push('/admin/workflows')}}
              >
                {/* Gear icon for Settings */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.527-.878 3.38.975 2.502 2.502a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.878 1.527-.975 3.38-2.502 2.502a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.527.878-3.38-.975-2.502-2.502a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.878-1.527.975-3.38 2.502-2.502.996.573 2.253.29 2.573-1.066z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
            </TooltipPopUp>
          )}
        </div>
      </div>

      {/* Audio Upload Modal */}
      {showAudioUploadModal && (
        <AudioUploadModal
          isOpen={showAudioUploadModal}
          onClose={() => setShowAudioUploadModal(false)}
          isProactiveAIMode={false}
          onAudioUploaded={handleAudioUploaded}
        />
      )}
    </>
  );
};

export default Header;
