import React, { useState, useEffect, useContext } from 'react';

import { AuthContext } from '@/utils/app/azureAD';

import { OpenAIModels } from '@/types/openai';

import { FileAttachmentMini } from '@/components/UI/Attachments';
import { authenticatedFetch } from '@/utils/app/csrf';

const AgentCreation = ({ workflowData, isEditMode = false }) => {
  const [isSaving, setIsSaving] = useState(false);
  const authContext = useContext(AuthContext);
  useEffect(() => {
    // Only add styles once to prevent layout shift
    const existingStyle = document.getElementById('agentcreation-styles');
    if (existingStyle) return; // Styles already added

    const style = document.createElement('style');
    style.id = 'agentcreation-styles'; // Add ID to prevent duplicates
    style.textContent = `
      .hide-scrollbar::-webkit-scrollbar {
        display: none;
      }
      .hide-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      .agent-creation-container * {
        box-sizing: border-box;
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

  const [citationEnabled, setCitationEnabled] = useState(false);
  const [groundingEnabled, setGroundingEnabled] = useState(false);
  const [selectedServiceLine, setSelectedServiceLine] = useState('');
  const [triggerChips, setTriggerChips] = useState([]);
  const [triggerInput, setTriggerInput] = useState('');
  const [microservices, setMicroservices] = useState([]);
  const [isServiceLineOpen, setIsServiceLineOpen] = useState(false);
  const [isModelOpen,setIsModelOpen]=useState(false);
  const [showToolMenu, setShowToolMenu] = useState(false);

  // NEW: Form fields for agent data
  const [agentName, setAgentName] = useState('');
  const [agentDescription, setAgentDescription] = useState(''); // NEW: Agent description
  const [instructions, setInstructions] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]); // NEW: Uploaded files from conversation

  // NEW: Dynamic options from JSON data
  const [serviceLineOptions, setServiceLineOptions] = useState([]);
  const [modelOptions, setModelOptions] = useState([]);
  const handleFileChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setUploadedFiles((prev) => [...prev, ...newFiles]); // append only
    }
  };
  // File type icons (from teamspace.tsx)
  const pdfIconSVG = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.5858 2L8.99998 2.00005C6.79085 2.00006 5 3.79092 5 6.00005V26.0001C5 28.2092 6.79086 30.0001 9 30.0001H23C25.2091 30.0001 27 28.2092 27 26.0001V11.4142C27 11.149 26.8946 10.8946 26.7071 10.7071L18.2929 2.2929C18.1054 2.10536 17.851 2 17.5858 2Z" fill="#FFE5E5"/><path d="M10 20h4v-4h-4v4zm0 4h4v-2h-4v2zm6-8v8h6v-8h-6z" fill="#F63C33"/><path d="M22 11H27L18 2V7C18 9.20914 19.7909 11 22 11Z" fill="#FFA098"/></svg>`;

  const wordIconSVG = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.5858 2L8.99998 2.00005C6.79085 2.00006 5 3.79092 5 6.00005V26.0001C5 28.2092 6.79086 30.0001 9 30.0001H23C25.2091 30.0001 27 28.2092 27 26.0001V11.4142C27 11.149 26.8946 10.8946 26.7071 10.7071L18.2929 2.2929C18.1054 2.10536 17.851 2 17.5858 2Z" fill="#E5F3FF"/><path d="M10 20h12v-2H10v2zm0 4h8v-2h-8v2zm0-8h12v-2H10v2z" fill="#2B7CD3"/><path d="M22 11H27L18 2V7C18 9.20914 19.7909 11 22 11Z" fill="#9ACBFF"/></svg>`;

  const excelIconSVG = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.5858 2L8.99998 2.00005C6.79085 2.00006 5 3.79092 5 6.00005V26.0001C5 28.2092 6.79086 30.0001 9 30.0001H23C25.2091 30.0001 27 28.2092 27 26.0001V11.4142C27 11.149 26.8946 10.8946 26.7071 10.7071L18.2929 2.2929C18.1054 2.10536 17.851 2 17.5858 2Z" fill="#E5FFE5"/><path d="M10 14h4v4h-4v-4zm5 0h4v4h-4v-4zm5 0h4v4h-4v-4zm-10 5h4v4h-4v-4zm5 0h4v4h-4v-4zm5 0h4v4h-4v-4z" fill="#107C10"/><path d="M22 11H27L18 2V7C18 9.20914 19.7909 11 22 11Z" fill="#A4E8A4"/></svg>`;

  const pptIconSVG = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.5858 2L8.99998 2.00005C6.79085 2.00006 5 3.79092 5 6.00005V26.0001C5 28.2092 6.79086 30.0001 9 30.0001H23C25.2091 30.0001 27 28.2092 27 26.0001V11.4142C27 11.149 26.8946 10.8946 26.7071 10.7071L18.2929 2.2929C18.1054 2.10536 17.851 2 17.5858 2Z" fill="#FFF0E5"/><path d="M10 14h12v2H10v-2zm0 4h12v2H10v-2zm0 4h8v2h-8v-2z" fill="#D24726"/><path d="M22 11H27L18 2V7C18 9.20914 19.7909 11 22 11Z" fill="#FFB299"/></svg>`;

  const imageIconSVG = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.5858 2L8.99998 2.00005C6.79085 2.00006 5 3.79092 5 6.00005V26.0001C5 28.2092 6.79086 30.0001 9 30.0001H23C25.2091 30.0001 27 28.2092 27 26.0001V11.4142C27 11.149 26.8946 10.8946 26.7071 10.7071L18.2929 2.2929C18.1054 2.10536 17.851 2 17.5858 2Z" fill="#FFF5E5"/><path d="M12 18l4-4 4 4 3-3v7H9v-4z" fill="#FFA500"/><circle cx="14" cy="14" r="2" fill="#FFA500"/><path d="M22 11H27L18 2V7C18 9.20914 19.7909 11 22 11Z" fill="#FFD699"/></svg>`;

  const textIconSVG = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.5858 2L8.99998 2.00005C6.79085 2.00006 5 3.79092 5 6.00005V26.0001C5 28.2092 6.79086 30.0001 9 30.0001H23C25.2091 30.0001 27 28.2092 27 26.0001V11.4142C27 11.149 26.8946 10.8946 26.7071 10.7071L18.2929 2.2929C18.1054 2.10536 17.851 2 17.5858 2Z" fill="#F5F5F5"/><path d="M10 12h12v1H10v-1zm0 3h12v1H10v-1zm0 3h12v1H10v-1zm0 3h8v1h-8v-1z" fill="#666"/><path d="M22 11H27L18 2V7C18 9.20914 19.7909 11 22 11Z" fill="#CCC"/></svg>`;

  const defaultFileIconSVG = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.5858 2L8.99998 2.00005C6.79085 2.00006 5 3.79092 5 6.00005V26.0001C5 28.2092 6.79086 30.0001 9 30.0001H23C25.2091 30.0001 27 28.2092 27 26.0001V11.4142C27 11.149 26.8946 10.8946 26.7071 10.7071L18.2929 2.2929C18.1054 2.10536 17.851 2 17.5858 2Z" fill="#E5E7EB"/><path d="M22 11H27L18 2V7C18 9.20914 19.7909 11 22 11Z" fill="#D1D5DB"/></svg>`;

  // Get file icon based on extension (from teamspace.tsx)
  const getFileIcon = (fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return pdfIconSVG;
      case 'doc':
      case 'docx':
        return wordIconSVG;
      case 'xls':
      case 'xlsx':
        return excelIconSVG;
      case 'ppt':
      case 'pptx':
        return pptIconSVG;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
        return imageIconSVG;
      case 'txt':
        return textIconSVG;
      default:
        return defaultFileIconSVG;
    }
  };

  const supportingServices = [
    { id: 'doc-gen', name: 'Document Generation', icon: '📄' },
    { id: 'outlook', name: 'Call Outlook', icon: '📧' },
    { id: 'translation', name: 'Translation', icon: '🌐' },
    { id: 'pdf-parser', name: 'PDF Parser', icon: '📑' },
    { id: 'data-analysis', name: 'Data Analysis', icon: '📊' },
    { id: 'web-scraping', name: 'Web Scraping', icon: '🕷️' },
    { id: 'api-integration', name: 'API Integration', icon: '🔌' },
    { id: 'file-converter', name: 'File Converter', icon: '🔄' },
    { id: 'ocr', name: 'OCR Scanner', icon: '🔍' },
    { id: 'scheduler', name: 'Task Scheduler', icon: '⏰' },
  ];

  const addTriggerChip = () => {
    if (triggerInput.trim() && !triggerChips.includes(triggerInput.trim())) {
      setTriggerChips([...triggerChips, triggerInput.trim()]);
      setTriggerInput('');
    }
  };

  const removeTriggerChip = (chipToRemove) => {
    setTriggerChips(triggerChips.filter((chip) => chip !== chipToRemove));
  };

  const addMicroservice = (serviceId) => {
    const service = supportingServices.find((s) => s.id === serviceId);
    if (service && !microservices.some((ms) => ms.id === serviceId)) {
      setMicroservices([...microservices, { ...service, isActive: true }]);
    }
    setShowToolMenu(false);
  };

  const removeMicroservice = (serviceId) => {
    setMicroservices(
      microservices.filter((service) => service.id !== serviceId),
    );
  };

  // NEW: Function to populate form from workflow JSON
  const populateFormFromWorkflow = (workflowData) => {
    console.log(
      '🔄 Populating AgentCreation form with workflow data:',
      workflowData,
    );

    // Set Agent Name from title
    if (workflowData.title) {
      console.log('✅ Setting Agent Name:', workflowData.title);
      setAgentName(workflowData.title);
    } else {
      console.log('⚠️ No title in workflowData');
    }

    // NEW: Set Agent Description from description
    if (workflowData.description) {
      console.log('✅ Setting Agent Description:', workflowData.description);
      setAgentDescription(workflowData.description);
    } else {
      console.log('⚠️ No description in workflowData');
      setAgentDescription('');
    }

    // Set Service Line from category and dynamically add to options
    if (workflowData.category) {
      console.log('✅ Setting Service Line:', workflowData.category);
      // Add category to service line options if not already present
      setServiceLineOptions((prevOptions) => {
        if (!prevOptions.includes(workflowData.category)) {
          return [...prevOptions, workflowData.category];
        }
        return prevOptions;
      });

      // Set the selected service line to the category from JSON
      setSelectedServiceLine(workflowData.category);
    } else {
      console.log('⚠️ No category in workflowData');
    }

    // Set Instructions from prompt (check both 'prompt' and 'description' fields)
    if (workflowData.prompt) {
      console.log(
        '✅ Setting Instructions from prompt:',
        workflowData.prompt.substring(0, 50) + '...',
      );
      setInstructions(workflowData.prompt);
    } else if (workflowData.description) {
      console.log(
        '✅ Setting Instructions from description (fallback):',
        workflowData.description.substring(0, 50) + '...',
      );
      setInstructions(workflowData.description);
    } else {
      console.log('⚠️ No prompt or description in workflowData');
      setInstructions('');
    }

    // Set Model from model field and dynamically add to options
    if (workflowData.model) {
      console.log('✅ Setting Model:', workflowData.model);
      // Add model to model options if not already present
      setModelOptions((prevOptions) => {
        if (!prevOptions.includes(workflowData.model)) {
          return [...prevOptions, workflowData.model];
        }
        return prevOptions;
      });

      // Set the selected model to the model from JSON
      setSelectedModel(workflowData.model);
    } else {
      console.log('⚠️ No model in workflowData');
    }

    // Set triggers directly from workflow data (no second LLM call)
    if (
      workflowData.triggers &&
      Array.isArray(workflowData.triggers) &&
      workflowData.triggers.length > 0
    ) {
      console.log(
        '✅ Setting trigger keywords from workflow:',
        workflowData.triggers,
      );
      setTriggerChips(workflowData.triggers);
    } else {
      console.log(
        '⚠️ No triggers found in workflow data, setting empty array (you can add triggers manually)',
      );
      setTriggerChips([]);
    }

    // NEW: Set Citation from workflow data
    if (typeof workflowData.citation === 'boolean') {
      console.log('✅ Setting citation from workflow:', workflowData.citation);
      setCitationEnabled(workflowData.citation);
    } else {
      console.log(
        '⚠️ Citation field not found, defaulting to false (you can enable it manually)',
      );
      setCitationEnabled(false);
    }

    // NEW: Set Uploaded Files from workflow data
    console.log('📁 Checking files in workflowData:', {
      hasFiles: !!workflowData.files,
      isArray: Array.isArray(workflowData.files),
      filesType: typeof workflowData.files,
      filesValue: workflowData.files,
      filesLength: workflowData.files?.length,
    });

    if (
      workflowData.files &&
      Array.isArray(workflowData.files) &&
      workflowData.files.length > 0
    ) {
      console.log(
        '✅ Setting uploaded files from workflow:',
        workflowData.files,
      );
      console.log('📁 Files array length:', workflowData.files.length);
      console.log('📁 Files content:', JSON.stringify(workflowData.files));
      setUploadedFiles(workflowData.files.map((e)=>({name:e,size:100}))); // Create new array to ensure state update
    } else {
      console.log(
        '⚠️ No files found in workflow data or files is empty:',
        workflowData.files,
      );
      setUploadedFiles([]);
    }

    console.log('✅ Form population complete. Summary:', {
      agentName: workflowData.title || 'NOT SET',
      agentDescription: workflowData.description || 'NOT SET',
      selectedServiceLine: workflowData.category || 'NOT SET',
      instructions: workflowData.prompt
        ? workflowData.prompt.substring(0, 50) + '...'
        : 'NOT SET',
      selectedModel: workflowData.model || 'NOT SET',
      triggerKeywords: workflowData.triggers || [],
      citation:
        workflowData.citation !== undefined ? workflowData.citation : 'NOT SET',
      filesCount: workflowData.files?.length || 0,
    });
  };

  // NEW: Function to clear/reset form
  const clearForm = () => {
    setAgentName('');
    setAgentDescription(''); // NEW: Clear agent description
    setSelectedServiceLine('');
    setInstructions('');
    setSelectedModel('');
    setTriggerChips([]);
    setMicroservices([]);
    setCitationEnabled(false);
    setGroundingEnabled(false);
    setUploadedFiles([]); // NEW: Clear uploaded files
    // Clear dynamic options
    setServiceLineOptions([]);
    setModelOptions([]);
    console.log('Form cleared');
  };

  // NEW: Handle Save button click (for edit mode)
  const handleSaveAgent = async () => {
    if (!workflowData || !workflowData._id) {
      console.error('No workflow ID found for updating');
      alert('Cannot save: No workflow selected for editing');
      return;
    }

    if (!agentName || !agentDescription || !instructions || !selectedModel) {
      alert(
        'Please fill in Agent Name, Description, Instructions, and Model before saving',
      );
      return;
    }

    try {
      console.log('💾 Saving updated agent to DB...');

      const updatedWorkflow = {
        title: agentName,
        description: agentDescription, // NEW: Include description
        category: selectedServiceLine,
        prompt: instructions,
        model: selectedModel,
        triggers: triggerChips,
        citation: citationEnabled,
        files: uploadedFiles,
      };

      const response = await fetch(`/api/workflow/${workflowData._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer dev-id-token',
        },
        body: JSON.stringify(updatedWorkflow),
      });

      if (response.ok) {
        // Notify to refresh agent list
        window.dispatchEvent(new Event('agentSaved'));

        // Return to ChatWindow
        window.dispatchEvent(new Event('agentSaveComplete'));
      } else {
        const error = await response.text();
        console.error('Failed to update agent:', error);
        alert(`Failed to save: ${error}`);
      }
    } catch (error) {
      console.error('Error saving agent:', error);
      alert('An error occurred while saving');
    }
  };

  // NEW: Listen for workflow data from ChatWindow save operation
  useEffect(() => {
    console.log('👂 AgentCreation: Registering workflowSaved event listener');

    const handleWorkflowSaved = (event) => {
      console.log(
        '🎯 AgentCreation: workflowSaved event received:',
        event.detail,
      );

      if (event.detail && event.detail.workflowData) {
        console.log('📁 Files in event:', event.detail.workflowData.files);
        console.log('📊 Full workflow data:', event.detail.workflowData);
        populateFormFromWorkflow(event.detail.workflowData);
      } else {
        console.log('⚠️ Event detail or workflowData missing:', event.detail);
      }
    };

    // Listen for custom event from ChatWindow
    window.addEventListener('workflowSaved', handleWorkflowSaved);

    return () => {
      console.log('🔇 AgentCreation: Removing workflowSaved event listener');
      window.removeEventListener('workflowSaved', handleWorkflowSaved);
    };
  }, []);

  // 🆕 NEW AGENT SESSION: Listen for new agent button click
  useEffect(() => {
    const handleNewAgentSession = () => {
      console.log(
        '🆕 AgentCreation: New agent session started - Clearing form',
      );
      clearForm();
      console.log('✅ AgentCreation: Form cleared successfully');
    };

    window.addEventListener('newAgentSession', handleNewAgentSession);

    return () => {
      window.removeEventListener('newAgentSession', handleNewAgentSession);
    };
  }, []);

  // NEW: Populate form when workflowData prop changes (for edit mode)
  useEffect(() => {
    console.log('🔍 AgentCreation: workflowData changed:', {
      hasData: !!workflowData,
      workflowId: workflowData?._id,
      isEditMode: isEditMode,
      timestamp: new Date().toISOString(),
    });

    let timeoutId;

    if (workflowData && workflowData._id) {
      console.log(
        '📝 AgentCreation: Populating form with workflowData:',
        workflowData,
      );
      // Use requestAnimationFrame + longer setTimeout to ensure DOM is fully painted and ready
      // This handles component state updates properly
      requestAnimationFrame(() => {
        timeoutId = setTimeout(() => {
          console.log(
            '⏰ AgentCreation: Executing populateFormFromWorkflow after RAF + delay',
          );
          populateFormFromWorkflow(workflowData);
        }, 500);
      });
    } else if (!workflowData && isEditMode === false) {
      console.log(
        '🆕 AgentCreation: No workflowData and not in edit mode - clearing form',
      );
      clearForm();
    }

    sessionStorage.setItem('enableSave', 'true');

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [workflowData?._id, isEditMode]);

  useEffect(() => {
    if (agentName !== '' && uploadedFiles.length > 0) {
      sessionStorage.setItem('enableSave', 'false');
    }
  }, [agentName, uploadedFiles]);

  return (
    <div
      className="agent-creation-container bg-[#F2F6F7] dark:bg-[#121212]"
      style={{
        // backgroundColor: 'white',
        width: 'auto',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div
        style={{
          flex: 1,
          padding: '24px',
          paddingTop: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          overflowY: 'auto',
          textAlign: 'left',
        }}
        // className="hide-scrollbar"
      >
        {/* General Section */}
        <div className="bg-white dark:bg-[#2A2B2E] rounded-lg shadow-md p-6 border border-gray-200 dark:border-[#3A3B3D]">
          <h2
            style={{
              fontSize: '12px',
              fontWeight: '500',
              // color: '#111827',
              marginBottom: '8px',
              margin: '0 0 8px 0',
            }}
            className="dark:text-white text-black"
          >
            General
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <input
                type="text"
                placeholder="Agent name"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  // backgroundColor: '#F2F6F7',
                  border: 'none',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
                className="bg-gray-200 dark:bg-[#2e2e2e] hover:bg-[#e8ebec] dark:hover:bg-[#2e2e2e] dark:text-gray-200"
              />
            </div>

            {/* NEW: Agent Description Input */}
            <div>
              <textarea
                rows={2}
                placeholder="Agent description"
                value={agentDescription}
                onChange={(e) => setAgentDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  resize: 'none',
                  border: 'none',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
                className="bg-gray-200 dark:bg-[#2e2e2e] hover:bg-[#e8ebec] dark:hover:bg-[#2e2e2e] dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIsServiceLineOpen(!isServiceLineOpen)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  // backgroundColor: '#F2F6F7',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
                className="bg-gray-200 dark:bg-[#2e2e2e]  dark:hover:bg-[#2e2e2e] dark:text-gray-200"
              >
                <span className="dark:text-gray-300">
                  {selectedServiceLine || 'Select Service Line'}
                </span>
                <svg
                  style={{ width: '12px', height: '12px', color: '#6b7280' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  className="dark:text-gray-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {isServiceLineOpen && (
                <div
                  style={{
                    position: 'absolute',
                    zIndex: 10,
                    width: '100%',
                    marginTop: '1px',
                    border: '1px solid #e5e7eb',
                    boxShadow:
                      '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    maxHeight: '160px',
                    overflowY: 'auto',
                  }}
                  className="w-64  text-[16px] rounded-md  bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2e2e2e]"
                >
                  {[
                    'General Use Cases',
                    'Service Line',
                    ...serviceLineOptions.filter(
                      (opt) =>
                        opt !== 'General Use Cases' && opt !== 'Service Line',
                    ),
                  ].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setSelectedServiceLine(option);
                        setIsServiceLineOpen(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        textAlign: 'left',
                        fontSize: '12px',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        // backgroundColor:
                        //   selectedServiceLine === option
                        //     ? '#f9fafb'
                        //     : 'transparent',
                      }}
                      // onMouseEnter={(e) =>
                      //   (e.target.style.backgroundColor = '#f9fafb')
                      // }
                      // onMouseLeave={(e) =>
                      //   (e.target.style.backgroundColor =
                      //     selectedServiceLine === option
                      //       ? '#f9fafb'
                      //       : 'transparent')
                      // }
                      className="bg-transparent dark:bg-transparent  dark:hover:bg-[#2e2e2e] dark:text-gray-200"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Settings Section */}
        <div className="bg-white dark:bg-[#2A2B2E] rounded-lg shadow-md p-6 border border-gray-200 dark:border-[#3A3B3D]">
          <h2
            style={{
              fontSize: '12px',
              fontWeight: '500',
              // color: '#111827',
              marginBottom: '8px',
              margin: '0 0 8px 0',
            }}
            className="dark:text-gray-100 text-black"
          >
            Settings
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className='bg-gray-200 dark:bg-[#2e2e2e] px-2 pt-1 rounded-lg'>
              <label className='text-gray-400 dark:text-gray-500 text-xs'>Agent's Instruction</label>
              <textarea
                rows={isEditMode?10:4}
                placeholder=""
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                style={{
                  width: '100%',
                  fontSize: '12px',
                  resize: 'none',
                  // backgroundColor: '#F2F6F7',
                  border: 'none',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
                className="bg-transparent pt-1 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <div>
              <div
                style={{
                  borderRadius: '8px',
                  padding: '8px',
                  // backgroundColor: '#F2F6F7'
                }}
                className="bg-gray-200 dark:bg-[#2e2e2e] dark:text-gray-200"
              >
                <input
                  type="text"
                  placeholder="Add trigger"
                  value={triggerInput}
                  onChange={(e) => setTriggerInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTriggerChip();
                    }
                  }}
                  style={{
                    width: '100%',
                    // backgroundColor: 'transparent',
                    fontSize: '12px',
                    border: 'none',
                    outline: 'none',
                    marginBottom: '4px',
                    fontFamily: 'inherit',
                  }}
                  className="bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
                <div className='flex gap-2 items-center py-1'>
                <button
                  type="button"
                  onClick={addTriggerChip}
                  style={{
                    padding: '2px 8px',
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '10px',
                    backgroundColor: '#1A1F20',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                  className="dark:bg-[#3a3a3a] dark:hover:bg-[#4a4a4a]"
                >
                  Add
                </button>
              
                {triggerChips.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '4px',
                    }}
                  >
                    {triggerChips.map((chip, index) => (
                      <span
                        key={index}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '3px 10px',
                          // backgroundColor: '#dbeafe',
                          // color: '#1e40af',
                          fontSize: '12px',
                          borderRadius: '9999px',
                        }}
                        className="bg-gray-300 text-[#1e40af] dark:bg-[#1e1e1e] dark:text-gray-200"
                      >
                        {chip}
                        <button
                          type="button"
                          onClick={() => removeTriggerChip(chip)}
                          style={{
                            marginLeft: '4px',
                            // color: '#2563eb',
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontFamily: 'inherit',
                          }}
                          className="text-[#2563eb] dark:text-gray-400 hover:dark:text-gray-200"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                </div>
              </div>
            </div>

            <div className="opacity-50">
              <div className="hover-box" data-message="Not Active Yet">
                <>
                  {/* <label
                    style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      // color: '#374151',
                      display: 'block',
                      marginBottom: '8px',
                    }}
                    className="dark:text-gray-200 text-gray-900"
                  >
                    Microservices
                  </label> */}
                  <div
                    style={{
                      borderRadius: '8px',
                      padding: '8px',
                      // backgroundColor: '#F2F6F7',
                      // opacity: 0.5,
                      cursor: 'not-allowed',
                    }}
                    className="bg-gray-200 dark:bg-[#2E2E2E] "
                  >
                    <div
                      style={{ position: 'relative', cursor: 'not-allowed' }}
                      className="py-2"
                    >
                      {/* Microservices Input (TOP) */}
                      <input
                        type="text"
                        placeholder="Microservices"
                        style={{
                          width: '100%',
                          fontSize: '12px',
                          border: 'none',
                          outline: 'none',
                          marginBottom: '8px',
                          fontFamily: 'inherit',
                        }}
                        className="bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                      />

                      {/* Add Tool Button (BOTTOM) */}
                      <button
                        type="button"
                        disabled
                        style={{
                          padding: '2px 6px',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '10px',
                          backgroundColor: '#1A1F20',
                          border: 'none',
                          cursor: 'not-allowed',
                          // marginBottom: '4px',
                          fontFamily: 'inherit',
                          display: 'flex',
                          alignItems: 'center',
                          // gap: '4px',
                        }}
                        className="dark:bg-[#3a3a3a]"
                      >
                        <svg
                          style={{
                            width: '10px',
                            height: '10px',
                            cursor: 'not-allowed',
                          }}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          className="dark:bg-[#3a3a3a] text-white "
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 6v12m6-6H6"
                          />
                        </svg>

                        <span className="text-white ">Add Tool</span>
                      </button>
                    </div>
                  </div>
                </>
              </div>
            </div>
            <div><div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIsModelOpen(!isModelOpen)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  // backgroundColor: '#F2F6F7',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
                className="bg-gray-200 dark:bg-[#2e2e2e]  dark:hover:bg-[#2e2e2e] dark:text-gray-200"
              >
                <span className="dark:text-gray-300">
                  {Object.values(OpenAIModels).find((e)=>e.name===selectedModel)?.label || 'Select Model'}
                </span>
                <svg
                  style={{ width: '12px', height: '12px', color: '#6b7280' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  className="dark:text-gray-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {isModelOpen && (
                <div
                  style={{
                    position: 'absolute',
                    zIndex: 10,
                    width: '100%',
                    marginTop: '1px',
                    border: '1px solid #e5e7eb',
                    boxShadow:
                      '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    maxHeight: '160px',
                    overflowY: 'auto',
                  }}
                  className="w-64  text-[16px] rounded-md  bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2e2e2e]"
                >
                  {Object.values(OpenAIModels).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={(e) => {setSelectedModel(option.name);setIsModelOpen(false);}}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        textAlign: 'left',
                        fontSize: '12px',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        // backgroundColor:
                        //   selectedModel === option?.name
                        //     ? '#f9fafb'
                        //     : 'transparent',
                      }}
                      // onMouseEnter={(e) =>
                      //   (e.target.style.backgroundColor = '#f9fafb')
                      // }
                      // onMouseLeave={(e) =>
                      //   (e.target.style.backgroundColor =
                      //     selectedModel === option?.name
                      //       ? '#f9fafb'
                      //       : 'transparent')
                      // }
                      className="bg-transparent dark:bg-transparent  dark:hover:bg-[#2e2e2e] dark:text-gray-200"
                    >
                      {option?.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
              <div
                style={{
                  pointerEvents: 'none',
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  paddingRight: '8px',
                  // color: '#6b7280'
                }}
                className="dark:text-gray-400"
              >
                <svg
                  style={{ width: '14px', height: '14px' }}
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
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Toggle Options */}
        <div className="bg-white dark:bg-[#2A2B2E] rounded-lg shadow-md p-6 border border-gray-200 dark:border-[#3A3B3D] flex flex-col gap-3">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <div style={{ flex: 1, paddingRight: '10px' }}>
              <h3
                className=" text-gray-900 dark:text-gray-100"
                style={{ fontSize: '12px', fontWeight: '500', margin: 0 }}
              >
                Citation
              </h3>
              <p
                style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  marginTop: '2px',
                  margin: '2px 0 0 0',
                }}
              >
                Automatically generates accurate references for content produced
                by AI, ensuring transparency, credibility, and proper
                attribution of sources.
              </p>
            </div>
            <button
              onClick={() => setCitationEnabled(!citationEnabled)}
              style={{
                marginLeft: '12px',
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
              role="switch"
              aria-checked={citationEnabled}
            >
              <div
                style={{
                  width: '32px',
                  height: '20px',
                  borderRadius: '10px',
                  transition: 'background-color 0.2s ease-in-out',
                  backgroundColor: citationEnabled ? '#43B02A' : '#d1d5db',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    boxShadow:
                      '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                    transform: citationEnabled
                      ? 'translateX(14px)'
                      : 'translateX(4px)',
                    transition: 'transform 0.2s ease-in-out',
                    position: 'absolute',
                    top: '3px',
                  }}
                />
              </div>
            </button>
          </div>

          <div className=" flex justify-between items-start ">
            <div style={{ flex: 1, paddingRight: '10px' }}>
              <h3
                className=" text-gray-900 dark:text-gray-100"
                style={{ fontSize: '12px', fontWeight: '500', margin: 0 }}
              >
                Grounding
              </h3>
              <p
                style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  marginTop: '2px',
                  margin: '2px 0 0 0',
                }}
              >
                Ensures AI responses are based on trusted, verifiable sources,
                enhancing accuracy, relevance, and user trust in generated
                content.
              </p>
            </div>
            <button
              disabled
              style={{
                marginLeft: '12px',
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'not-allowed',
              }}
              role="switch"
              aria-checked={groundingEnabled}
            >
              <div
                style={{
                  width: '32px',
                  height: '20px',
                  borderRadius: '10px',
                  transition: 'background-color 0.2s ease-in-out',
                  backgroundColor: '#d1d5db',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    boxShadow:
                      '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                    transform: 'translateX(4px)',
                    transition: 'transform 0.2s ease-in-out',
                    position: 'absolute',
                    top: '3px',
                  }}
                />
              </div>
            </button>
          </div>
        </div>

        {/* Files Section - NEW: Display uploaded files from conversation */}
        <div className=" bg-white dark:bg-[#2A2B2E] rounded-lg shadow-md p-6 border border-gray-200 dark:border-[#3A3B3D]">
          <h2
            style={{
              fontSize: '12px',
              fontWeight: '500',
              // color: '#111827',
              marginBottom: '8px',
              margin: '0 0 8px 0',
            }}
            className=" text-gray-900 dark:text-gray-100"
          >
            Files
          </h2>

          <div className="border-dashed border-2 block border-gray-300 h-52 dark:border-[#3A3B3D] p-6 rounded-lg  dark:bg-[#1E1F22]">
            <div className="">
              <div className="text-center flex flex-col items-center justify-center">
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  Drag the documents (JPG, Word, TXT, PDF, PPT, XLS)
                </div>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="fileInput"
                />
                <label
                  htmlFor="fileInput"
                  className="mt-2 w-full bg-gray-200 dark:bg-[#3A3B3D] text-gray-700 dark:text-gray-200 px-3 py-1 rounded-lg cursor-pointer hover:bg-gray-300 dark:hover:bg-[#2A2B2E]"
                >
                  + Select document
                </label>
                {uploadedFiles && uploadedFiles.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-3">
                    {uploadedFiles.map((fileName, index) => (
                      <FileAttachmentMini
                        key={index}
                        file={fileName}
                        index={index}
                        removeUploadedFile={() => {
                          const newFiles = uploadedFiles.filter(
                            (_, i) => i !== index,
                          );
                          setUploadedFiles(newFiles);
                        }}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Save Button (shown in edit mode) */}
        {
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            <button
              onClick={async () => {
                setIsSaving(true);
                try {
                  console.log('💾 Saving edited agent:', workflowData);

                  // Prepare updated agent data
                  const updatedAgentData = isEditMode
                    ? {
                        ...workflowData,
                        title: agentName,
                        prompt: instructions,
                        description: agentDescription,
                        model: selectedModel,
                        category: selectedServiceLine,
                        triggers: triggerChips,
                        citation: citationEnabled,
                        files: uploadedFiles.map((f) => f.filename || f.name),
                        // Include all other existing workflow fields
                        // Override with new values
                        updatedAt: new Date().toISOString(),
                      }
                    : {
                        title: agentName,
                        description: agentDescription,
                        prompt: instructions,
                        model: selectedModel,
                        category: selectedServiceLine,
                        triggers: triggerChips,
                        citation: citationEnabled,
                        uploadRequired: false,
                        files: uploadedFiles.map((f) => f.filename || f.name),
                        createdBy: authContext?.user.email,
                        // Include all other existing workflow fields
                        // Override with new values
                        updatedAt: new Date().toISOString(),
                      };

                  console.log(
                    '📤 Sending update request with data:',
                    updatedAgentData,
                    agentName,
                  );

                  // Call API to update agent
                  const response = isEditMode
                    ? await authenticatedFetch(`/api/workflow/${workflowData?._id}`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(updatedAgentData),
                      })
                    : await authenticatedFetch(`/api/workflow`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(updatedAgentData),
                      });

                  if (!response.ok) {
                    throw new Error(
                      `Failed to update agent: ${response.statusText}`,
                    );
                  }

                  const result = await response.json();

                  // Clear the form after successful save
                  console.log('🧹 Clearing form after successful save...');
                  clearForm();

                  // Dispatch event to exit edit mode and restore layout
                  if (workflowData?._id) {
                    window.dispatchEvent(new CustomEvent('agentSaved'));
                    window.dispatchEvent(
                      new CustomEvent('agentEditSaveComplete'),
                    );
                  } else {
                    window.dispatchEvent(new CustomEvent('agentSaved'));
                  }
                } catch (error) {
                  console.error('❌ Error updating agent:', error);
                  alert(`Error updating agent: ${error.message}`);
                } finally {
                  setIsSaving(false);
                }
              }}
              disabled={
                isSaving || !agentName || !agentDescription || !instructions
              }
              style={{
                padding: '4px 12px',
                backgroundColor: '#1a1f20',
                color: isSaving ? '#000000' : '#d1d5db',
                border: 'none',
                borderRadius: '9999px',
                width: isEditMode ? '' : '100%',
                textAlign: 'center',
                justifyContent: 'center',
                padding: isEditMode ? '4px 12px' : '10px',
                fontSize: '12px',
                fontWeight: '400',
                cursor:
                  isSaving || !agentName || !agentDescription || !instructions
                    ? 'not-allowed'
                    : 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity:
                  !agentName || !agentDescription || !instructions ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (
                  !isSaving &&
                  agentName &&
                  agentDescription &&
                  instructions
                ) {
                  e.currentTarget.style.backgroundColor = '#374151';
                }
              }}
              onMouseLeave={(e) => {
                if (
                  !isSaving &&
                  agentName &&
                  agentDescription &&
                  instructions
                ) {
                  e.currentTarget.style.backgroundColor = '#1a1f20';
                }
              }}
            >
              {isSaving ? (
                <>
                  <svg
                    style={{
                      width: '16px',
                      height: '16px',
                      animation: 'spin 1s linear infinite',
                    }}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      style={{ opacity: 0.25 }}
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      style={{ opacity: 0.75 }}
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <style>
                    {`@keyframes spin { to { transform: rotate(360deg); } }`}
                  </style>
                  <span style={{ color: '#000000', fontWeight: '500' }}>
                    Saving...
                  </span>
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ width: '16px', height: '16px' }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                    />
                  </svg>
                  <span>Save</span>
                </>
              )}
            </button>
          </div>
        }
      </div>
    </div>
  );
};

export default AgentCreation;
