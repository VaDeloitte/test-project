
import React, { useState, useEffect, useContext } from 'react';

import { useRouter } from 'next/router';

import { WorkflowI } from '@/types/workflow';

import ListSelectBox, { type Workflow } from './ListSelectBox';

import { v4 as uuidv4 } from 'uuid';

import { AuthContext } from '@/utils/app/azureAD';
import { getAuthHeaders } from '@/utils/app/csrf';

interface AgentSelectorProp {
  handleActivateWorkflow: (workflow: any) => void;
}

const AgentSelector: React.FC<AgentSelectorProp> = (props) => {
  const router = useRouter();
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  
  const [options1, setOptions1] = useState<Workflow[]>([]);
  const [options2, setOptions2] = useState<Workflow[]>([]);
  const [selectedOption1, setSelectedOption1] = useState<Workflow | null>(null);
  const [selectedOption2, setSelectedOption2] = useState<Workflow | null>(null);
  const hasFetchedRef = React.useRef(false);

  useEffect(() => {
    if (!user?.idToken) {
      console.log('[AgentSelector]: ⏳ Waiting for user token...');
      return;
    }

    if (hasFetchedRef.current) {
      console.log('[AgentSelector]: ✅ Already fetched, skipping...');
      return;
    }

    console.log('[AgentSelector]: ✅ User token available, fetching workflows...');
    hasFetchedRef.current = true;

    const fetchOptions = async () => {
      try {
        // Validate and refresh token before making API call
        let validToken = user.idToken;
        if (authContext?.validateAndRefreshToken && validToken) {
          validToken = await authContext.validateAndRefreshToken(validToken) || validToken;
        }
        
        // Fetch General Use Cases
        const res1 = await fetch(
          '/api/workflow?category=General Use Cases&n=20',
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${validToken}`,
            },
            credentials: 'include',
          }
        );

        if (!res1.ok) {
          console.error(`[AgentSelector]: Failed to fetch General Use Cases: ${res1.status}`);
          return;
        }

        const data1 = await res1.json();
        if (data1.workflows && Array.isArray(data1.workflows)) {
          const workflows1 = data1.workflows.filter(
            (w: Workflow) =>
              w.category === 'General Use Cases' &&
              (!w.workflowType || w.workflowType === 'workflow'),
          );
          setOptions1(workflows1);
        }

        // Fetch Service Line workflows filtered by user's service line  
        const res2 = await fetch(`/api/workflow?category=Service Lines&subcategory=${user?.serviceLine}&n=20`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${validToken}`,
          },
          credentials: 'include',
        });

        if (!res2.ok) {
          console.error(`[AgentSelector]: Failed to fetch Service Lines: ${res2.status}`);
          return;
        }

        const data2 = await res2.json();
        
        // Get user's service line from localStorage or context
        const userServiceLine = user?.serviceLine ||
                               localStorage.getItem('userServiceLine') || 
                               'Value Added Tax (VAT)'; // Default fallback
        console.log("user?.serviceLine :",user?.serviceLine)
        console.log("===data2====", data2)
        const workflows2 = data2.workflows.filter(
          (w: Workflow) =>
            w.category === 'Service Lines' &&
            w.subcategory === userServiceLine &&
            (!w.workflowType || w.workflowType === 'workflow'),
        );

        console.log("user?.serviceLine :", workflows2)
        
        setOptions2(workflows2);
      } catch (err) {
        console.error('[AgentSelector]: Failed to fetch workflows:', err);
      }
    };
    
    fetchOptions();
  }, [user?.idToken]); // Only re-fetch when token changes

  const handleWorkflowSelect = async (workflow: Workflow | null) => {
    if (!workflow) return;
    if (workflow.uploadRequired) {
      alert(`Upload required: ${workflow.uploadDescription}`);
      return;
    }
    localStorage.removeItem('file');
    // const id = `${uuidv4()}_${workflow._id}`;
    // await router.push(`/chat?id=${id}&wid=${workflow._id}`);
    props.handleActivateWorkflow(workflow);
  };

  return (
    <div className="absolute top-[80px] md:left-0 md:right-0 right-2 left-2 flex flex-col items-center">
      <h1 className="text-base md:text-[16px] font-semibold text-gray-900 dark:text-white mb-3 text-center">
        Select an Agent or give Tax Genie an instruction below
      </h1>

      <div
        className="flex
   lg:flex-row flex-col  justify-center items-center gap-5"
      >
        <div className="flex justify-center">
          <ListSelectBox
            options={options1}
            selected={selectedOption1}
            onClick={()=>{
              window.dispatchEvent(new Event("close-all-dropdowns"));
            }}
            onChange={(option) => {
              setSelectedOption1(option);
              handleWorkflowSelect(option);
            }}
            getOptionLabel={(option) => option.title}
            className="w-64 dropdown1 h-10 text-[16px] rounded-md  bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2e2e2e]"
            placeholder={{ title: 'Top 20 Cross Functional Agents' }}
          />
        </div>

        <div className="flex justify-center">
          <ListSelectBox
           onClick={()=>{
              window.dispatchEvent(new Event("close-all-dropdowns"));
            }}
            options={options2}
            selected={selectedOption2}
            onChange={(option) => {
              setSelectedOption2(option);
              handleWorkflowSelect(option);
            }}
            getOptionLabel={(option) => option.title}
            className="w-64 h-10 dropdown2 text-sm rounded-md  bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2e2e2e]"
            placeholder={{ 
              title: 'Top 20 Service Line Agents' 
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default AgentSelector;

