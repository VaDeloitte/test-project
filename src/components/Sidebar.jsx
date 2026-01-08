import React, { useState, useEffect, useContext } from 'react';
import { fetchWorkflows } from '../../services/workflowService'; 
import { AuthContext } from '../../utils/app/azureAD';
import { Tooltip } from 'react-tooltip';
import { CgMenuGridO } from 'react-icons/cg';
import { 
  filterServiceLineWorkflows, 
  filterTGAgentWorkflows, 
  getWorkflowFieldStatus 
} from '../../utils/workflowUtils';

const Sidebar = () => {
  const [isLightMode, setIsLightMode] = useState(true);
  const [showTGAgents, setShowTGAgents] = useState(false);
  const [showServiceLines, setShowServiceLines] = useState(false);
  const [showTGAgentWorkflows, setShowTGAgentWorkflows] = useState(false); // Show workflows under TG Agents
  const [workflows, setWorkflows] = useState([]);
  const [serviceLineWorkflows, setServiceLineWorkflows] = useState([]);
  const [tgAgentWorkflows, setTGAgentWorkflows] = useState([]); // Workflows saved via agent builder
  const [tgAgentLoading, setTGAgentLoading] = useState(false); // Separate loading state for TG agents
  const [lastTGAgentLoad, setLastTGAgentLoad] = useState(0); // Track last load time
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState('subcategories'); // subcategories, subsubcategories, titles
  const [selectedCategory, setSelectedCategory] = useState('General Use Cases'); // Always General Use Cases
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [selectedSubsubcategory, setSelectedSubsubcategory] = useState('');
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [rightPanelData, setRightPanelData] = useState([]);
  const [rightPanelTitle, setRightPanelTitle] = useState('');
  const [showThirdPanel, setShowThirdPanel] = useState(false);
  const [thirdPanelData, setThirdPanelData] = useState(null);
  const [thirdPanelTitle, setThirdPanelTitle] = useState('');
  
  // Service Lines specific state
  const [serviceLineCurrentView, setServiceLineCurrentView] = useState('subcategories');
  const [serviceLineSelectedSubcategory, setServiceLineSelectedSubcategory] = useState('');
  const [serviceLineSelectedSubsubcategory, setServiceLineSelectedSubsubcategory] = useState('');
  const [serviceLineShowRightPanel, setServiceLineShowRightPanel] = useState(false);
  const [serviceLineRightPanelData, setServiceLineRightPanelData] = useState([]);
  const [serviceLineRightPanelTitle, setServiceLineRightPanelTitle] = useState('');
  const [serviceLineShowThirdPanel, setServiceLineShowThirdPanel] = useState(false);
  const [serviceLineThirdPanelData, setServiceLineThirdPanelData] = useState(null);
  const [serviceLineThirdPanelTitle, setServiceLineThirdPanelTitle] = useState('');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(null);
  
  // Selection state for highlighting clicked rows
  const [selectedSubcategoryIndex, setSelectedSubcategoryIndex] = useState(null);
  const [selectedSubsubcategoryIndex, setSelectedSubsubcategoryIndex] = useState(null);
  const [serviceLineSelectedSubcategoryIndex, setServiceLineSelectedSubcategoryIndex] = useState(null);
  const [serviceLineSelectedSubsubcategoryIndex, setServiceLineSelectedSubsubcategoryIndex] = useState(null);
  const [serviceLineSelectedWorkflowId, setServiceLineSelectedWorkflowId] = useState(null);
  
  // Get auth context for proper token handling
  const authContext = useContext(AuthContext);
  const user = authContext?.user;

  // Helper function to get initials from workflow title
  const getWorkflowInitials = (title) => {
    if (!title) return 'WF';
    
    const words = title.trim().split(' ').filter(word => word.length > 0);
    if (words.length === 0) return 'WF';
    
    if (words.length === 1) {
      return words[0].substring(0, 1).toUpperCase();
    }
    
    return (words[0][0]).toUpperCase();
  };

  // Fetch workflows when TG Agents is opened
  useEffect(() => {
    if (showTGAgents) {
      loadWorkflows();
    }
  }, [showTGAgents]);

  // Fetch Service Lines workflows when Service Lines is opened
  useEffect(() => {
    if (showServiceLines) {
      loadServiceLineWorkflows();
    }
  }, [showServiceLines]);

  // Auto-load TG Agent workflows on component mount
  useEffect(() => {
    loadTGAgentWorkflows();
  }, []); // Empty dependency array - only run once on mount

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

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const idToken = user?.idToken || '';
      const params = {
        workflowType: 'workflow',
      };
      
      // Use the same fetchWorkflows function with proper parameters as in Workflows.tsx
      const response = await fetchWorkflows(
        idToken,
        authContext?.validateAndRefreshToken,
        params
      );
      
      if (response?.workflows) {
        const generalUseCasesWorkflows = response.workflows.filter(w => w.category === "General Use Cases");
        setWorkflows(generalUseCasesWorkflows);
      } else {
        setError('No workflows received from API');
      }
    } catch (error) {
      setError(`Error fetching workflows: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadServiceLineWorkflows = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const idToken = user?.idToken || '';
      const params = {
        workflowType: 'workflow',
      };
      
      // Use the same fetchWorkflows function with proper parameters as in Workflows.tsx
      const response = await fetchWorkflows(
        idToken,
        authContext?.validateAndRefreshToken,
        params
      );
      
      console.log('Full API response for Service Lines:', response);
      
      if (response?.workflows) {
        const serviceLineWorkflowsData = filterServiceLineWorkflows(response.workflows);
        
        setServiceLineWorkflows(serviceLineWorkflowsData);
      } else {
        setError('No workflows received from API');
      }
    } catch (error) {
      setError(`Error fetching workflows: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

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
      
      const idToken = user?.idToken || '';
      const params = {
        workflowType: 'workflow',
      };
      
      const response = await fetchWorkflows(
        idToken,
        authContext?.validateAndRefreshToken,
        params
      );
      
      
      if (response?.workflows) {
        const tgAgentWorkflowsData = filterTGAgentWorkflows(response.workflows);
        setTGAgentWorkflows(tgAgentWorkflowsData);
      } else {
        setError('No workflows received from API');
      }
    } catch (error) {
      setError(`Error fetching workflows: ${error.message}`);
    } finally {
      setTGAgentLoading(false);
    }
  };

  const getSubcategories = () => {
    const subcategories = [...new Set(workflows
      .filter(w => w.subcategory)
      .map(w => w.subcategory)
      .filter(Boolean))];
    
    return subcategories.sort();
  };

  const getActualSubcategories = (mainCategory) => {
    const subcategories = [...new Set(
      workflows
        .filter(w => w.subcategory === mainCategory && w.subsubcategory)
        .map(w => w.subsubcategory)
        .filter(Boolean)
    )];
    return subcategories.sort();
  };

  // Get subsubcategories - in this case, there might be additional levels or we show titles directly
  const getSubsubcategories = (mainCategory, subcategory) => {
    // Since the API shows subsubcategory is empty, we might not have this level
    // But keeping the function for future extensibility
    const subsubcategories = [...new Set(
      workflows
        .filter(w => w.subcategory === mainCategory && w.subsubcategory === subcategory && w.subsubcategory)
        .map(w => w.subsubcategory)
        .filter(Boolean)
    )];
    return subsubcategories.sort();
  };

  // Get titles for selected category/subcategory
  const getTitles = (mainCategory, subcategory, subsubcategory) => {
    if (subsubcategory) {
      // If we have a subsubcategory, filter by all three levels
      return workflows.filter(w => 
        w.subcategory === mainCategory && 
        w.subsubcategory === subcategory
      );
    } else if (subcategory) {
      // If we have subcategory, filter by main category and subcategory
      return workflows.filter(w => 
        w.subcategory === mainCategory && 
        w.subsubcategory === subcategory
      );
    } else {
      // If no subcategory, show all workflows for the main category
      return workflows.filter(w => 
        w.subcategory === mainCategory && 
        (!w.subsubcategory || w.subsubcategory === "")
      );
    }
  };

  // Handle navigation - Main category click (Document & Content Creation, etc.)
  const handleMainCategoryClick = (mainCategory) => {
    setSelectedCategory(mainCategory);
    
    // Check if this main category has any subcategories
    const subcategories = getActualSubcategories(mainCategory);
    if (subcategories.length > 0) {
      // Show subcategories in right panel
      setRightPanelData(subcategories);
      setRightPanelTitle(`${mainCategory} - Subcategories`);
      setShowRightPanel(true);
    } else {
      // Show workflows directly in right panel
      const workflows = getTitles(mainCategory, '', '');
      setRightPanelData(workflows);
      setRightPanelTitle(`${mainCategory} - Workflows`);
      setShowRightPanel(true);
    }
  };

  const handleSubcategoryClick = (subcategory) => {
    setSelectedSubcategory(subcategory);
    
    // Check if this subcategory has any subsubcategories
    const subsubcategories = getSubsubcategories(selectedCategory, subcategory);
    if (subsubcategories.length > 0) {
      // Has subsubcategories, go to subsubcategories view
      setCurrentView('subsubcategories');
      setBreadcrumb([selectedCategory, subcategory]);
    } else {
      // No subsubcategories, go directly to titles
      setCurrentView('titles');
      setBreadcrumb([selectedCategory, subcategory]);
      setSelectedSubsubcategory(''); // Clear any previous subsubcategory
    }
  };

  const handleSubsubcategoryClick = (subsubcategory) => {
    setSelectedSubsubcategory(subsubcategory);
    setCurrentView('titles');
    setBreadcrumb([selectedCategory, selectedSubcategory, subsubcategory]);
  };

  const handleBack = () => {
    if (currentView === 'actualSubcategories') {
      setCurrentView('subcategories');
      setBreadcrumb([]);
      setSelectedCategory('General Use Cases');
      setSelectedSubcategory('');
    } else if (currentView === 'subsubcategories') {
      setCurrentView('actualSubcategories');
      setBreadcrumb([selectedCategory]);
      setSelectedSubcategory('');
    } else if (currentView === 'titles') {
      if (selectedSubsubcategory) {
        // Coming from subsubcategory level
        setCurrentView('subsubcategories');
        setBreadcrumb([selectedCategory, selectedSubcategory]);
        setSelectedSubsubcategory('');
      } else if (selectedSubcategory) {
        // Coming from subcategory level
        setCurrentView('actualSubcategories');
        setBreadcrumb([selectedCategory]);
        setSelectedSubcategory('');
      } else {
        // Coming directly from main category level (no subcategories)
        setCurrentView('subcategories');
        setBreadcrumb([]);
        setSelectedCategory('General Use Cases');
      }
    }
  };

  const closeTGAgents = () => {
    setShowTGAgents(false);
    setShowRightPanel(false);
    setShowThirdPanel(false);
    setCurrentView('subcategories');
    setBreadcrumb([]);
    setSelectedCategory('General Use Cases');
    setSelectedSubcategory('');
    setSelectedSubsubcategory('');
    setRightPanelData([]);
    setRightPanelTitle('');
    setThirdPanelData(null);
    setThirdPanelTitle('');
    // Clear all selection states
    setSelectedSubcategoryIndex(null);
    setSelectedSubsubcategoryIndex(null);
    setSelectedWorkflowId(null);
  };

  // Service Lines helper functions
  const getServiceLineSubcategories = () => {
    console.log('Total Service Lines workflows available:', serviceLineWorkflows.length);
    
    // Get unique subcategories from Service Lines workflows
    const subcategories = [...new Set(serviceLineWorkflows
      .filter(w => w.subcategory) // Only workflows with subcategory
      .map(w => w.subcategory)
      .filter(Boolean))];
    
    console.log('Available Service Lines subcategories:', subcategories);
    return subcategories.sort();
  };

  const getServiceLineSubsubcategories = (subcategory) => {
    const subsubcategories = [...new Set(
      serviceLineWorkflows
        .filter(w => w.subcategory === subcategory && w.subsubcategory)
        .map(w => w.subsubcategory)
        .filter(Boolean)
    )];
    return subsubcategories.sort();
  };

  const getServiceLineTitles = (subcategory, subsubcategory) => {
    if (subsubcategory) {
      // Filter by both subcategory and subsubcategory
      return serviceLineWorkflows.filter(w => 
        w.subcategory === subcategory && 
        w.subsubcategory === subsubcategory
      );
    } else {
      // Filter by subcategory only
      return serviceLineWorkflows.filter(w => 
        w.subcategory === subcategory && 
        (!w.subsubcategory || w.subsubcategory === "")
      );
    }
  };

  // Service Lines navigation handlers
  const handleServiceLineSubcategoryClick = (subcategory) => {
    setServiceLineSelectedSubcategory(subcategory);
    
    // Check if this subcategory has any subsubcategories
    const subsubcategories = getServiceLineSubsubcategories(subcategory);
    if (subsubcategories.length > 0) {
      // Show subsubcategories in right panel
      setServiceLineRightPanelData(subsubcategories);
      setServiceLineRightPanelTitle(`${subcategory} - Subsubcategories`);
      setServiceLineShowRightPanel(true);
    } else {
      // Show workflows directly in right panel
      const workflows = getServiceLineTitles(subcategory, '');
      setServiceLineRightPanelData(workflows);
      setServiceLineRightPanelTitle(`${subcategory} - Workflows`);
      setServiceLineShowRightPanel(true);
    }
  };

  const handleServiceLineSubsubcategoryClick = (subsubcategory) => {
    setServiceLineSelectedSubsubcategory(subsubcategory);
    
    // Show workflows for this subsubcategory
    const workflows = getServiceLineTitles(serviceLineSelectedSubcategory, subsubcategory);
    setServiceLineRightPanelData(workflows);
    setServiceLineRightPanelTitle(`${serviceLineSelectedSubcategory} > ${subsubcategory} - Workflows`);
  };

  const closeServiceLines = () => {
    setShowServiceLines(false);
    setServiceLineShowRightPanel(false);
    setServiceLineShowThirdPanel(false);
    setServiceLineCurrentView('subcategories');
    setServiceLineSelectedSubcategory('');
    setServiceLineSelectedSubsubcategory('');
    setServiceLineRightPanelData([]);
    setServiceLineRightPanelTitle('');
    setServiceLineThirdPanelData(null);
    setServiceLineThirdPanelTitle('');
    // Clear all selection states
    setServiceLineSelectedSubcategoryIndex(null);
    setServiceLineSelectedSubsubcategoryIndex(null);
    setServiceLineSelectedWorkflowId(null);
  };

  return (
    <div className="w-full max-w-[280px] md:max-w-[256px] h-full bg-white border-r border-gray-200 flex flex-col">

      {/* Main Content */}
      <div className="flex-1 py-2 space-y-3 overflow-hidden" style={{ paddingTop: '24px' }}>
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
            <svg className="w-3.5 h-3.5 ml-3 text-gray-400" fill="none" stroke="black" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by Chat"
            className="w-full px-7 py-2 font-calibri text-[11px] text-gray-600 hover:text-gray-900 bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

       {/* TG Agents Section */}
          <div className="flex-1 flex flex-col overflow-hidden scrollbar-hidden min-h-0">
            <h2 className="px-2 text-sm font-calibri font-semibold text-gray-900 mt-3 ">
              My Agents
            </h2>
            
            {/* TG Agents Container with New Agents overlay */}
            <div className="relative overflow-hidden" style={{ height: '200px' }}>
              {/* Scrollable TG Agent workflows */}
              <div className="h-full overflow-y-auto scrollbar-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <div className="pt-12"> {/* Add padding-top to account for overlay button */}
                  {tgAgentWorkflows.length > 0 ? (
                    tgAgentWorkflows.map((workflow, index) => {
                      const isActive = false; // You can add active state logic here
                      return (
                        <div key={workflow._id || index} className="">
                          <button
                            onClick={() => {
                              console.log('Selected TG agent:', workflow.title);
                              // Add navigation or workflow opening logic here
                            }}
                            className={`py-2 px-4 flex justify-between items-center space-x-1.5 font-calibri text-xs w-full rounded-md ${
                              isActive
                                ? "bg-gray-200 text-black"
                                : "bg-white text-gray-600 hover:text-black hover:bg-gray-100"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                                {getWorkflowInitials(workflow.title)}
                              </div>
                              <span className="text-[12px] leading-normal text-black" title={workflow.title}>
                                {workflow.title}
                              </span>
                            </div>
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    // Add placeholder content for testing scroll when no workflows
                    Array.from({ length: 15 }, (_, i) => (
                      <div key={`placeholder-${i}`} className="py-3 px-4 text-xs text-gray-400 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                            {i + 1}
                          </div>
                          <span>Sample workflow {i + 1} (placeholder)</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              {/* New Agents Button Overlay */}
              <div className="absolute top-0 left-0 right-0 z-10 bg-white" style={{ boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1), 0 -1px 2px rgba(0, 0, 0, 0.05)' }}>
                <button
                  className={`w-full flex items-center px-4 py-2 space-x-1.5 font-calibri text-[11px] text-gray-600 hover:text-gray-900 rounded-md bg-white hover:bg-gray-50`}
                  onClick={() => {
                    console.log('🚀 New Agents button clicked - navigating to /src-app');
                    window.location.href = '/src-app';
                  }}
                >
                  <div className="w-5 h-5 flex items-center justify-center border border-black rounded-full">
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
                  <span>New Agents</span>
                </button>
              </div>
            </div>
          </div>

        {/* My Agents Section */}
        <div>
          
          <h2 className="px-2 text-sm font-calibri font-semibold text-gray-900">
            TG Agents
          </h2>


          {/* Service Lines Button */}
          <button 
            onClick={() => {
              // Clear any TG Agents selections
              setSelectedSubcategoryIndex(null);
              setSelectedSubsubcategoryIndex(null);
              setSelectedWorkflowId(null);
              setShowServiceLines(true);
            }}
            className="py-2 px-4 flex items-center space-x-1.5 font-calibri text-xs w-full  text-black hover:text-gray-900 hover:bg-gray-100"
          >
            <div className="w-5 h-5 bg-black rounded-sm flex items-center justify-center text-white text-[10px] font-bold">
              S
            </div>
            <span className="text-[12px] leading-normal text-black">
              Service Lines
            </span>
          </button>

          {/* Cross Functional Button */}
          <button 
            onClick={() => {
              // Clear any Service Lines selections
              setServiceLineSelectedSubcategoryIndex(null);
              setServiceLineSelectedSubsubcategoryIndex(null);
              setServiceLineSelectedWorkflowId(null);
              setShowTGAgents(true);
            }}
            className="py-2 px-4 flex items-center space-x-1.5 font-calibri text-xs w-full bg-gray-200 text-black hover:text-gray-900 hover:bg-gray-100"
          >
            <div className="w-5 h-5 bg-black rounded-sm flex items-center justify-center text-white text-[10px] font-bold">
              C
            </div>
            <span className="text-[12px] leading-normal text-black">
              Cross Functional
            </span>
          </button>

      

         
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200">
    

        {/* Mode Section */}
        <div className="ml-5 py-1 border-b border-gray-200">
          <div className="font-calibri text-[12px] text-left font-semibold text-gray-900">
            Mode
          </div>
          <div className="flex mb-1 items-center justify-between">
            <span className="font-calibri text-[11px] text-gray-600">
              Light mode
            </span>
            <button
              onClick={() => setIsLightMode(!isLightMode)}
              className={`relative inline-flex h-4 w-8 mr-2 items-center rounded-full transition-colors focus:outline-none ${
                isLightMode ? 'bg-[#43B02A]' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${
                  isLightMode ? 'translate-x-4' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="p-1 bg-white border-t border-gray-200">
          <div className="flex items-center justify-between px-2">
            <button className="flex flex-col items-center px-1.5 py-0.5 text-black-400 hover:text-gray-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
                />
              </svg>
              <span className="font-calibri text-[11px] mt-0.5">Chats</span>
            </button>

            <button className="flex flex-col items-center px-1.5 py-0.5 text-gray-400 hover:text-gray-600">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span className="font-calibri text-[11px] mt-0.5">Agents</span>
            </button>

            <button className="flex flex-col items-center px-1.5 py-0.5 text-gray-400 hover:text-gray-600">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-calibri text-[11px] mt-0.5">Info</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Service Lines Overlay */}
      {showServiceLines && (
        <>
          {/* Backdrop for closing modals when clicking outside */}
          <div 
            className="fixed inset-0 z-40 pointer-events-auto"
            onClick={closeServiceLines}
          />
          
          {/* Main Service Lines Panel - positioned immediately right of sidebar */}
          <div 
            className="fixed bg-white rounded-lg shadow-xl flex flex-col border border-gray-200 pointer-events-auto"
            style={{
              left: '280px',
              top: '20px',
              width: '270px',
              maxHeight: '500px',
              zIndex: 51
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-semibold text-gray-900">Service Lines</h2>
              </div>
              <button 
                onClick={closeServiceLines}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-gray-500">Loading Service Lines...</div>
                </div>
              )}
              
              {error && (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="text-sm text-red-500 mb-2">{error}</div>
                  <button 
                    onClick={loadServiceLineWorkflows}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Retry
                  </button>
                </div>
              )}
              
              {!loading && !error && (
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Categories</h3>
                  {getServiceLineSubcategories().length === 0 ? (
                    <div className="text-sm text-gray-500 text-center py-4">
                      No Service Lines categories found.
                    </div>
                  ) : (
                    getServiceLineSubcategories().map((subcategory, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          // Clear other selections in this panel
                          setServiceLineSelectedSubsubcategoryIndex(null);
                          setServiceLineSelectedWorkflowId(null);
                          setServiceLineSelectedSubcategoryIndex(index);
                          handleServiceLineSubcategoryClick(subcategory);
                        }}
                        className={`w-full text-left p-2 text-sm rounded transition-colors ${
                          serviceLineSelectedSubcategoryIndex === index
                            ? 'text-gray-700'
                            : 'text-gray-700 hover:bg-cyan-50 hover:text-cyan-600'
                        }`}
                        style={{
                          backgroundColor: serviceLineSelectedSubcategoryIndex === index ? '#F2F6F7' : 'transparent'
                        }}
                      >
                        {subcategory}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Service Lines Right Panel */}
          {serviceLineShowRightPanel && (
            <div 
              className="fixed bg-white rounded-lg shadow-xl flex flex-col border border-gray-200 pointer-events-auto"
              style={{
                left: '530px',
                top: '20px',
                width: '315px',
                maxHeight: '500px',
                zIndex: 52
              }}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setServiceLineShowRightPanel(false);
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h3 className="text-lg font-semibold text-gray-900">{serviceLineRightPanelTitle}</h3>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setServiceLineShowRightPanel(false);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-1">
                  {serviceLineRightPanelData.map((item, index) => (
                    <button
                      key={index}
                      className={`w-full text-left p-2 text-sm rounded transition-colors ${
                        serviceLineSelectedSubsubcategoryIndex === index
                          ? 'text-gray-700'
                          : 'text-gray-700 hover:bg-cyan-50 hover:text-cyan-600'
                      }`}
                      style={{
                        backgroundColor: serviceLineSelectedSubsubcategoryIndex === index ? '#F2F6F7' : 'transparent'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Clear other selections in this panel
                        setServiceLineSelectedWorkflowId(null);
                        setServiceLineSelectedSubsubcategoryIndex(index);
                        if (typeof item === 'string') {
                          // Handle subsubcategory click - show workflows in third panel
                          const workflows = getServiceLineTitles(serviceLineSelectedSubcategory, item);
                          setServiceLineThirdPanelData(workflows);
                          setServiceLineThirdPanelTitle(`${serviceLineSelectedSubcategory} > ${item} - Workflows`);
                          setServiceLineShowThirdPanel(true);
                          setServiceLineSelectedSubsubcategory(item);
                        } else {
                          // Handle workflow selection - just log for now
                          console.log('Selected Service Lines workflow:', item);
                        }
                      }}
                    >
                      {typeof item === 'string' ? item : item.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Service Lines Third Panel - Workflow Details */}
          {serviceLineShowThirdPanel && serviceLineThirdPanelData && (
            <div 
              className="fixed bg-white rounded-lg shadow-xl flex flex-col border border-gray-200 pointer-events-auto"
              style={{
                left: '845px',
                top: '20px',
                width: '360px',
                maxHeight: '500px',
                zIndex: 53
              }}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setServiceLineShowThirdPanel(false);
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h3 className="text-lg font-semibold text-gray-900">{serviceLineThirdPanelTitle}</h3>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setServiceLineShowThirdPanel(false);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {Array.isArray(serviceLineThirdPanelData) ? (
                  // Display list of workflows
                  <div className="space-y-1">
                    {serviceLineThirdPanelData.map((workflow, index) => (
                      <div
                        key={index}
                        className={`relative w-full text-left p-3 text-sm rounded transition-colors border border-gray-200 cursor-pointer ${
                          serviceLineSelectedWorkflowId === workflow._id
                            ? 'text-gray-700'
                            : 'text-gray-700 hover:bg-cyan-50 hover:text-cyan-600'
                        }`}
                        style={{
                          backgroundColor: serviceLineSelectedWorkflowId === workflow._id ? '#F2F6F7' : 'transparent'
                        }}
                        onClick={() => {
                          console.log('Selected Service Lines workflow:', workflow);
                          setServiceLineSelectedWorkflowId(workflow._id);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 text-left pr-2">
                            <div className="font-medium">{workflow.title}</div>
                          </div>
                          <div className="relative">
                            <svg 
                              className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help"
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                              data-tooltip-id={`workflow-tooltip-${workflow._id}`}
                              data-tooltip-place="left"
                              data-tooltip-wrapper="html"
                              data-tooltip-position-strategy="fixed"
                              data-tooltip-delay-show={100}
                              data-tooltip-delay-hide={200}
                              data-tooltip-offset={10}
                            >
                              <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth="2" 
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                              />
                            </svg>
                            
                            <Tooltip 
                              id={`workflow-tooltip-${workflow._id}`} 
                              className="z-[100] bg-gray-800 text-white text-sm rounded-lg shadow-lg border border-gray-600"
                              style={{ 
                                backgroundColor: '#2d3748', 
                                width: '250px',
                                height: 'auto',
                                color: 'white', 
                                fontSize: '12px', 
                                lineHeight: '1.4',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
                                border: '1px solid #4a5568'
                              }}
                            >
                              <div style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                <div style={{ fontWeight: '600', marginBottom: '4px', color: '#e2e8f0' }}>
                                  Description:
                                </div>
                                <div style={{ color: '#cbd5e0' }}>
                                  {(() => {
                                    const description = workflow.description || 'No description available';
                                    const words = description.split(' ');
                                    if (words.length > 30) {
                                      return words.slice(0, 30).join(' ') + '...';
                                    }
                                    return description;
                                  })()}
                                </div>
                                {workflow.category && (
                                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#a0aec0' }}>
                                    <strong>Category:</strong> {workflow.category}
                                  </div>
                                )}
                                {workflow.subcategory && (
                                  <div style={{ marginTop: '4px', fontSize: '11px', color: '#a0aec0' }}>
                                    <strong>Subcategory:</strong> {workflow.subcategory}
                                  </div>
                                )}
                              </div>
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Display single workflow details (original functionality)
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">Title</h4>
                      <p className="text-sm text-gray-700">{serviceLineThirdPanelData.title}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">Description</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">{serviceLineThirdPanelData.description}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">Category</h4>
                      <p className="text-sm text-gray-700">{serviceLineThirdPanelData.category}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">Subcategory</h4>
                      <p className="text-sm text-gray-700">{serviceLineThirdPanelData.subcategory}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">Subsubcategory</h4>
                      <p className="text-sm text-gray-700">{serviceLineThirdPanelData.subsubcategory}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">Hit Count</h4>
                      <p className="text-sm text-gray-700">{serviceLineThirdPanelData.hitCount}</p>
                    </div>
                    <div className="pt-4">
                      <button className="w-full bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors">
                        Use This Workflow
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
      {showTGAgents && (
        <>
          {/* Backdrop for closing modals when clicking outside */}
          <div 
            className="fixed inset-0 z-40 pointer-events-auto"
            onClick={closeTGAgents}
          />
          
          {/* Main Categories Panel - positioned immediately right of sidebar */}
          <div 
            className="fixed bg-white rounded-lg shadow-xl flex flex-col border border-gray-200 pointer-events-auto"
            style={{
              left: '280px',
              top: '20px',
              width: '270px',
              maxHeight: '500px',
              zIndex: 51
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-semibold text-gray-900">My Agents</h2>
              </div>
              <button 
                onClick={closeTGAgents}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-gray-500">Loading workflows...</div>
                </div>
              )}
              
              {error && (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="text-sm text-red-500 mb-2">{error}</div>
                  <button 
                    onClick={loadWorkflows}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Retry
                  </button>
                </div>
              )}
              
              {!loading && !error && (
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">General Use Cases</h3>
                  {getSubcategories().length === 0 ? (
                    <div className="text-sm text-gray-500 text-center py-4">
                      No categories found. Check console for debugging info.
                    </div>
                  ) : (
                    getSubcategories().map((category, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          // Clear other selections in this panel
                          setSelectedSubsubcategoryIndex(null);
                          setSelectedWorkflowId(null);
                          setSelectedSubcategoryIndex(index);
                          handleMainCategoryClick(category);
                        }}
                        className={`w-full text-left p-2 text-sm rounded transition-colors ${
                          selectedSubcategoryIndex === index
                            ? 'text-gray-700'
                            : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                        }`}
                        style={{
                          backgroundColor: selectedSubcategoryIndex === index ? '#F2F6F7' : 'transparent'
                        }}
                      >
                        {category}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - positioned immediately right of first panel */}
          {showRightPanel && (
            <div 
              className="fixed bg-white rounded-lg shadow-xl flex flex-col border border-gray-200 pointer-events-auto"
              style={{
                left: '530px',
                top: '20px',
                width: '315px',
                maxHeight: '500px',
                zIndex: 52
              }}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowRightPanel(false);
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h3 className="text-lg font-semibold text-gray-900">{rightPanelTitle}</h3>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowRightPanel(false);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-1">
                  {rightPanelData.map((item, index) => (
                    <button
                      key={index}
                      className={`w-full text-left p-2 text-sm rounded transition-colors ${
                        selectedSubsubcategoryIndex === index
                          ? 'text-gray-700'
                          : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                      style={{
                        backgroundColor: selectedSubsubcategoryIndex === index ? '#F2F6F7' : 'transparent'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Clear workflow selections
                        setSelectedWorkflowId(null);
                        setSelectedSubsubcategoryIndex(index);
                        if (typeof item === 'string') {
                          // Handle subcategory click - show workflows
                          const workflows = getTitles(selectedCategory, item, '');
                          setRightPanelData(workflows);
                          setRightPanelTitle(`${selectedCategory} > ${item} - Workflows`);
                        } else {
                          // Handle workflow selection - open third panel with workflow details
                          setThirdPanelData(item);
                          setThirdPanelTitle(`Workflow Details: ${item.title}`);
                          setShowThirdPanel(true);
                          console.log('Selected workflow:', item);
                        }
                      }}
                    >
                      {typeof item === 'string' ? item : item.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Cross Functional Agents Third Panel - Workflow Details */}
          {showThirdPanel && thirdPanelData && (
            <div 
              className="fixed bg-white rounded-lg shadow-xl flex flex-col border border-gray-200 pointer-events-auto"
              style={{
                left: '845px',
                top: '20px',
                width: '360px',
                maxHeight: '500px',
                zIndex: 53
              }}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowThirdPanel(false);
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h3 className="text-lg font-semibold text-gray-900">{thirdPanelTitle}</h3>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowThirdPanel(false);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">Title</h4>
                    <p className="text-sm text-gray-700">{thirdPanelData.title}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">Description</h4>
                    <p className="text-sm text-gray-700 leading-relaxed">{thirdPanelData.description}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">Category</h4>
                    <p className="text-sm text-gray-700">{thirdPanelData.category}</p>
                  </div>
                  {thirdPanelData.subcategory && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">Subcategory</h4>
                      <p className="text-sm text-gray-700">{thirdPanelData.subcategory}</p>
                    </div>
                  )}
                  {thirdPanelData.subsubcategory && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">Subsubcategory</h4>
                      <p className="text-sm text-gray-700">{thirdPanelData.subsubcategory}</p>
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">Hit Count</h4>
                    <p className="text-sm text-gray-700">{thirdPanelData.hitCount}</p>
                  </div>
                  <div className="pt-4">
                    <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                      Use This Workflow
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Sidebar;
