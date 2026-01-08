import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Intro from '../Intro/Intro';
import Workflow from '../Workflow/Workflow';
import ActivateWorkflow from '../Modals/Workflows/ActivateWorkflow';
import { IconChevronLeft, IconArrowsSort, IconAdjustments, IconShieldCog } from '@tabler/icons-react';
import Filter from '../atoms/Filter/Filter';
import { v4 as uuidv5 } from 'uuid';
import { WorkflowI } from '../../types/workflow';
import { useTranslation } from 'next-i18next';
import ChatWindow from './HomeContentNew';

interface WorkflowProps {
    id: number;
    name: string;
    description: string;
}

interface HomeSidebarProps {
    workflowsData: WorkflowI[];
    handleSearch: any;
    token: any;
}

interface Workflow {
    _id: string;
    title: string;
    description: string;
    category: string;
    subcategory: string;
    subsubcategory: string;
    hitCount: number;
    prompt: string;
    uploadRequired: boolean;
    uploadDescription?: string;
    isGeneral?: any;
}

const HomeContent: React.FC<HomeSidebarProps> = (props) => {
    const { t } = useTranslation('chat');
    const { workflowsData, token, handleSearch } = props;
    const router = useRouter();
    const [activeTooltipIndex, setActiveTooltipIndex] = useState<any>(null);
    const [filterService, setFilterService] = useState<any>([]);
    const [filterGeneral, setFilterGeneral] = useState<any>("");
    const initialState = {
        currentView: 'parent' as 'parent' | 'sub' | 'subsub',
        selectedCategory: '',
        selectedSubCategory: '',
        selectedSubSubCategory: ''
    };

    const [serviceLineState, setServiceLineState] = useState(initialState);
    const [generalUseCaseState, setGeneralUseCaseState] = useState(initialState);
    const [enablingUseCaseState, setEnablingUseCaseState] = useState(initialState);

    const [isUploadModalOpen, setUploadModalOpen] = useState(false);
    const [editWorkflow, setEditWorkflow] = useState<any>(null);
    const [filteredServiceLines, setFilteredServiceLines] = useState<any>([]);
    const [filteredEnablingFunctions, setFilteredEnablingFunctions] = useState<any>([]);
    const [filteredGeneralUseCases, setFilteredGeneralUseCases] = useState<any>([]);

    const handleFreestyleGenieClick = () => {
        const id = uuidv5();
        localStorage.removeItem("file");
        // changeIdForSelectedConversation(id);
        // clearMessagesInSelectedConversation();
        router.push(`${router.basePath}/chat?id=${id}`);
    };
    /*const { t } = useTranslation('chat');*/

    const getFilteredWorkflows = (category: string, state: typeof initialState, filterBy?: any, isGeneral?: boolean): any => {
        let filteredWorkflows: any = [];
        if (isGeneral) {
            switch (state.currentView) {
                case 'parent':
                    filteredWorkflows = workflowsData?.filter((workflow: any) => workflow.category === category && !workflow.subcategory);
                    break;
                case 'sub':
                    filteredWorkflows = workflowsData?.filter((workflow: any) => workflow.category === category && workflow.subcategory === state.selectedCategory);
                    break;
                default:
                    filteredWorkflows = [];
                    break;
            }
        } else {
            switch (state.currentView) {
                case 'parent':
                    filteredWorkflows = workflowsData?.filter((workflow: any) => (workflow.category === category && !workflow.subcategory));
                    break;
                case 'sub':
                    filteredWorkflows = workflowsData?.filter((workflow: any) => workflow.category === category && workflow.subcategory === state.selectedCategory && !workflow.subsubcategory);
                    break;
                case 'subsub':
                    filteredWorkflows = workflowsData?.filter((workflow: any) => workflow.category === category && workflow.subcategory === state.selectedCategory && workflow.subsubcategory === state.selectedSubSubCategory);
                    break;
                default:
                    filteredWorkflows = [];
                    break;
            }
        }

        if (filterBy === 'Most popular') {
            filteredWorkflows = filteredWorkflows.sort((a: any, b: any) => b.hitCount - a.hitCount);
        } else if (filterBy === 'Alphabetical') {
            filteredWorkflows = filteredWorkflows.sort((a: any, b: any) => a.title.localeCompare(b.title));
        }

        return filteredWorkflows;
    };

    useEffect(() => {
        setFilteredServiceLines(getFilteredWorkflows('Service Lines', serviceLineState, filterService, false));
    }, [serviceLineState, filterService, workflowsData]);

    useEffect(() => {
        setFilteredEnablingFunctions(getFilteredWorkflows('Enabling Functions', enablingUseCaseState, filterService, false));
    }, [enablingUseCaseState, filterService, workflowsData]);

    useEffect(() => {
        setFilteredGeneralUseCases(getFilteredWorkflows('General Use Cases', generalUseCaseState, filterGeneral, true));
    }, [generalUseCaseState, filterGeneral, workflowsData]);

    const handleDropdownChange = (name: string, selectedOption: string, type: string) => {
        if (type == "service") {
            setFilterService((prevData: any) => ({
                ...prevData,
                [name]: selectedOption,
            }));
        }
        if (type == "general") {
            setFilterGeneral((prevData: any) => ({
                ...prevData,
                [name]: selectedOption,
            }));
        }

    };

    const arrow = () => <IconChevronLeft
        size={26}
        className="cursor-pointer dark:text-warning text-white  dark:bg-main bg-default rounded-[50px] mr-[10px] flex items-center justify-center pr-[3px]" />;
    const handleExplore = (workflow: Workflow, state: typeof initialState, setState: React.Dispatch<React.SetStateAction<typeof initialState>>, isGeneral?: boolean) => {
        if (isGeneral) {
            if (state.currentView === 'parent') {
                setState(prevState => ({ ...prevState, selectedCategory: workflow.title, currentView: 'sub' }));
            }
        } else {
            if (state.currentView === 'parent') {
                setState(prevState => ({ ...prevState, selectedCategory: workflow.title, currentView: 'sub' }));
            } else if (state.currentView === 'sub') {
                setState(prevState => ({ ...prevState, selectedSubCategory: workflow.title, currentView: 'subsub' }));
                setState(prevState => ({ ...prevState, selectedSubSubCategory: workflow.title }));
            } else if (state.currentView === 'subsub') {
                setState(prevState => ({ ...prevState, selectedSubSubCategory: workflow.title }));
            }
        }
    };

    const handleBack = (state: typeof initialState, setState: React.Dispatch<React.SetStateAction<typeof initialState>>) => {
        if (state.currentView === 'subsub') {
            setState(prevState => ({ ...prevState, selectedSubSubCategory: '', currentView: 'sub' }));
        } else if (state.currentView === 'sub') {
            setState(prevState => ({ ...prevState, selectedSubCategory: '', currentView: 'parent' }));
        }
    };

    const handleEdit = (workflow: any) => {
        setEditWorkflow(workflow);
        setUploadModalOpen(true);
    };

    if (true) {
        return (
            <ChatWindow workflowsData={workflowsData} handleSearch={handleSearch} token={token} />
        )
    }

    return (
        <div className="w-full xl:px-8 text-center">
            <Intro workflowsData={workflowsData} handleActivate={handleEdit} />

            <div className="grid lg:grid-cols-2 gap-y-10 gap-4 py-6 h-full lg:flex lg:flex-row-reverse">
                {workflowsData && workflowsData.length !== 0 ? (
                    <>
                        <div className={`workflow-tab dark:bg-primary bg-white p-4 rounded-[14px] w-full dark:text-secondary text-left mb-2`}>
                            <div className="flex gap-2 justify-between items-center min-h-8">
                                <IconShieldCog size={15} className='dark:text-white text-black' />
                                <h1 className="flex-1 dark:bg-primary text-xs text-default dark:text-white">Agent Categories by Service Line & Enabling Function </h1>
                                <Filter
                                    buttonStyle={`ml-auto`}
                                    options={['Alphabetical', 'Most popular']}
                                    onSelect={(selectedOption: string) => handleDropdownChange('category', selectedOption, "service")}
                                    placeholder={"Category"}
                                    sendOption={(option: any) => { setFilterService(option) }}
                                >
                                    <IconArrowsSort size={8} className="text-white cursor-pointer ml-auto bg-grey rounded-3xl w-[20px] h-[20px] p-[4px]" />
                                </Filter>

                            </div>
                            <hr className='-mx-4 mb-3 mt-3 border-grey' />
                            {serviceLineState.currentView !== 'parent' && (
                                <div className="flex items-center dark:text-[#9d9f9e]" onClick={() => handleBack(serviceLineState, setServiceLineState)}>
                                    {arrow()}
                                    <p className="text-xs">
                                        Back
                                    </p>
                                </div>
                            )}

                            <div className="workflow-tab-content overflow-hidden">
                                <div className="ml-4">
                                    <h2 className="text-xs font-bold mt-4 mb-2">
                                        {serviceLineState.currentView == 'parent' ? 'Service Lines ' : serviceLineState.currentView === 'sub' ? serviceLineState.selectedCategory : serviceLineState.selectedSubCategory}
                                    </h2>
                                    {filteredServiceLines?.map((workflow: any, index: any) => (
                                        <div className="parent" key={index}>
                                            <Workflow
                                                workflow={workflow}
                                                index={index}
                                                activeTooltipIndex={activeTooltipIndex}
                                                setActiveTooltipIndex={setActiveTooltipIndex}
                                                withExplore={serviceLineState.currentView !== 'subsub'}
                                                handleExplore={() => handleExplore(workflow, serviceLineState, setServiceLineState)}
                                                sideWorkflow={true}
                                                handleActivate={handleEdit}
                                                isWithSubsub={!!workflow.subsubcategory}
                                                isGeneral={false}
                                                tooltipCls={'left-start'}
                                            />
                                        </div>
                                    ))}
                                </div>
                                {/* end service line */}

                                {/* start Enabling function */}
                                {enablingUseCaseState.currentView !== 'parent' && (
                                    <div className="flex items-center dark:text-[#9d9f9e]" onClick={() => handleBack(enablingUseCaseState, setEnablingUseCaseState)}>
                                        {arrow()}
                                        <p className="text-xs">Back</p>
                                    </div>
                                )}

                                <div className="ml-4 h-full">
                                    <h2 className="text-xs font-bold mt-4 mb-2">
                                        {enablingUseCaseState.currentView == 'parent' ? 'Enabling Functions ' : enablingUseCaseState.currentView === 'sub' ? enablingUseCaseState.selectedCategory : enablingUseCaseState.selectedSubCategory}
                                    </h2>
                                    {filteredEnablingFunctions?.map((workflow: any, index: any) => (
                                        <div className="parent" key={index}>
                                            <Workflow
                                                workflow={workflow}
                                                index={index}
                                                activeTooltipIndex={activeTooltipIndex}
                                                setActiveTooltipIndex={setActiveTooltipIndex}
                                                withExplore={enablingUseCaseState.currentView !== 'subsub'}
                                                handleExplore={() => handleExplore(workflow, enablingUseCaseState, setEnablingUseCaseState)}
                                                sideWorkflow={true}
                                                handleActivate={handleEdit}
                                                isWithSubsub={!!workflow.subsubcategory}

                                                isGeneral={false}
                                                tooltipCls={'left-start'}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>



                        </div>
                        <div className={`workflow-tab dark:bg-primary bg-white p-4 rounded-[14px] w-full dark:text-secondary text-left mb-2`}>
                            <div className="flex gap-2 justify-between items-center min-h-8">
                                <IconAdjustments size={15} className='dark:text-white text-black' />
                                <h1 className="flex-1 dark:bg-primary text-xs text-default dark:text-white">
                                    <span>Agent Categories by Type of Activity</span>
                                </h1>
                                <Filter
                                    buttonStyle={`ml-auto`}
                                    options={['Alphabetical', 'Most popular']}
                                    onSelect={(selectedOption: string) => handleDropdownChange('category', selectedOption, "general")}
                                    placeholder={"Category"}
                                    sendOption={(option: any) => setFilterGeneral(option)}
                                >
                                    <IconArrowsSort size={8} className="text-white cursor-pointer ml-auto bg-grey rounded-3xl w-[20px] h-[20px] p-[4px]" />
                                </Filter>
                            </div>
                            <hr className='-mx-4 mb-3 mt-3 border-grey' />

                            {generalUseCaseState.currentView !== 'parent' && (
                                <div className="flex items-center dark:text-[#9d9f9e]" onClick={() => handleBack(generalUseCaseState, setGeneralUseCaseState)}>
                                    {arrow()}
                                    <p className="text-xs">{generalUseCaseState.currentView === 'sub' ? generalUseCaseState.selectedCategory : generalUseCaseState.selectedSubCategory}</p>
                                </div>
                            )}
                            <div className="workflow-tab-content overflow-hidden">
                                <div className="ml-4">
                                    <h2 className="text-xs font-bold mt-4 mb-2">
                                        {generalUseCaseState.currentView == 'parent' ? 'General Lines ' : generalUseCaseState.currentView === 'sub' ? generalUseCaseState.selectedCategory : generalUseCaseState.selectedSubCategory}
                                    </h2>
                                    {filteredGeneralUseCases?.map((workflow: any, index: any) => (
                                        <div className="parent" key={index}>
                                            <Workflow
                                                workflow={workflow}
                                                index={index}
                                                activeTooltipIndex={activeTooltipIndex}
                                                setActiveTooltipIndex={setActiveTooltipIndex}
                                                withExplore={generalUseCaseState.currentView !== 'sub'}
                                                handleExplore={() => handleExplore(workflow, generalUseCaseState, setGeneralUseCaseState)}
                                                sideWorkflow={true}
                                                handleActivate={handleEdit}
                                                isWithSubsub={generalUseCaseState.currentView === 'sub'}
                                                isGeneral={true}
                                                tooltipCls={'left-start'}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                ) : null}
            </div>

            <div className='relative inline-flex items-center mb-8 w-full'>
                <div className="absolute left-0 inset-0 border-t border-grey w-[45%]"></div>
                <span className='border-b-1 mx-auto -mt-[10px] text-grey before:content border-b border-grey text-sm'>OR</span>
                <div className="absolute left-[unset] right-0 inset-0 border-t border-grey w-[45%]"></div>
            </div>
            <button onClick={handleFreestyleGenieClick} className="px-10 py-3 bg-default text-center dark:text-white text-white rounded-[10px] w-full dark:hover:bg-secondary md:text-[16px] text-[12px]">Use Genie Freestyle without a Agent  </button>
            {isUploadModalOpen && (
                <ActivateWorkflow
                    modalOpen={isUploadModalOpen}
                    setModalOpen={() => setUploadModalOpen(false)}
                    workflow={editWorkflow}
                    token={token}
                />
            )}
            <div className="px-3 pt-2 pb-3 text-center text-[12px]  dark:text-[#9A9B9F] bg-transparent dark:bg-transparent text-black md:px-8 md:pt-8 md:pb-6 ">
                {' '}
                {t(
                    'Version 2.0, Genie developed by Deloitte Middle East Services in conjunction with the Deloitte Middle East AI Institute',
                )}
            </div>
        </div>
    );


};

export default HomeContent;
