import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import ChatWindow from '../src/components/ChatWindow';
import AgentBuilderHeader from '../src/components/AgentBuilderHeader';

const TestAgentPage: React.FC = () => {
  const router = useRouter();
  const { workflowId } = router.query;
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Ensure we have a workflow ID
    if (workflowId && typeof workflowId === 'string') {
      // Store in sessionStorage for ChatWindow to use
      sessionStorage.setItem('testAgentWorkflowId', workflowId);
      
      // Clear any existing agent builder conversation to start fresh
      sessionStorage.removeItem('agentBuilderConversationId');
      
      console.log('🧪 Test Agent Page - Workflow ID:', workflowId);
      setIsReady(true);
    }
  }, [workflowId]);

  if (!isReady || !workflowId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-900">Loading Test Agent...</p>
          <p className="text-sm text-gray-500 mt-2">Please wait</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header with Test Agent indicator */}
      <div className="fixed top-0 left-0 right-0 z-50 w-full h-[50px] bg-white border-b border-gray-200 flex items-center">
        <div className="flex-shrink-0 w-64 h-full border-r border-gray-200">
          <div className="flex items-center h-full px-4 gap-2">
            <img
              src="/assets/deloitte-logo.svg"
              alt="Deloitte Logo"
              className="h-5 w-auto"
            />
            <span className="text-gray-300">|</span>
            <span className="text-base font-calibri font-bold text-gray-700 whitespace-nowrap">
              Tax Genie 3.0
            </span>
          </div>
        </div>
        
        {/* Test Mode Badge */}
        <div className="ml-4 flex items-center space-x-2">
          <div className="flex items-center px-3 py-1 bg-blue-100 rounded-full">
            <svg className="w-4 h-4 text-blue-600 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-blue-600">Test Mode</span>
          </div>
          <span className="text-xs text-gray-500">Testing saved workflow</span>
        </div>

        {/* Close button */}
        <div className="ml-auto pr-4">
          <button
            onClick={() => window.close()}
            className="flex items-center px-3 py-1 space-x-1 text-xs text-gray-700 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Close Test</span>
          </button>
        </div>
      </div>

      {/* ChatWindow - full functionality */}
      <div className="pt-[50px] h-full">
        <ChatWindow />
      </div>
    </div>
  );
};

export default TestAgentPage;
