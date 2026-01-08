import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Loading components for better UX
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-full w-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
  </div>
);

// Dynamic imports with loading states to prevent layout shift
const AgentCreation = dynamic(() => import('../../src/components/AgentCreation'), { 
  ssr: false,
  loading: () => <LoadingSpinner />
});
const ChatWindow = dynamic(() => import('../../src/components/ChatWindow'), { 
  ssr: false,
  loading: () => <LoadingSpinner />
});

/**
 * AgentBuilderContent - Pure AgentCreation + ChatWindow layout
 * Used when rendering within HomeLayoutNew (embedded mode)
 * No header, no sidebar - just the 40/60 split content
 */
const AgentBuilderContent: React.FC = () => {
  // States for edit mode
  const [editingWorkflowData, setEditingWorkflowData] = useState<any>(null);
  const [currentTab, setCurrentTab] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // Sync currentTab from sessionStorage
  useEffect(() => {
    const tab = sessionStorage.getItem("currentTab");
    setCurrentTab(tab);
    console.log('🎨 AgentBuilderContent: currentTab from sessionStorage:', tab);
    
    // Check for pending workflow data in sessionStorage
    const storedWorkflowData = sessionStorage.getItem('editingWorkflowData');
    if (storedWorkflowData && tab === "agents-edit") {
      try {
        const workflowData = JSON.parse(storedWorkflowData);
        console.log('📦 AgentBuilderContent: Found stored workflowData in sessionStorage:', {
          id: workflowData._id,
          title: workflowData.title
        });
        setEditingWorkflowData(workflowData);
        setIsEditMode(true);
        // Clear it after loading
        sessionStorage.removeItem('editingWorkflowData');
      } catch (error) {
        console.error('❌ Failed to parse stored workflowData:', error);
      }
    } else if (tab === "agents-edit") {
      setIsEditMode(true);
      console.log('✅ Setting isEditMode to true because tab is agents-edit');
    } else {
      setIsEditMode(false);
      console.log('❌ Setting isEditMode to false because tab is:', tab);
    }
    
    // Poll for tab changes
    const interval = setInterval(() => {
      const newTab = sessionStorage.getItem("currentTab");
      if (newTab !== tab) {
        setCurrentTab(newTab);
        setIsEditMode(newTab === "agents-edit");
      }
    }, 200);
    
    return () => clearInterval(interval);
  }, []);

  // Listen for edit event from AgentsTab
  useEffect(() => {
    console.log('🎧 AgentBuilderContent: Setting up editAgent event listener');
    
    const handleEditAgent = (event: any) => {
      console.log('🔧 Edit agent event received in AgentBuilderContent:', event.detail);
      const workflowData = event.detail?.workflowData;
      
      if (workflowData) {
        console.log('✅ AgentBuilderContent: Setting editingWorkflowData:', {
          id: workflowData._id,
          title: workflowData.title,
          hasPrompt: !!workflowData.prompt
        });
        setEditingWorkflowData(workflowData);
        setIsEditMode(true);
        
        // Notify header to disable Save/Publish buttons
        window.dispatchEvent(new CustomEvent('agentEditModeChange', {
          detail: { isEditMode: true }
        }));
      } else {
        console.error('❌ AgentBuilderContent: No workflowData in editAgent event!', event.detail);
      }
    };

    const handleAgentEditSaveComplete = () => {
      console.log('✅ Agent edit save complete - exiting edit mode');
      setEditingWorkflowData(null);
      setIsEditMode(false);
      
      // Notify header to enable Save/Publish buttons
      window.dispatchEvent(new CustomEvent('agentEditModeChange', {
        detail: { isEditMode: false }
      }));
    };

    window.addEventListener('editAgent', handleEditAgent);
    window.addEventListener('agentEditSaveComplete', handleAgentEditSaveComplete);
    
    console.log('✅ AgentBuilderContent: Event listeners registered');

    return () => {
      console.log('🧹 AgentBuilderContent: Removing event listeners');
      window.removeEventListener('editAgent', handleEditAgent);
      window.removeEventListener('agentEditSaveComplete', handleAgentEditSaveComplete);
    };
  }, []);
  
  console.log('🔍 AgentBuilderContent render:', {
    isEditMode,
    currentTab,
    hasWorkflowData: !!editingWorkflowData,
    workflowId: editingWorkflowData?._id
  });
  
  return (
    <div className="flex h-full w-full font-[Calibri]">
      {/* Left Panel - AgentCreation - Expands to full width in edit mode */}
      <div 
        className="h-full border-r border-gray-200 dark:border-gray-700 overflow-y-auto transition-all duration-300" 
        style={{ 
          flex: isEditMode ? '1' : '0 0 40%', 
          width: isEditMode ? '100%' : '40%' 
        }}
      >
        <AgentCreation 
          workflowData={editingWorkflowData} 
          isEditMode={isEditMode}
        />
      </div>
      
      {/* Right Panel - ChatWindow - Hidden in edit mode */}
      {!isEditMode && (
        <div className="h-full overflow-y-auto transition-all duration-300" style={{ flex: '0 0 60%', width: '60%' }}>
          <ChatWindow />
        </div>
      )}
    </div>
  );
};

export default AgentBuilderContent;
