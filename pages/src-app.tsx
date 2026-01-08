import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';

// Loading components for better UX
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-full w-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
  </div>
);

// Dynamic imports with loading states to prevent layout shift
const SidebarNew = dynamic(() => import('../components/Sidebar/SidebarNew'), { 
  ssr: false,
  loading: () => <LoadingSpinner />
});
const AgentCreation = dynamic(() => import('../src/components/AgentCreation'), { 
  ssr: false,
  loading: () => <LoadingSpinner />
});
const ChatWindow = dynamic(() => import('../src/components/ChatWindow'), { 
  ssr: false,
  loading: () => <LoadingSpinner />
});

const SrcAppPage = () => {
  // States for header button functionality
  const [isSavingAgent, setIsSavingAgent] = useState<boolean>(false);
  const [agentSaved, setAgentSaved] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [agentPublished, setAgentPublished] = useState<boolean>(false);
  const [lastSavedWorkflowId, setLastSavedWorkflowId] = useState<string | null>(null);
  const [messagesLength, setMessagesLength] = useState<number>(0);
  
  // Sidebar states (only used in standalone mode)
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // NEW: States for edit mode
  const [showAgentCreation, setShowAgentCreation] = useState<boolean>(false);
  const [editingWorkflowData, setEditingWorkflowData] = useState<any>(null);
  
  // NEW: Detect if we're in embedded mode (used from HomeLayout) or standalone mode
  const [isEmbedded, setIsEmbedded] = useState<boolean>(false);
  
  useEffect(() => {
    // Check if we're being rendered within HomeLayout (embedded mode)
    const currentTab = sessionStorage.getItem("currentTab");
    setIsEmbedded(currentTab === "agents" || currentTab === "agents-new");
    console.log('🔍 SrcAppPage mode:', (currentTab === "agents" || currentTab === "agents-new") ? 'EMBEDDED' : 'STANDALONE', 'currentTab:', currentTab);
  }, []);
  
  useEffect(() => {
    console.log('🎨 SrcAppPage rendering. isEmbedded:', isEmbedded, 'showAgentCreation:', showAgentCreation);
  }, [isEmbedded, showAgentCreation]);

  // Listen for tab changes - reset to ChatWindow when not in agents-new mode
  useEffect(() => {
    let lastTab = sessionStorage.getItem("currentTab");
    
    const checkTabChange = () => {
      const currentTab = sessionStorage.getItem("currentTab");
      
      // Only process if tab actually changed
      if (currentTab !== lastTab) {
        lastTab = currentTab;
        
        // If we're switching away from agents tabs, reset to ChatWindow
        if (currentTab !== "agents" && currentTab !== "agents-new" && currentTab !== "agents-edit") {
          setShowAgentCreation(false);
          setEditingWorkflowData(null);
          
          // Dispatch edit mode change for header
          window.dispatchEvent(new CustomEvent('agentEditModeChange', {
            detail: { isEditMode: false }
          }));
        }
      }
    };

    // Check immediately and on storage changes
    checkTabChange();
    window.addEventListener('storage', checkTabChange);
    
    // Also check periodically for sessionStorage changes (reduced frequency)
    const interval = setInterval(checkTabChange, 200);

    return () => {
      window.removeEventListener('storage', checkTabChange);
      clearInterval(interval);
    };
  }, []);

  // Listen for edit event from AgentsTab
  useEffect(() => {
    const handleEditAgent = (event: any) => {
      console.log('🔧 Edit agent event received in src-app:', event.detail);
      setEditingWorkflowData(event.detail.workflowData);
      setShowAgentCreation(true);
      
      // Dispatch edit mode change for header
      window.dispatchEvent(new CustomEvent('agentEditModeChange', {
        detail: { isEditMode: true }
      }));
    };

    const handleAgentSaveComplete = () => {
      console.log('✅ Agent save complete - returning to ChatWindow');
      setShowAgentCreation(false);
      setEditingWorkflowData(null);
      
      // Dispatch edit mode change for header
      window.dispatchEvent(new CustomEvent('agentEditModeChange', {
        detail: { isEditMode: false }
      }));
    };

    window.addEventListener('editAgent', handleEditAgent);
    window.addEventListener('agentSaveComplete', handleAgentSaveComplete);

    return () => {
      window.removeEventListener('editAgent', handleEditAgent);
      window.removeEventListener('agentSaveComplete', handleAgentSaveComplete);
    };
  }, []);

  // Listen for events from ChatWindow to update header states
  useEffect(() => {
    const handleChatWindowStateChange = (event: any) => {
      if (event.detail) {
        const { type, ...states } = event.detail;
        
        console.log('src-app.tsx received event:', { type, states });
        
        if (type === 'saveStart') setIsSavingAgent(true);
        if (type === 'saveEnd') {
          setIsSavingAgent(false);
          setAgentSaved(states.success || false);
          if (states.workflowId) {
            console.log('Setting lastSavedWorkflowId:', states.workflowId);
            setLastSavedWorkflowId(states.workflowId);
          }
        }
        if (type === 'saveReset') setAgentSaved(false);
        if (type === 'publishStart') setIsPublishing(true);
        if (type === 'publishEnd') {
          setIsPublishing(false);
          setAgentPublished(states.success || false);
        }
        if (type === 'publishReset') setAgentPublished(false);
        if (type === 'messagesUpdate') setMessagesLength(states.count || 0);
      }
    };

    window.addEventListener('chatWindowStateChange', handleChatWindowStateChange);
    return () => {
      window.removeEventListener('chatWindowStateChange', handleChatWindowStateChange);
    };
  }, []);

  const handleSave = () => {
    // Dispatch event to ChatWindow
    window.dispatchEvent(new CustomEvent('headerSaveClick'));
  };

  const handleSubmitForPublishing = () => {
    // Dispatch event to ChatWindow
    window.dispatchEvent(new CustomEvent('headerPublishClick'));
  };

  return (
    <div className='font-[Calibri]'>
      <Head>
        <title>Agent Builder - Tax Genie 3.0</title>
        {/* Preload critical styles to prevent layout shift */}
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Prevent layout shift with fixed layout */
            body {
              overflow: hidden;
            }
            
            /* Pre-define scrollbar styles */
            .scrollbar-none {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
            .scrollbar-none::-webkit-scrollbar {
              display: none;
            }
            
            /* Prevent content jumping */
            .hide-scrollbar::-webkit-scrollbar {
              display: none;
            }
            .hide-scrollbar {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `
        }} />
      </Head>
      
      {/* Main Content - fixed height to prevent layout shift */}
      <div className={`flex h-screen overflow-hidden pt-[50px]`} style={isEmbedded ? { marginTop: '50px' } : { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
       
        
        {/* AgentCreation + ChatWindow - Side by side layout */}
        <div className="flex flex-1 h-full" style={isEmbedded ? { height: 'calc(100vh - 100px)' } : { height: 'calc(100vh - 50px)' }}>
          {/* Left Panel - AgentCreation (40% width) */}
          <div className="h-full border-r border-gray-200 overflow-y-auto" style={{ flex: '0 0 40%', width: '40%' }}>
            <AgentCreation 
              workflowData={editingWorkflowData}
              isEditMode={!!editingWorkflowData} 
            />
          </div>
          
          {/* Right Panel - ChatWindow (60% width) */}
          <div className="h-full overflow-y-auto" style={{ flex: '0 0 60%', width: '60%' }}>
            <ChatWindow />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SrcAppPage;