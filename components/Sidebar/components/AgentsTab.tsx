import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { v4 as uuidv5 } from 'uuid';
import { fetchWorkflows, getWorkflowById } from '@/services/workflowService';

import { AuthContext } from '@/utils/app/azureAD';
import { filterTGAgentWorkflows } from '@/utils/workflowUtils';

// import CategoryDrawer from '@/components/CategoryDrawer/CategoryDrawer';
import Search from '@/components/Search';
import dynamic from 'next/dynamic';

const CategoryDrawer = dynamic(() => import('@/components/CategoryDrawer/CategoryDrawer'), { 
  ssr: false // Disable SSR for this component
});

import { WorkflowSkeleton } from './Skeletons';

const AgentsTab = ({ setActiveTab }: any) => {
  const [tgAgentWorkflows, setTGAgentWorkflows] = useState([]);
  const [tgAgentLoading, setTGAgentLoading] = useState(false); // Separate loading state for TG agents
  const [lastTGAgentLoad, setLastTGAgentLoad] = useState(0);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const authContext = useContext(AuthContext);
   const validateAndRefreshToken = authContext?.validateAndRefreshToken;
  const [agentType, setAgentType] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hoveredAgentId, setHoveredAgentId] = useState<string | null>(null);
  const router = useRouter();
  const user = authContext?.user;


  useEffect(()=>{
    setOpenDrawer(false);
  },[router])
  const loadTGAgentWorkflows = async () => {
    const now = Date.now();

    if (tgAgentLoading) {
      return;
    }

    if (now - lastTGAgentLoad < 3000) {
      return;
    }

    try {
      setTGAgentLoading(true);
      setLastTGAgentLoad(now);
      setError(null);

      console.log('🔐 [AgentsTab] Current user:', user?.email || 'NO EMAIL');
      console.log('🔑 [AgentsTab] Token exists:', !!user?.idToken);

      const idToken = user?.idToken || '';
      const params: any = {
        workflowType: 'workflow',
        filterByUser: 'true', // Filter workflows by authenticated user
      };

      console.log('📤 [AgentsTab] Fetching workflows with params:', params);

      const response = await fetchWorkflows(
        idToken,
        authContext?.validateAndRefreshToken,
        params,
      );

      console.log('📥 [AgentsTab] Response received:', {
        workflowCount: response?.workflows?.length || 0,
        workflows: response?.workflows?.map((w: any) => ({
          title: w.title,
          createdBy: w.createdBy,
        })) || []
      });

      if (response?.workflows) {
        const tgAgentWorkflowsData = filterTGAgentWorkflows(response.workflows);
        console.log('✅ [AgentsTab] After client-side filter:', {
          count: tgAgentWorkflowsData.length,
          agents: tgAgentWorkflowsData.map((w: any) => ({
            title: w.title,
            createdBy: w.createdBy,
          }))
        });
        setTGAgentWorkflows(tgAgentWorkflowsData);
      } else {
        setError('No workflows received from API');
      }
    } catch (error: any) {
      setError(`Error fetching workflows: ${error.message}`);
    } finally {
      setTGAgentLoading(false);
    }
  };

  useEffect(() => {
    loadTGAgentWorkflows();

    // Define the event listener function
    const handleRefreshChatHistory = () => {
     setOpenDrawer(false); // Trigger getMessages when the event is fired
    };

    // Attach the event listener
    window.addEventListener('close-drawer', handleRefreshChatHistory);

    // Clean up the event listener and the timer when the component is unmounted
    return () => {
      window.removeEventListener('close-drawer', handleRefreshChatHistory); // Clean up the event listener
    };
  }, []); // Empty dependency array - only run once on mount

  const getWorkflowInitials = (title: string) => {
    if (!title) return 'WF';

    const words = title
      .trim()
      .split(' ')
      .filter((word) => word.length > 0);
    if (words.length === 0) return 'WF';

    if (words.length === 1) {
      return words[0].substring(0, 1).toUpperCase();
    }

    return words[0][0].toUpperCase();
  };

  // Handle edit button click
  const handleEditAgent = async (e: React.MouseEvent, workflow: any) => {
    e.stopPropagation();
    console.log('🔧 Edit agent clicked:', workflow.title);
    console.log('🔍 Full workflow object from list:', workflow);
    console.log('📋 Workflow fields from list:', {
      hasPrompt: !!workflow.prompt,
      hasTriggers: !!workflow.triggers,
      triggersLength: workflow.triggers?.length,
      hasCitation: workflow.citation !== undefined,
      citationValue: workflow.citation,
      hasFiles: !!workflow.files,
      filesLength: workflow.files?.length,
      filesValue: workflow.files,
    });

    // Fetch complete workflow data from API to get all fields
    try {
      console.log('📥 Fetching complete workflow data from API...');
      const response = await fetch(`/api/workflow/${workflow._id}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${user?.idToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        const completeWorkflow = result.workflow || result;
        console.log('✅ Complete workflow data received:', completeWorkflow);
        console.log('📋 Complete workflow fields:', {
          hasPrompt: !!completeWorkflow.prompt,
          promptPreview: completeWorkflow.prompt?.substring(0, 50),
          hasTriggers: !!completeWorkflow.triggers,
          triggersLength: completeWorkflow.triggers?.length,
          triggers: completeWorkflow.triggers,
          hasCitation: completeWorkflow.citation !== undefined,
          citationValue: completeWorkflow.citation,
          hasFiles: !!completeWorkflow.files,
          filesLength: completeWorkflow.files?.length,
          files: completeWorkflow.files,
        });

        // Dispatch event with complete workflow data
        window.dispatchEvent(
          new CustomEvent('editAgent', {
            detail: { workflowData: completeWorkflow },
          }),
        );
        // Store in sessionStorage so AgentBuilderContent can pick it up on mount
        sessionStorage.setItem('editingWorkflowData', JSON.stringify(completeWorkflow));
        // Dispatch edit mode change for header
        window.dispatchEvent(new CustomEvent('agentEditModeChange', {
          detail: { isEditMode: true }
        }));
        sessionStorage.setItem('currentTab', 'agents-edit');
      } else {
        console.error('❌ Failed to fetch complete workflow');
        // Fallback to list data
        sessionStorage.setItem('currentTab', 'agents-edit');
        window.dispatchEvent(
          new CustomEvent('editAgent', {
            detail: { workflowData: workflow },
          }),
        );
        // Dispatch edit mode change for header
        window.dispatchEvent(new CustomEvent('agentEditModeChange', {
          detail: { isEditMode: true }
        }));
      }
    } catch (error) {
      console.error('❌ Error fetching complete workflow:', error);
      // Fallback to list data
      sessionStorage.setItem('currentTab', 'agents-edit');
      window.dispatchEvent(
        new CustomEvent('editAgent', {
          detail: { workflowData: workflow },
        }),
      );
      // Dispatch edit mode change for header
      window.dispatchEvent(new CustomEvent('agentEditModeChange', {
        detail: { isEditMode: true }
      }));
    }
  };

  // Handle delete button click
  const handleDeleteAgent = async (e: React.MouseEvent, workflow: any) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${workflow.title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/workflow/${workflow._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${user?.idToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('✅ Agent deleted successfully');
        loadTGAgentWorkflows(); // Refresh the list
        window.dispatchEvent(new Event('agentDeleted'));
      } else {
        const error = await response.text();
        alert(`Failed to delete agent: ${error}`);
      }
    } catch (error) {
      console.error('Error deleting agent:', error);
      alert('Failed to delete agent');
    }
  };

  useEffect(() => {
    const handleAgentSaved = () => {
      loadTGAgentWorkflows();
    };

    window.addEventListener('agentSaved', handleAgentSaved);
    window.addEventListener('agentPublished', handleAgentSaved);
    return () => {
      window.removeEventListener('agentSaved', handleAgentSaved);
      window.removeEventListener('agentPublished', handleAgentSaved);

    };
  }, []);

   const handleAgentSelect = async (agent: any) => {
      try {
        // Fetch the workflow by ID
        const fetchedWorkflow: any = await getWorkflowById(
          agent._id,
          authContext?.user?.idToken,
          validateAndRefreshToken,
        );
        if (fetchedWorkflow) {
          const workflowJSON = JSON.parse(fetchedWorkflow)?.workflow;
  
          const freshConvo = { workflow: workflowJSON };
          sessionStorage.setItem('freshConvoKey', JSON.stringify(freshConvo));
          sessionStorage.setItem('currentTab', 'chats');
          router.push('/chat?id=' + uuidv5() + '_' + workflowJSON._id);
  
          // handleMessageSendB(undefined, workflowJSON, false);
          // setActiveWorkflow(workflowJSON);
          // falseHandleSubmitNew(workflowJSON);
        }
      } catch (error) {
        console.error('Error fetching workflow:', error);
      }
    };
  return (
    <div className="">
      <CategoryDrawer
        heading={agentType}
        open={openDrawer}
        close={(e: any) => {
          setOpenDrawer(e);
          setAgentType('');
        }}
      />
      <div className="w-full max-w-[280px] md:max-w-[256px]">
        <Search
          placeholder={'Search by Agent'}
          searchTerm={searchTerm}
          onSearch={() => {
            return;
          }}
          openSidebar={() => {
            return;
          }}
        />
        <div className="py-1">
          <h2 className=" mt-2 px-3 font-calibri text-sm font-semibold text-gray-900 dark:text-gray-100">
            TG Agents
          </h2>
 
          {/* Service Lines Button */}
          <button
            onClick={() => {
              setOpenDrawer(true);
              setAgentType('Service Line Agents');
              // Clear any TG Agents selections
              //   setSelectedSubcategoryIndex(null);
              //   setSelectedSubsubcategoryIndex(null);
              //   setSelectedWorkflowId(null);
              //   setShowServiceLines(true);
            }}
            className={`py-2 px-4 mt-1 flex items-center space-x-1.5 font-calibri text-xs w-full text-black dark:text-gray-100 hover:text-gray-900 hover:bg-[#F2F6F7] dark:hover:bg-[#2E2E2E] ${
              agentType.includes('Service')
                ? 'bg-[#F2F6F7] dark:bg-[#2E2E2E]'
                : ''
            }`}
          >
            <div className="w-5 h-5 bg-black dark:bg-gray-300 rounded-sm flex items-center justify-center text-white dark:text-black text-[10px] font-bold">
              SL
            </div>
            <span className="text-[12px] leading-normal dark:text-white text-black">
              Service Lines Agents
            </span>
          </button>

          {/* Enabling Functions Button */}
          {/* <button
            onClick={() => {
              setOpenDrawer(true);
              setAgentType('Enabling Functions Agents');
              // Clear any Service Lines selections
              //   setServiceLineSelectedSubcategoryIndex(null);
              //   setServiceLineSelectedSubsubcategoryIndex(null);
              //   setServiceLineSelectedWorkflowId(null);
              //   setShowTGAgents(true);
            }}
            className={`py-2 px-4 flex items-center space-x-1.5 font-calibri text-xs w-full text-black dark:text-gray-100 hover:text-gray-900 hover:bg-[#F2F6F7] dark:hover:bg-[#2E2E2E] ${
              agentType.includes('Enabling')
                ? 'bg-[#F2F6F7] dark:bg-[#2E2E2E]'
                : ''
            }`}
          >
            <div className="w-5 h-5 bg-black dark:bg-gray-300 rounded-sm flex items-center justify-center text-white dark:text-black text-[10px] font-bold">
              EF
            </div>
            <span className="text-[12px] leading-normal">
              Enabling Functions Agents
            </span>
          </button> */}

          {/* Cross Functional Button */}
          <button
            onClick={() => {
              setOpenDrawer(true);
              setAgentType('Cross Functional Agents');
              // Clear any Service Lines selections
              //   setServiceLineSelectedSubcategoryIndex(null);
              //   setServiceLineSelectedSubsubcategoryIndex(null);
              //   setServiceLineSelectedWorkflowId(null);
              //   setShowTGAgents(true);
            }}
            className={`py-2 px-4 flex items-center space-x-1.5 font-calibri text-xs w-full text-black dark:text-gray-100 hover:text-gray-900 hover:bg-[#F2F6F7] dark:hover:bg-[#2E2E2E] ${
              agentType.includes('Cross')
                ? 'bg-[#F2F6F7] dark:bg-[#2E2E2E]'
                : ''
            }`}
          >
            <div className="w-5 h-5 bg-black dark:bg-gray-300 rounded-sm flex items-center justify-center text-white dark:text-black text-[10px] font-bold">
              CF
            </div>
            <span className="text-[12px] leading-normal">
              Cross Functional Agents
            </span>
          </button>
        </div>

        <div className="py-1">
          <h2 className="px-3 font-calibri text-sm font-semibold text-gray-900 dark:text-gray-100">
            My Agents
          </h2>
          <div
            className="relative scrollbar-track-black py-1 "
            style={{ height: window.innerHeight > 700 ? '51vh' : '45vh' }}
          >
            {/* Scrollable TG Agent workflows */}
            <div
              className="h-full overflow-y-auto scrollbar-none"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <div className="pt-8">
                {' '}
                {/* Add padding-top to account for overlay button */}
                {tgAgentWorkflows.map((workflow: any, index: number) => {
                  const isActive = false; // You can add active state logic here
                  const isHovered = hoveredAgentId === workflow._id;
                  return (
                    <div key={workflow._id || index} className="">
                      <button
                        onClick={() => {
                          console.log('Selected TG agent:', workflow.title);
                          handleAgentSelect(workflow)
                          // Add navigation or workflow opening logic here
                        }}
                        onMouseEnter={() => setHoveredAgentId(workflow._id)}
                        onMouseLeave={() => setHoveredAgentId(null)}
                        className={`py-2 pl-4 pr-1  flex justify-between items-center   font-[Calibri] text-xs w-full rounded-md ${
                          isActive
                            ? 'bg-[#F2F6F7] dark:bg-[#1E1E1E] text-black dark:text-white'
                            : 'bg-white dark:bg-[#1E1E1E] text-gray-600 dark:text-gray-200 hover:text-black dark:hover:text-white hover:bg-[#F2F6F7] dark:hover:bg-[#2E2E2E]'
                        }`}
                      >
                        <div className="flex items-center gap-2 ">
                          <div className="w-5 h-5 bg-black dark:bg-gray-300 rounded-full flex items-center justify-center text-white dark:text-black text-[13px] font-bold">
                            {getWorkflowInitials(workflow.title)}
                          </div>
                          <span
                            className="text-[13px] leading-normal text-ellipsis capitalize"
                            title={workflow.title}
                          >
                            {workflow.title}
                          </span>
                        </div>

                        {/* Edit and Delete buttons - shown on hover */}
                       
                          <div className={` items-center  flex`} 
                          style={{opacity:isHovered?"1":"0"}}
                          >
                            {/* Edit Button */}
                            <div
                              onClick={(e) => {
                                handleEditAgent(e, workflow);
                                setOpenDrawer(false);
                                setAgentType('');
                                 window.dispatchEvent(new CustomEvent('agentEditModeChange', {
                                    detail: { isEditMode: false }
                                  }));
                              }}
                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                              title="Edit agent"
                            >
                              <svg
                                className="w-4 h-4 text-gray-500"
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
                            </div>

                            {/* Delete Button */}
                            <div
                              onClick={(e) => {
                                handleDeleteAgent(e, workflow);
                                setOpenDrawer(false);
                                setAgentType('');
                                 window.dispatchEvent(new CustomEvent('agentEditModeChange', {
                                    detail: { isEditMode: false }
                                  }));  
                              }}
                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                              title="Delete agent"
                            >
                              <svg
                                className="w-4 h-4 text-gray-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </div>
                          </div>
                       </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="absolute top-0 left-0 right-0 z-10 bg-white dark:bg-[#1E1E1E]">
              <button
                className={`w-full flex items-center  px-4 py-2 space-x-1.5 font-[Calibri] dark:hover:bg-[#2e2e2e] dark:hover:text-white dark:text-gray-300 text-gray-600 hover:text-gray-900  `}
                onClick={() => {
                  console.log('🆕 New Agent clicked - Starting fresh session');

                  // Clear agent builder session data
                  sessionStorage.removeItem('agentBuilderConversationId');
                  sessionStorage.removeItem('testAgentWorkflowId');
                   window.dispatchEvent(new CustomEvent('agentEditModeChange', {
                      detail: { isEditMode: false }
                    }));

                  // Set tab to agents-new (same as clicking Agents tab)
                  sessionStorage.setItem('currentTab', 'agents-new');

                  // Dispatch event to refresh ChatWindow and AgentCreation
                  window.dispatchEvent(new CustomEvent('newAgentSession'));
                  setOpenDrawer(false);
                  setAgentType('');
                  console.log(
                    '✅ New agent session triggered - Components will refresh in place',
                  );

                  // Don't navigate - just refresh components in place (same as Agents tab behavior)
                }}
              >
                <div className="w-5 h-5 flex items-center justify-center border border-black dark:border-gray-400 rounded-full">
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 6v12m6-6H6"
                    />
                  </svg>
                </div>
                <span className="font-[Calibri] text-[13px] font-medium">
                  New Agent
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentsTab;
