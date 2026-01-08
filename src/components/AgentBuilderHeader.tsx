import React from 'react';
import { useRouter } from 'next/router';
import { CgMenuGridO } from 'react-icons/cg';

interface AgentBuilderHeaderProps {
  onSave?: () => void;
  onSubmitForPublishing?: () => void;
  isSavingAgent?: boolean;
  agentSaved?: boolean;
  isPublishing?: boolean;
  agentPublished?: boolean;
  lastSavedWorkflowId?: string | null;
  messagesLength?: number;
}

const AgentBuilderHeader: React.FC<AgentBuilderHeaderProps> = ({
  onSave,
  onSubmitForPublishing,
  isSavingAgent = false,
  agentSaved = false,
  isPublishing = false,
  agentPublished = false,
  lastSavedWorkflowId = null,
  messagesLength = 0
}) => {
  const router = useRouter();
  // Handle Save button click - dispatch event for ChatWindow
  const handleSaveClick = () => {
    if (onSave) {
      // Use prop if provided (for flexibility)
      onSave();
    } else {
      // Dispatch custom event that ChatWindow is listening for
      window.dispatchEvent(new CustomEvent('headerSaveClick'));
      console.log('Dispatched headerSaveClick event');
    }
  };

  // Handle Submit for Publishing button click - dispatch event for ChatWindow
  const handlePublishClick = () => {
    console.log('AgentBuilderHeader - Publish Click:', {
      lastSavedWorkflowId: lastSavedWorkflowId,
      hasWorkflowId: !!lastSavedWorkflowId,
      isPublishing: isPublishing
    });
    
    if (onSubmitForPublishing) {
      // Use prop if provided (for flexibility)
      onSubmitForPublishing();
    } else {
      // Dispatch custom event that ChatWindow is listening for
      window.dispatchEvent(new CustomEvent('headerPublishClick'));
      console.log('Dispatched headerPublishClick event');
    }
  };

  return (
    <>
      {/* Header Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 w-full h-[50px] bg-white border-b border-gray-200 md:flex block items-center">
       

        {/* Right Section - Save and Submit Buttons */}
        <div className="flex bg-white md:border-0 ml-auto space-x-3 pr-4 items-center">
          {/* <button className='bg-gray-900 text-gray-300 hover:bg-gray-700 rounded-full text-xs px-2 py-1' onClick={()=>{sessionStorage.setItem("currentTab","agents")}}>Cancel</button> */}
          {/* Save Agent Button */}
          <button 
            onClick={handleSaveClick}
            disabled={isSavingAgent || messagesLength === 0}
            className={`px-2 py-1 text-xs rounded-full flex items-center space-x-1 transition-all duration-200 ${
              isSavingAgent 
                ? 'bg-yellow-500 text-black cursor-not-allowed animate-pulse' 
                : agentSaved
                  ? 'bg-green-500 text-black'
                  : 'bg-gray-900 dark:bg-[#2E2E2E] text-gray-300 hover:bg-gray-700 dark:hover:bg-[#2E2E2E]'
            }`}
          >
            {isSavingAgent ? (
              <>
                <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                <span className="text-black font-medium">Saving...</span>
              </>
            ) : agentSaved ? (
              <>
                <svg className="w-3 h-3 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-black font-medium">Saved!</span>
              </>
            ) : (
              <>
                <svg className="w-3 h-3 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <span className="text-gray-300">Save</span>
              </>
            )}
          </button>

          {/* Submit for Publishing Button */}
          <button 
            onClick={handlePublishClick}
            disabled={!lastSavedWorkflowId || isPublishing}
            className={`px-2 py-1 text-xs rounded-full flex items-center space-x-1 transition-all duration-200 ${
              isPublishing 
                ? 'bg-yellow-500 text-black cursor-not-allowed animate-pulse' 
                : agentPublished
                  ? 'bg-green-500 text-black'
                  : lastSavedWorkflowId
                    ? 'bg-white text-black dark:bg-[#2E2E2E] text-gray-100 hover:bg-gray-700'
                    : 'bg-white text-black dark:bg-[#2E2E2E] dark:text-white cursor-not-allowed'
            }`}
          >
            {isPublishing ? (
              <>
                <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                <span className="text-black font-medium">Publishing...</span>
              </>
            ) : agentPublished ? (
              <>
                <svg className="w-3 h-3 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-black font-medium">Published!</span>
              </>
            ) : (
              <>
                <svg className="w-3 h-3 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Submit for publishing</span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default AgentBuilderHeader;
