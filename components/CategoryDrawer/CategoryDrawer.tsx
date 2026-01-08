import { useContext, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { Tooltip } from 'react-tooltip';

import { useRouter } from 'next/router';

import { fetchWorkflows, getWorkflowById } from '@/services/workflowService';

import { AuthContext } from '@/utils/app/azureAD';
import {
  filterServiceLineWorkflows,
  filterTGAgentWorkflows,
  isPublishedWorkflow,
} from '@/utils/workflowUtils';

import { RateAgent } from '../Folder/NewComp/RatingAndReviewComponent';

import { v4 as uuidv5 } from 'uuid';
import { authenticatedFetch } from '@/utils/app/csrf';

export default function CategoryDrawer({ heading, open, close }: any) {
  const portalRoot = document.getElementById('portal-root');
  if (!portalRoot) return null; // safety check

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>('');
  const authContext = useContext(AuthContext);
  const [rating, setRating] = useState({value:'',id:""});
  const validateAndRefreshToken = authContext?.validateAndRefreshToken;
  const [selectedSubcategoryIndex, setselectedSubcategoryIndex] = useState<
    null | number
  >(null);
  const [data, setData] = useState({
    agents: [],
    serviceLine: [],
    tgAgents: [],
  });
  const router = useRouter();
  const [thirdPanelData, setThirdPanelData] = useState<any>({});
  const [rightPanelData, setRightPanelData] = useState<any>([]);
  const [selectedSubsubcategoryIndex, setSelectedSubsubcategoryIndex] =
    useState<null | number>(null);
  const [serviceLineRightPanelData, setServiceLineRightPanelData] = useState(
    [],
  );
   const [enableFunctionRightPanelData, setEnableFunctionRightPanelData] = useState(
    [],
  );
  const [workflows, setWorkflows] = useState([]);
  const [enablingWorkflows, setEnablingWorkflows] = useState([]);
  const [serviceLineWorkflows, setServiceLineWorkflows] = useState([]);
  const [tgAgentWorkflows, setTGAgentWorkflows] = useState([]);
  const user = authContext?.user;
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>({});
  const [serviceLineThirdPanelData, setServiceLineThirdPanelData] =
    useState<any>({});
  const [enableFunctionThirdPanelData,setEnableFunctionThirdPanelData]=useState<any>({})
  const [title, setTitle] = useState({
    subTitle: '',
    setSubSubTitle: '',
    serviceLineTitle: '',
    serviceLineSubTitle: '',
    setSubSubSubTitle: '',
  });
  const [titleId, setTitltId] = useState({
    subTitle: '',
    setSubSubTitle: '',
    serviceLineTitle: '',
    enableTitle:"",
    serviceLineSubTitle: '',
    setSubSubSubTitle: '',
  });

  useEffect(() => {
    setRightPanelData([]);
    setEnableFunctionRightPanelData([]);
    setEnableFunctionThirdPanelData({});
    setServiceLineRightPanelData([]);
    setThirdPanelData({});
    setSelectedWorkflow({});
    setServiceLineThirdPanelData({});
  }, [heading]);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      setError(null);
      const idToken = user?.idToken || '';
      const params: any = { workflowType: 'workflow' }; // Use the same fetchWorkflows function with proper parameters as in Workflows.tsx
      const response = await fetchWorkflows(
        idToken,
        authContext?.validateAndRefreshToken,
        params,
      );
      if (response?.workflows) {
        const generalUseCasesWorkflows = response.workflows.filter(
          (w: any) => w.category === 'General Use Cases',
        );
        setWorkflows(generalUseCasesWorkflows);
        console.log(generalUseCasesWorkflows,'generalUseCasesWorkflows')
        const enablingFunctionsWorkflows = response.workflows.filter(
          (w: any) => w.category === 'Enabling Functions' || w.category === 'Enabling Function',
        );
        setEnablingWorkflows(enablingFunctionsWorkflows);
      } else {
        setError('No workflows received from API');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadServiceLineWorkflows = async () => {
    try {
      setLoading(true);
      setError(null);

      const idToken = user?.idToken || '';
      const params: any = {
        workflowType: 'workflow',
      };

      // Use the same fetchWorkflows function with proper parameters as in Workflows.tsx
      const response = await fetchWorkflows(
        idToken,
        authContext?.validateAndRefreshToken,
        params,
      );


      if (response?.workflows) {
        const serviceLineWorkflowsData = filterServiceLineWorkflows(
          response.workflows,
        );

       
        setServiceLineWorkflows(serviceLineWorkflowsData);
      } else {
        setError('No workflows received from API');
      }
    } catch (error: any) {
      setError(`Error fetching workflows: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getSubcategories = () => {
    const subcategories = [
      ...new Set(
        workflows
          .filter((w: any) => w.subcategory)
          .map((w: any) => w.subcategory)
          .filter(Boolean),
      ),
    ];

    return subcategories.sort();
  };

  const getActualSubcategories = (mainCategory: any) => {
    const subcategories = [
      ...new Set(
        workflows
          .filter(
            (w: any) => w.subcategory === mainCategory && w.subsubcategory,
          )
          .map((w: any) => w.subsubcategory)
          .filter(Boolean),
      ),
    ];
    return subcategories.sort();
  };

  const getEnableActualSubcategories = (mainCategory: any) => {
    const subcategories = [
      ...new Set(
        enablingWorkflows
          .filter(
            (w: any) => w.subcategory === mainCategory && w.subsubcategory,
          )
          .map((w: any) => w.subsubcategory)
          .filter(Boolean),
      ),
    ];
    return subcategories.sort();
  };

  // Service Lines helper functions
  const getServiceLineSubcategories = () => {
    // Get unique subcategories from Service Lines workflows
    const subcategories = [
      ...new Set(
        serviceLineWorkflows
          .filter((w: any) => w.subcategory) // Only workflows with subcategory
          .map((w: any) => w.subcategory)
          .filter(Boolean),
      ),
    ];
    return subcategories.sort();
  };

  const getEnablingFunctionSubcategories=()=>{
    const subcategories=[
      ...new Set(
        enablingWorkflows.filter((w:any)=>w.subcategory)
        .map((w:any)=>w.subcategory)
        .filter(Boolean),
      )
    ];
    return subcategories.sort();
  }

  const getServiceLineSubsubcategories = (subcategory: any) => {
    const subsubcategories = [
      ...new Set(
        serviceLineWorkflows
          .filter((w: any) => w.subcategory === subcategory && w.subsubcategory)
          .map((w: any) => w.subsubcategory)
          .filter(Boolean),
      ),
    ];
    return subsubcategories.sort();
  };

    const getEnableFunctionSubsubcategories = (subcategory: any) => {
    const subsubcategories = [
      ...new Set(
        enablingWorkflows
          .filter((w: any) => w.subcategory === subcategory && w.subsubcategory)
          .map((w: any) => w.subsubcategory)
          .filter(Boolean),
      ),
    ];
    return subsubcategories.sort();
  };

  // Fetch workflows when TG Agents is opened
  useEffect(() => {
    loadServiceLineWorkflows();
    loadWorkflows();
  }, []);

  const handleMainCategoryClick = (mainCategory: any) => {
    // Check if this main category has any subcategories

    const subcategories: any = getActualSubcategories(mainCategory);
    if (subcategories.length > 0) {
      // Show subcategories in right panel
      setRightPanelData(subcategories);
    } else {
      // Show workflows directly in right panel
      const workflows = getTitles(mainCategory, '', '');
      setRightPanelData(workflows);
    }
  };

  const handleEnableMainCategoryClick=(mainCategory:any)=>{

    const subcategories: any = getEnableActualSubcategories(mainCategory);
    if (subcategories.length > 0) {
      // Show subcategories in right panel
      setEnableFunctionRightPanelData(subcategories);
    } else {
      // Show workflows directly in right panel
      const workflows = getTitles(mainCategory, '', '');
      setEnableFunctionRightPanelData(workflows);
    }
  }
  // Service Lines navigation handlers
  const handleServiceLineSubcategoryClick = (subcategory: any) => {
    // Check if this subcategory has any subsubcategories
    const subsubcategories: any = getServiceLineSubsubcategories(subcategory);
    if (subsubcategories.length > 0) {
      // Show subsubcategories in right panel
       setTitltId({
        ...titleId,
        enableTitle:"",
        serviceLineTitle: subcategory,
      });
      setServiceLineRightPanelData(subsubcategories);
    } else {
      const parent: any = serviceLineWorkflows.find((e: any) =>
        e.subcategory?.includes(subcategory),
      );
      setTitle({
        ...title,
        setSubSubSubTitle: parent.subcategory,
      });
      setTitltId({
        ...titleId,
         serviceLineTitle: subcategory,
        setSubSubSubTitle: parent?._id,
      });
      setSelectedWorkflow(parent);
      // setServiceLineRightPanelData(workflows);
    }
  };
   const handleEnableFunctionSubcategoryClick = (subcategory: any) => {
    // Check if this subcategory has any subsubcategories
    const subsubcategories: any = getEnableFunctionSubsubcategories(subcategory);
    if (subsubcategories.length > 0) {
      // Show subsubcategories in right panel
      setEnableFunctionRightPanelData(subsubcategories);
    } else {
      const parent: any = enablingWorkflows.find((e: any) =>
        e.subcategory.includes(subcategory),
      );
      setTitle({
        ...title,
        setSubSubSubTitle: parent.subcategory,
      });
      setTitltId({
        ...titleId,
        setSubSubSubTitle: parent?._id,
      });
      setSelectedWorkflow(parent);
      // setServiceLineRightPanelData(workflows);
    }
  };

  
  

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

  const getServiceLineTitles = (subcategory: any, subsubcategory: any) => {
    if (subsubcategory) {
      // Filter by both subcategory and subsubcategory
      return serviceLineWorkflows.filter(
        (w: any) =>
          w.subcategory === subcategory && w.subsubcategory === subsubcategory,
      );
    } else {
      // Filter by subcategory only
      return serviceLineWorkflows.filter(
        (w: any) =>
          w.subcategory === subcategory &&
          (!w.subsubcategory || w.subsubcategory === ''),
      );
    }
  };
  const getEnableFunctionTitles = (subcategory: any, subsubcategory: any) => {
    if (subsubcategory) {
      // Filter by both subcategory and subsubcategory
      return enablingWorkflows.filter(
        (w: any) =>
          w.subcategory === subcategory && w.subsubcategory === subsubcategory,
      );
    } else {
      // Filter by subcategory only
      return enablingWorkflows.filter(
        (w: any) =>
          w.subcategory === subcategory &&
          (!w.subsubcategory || w.subsubcategory === ''),
      );
    }
  };

  // Get titles for selected category/subcategory
  const getTitles = (
    mainCategory: any,
    subcategory: any,
    subsubcategory: any,
  ) => {
    if (subsubcategory) {
      // If we have a subsubcategory, filter by all three levels
      return workflows.filter(
        (w: any) =>
          w.subcategory === mainCategory && w.subsubcategory === subcategory,
      );
    } else if (subcategory) {
      // If we have subcategory, filter by main category and subcategory
      return workflows.filter(
        (w: any) =>
          w.subcategory === mainCategory && w.subsubcategory === subcategory,
      );
    } else {
      // If no subcategory, show all workflows for the main category
      return workflows.filter(
        (w: any) =>
          w.subcategory === mainCategory &&
          (!w.subsubcategory || w.subsubcategory === ''),
      );
    }
  };


  const handleAddRating=async(id:any,value:any,version:any)=>{
    const workflowData:any={
      rating:value,
      version:version,
      userId:user?.email
    }
     try {
      const response = await authenticatedFetch(`api/workflow/${id}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(workflowData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating/updating conversation:', error);
    }
  }


  function renderData() {
    if (heading.includes('Cross')) {
      return (
        <>
          <div>
            <div className="w-60 border-r h-[91.5vh] overflow-auto scrollbar-none border-gray-200 dark:border-gray-200 bg-white dark:bg-[#1E1E1E]">
              <h3 className="text-[14px] font-bold text-gray-700 dark:text-gray-100 px-4 py-2">
                {heading.replace('Agents', '')}
              </h3>

              <hr className="m-0 " />
              {getSubcategories().length === 0 ? (
                <div className="text-[12px] text-gray-500 dark:text-gray-400 text-center py-4">
                  No categories found. Check console for debugging info.
                </div>
              ) : (
                getSubcategories().map((category, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      //   // Clear other selections in this panel
                      setselectedSubcategoryIndex(index);
                      handleMainCategoryClick(category);
                      setThirdPanelData({});
                      setTitle({
                        subTitle: category,
                        setSubSubTitle: '',
                        serviceLineTitle: '',
                        serviceLineSubTitle: '',
                        setSubSubSubTitle: '',
                      });
                      setTitltId({
                        subTitle: category,
                        setSubSubTitle: '',
                        serviceLineTitle: '',
                        enableTitle:"",
                        serviceLineSubTitle: '',
                        setSubSubSubTitle: '',
                      });
                    }}
                    className={`w-full text-left p-3 px-4 text-[12px] cursor-pointer transition-colors 
              ${
                titleId.subTitle === category
                  ? 'text-gray-900 dark:text-white bg-[#F2F6F7] dark:bg-[#1E1E1E]'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2E2E2E] hover:text-[#43B02A]'
              }`}
                  >
                    {category}
                  </div>
                ))
              )}
            </div>
          </div>
          {rightPanelData.length > 0 && (
            <div className="overflow-y-auto w-60 h-[91.5vh] overflow-auto pr-0 scrollbar-none border-r border-gray-200 bg-white dark:border-gray-200 dark:bg-[#1E1E1E]">
              <h3 className="text-[14px] py-2 font-bold text-gray-700 dark:text-gray-100 px-4">
                Category
              </h3>

              <hr className="" />
              <div className="space-y-1">
                {rightPanelData.map(
                  (item: any, index: number) =>
                    isPublishedWorkflow(item) && (
                      <div
                        key={index}
                        className={`w-full text-left p-3 px-4 cursor-pointer text-[12px] transition-colors ${
                          titleId.setSubSubTitle === item ||
                          titleId.setSubSubTitle === item?._id
                            ? 'text-gray-900 dark:text-white bg-[#F2F6F7] dark:bg-[#1E1E1E]'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2E2E2E] hover:text-[#43B02A]'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSubsubcategoryIndex(index);
                          if (typeof item === 'string') {
                            const workflows = getTitles(
                              title.subTitle,
                              item,
                              '',
                            );
                            setRightPanelData(workflows);
                            setTitle({ ...title, setSubSubTitle: item });
                            setTitltId({
                              ...titleId,
                              setSubSubTitle: item,
                            });
                          } else {
                            // Handle workflow selection - open third panel with workflow details
                            setThirdPanelData(item);
                            setTitle({ ...title, setSubSubTitle: item?.title });
                            setTitltId({
                              ...titleId,
                              setSubSubTitle: item?._id,
                            });
                          }
                        }}
                      >
                        {typeof item === 'string' ? item : item.title}
                      </div>
                    ),
                )}
              </div>
            </div>
          )}
          {thirdPanelData?.title !== undefined && (
            <div className="w-64 scrollbar-none flex flex-col pointer-events-auto h-[91.5vh] overflow-auto bg-white dark:bg-[#1E1E1E] text-gray-900 dark:text-gray-100">
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-200">
                <div className="flex items-center space-x-2">
                  {/* <button 
                    onClick={(e) => {
                      e.stopPropagation();
                    //   setShowThirdPanel(false);
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button> */}
                  <h3 className="  text-[14px] font-bold text-[#43B02A] dark:text-white px-4 py-2">
                    Agent Description
                  </h3>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setThirdPanelData({});
                    // setShowThirdPanel(false);
                  }}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-none px-4 py-3">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-[12px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Title
                    </h4>
                    <p className="text-[12px] text-gray-700 dark:text-gray-300">
                      {thirdPanelData.title}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-[12px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Description
                    </h4>
                    <p className="text-[12px] text-gray-700 dark:text-gray-300 leading-relaxed">
                      {thirdPanelData.description}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-[12px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Category
                    </h4>
                    <p className="text-[12px] text-gray-700 dark:text-gray-300">
                      {thirdPanelData.category}
                    </p>
                  </div>
                  {thirdPanelData.subcategory && (
                    <div>
                      <h4 className="text-[12px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        Subcategory
                      </h4>
                      <p className="text-[12px] text-gray-700 dark:text-gray-300">
                        {thirdPanelData.subcategory}
                      </p>
                    </div>
                  )}
                  {thirdPanelData.subsubcategory && (
                    <div>
                      <h4 className="text-[12px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        Subsubcategory
                      </h4>
                      <p className="text-[12px] text-gray-700 dark:text-gray-300">
                        {thirdPanelData.subsubcategory}
                      </p>
                    </div>
                  )}
                  {/* <div>
                    <h4 className="text-[12px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Hit Count
                    </h4>
                    <p className="text-[12px] text-gray-700 dark:text-gray-300">
                      {thirdPanelData.hitCount}
                    </p>
                  </div> */}
                  <div>
                    <div className="">
                     <span className="text-left   text-[12px]  transition-colors dark:text-gray-300 text-gray-700 ">
                     <h4 className="text-[12px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Rating:
                    </h4>
                       {`${rating?.value||thirdPanelData?.rating?.avgRating||"No Rating"}`}
                    </span>
                    </div>
                  </div>
                  <div>{<RateAgent rating={thirdPanelData?.rating?.avgRating===0?rating:{value:thirdPanelData?.rating?.avgRating,id:thirdPanelData?._id}} setRating={(value:any)=>{setRating(value);handleAddRating(thirdPanelData?._id,value?.value,thirdPanelData?.version)}} id={thirdPanelData?._id} />} </div>
                  <div className="pt-4">
                    <button
                      onClick={() => handleAgentSelect(thirdPanelData)}
                      className="w-full bg-[#43B02A] rounded-md text-white cursor-pointer px-4 py-2 hover:bg-[#3a9d25] transition-colors"
                    >
                      Use This Agent
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      );
    } else {
      return (
        <div className='block'>
        <div className="flex ">
          <div className="w-60 border-r h-[92vh] overflow-auto scrollbar-none border-gray-200 dark:border-gray-200 bg-white dark:bg-[#1E1E1E]">
           <>
            <h3 className="text-[14px] font-bold text-gray-700 dark:text-gray-100 px-4 py-2">
              {heading.replace('Agents', '')}
            </h3>

            <hr className="" />
            {getServiceLineSubcategories().length === 0 ? (
              <div className="text-[12px] text-gray-500 dark:text-gray-400 text-center py-4">
                No Service Lines categories found.
              </div>
            ) : (
              getServiceLineSubcategories().map((subcategory, index) => (
                <div
                  key={index}
                  onClick={() => {
                    setTitle({
                      ...title,
                      serviceLineTitle: subcategory,
                      setSubSubSubTitle: '',
                      setSubSubTitle: '',
                      subTitle: '',
                    });
                    setTitltId({
                      ...titleId,
                      enableTitle:"",
                      serviceLineTitle: subcategory,
                    });
                    setServiceLineThirdPanelData({});
                    setEnableFunctionRightPanelData([]);
                    setEnableFunctionThirdPanelData({});
                    setServiceLineRightPanelData([]);
                    setSelectedWorkflow({});
                    handleServiceLineSubcategoryClick(subcategory);
                  }}
                  className={`w-full text-left p-3 cursor-pointer text-[12px] px-4 transition-colors ${
                    titleId.serviceLineTitle === subcategory
                      ? 'text-gray-900 dark:text-white bg-[#F2F6F7] dark:bg-[#2E2E2E]'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2E2E2E] hover:text-[#43B02A]'
                  }`}
                >
                  {subcategory}
                </div>
              ))
            )}
            </>
            {/* <div className="block "> */}
            {/* <h3 className="text-[14px] font-bold text-gray-700 dark:text-gray-100 px-4 py-2">
              Enabling Function Agents
            </h3>
            <hr className="" />
            {getEnablingFunctionSubcategories().length === 0 ? (
              <div className="text-[12px] text-gray-500 dark:text-gray-400 text-center py-4">
                No Service Lines categories found.
              </div>
            ) : (
              getEnablingFunctionSubcategories().map((subcategory, index) => (
                <div
                  key={index}
                  onClick={() => {
                    setTitle({
                      ...title,
                      serviceLineTitle: subcategory,
                      setSubSubSubTitle: '',
                      setSubSubTitle: '',
                      subTitle: '',
                    });
                    setTitltId({
                      ...titleId,
                      serviceLineTitle:"",
                      enableTitle: subcategory,
                    });
                    setEnableFunctionRightPanelData([]);
                    setEnableFunctionThirdPanelData({});
                    setServiceLineRightPanelData([]);
                    setServiceLineThirdPanelData({});
                    setSelectedWorkflow({});
                    handleEnableMainCategoryClick(subcategory);
                  }}
                  className={`w-full text-left p-3 cursor-pointer text-[12px] px-4 transition-colors ${
                    titleId.enableTitle === subcategory
                      ? 'text-gray-900 dark:text-white bg-[#F2F6F7] dark:bg-[#2E2E2E]'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2E2E2E] hover:text-[#43B02A]'
                  }`}
                >
                  {subcategory}
                </div>
              ))
            )} */}
          {/* </div> */}
         
          </div>
          {/* Service Lines Right Panel */}
          {serviceLineRightPanelData.length > 0 && (
            <div className="flex flex-col w-60 h-[92vh] overflow-auto scrollbar-none border-r border-gray-200 dark:border-gray-200 pointer-events-auto bg-white dark:bg-[#1E1E1E]">
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-200">
                <div className="flex items-center space-x-2">
                  <h3 className="text-[14px] font-bold  text-gray-700 dark:text-gray-100 px-4 py-2">
                    Category
                  </h3>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-none">
                <div className="space-y-1">
                  {serviceLineRightPanelData.map(
                    (item: any, index) =>
                      isPublishedWorkflow(item) && (
                        <div
                          key={index}
                          className={`w-full text-left p-3 cursor-pointer px-4 text-[12px] transition-colors ${
                            titleId.serviceLineSubTitle === item ||
                            titleId.serviceLineSubTitle === item?._id
                              ? 'text-gray-900 dark:text-white bg-[#F2F6F7] dark:bg-[#2E2E2E]'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2E2E2E] hover:text-[#43B02A]'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedWorkflow({});
                            if (typeof item === 'string') {
                              setTitle({ ...title, serviceLineSubTitle: item });
                              setTitltId({
                                ...titleId,
                                serviceLineSubTitle: item,
                              });
                              // Handle subsubcategory click - show workflows in third panel
                              const workflows = getServiceLineTitles(
                                title.serviceLineTitle,
                                item,
                              );
                              setServiceLineThirdPanelData(workflows);
                            } else {
                              // Handle workflow selection - just log for now
                              setTitle({
                                ...title,
                                serviceLineSubTitle: '',
                                setSubSubSubTitle: item?.title,
                              });
                              setTitltId({
                                ...titleId,
                                serviceLineSubTitle: item?._id,
                                setSubSubSubTitle: item?._id,
                              });
                              setSelectedWorkflow(item);
                            }
                          }}
                        >
                          {typeof item === 'string' ? item : item.title}
                        </div>
                      ),
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Service Lines Third Panel - Workflow Details */}
          {serviceLineThirdPanelData?.length > 0 && (
            <div className="flex flex-col w-60 h-[92vh] overflow-auto scrollbar-none pointer-events-auto border-r border-gray-200 dark:border-gray-200 bg-white dark:bg-[#1E1E1E]">
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-200">
                <div className="flex items-center">
                  <h3 className="text-[14px] font-bold  text-gray-700 dark:text-gray-100 px-4 py-2">
                    Sub-Category
                  </h3>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-none">
                {Array.isArray(serviceLineThirdPanelData) ? (
                  // Display list of workflows
                  <div className="space-y-1">
                    {serviceLineThirdPanelData.map((workflow, index) => (
                      <div
                        key={index}
                        onClick={() => {
                          setTitle({
                            ...title,
                            setSubSubSubTitle: workflow.title,
                          });
                          setTitltId({
                            ...titleId,
                            setSubSubSubTitle: workflow?._id,
                          });
                          setSelectedWorkflow(workflow);
                        }}
                      >
                        <div className="flex items-center justify-between ">
                          <div className="flex-1 text-left ">
                            <div
                              className={`${
                                selectedWorkflow?._id === workflow._id
                                  ? 'bg-[#F2F6F7] dark:bg-[#2E2E2E]'
                                  : ''
                              } px-4 p-3 w-full cursor-pointer text-left text-[12px] transition-colors text-gray-700 dark:text-gray-300`}
                            >
                              {workflow.title}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Display single workflow details (original functionality)
                  ''
                )}
              </div>
            </div>
          )}
      
           {/* Service Lines Right Panel */}
          {enableFunctionRightPanelData.length > 0 && (
            <div className="flex flex-col w-60 h-[92vh] overflow-auto scrollbar-none border-r border-gray-200 dark:border-gray-200 pointer-events-auto bg-white dark:bg-[#1E1E1E]">
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-200">
                <div className="flex items-center space-x-2">
                  <h3 className="text-[14px] font-bold  text-gray-700 dark:text-gray-100 px-4 py-2">
                    Category
                  </h3>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-none">
                <div className="space-y-1">
                  {enableFunctionRightPanelData.map(
                    (item: any, index) =>
                      isPublishedWorkflow(item) && (
                        <div
                          key={index}
                          className={`w-full text-left p-3 cursor-pointer px-4 text-[12px] transition-colors ${
                            titleId.serviceLineSubTitle === item ||
                            titleId.serviceLineSubTitle === item?._id
                              ? 'text-gray-900 dark:text-white bg-[#F2F6F7] dark:bg-[#2E2E2E]'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2E2E2E] hover:text-[#43B02A]'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedWorkflow({});
                            if (typeof item === 'string') {
                              setTitle({ ...title, serviceLineSubTitle: item });
                              setTitltId({
                                ...titleId,
                                serviceLineSubTitle: item,
                              });
                              // Handle subsubcategory click - show workflows in third panel
                              const workflows = getEnableFunctionTitles(
                                title.serviceLineTitle,
                                item,
                              );
                              setEnableFunctionThirdPanelData(workflows);
                            } else {
                              // Handle workflow selection - just log for now
                              setTitle({
                                ...title,
                                serviceLineSubTitle: '',
                                setSubSubSubTitle: item?.title,
                              });
                              setTitltId({
                                ...titleId,
                                serviceLineSubTitle: item?._id,
                                setSubSubSubTitle: item?._id,
                              });
                              setSelectedWorkflow(item);
                            }
                          }}
                        >
                          {typeof item === 'string' ? item : item.title}
                        </div>
                      ),
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Service Lines Third Panel - Workflow Details */}
          {enableFunctionThirdPanelData?.length > 0 && (
            <div className="flex flex-col w-60 h-[92vh] overflow-auto scrollbar-none pointer-events-auto border-r border-gray-200 dark:border-gray-200 bg-white dark:bg-[#1E1E1E]">
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-200">
                <div className="flex items-center">
                  <h3 className="text-[14px] font-bold  text-gray-700 dark:text-gray-100 px-4 py-2">
                    Sub-Category
                  </h3>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-none">
                {Array.isArray(enableFunctionThirdPanelData) ? (
                  // Display list of workflows
                  <div className="space-y-1">
                    {enableFunctionThirdPanelData.map((workflow, index) => (
                      <div
                        key={index}
                        onClick={() => {
                          setTitle({
                            ...title,
                            setSubSubSubTitle: workflow.title,
                          });
                          setTitltId({
                            ...titleId,
                            setSubSubSubTitle: workflow?._id,
                          });
                          setSelectedWorkflow(workflow);
                        }}
                      >
                        <div className="flex items-center justify-between ">
                          <div className="flex-1 text-left ">
                            <div
                              className={`${
                                selectedWorkflow?._id === workflow._id
                                  ? 'bg-[#F2F6F7] dark:bg-[#2E2E2E]'
                                  : ''
                              } px-4 p-3 w-full cursor-pointer text-left text-[12px] transition-colors text-gray-700 dark:text-gray-300`}
                            >
                              {workflow.title}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Display single workflow details (original functionality)
                  ''
                )}
              </div>
            </div>
          )}
          {selectedWorkflow?.title !== undefined && (
            <div className="w-60 flex flex-col pointer-events-auto h-[92vh] overflow-auto bg-white dark:bg-[#1E1E1E] text-gray-900 dark:text-gray-100">
              <div className="flex items-center justify-between w-full border-b border-gray-200 dark:border-gray-200">
                <div className="flex items-center space-x-2">
                  <h3 className="text-[14px] font-bold text-[#43B02A] px-4 py-2">
                    Agent Description
                  </h3>
                  {/* <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedWorkflow({});
                    // setShowThirdPanel(false);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button> */}
                </div>
              </div>
              <div className="px-4 py-3 space-y-4">
                <div>
                  <div className="text-left font-bold text-[12px] transition-colors">
                    Description:
                  </div>
                  <div className="text-left py-1 text-[12px] transition-colors">
                    {(() => {
                      const description =
                        selectedWorkflow?.description ||
                        'No description available';
                      const words = description.split(' ');
                      if (words.length > 30) {
                        return words.slice(0, 30).join(' ') + '...';
                      }
                      return description;
                    })()}
                  </div>
                </div>
                {selectedWorkflow?.category && (
                  <div className="text-left py-1 text-[12px] transition-colors">
                    <strong>Category:</strong> {selectedWorkflow?.category}
                  </div>
                )}
                {selectedWorkflow?.subcategory && (
                  <div className="text-left py-1 text-[12px] transition-colors">
                    <strong>Subcategory:</strong>{' '}
                    {selectedWorkflow?.subcategory}
                  </div>
                )}
                <div>
                  <p className="">
                    <span className="text-left   text-[12px]  transition-colors dark:text-gray-300 text-gray-700 ">
                     <strong>Rating:</strong>{' '}
                       {`${rating?.value||selectedWorkflow?.rating?.avgRating||'No Rating'}`}
                    </span>
                  </p>
                </div>
                <div>{<RateAgent rating={selectedWorkflow?.rating?.avgRating===0?rating:{value:selectedWorkflow?.rating?.avgRating,id:selectedWorkflow?._id}} setRating={(value:any)=>{setRating(value);handleAddRating(selectedWorkflow?._id,value?.value,selectedWorkflow?.version)}} id={selectedWorkflow?._id} />}</div>
                <div className="">
                  <button
                    onClick={() => handleAgentSelect(selectedWorkflow)}
                    className="w-full bg-[#43B02A] rounded-md text-white cursor-pointer px-4 py-2 hover:bg-[#3a9d25] transition-colors"
                  >
                    Use This Agent
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
         
        </div>
      );
    }
  }

  return ReactDOM.createPortal(
    <>
      {/* Overlay */}
      <div
        onClick={() => {close(false);setServiceLineRightPanelData([]);setServiceLineThirdPanelData({});setEnableFunctionRightPanelData([]);setEnableFunctionThirdPanelData({});setTitltId({subTitle:"",setSubSubSubTitle:"",serviceLineSubTitle:"",enableTitle:"",serviceLineTitle:"",setSubSubTitle:""})}}
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-40 ${
          open ? 'bg-opacity-50 visible' : 'bg-opacity-0 invisible'
        }`}
      />

      {/* Drawer Panel (Right Side) */}
      <div
        className={`fixed flex top-[50px]  left-[256px] h-full w-max bg-white dark:bg-[#1E1E1E] shadow-lg transform transition-transform duration-300 ease-in-out z-50
          ${open ? 'translate-x-0' : 'hidden translate-x-full'}
        `}
        style={{ zIndex: 1000000000 }}
      >
        {renderData()}
      </div>
    </>,
    portalRoot,
  );
}
