import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import Intro from '@/components/Intro/Intro';
import Workflow from '@/components/Workflow/Workflow';
import ActivateWorkflow from '@/components/Modals/Workflows/ActivateWorkflow';
import { IconChevronLeft } from '@tabler/icons-react';
import { WorkflowI } from '../types/workflow';
import { fetchWorkflows } from '@/services/workflowService';
import { AuthContext } from '@/utils/app/azureAD';
import HomeLayout from '@/components/Home/HomeLayout';
import IntroWorkflowPage from '@/components/Intro/IntroWorkflowPage';
import IntroWorkflowTableChange from '@/components/Intro/IntroWorkflowTableChange';
import { setegid } from 'process';

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
interface WorkflowVisibility {
    id: string;
    isVisible: boolean;
}
const HomeContent: React.FC<HomeSidebarProps> = (props) => {
    const { token } = props;
    const authContext = useContext(AuthContext);
    const { user }: any = useContext(AuthContext);
    const [activeTooltipIndex, setActiveTooltipIndex] = useState<any>(null);
    const [filterService, setFilterService] = useState<any>([]);
    const [filterGeneral, setFilterGeneral] = useState<any>("");
    const initialState = {
        currentView: 'parent' as 'parent' | 'sub' | 'subsub',
        selectedCategory: '',
        selectedSubCategory: '',
        selectedSubSubCategory: ''
    };
    const [triggerQueryClear, setTriggerQueryClear] = useState(false);
    const [serviceLineState, setServiceLineState] = useState(initialState);
    const [generalUseCaseState, setGeneralUseCaseState] = useState(initialState);
    const [enablingUseCaseState, setEnablingUseCaseState] = useState(initialState);
    const [workflowsData, setWorkflowsData] = useState<WorkflowI[]>([]);
    const [workflowsDataSearch, setWorkflowsDataSearch] = useState<WorkflowI[]>([]);
    const [workflowsDataInitial, setWorkflowsDataInitial] = useState<WorkflowI[]>([]);

    const [isUploadModalOpen, setUploadModalOpen] = useState(false);
    const [editWorkflow, setEditWorkflow] = useState<any>(null);
    const [filteredServiceLines, setFilteredServiceLines] = useState<any>([]);
    const [filteredEnablingFunctions, setFilteredEnablingFunctions] = useState<any>([]);
    const [filteredGeneralUseCases, setFilteredGeneralUseCases] = useState<any>([]);
    // const [showMore, setShowMore] = useState(false);
    const [showWorkflow, setShowWorkflow] = useState<WorkflowVisibility[]>([])

    const arrow = () => <IconChevronLeft
        size={26}
        className="cursor-pointer dark:text-warning text-white  dark:bg-main bg-default rounded-[50px] mr-[10px] flex items-center justify-center pr-[3px]" />;
    const fetchAndSetWorkflows = async (params = {}, isTop = false) => {
        const response = await fetchWorkflows(user?.idToken, authContext?.validateAndRefreshToken, params);
        isTop ? null : setWorkflowsData(response?.workflows)
        if (!isTop) {
            setWorkflowsDataInitial(response?.workflows);
        }
        console.log(response?.workflows, 'workflows')
    };

    const getFilteredWorkflows = (category: string, state: typeof initialState, filterBy?: any, isGeneral?: boolean): any => {
        let filteredWorkflows: any = [];
        console.log('working', workflowsData)
        console.log(category, 'current')
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
        console.log(filteredWorkflows != undefined ? filteredWorkflows : [], 'check')

        return filteredWorkflows != undefined ? filteredWorkflows : [];
    };
    useEffect(() => {
        if (generalUseCaseState.currentView != 'parent' || serviceLineState.currentView != 'parent' || enablingUseCaseState.currentView != 'parent')
            setTriggerQueryClear((prev) => !prev)
    }, [generalUseCaseState.currentView, serviceLineState.currentView, enablingUseCaseState.currentView])
    // useEffect(() => {
    //     console.log(workflowsData, 'triggeredcheck')
    //     //    setWorkflowsData(workflowsDataSearch)
    // }, [workflowsData, setWorkflowsData]);
    // console.log(workflowsDataSearch, 'triggered')
    // useEffect(() => {
    //     console.log(workflowsDataSearch, 'triggered')
    //     // setWorkflowsData(workflowsDataSearch)
    // }, [workflowsDataSearch, setWorkflowsDataSearch]);
    useEffect(() => {
        if (user?.idToken) {
            fetchAndSetWorkflows(); // Fetch regular workflows
        }
    }, [user]);

    useEffect(() => {
        setFilteredServiceLines(getFilteredWorkflows('Service Lines', serviceLineState, filterService, false));
    }, [serviceLineState, filterService, workflowsData]);

    useEffect(() => {
        setFilteredEnablingFunctions(getFilteredWorkflows('Enabling Functions', enablingUseCaseState, filterService, false));
    }, [enablingUseCaseState, filterService, workflowsData]);

    useEffect(() => {
        setFilteredGeneralUseCases(getFilteredWorkflows('General Use Cases', generalUseCaseState, filterGeneral, true));
    }, [generalUseCaseState, filterGeneral, workflowsData]);


    const handleExplore = (workflow: Workflow, state: typeof initialState, setState: React.Dispatch<React.SetStateAction<typeof initialState>>, isGeneral?: boolean) => {
        if (isGeneral) {
            if (state.currentView === 'parent') {
                setWorkflowsDataSearch([])
                setState(prevState => ({ ...prevState, selectedCategory: workflow.title, currentView: 'sub' }));
            }
        } else {
            if (state.currentView === 'parent') {
                setWorkflowsDataSearch([])
                setState(prevState => ({ ...prevState, selectedCategory: workflow.title, currentView: 'sub' }));
                // setEnablingUseCaseState(prevState => ({ ...prevState, selectedSubSubCategory: '', currentView: 'sub' }));
                // setServiceLineState(prevState => ({ ...prevState, selectedSubSubCategory: '', currentView: 'sub' }));

                console.log("initialState", initialState)
            } else if (state.currentView === 'sub') {
                setWorkflowsDataSearch([])
                setState(prevState => ({ ...prevState, selectedSubCategory: workflow.title, currentView: 'subsub' }));
                setState(prevState => ({ ...prevState, selectedSubSubCategory: workflow.title }));
            } else if (state.currentView === 'subsub') {
                setWorkflowsDataSearch([])
                setState(prevState => ({ ...prevState, selectedSubSubCategory: workflow.title }));
            }
        }
    };

    const handleBack = (state: typeof initialState, setState: React.Dispatch<React.SetStateAction<typeof initialState>>, full = 'no') => {
        if (state.currentView === 'subsub') {
            setWorkflowsDataSearch([])
            if (full == 'no')
                setState(prevState => ({ ...prevState, selectedSubSubCategory: '', currentView: 'sub' }));
            else{
                setState(prevState => ({ ...prevState, selectedSubCategory: '',selectedSubSubCategory: '', currentView: 'parent' }));

            }
        } else if (state.currentView === 'sub') {
            // setWorkflowsDataSearch([])
            setState(prevState => ({ ...prevState, selectedSubCategory: '', currentView: 'parent' }));
        }
    };

    const handleEdit = (workflow: any) => {
        setEditWorkflow(workflow);
        setUploadModalOpen(true);
    };
    const handleShowMore = (id: string): void => {
        // console.log(id,'idd')
        setShowWorkflow((prevState) => {
            const indexWorkflow = prevState.findIndex((workflow) => workflow.id === id)
            if (indexWorkflow != -1) {
                return prevState.map((workflow) =>
                    (workflow.id === id ? { ...workflow, isVisible: !workflow.isVisible } : workflow)
                )

            }
            else {

                return [...prevState, { id, isVisible: true }]
            }

        })
    }
    useEffect(() => {
        setCurrentPage(1);
    }, [workflowsDataSearch, filteredGeneralUseCases, filteredServiceLines, filteredEnablingFunctions])
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 5
    // const combinedData = [...workflowsDataSearch, ...filteredGeneralUseCases, ...filteredServiceLines, ...filteredEnablingFunctions]
    let totalPages = 0
    if (workflowsDataSearch.length > 0) {
        totalPages = Math.ceil(workflowsDataSearch.length / rowsPerPage);
    }
    else {
        if (workflowsDataSearch.length == 0 && generalUseCaseState.currentView != 'parent') {
            totalPages = Math.ceil(filteredGeneralUseCases.length / rowsPerPage);
        }
        if (workflowsDataSearch.length == 0 && serviceLineState.currentView != 'parent') {
            totalPages = Math.ceil(filteredServiceLines.length / rowsPerPage);
        }
        if (workflowsDataSearch.length == 0 && enablingUseCaseState.currentView != 'parent') {
            totalPages = Math.ceil(filteredEnablingFunctions.length / rowsPerPage);
        }

    }
    // Calculate which rows to display
    const startIndex = (currentPage - 1) * rowsPerPage;
    // console.log(startIndex,'startI')
    const endIndex = startIndex + rowsPerPage;
    const currentRowsWorkflows = workflowsDataSearch.slice(startIndex, endIndex);
    const currentRowsGeneral = filteredGeneralUseCases.slice(startIndex, endIndex);

    const currentRowsServiceLines = filteredServiceLines.slice(startIndex, endIndex);

    const currentRowsEnabling = filteredEnablingFunctions.slice(startIndex, endIndex);
    const windowSize = 1; // e.g. 1 => show [currentPage-1, currentPage, currentPage+1]

    // This is the function from above
    const getPageNumbers = (total: any, current: any, w: any) => {
        // If total is small, just show them all
        if (total <= 2 + 2 * w) {
            return Array.from({ length: total }, (_, i) => i + 1);
        }

        const pages:any = [1];
        if (current > 2 + w) {
            pages.push("...");
        }

        const start = Math.max(2, current - w);
        console.log(start, 'start')
        const end = Math.min(total - 1, current + w);

        for (let p = start; p <= end; p++) {
            pages.push(p);
        }

        if (current < total - w - 1) {
            pages.push("...");
        }

        if (total > 1) {
            pages.push(total);
        }

        return pages;
    };

    const pageNumbers = getPageNumbers(totalPages, currentPage, windowSize);

    // Handlers
    const handlePrev = () => {
        setCurrentPage((prev) => (prev > 1 ? prev - 1 : prev));
    };
    const handleNext = () => {
        setCurrentPage((prev) => (prev < totalPages ? prev + 1 : prev));
    };
    useEffect(() => {
        if (workflowsDataSearch.length != 0) {
            setGeneralUseCaseState(prevState => ({ ...prevState, selectedSubCategory: '', currentView: 'parent' }));

            setEnablingUseCaseState(prevState => ({ ...prevState, selectedSubCategory: '', currentView: 'parent' }));
            setServiceLineState(prevState => ({ ...prevState, selectedSubCategory: '', currentView: 'parent' }));

        }
    }, [workflowsDataSearch])
    return (
            <div className="w-full xl:px-8 text-center">
                <div className="grid lg:grid-cols-2 gap-y-10 gap-16 py-6 h-full lg:flex lg:flex-row-reverse">
                    {workflowsData && workflowsData.length !== 0 ? (
                        <>
                            <div className="lg:order-1 order-2 w-[100%] flex items-center justify-center">
                                <div className=" w-full bg-dark p-4 dark:bg-primary bg-white  !rounded-[14px]">

                                    <table className="min-w-full bg-transparent p-5  w-full dark:text-secondary text-black">
                                        <thead className='!rounded-t-[30px]'>
                                            <tr>
                                                {workflowsDataSearch.length == 0 && (serviceLineState.currentView === 'sub' || enablingUseCaseState.currentView === 'sub') ? <th className="py-2 px-4 !border-b border-[#000] dark:bg-[#00000026] bg-white text-[14px] w-[150px]">Category Name</th> : <th className="py-2 px-4 !border-b border-[#000] dark:bg-[#00000026] bg-white text-[14px] w-[150px]">Workflow Name</th>}
                                                <th className="py-2 px-4 !border-b border-[#000] dark:bg-[#00000026] bg-white text-[14px] w-[130px]">Purpose</th>
                                                {workflowsDataSearch.length == 0 && (serviceLineState.currentView === 'sub' || enablingUseCaseState.currentView === 'sub') ?null:<th className="py-2 px-4 !border-b border-[#000] dark:bg-[#00000026] bg-white text-[14px] w-[400px]">Description</th>}
                                                {!(serviceLineState.currentView === 'sub' || enablingUseCaseState.currentView === 'sub') && <th className="py-2 px-4 !border-b border-[#000] dark:bg-[#00000026] bg-white text-[14px] w-[120px]">Actions</th>}
                                            </tr>
                                        </thead>


                                        <tbody>
                                            {workflowsDataSearch.length > 0 && currentRowsWorkflows?.map((workflow: any, index: any) => (

                                                <tr className="parent" key={index}>
                                                    <td className="border-[#000]">
                                                        <Workflow
                                                            tableView={true}
                                                            workflow={workflow}
                                                            index={index}
                                                            activeTooltipIndex={activeTooltipIndex}
                                                            setActiveTooltipIndex={setActiveTooltipIndex}
                                                            withExplore={false}
                                                            handleExplore={() => handleExplore(workflow, generalUseCaseState, setGeneralUseCaseState)}
                                                            sideWorkflow={true}
                                                            activate={false}
                                                            handleActivate={handleEdit}
                                                            isWithSubsub={true}
                                                            isGeneral={true}
                                                            tooltipCls={'left-start'}
                                                            isDesc = {!!workflow.description}
                                                        />
                                                    </td>
                                                    <td className="py-2 px-4 border-b border-[#000] dark:text-white text-[14px]">{workflow.category}</td>
                                                    <td className="py-2 px-4 border-b border-[#000] dark:text-white text-[14px]">  {showWorkflow.some((visible) => visible.id === workflow._id && visible.isVisible) ? workflow.description : `${workflow.description.substring(0, 200)}`}
                                                        {workflow.description ? <button className="btn ml-1 text-[#729C3E]" onClick={() => handleShowMore(workflow._id)}>{showWorkflow.some((visible) => visible.id === workflow._id && visible.isVisible) ? "Show less" : "Show more"}</button> : ""}
                                                    </td>
                                                    <td className="py-2 px-4 border-b border-[#000] dark:text-white text-[14px]">
                                                        <Workflow
                                                            tableView={true}
                                                            workflow={workflow}
                                                            index={index}
                                                            activeTooltipIndex={activeTooltipIndex}
                                                            setActiveTooltipIndex={setActiveTooltipIndex}
                                                            withExplore={false}
                                                            handleExplore={() => handleExplore(workflow, generalUseCaseState, setGeneralUseCaseState)}
                                                            sideWorkflow={true}
                                                            activate={true}
                                                            handleActivate={handleEdit}
                                                            isWithSubsub={true}
                                                            isGeneral={true}
                                                            tooltipCls={'left-start'}
                                                            showButton={true}
                                                            isDesc = {!!workflow.description}
                                                        />
                                                         
                                                    </td>
                                                </tr>
                                            ))}
                                            {workflowsDataSearch.length == 0 && generalUseCaseState.currentView != 'parent' && currentRowsGeneral?.map((workflow: any, index: any) => (
                                                <tr className="parent" key={index}>
                                                    <td className="border-[#000]">
                                                        <Workflow
                                                            tableView={true}
                                                            workflow={workflow}
                                                            index={index}
                                                            activeTooltipIndex={activeTooltipIndex}
                                                            setActiveTooltipIndex={setActiveTooltipIndex}
                                                            withExplore={generalUseCaseState.currentView !== 'sub'}
                                                            handleExplore={() => handleExplore(workflow, generalUseCaseState, setGeneralUseCaseState)}
                                                            sideWorkflow={true}
                                                            activate={false}
                                                            handleActivate={handleEdit}
                                                            isWithSubsub={generalUseCaseState.currentView === 'sub'}
                                                            isGeneral={true}
                                                            tooltipCls={'left-start'}
                                                            isDesc = {!!workflow.description}
                                                        />
                                                    </td>
                                                    <td className="py-2 px-4 border-b border-[#000] dark:text-white text-[14px]">{workflow.category}</td>
                                                    <td className="py-2 px-4 border-b border-[#000] dark:text-white text-[14px]">  {showWorkflow.some((visible) => visible.id === workflow._id && visible.isVisible) ? workflow.description : `${workflow.description.substring(0, 200)}`}
                                                        {workflow.description ? <button className="btn ml-1 text-[#729C3E]" onClick={() => handleShowMore(workflow._id)}>{showWorkflow.some((visible) => visible.id === workflow._id && visible.isVisible) ? "Show less" : "Show more"}</button> : ""}
                                                    </td>
                                                    {generalUseCaseState.currentView === 'sub' && <td className="py-2 px-4 border-b border-[#000] dark:text-white text-[14px]">
                                                        <Workflow
                                                            tableView={true}
                                                            workflow={workflow}
                                                            index={index}
                                                            activeTooltipIndex={activeTooltipIndex}
                                                            setActiveTooltipIndex={setActiveTooltipIndex}
                                                            withExplore={generalUseCaseState.currentView !== 'sub'}
                                                            handleExplore={() => handleExplore(workflow, generalUseCaseState, setGeneralUseCaseState)}
                                                            sideWorkflow={true}
                                                            activate={true}
                                                            handleActivate={handleEdit}
                                                            isWithSubsub={generalUseCaseState.currentView === 'sub'}
                                                            isGeneral={true}
                                                            tooltipCls={'left-start'}
                                                            showButton={true}
                                                            isDesc = {!!workflow.description}
                                                        />
                                                    </td>}
                                                </tr>
                                            ))}
                                            {workflowsDataSearch.length == 0 && serviceLineState.currentView != 'parent' && currentRowsServiceLines?.map((workflow: any, index: any) => (
                                                <tr className="parent" key={index}>
                                                    <td className="border-[#000]">
                                                        <Workflow
                                                            tableView={true}
                                                            workflow={workflow}
                                                            index={index}
                                                            activeTooltipIndex={activeTooltipIndex}
                                                            setActiveTooltipIndex={setActiveTooltipIndex}
                                                            withExplore={serviceLineState.currentView !== 'subsub'}
                                                            handleExplore={() => handleExplore(workflow, serviceLineState, setServiceLineState)}
                                                            sideWorkflow={true}
                                                            activate={false}
                                                            handleActivate={handleEdit}
                                                            isWithSubsub={serviceLineState.currentView === 'sub'}
                                                            isGeneral={false}
                                                            tooltipCls={'left-start'}
                                                            isDesc = {!!workflow.description}
                                                        />


                                                    </td>
                                                    <td className="py-2 px-4 border-b border-[#000] dark:text-white text-[14px]">{workflow.category}</td>
                                                    {workflow.description && <td className="py-2 px-4 border-b border-[#000] dark:text-white text-[14px]">  {showWorkflow.some((visible) => visible.id === workflow._id && visible.isVisible) ? workflow.description : `${workflow.description.substring(0, 200)}`}
                                                        {workflow.description ? <button className="btn ml-1 text-[#729C3E]" onClick={() => handleShowMore(workflow._id)}>{showWorkflow.some((visible) => visible.id === workflow._id && visible.isVisible) ? "Show less" : "Show more"}</button> : ""}
                                                    </td>}
                                                    {serviceLineState.currentView === 'subsub' && <td className="py-2 px-4 border-b border-[#000] dark:text-white text-[14px]">
                                                        <Workflow
                                                            tableView={true}
                                                            workflow={workflow}
                                                            index={index}
                                                            activeTooltipIndex={activeTooltipIndex}
                                                            setActiveTooltipIndex={setActiveTooltipIndex}
                                                            withExplore={false}
                                                            handleExplore={() => handleExplore(workflow, serviceLineState, setServiceLineState)}
                                                            sideWorkflow={true}
                                                            activate={true}
                                                            handleActivate={handleEdit}
                                                            isWithSubsub={serviceLineState.currentView === 'subsub'}
                                                            isGeneral={true}
                                                            tooltipCls={'left-start'}
                                                            showButton={true}
                                                            isDesc = {!!workflow.description}
                                                        />                                                    </td>}
                                                </tr>
                                            ))}
                                            {workflowsDataSearch.length == 0 && enablingUseCaseState.currentView != 'parent' && currentRowsEnabling?.map((workflow: any, index: any) => (
                                                <tr className="parent" key={index}>
                                                    <td className="border-[#000]">
                                                        <Workflow
                                                            tableView={true}
                                                            workflow={workflow}
                                                            index={index}
                                                            activeTooltipIndex={activeTooltipIndex}
                                                            setActiveTooltipIndex={setActiveTooltipIndex}
                                                            withExplore={enablingUseCaseState.currentView !== 'subsub'}
                                                            handleExplore={() => handleExplore(workflow, enablingUseCaseState, setEnablingUseCaseState)}
                                                            sideWorkflow={true}
                                                            activate={false}
                                                            handleActivate={handleEdit}
                                                            isWithSubsub={enablingUseCaseState.currentView === 'sub'}
                                                            isGeneral={false}
                                                            tooltipCls={'left-start'}
                                                            isDesc = {!!workflow.description}
                                                        />

                                                    </td>

                                                    <td className="py-2 px-4 border-b border-[#000] dark:text-white text-[14px]">{workflow.category}</td>
                                                    {workflow.description && <td className="py-2 px-4 border-b border-[#000] dark:text-white text-[14px]">  {showWorkflow.some((visible) => visible.id === workflow._id && visible.isVisible) ? workflow.description : `${workflow.description.substring(0, 200)}`}
                                                        {workflow.description ? <button className="btn ml-1 text-[#729C3E]" onClick={() => handleShowMore(workflow._id)}>{showWorkflow.some((visible) => visible.id === workflow._id && visible.isVisible) ? "Show less" : "Show more"}</button> : ""}
                                                    </td>}
                                                    {enablingUseCaseState.currentView === 'subsub' && <td className="py-2 px-4 border-b border-[#000] dark:text-white text-[14px]">
                                                        <Workflow
                                                            tableView={true}
                                                            workflow={workflow}
                                                            index={index}
                                                            activeTooltipIndex={activeTooltipIndex}
                                                            setActiveTooltipIndex={setActiveTooltipIndex}
                                                            withExplore={enablingUseCaseState.currentView !== 'subsub'}
                                                            handleExplore={() => handleExplore(workflow, enablingUseCaseState, setEnablingUseCaseState)}
                                                            sideWorkflow={true}
                                                            activate={true}
                                                            handleActivate={handleEdit}
                                                            isWithSubsub={enablingUseCaseState.currentView === 'subsub'}
                                                            isGeneral={true}
                                                            tooltipCls={'left-start'}
                                                            showButton={true}
                                                            isDesc = {!!workflow.description}
                                                        />
                                                    </td>}
                                                </tr>
                                            ))}


                                        </tbody>
                                    </table>
                                    <div style={{ display: "flex", gap: 8 }}>
                                        {/* PREVIOUS BUTTON */}
                                        {totalPages>0 &&<button style={{ color: 'white' }} onClick={handlePrev} disabled={currentPage === 1}>
                                            <img src="https://www.tailwindtap.com/assets/travelagency-admin/leftarrow.svg" alt="Previous" />
                                        </button>}

                                        {/* PAGE NUMBERS */}
                                        {pageNumbers.map((page:any, index:any) => {
                                            if (page === "...") {
                                                return (
                                                    <span key={index} style={{ margin: "0 4px", color: 'white' }}>
                                                        ...
                                                    </span>
                                                );
                                            }
                                            return (
                                                <button
                                                    key={index}
                                                    onClick={() => setCurrentPage(page)}
                                                    style={{

                                                        fontWeight: page === currentPage ? "bold" : "normal",
                                                        backgroundColor: page === currentPage ? "#999" : "transparent",
                                                        color: page === currentPage ? "#000" : "grey",
                                                    }}
                                                >
                                                    {page}
                                                </button>
                                            );
                                        })}

                                        {/* NEXT BUTTON */}
                                        {totalPages>0 && <button style={{ color: 'white' }} onClick={handleNext} disabled={currentPage === totalPages}>
                                            <img src="https://www.tailwindtap.com/assets/travelagency-admin/rightarrow.svg" alt="Next" />
                                        </button>}
                                    </div>

                                </div>
                            </div>
                            <div className={`lg:order-2 order-1 max-w-[400px] workflow-tab dark:bg-primary bg-white p-4 rounded-[14px] w-full dark:text-secondary text-left mb-2 overflow-hidden`}>
                                <div className="flex gap-2 justify-between items-center min-h-8">
                                    <h1 className="flex-1 dark:bg-primary text-lg text-default dark:text-white font-[600]">
                                        <span>Agents</span>
                                    </h1>
                                </div>

                                <hr className='-mx-4 mb-3 mt-3 border-grey' />

                                {/* <IntroWorkflowPage fullPlaceholder="Search for workflow..." workflowsDataInitial={workflowsDataInitial} workflowsData={workflowsData} workflowsDataSearch={workflowsDataSearch} setWorkflowsDataSearch = {setWorkflowsDataSearch} handleActivate={handleEdit} showIcon={false} style={" xl:!h-[40px] !h-[20px] !dark:bg-[#000] !dark:border-0 !pl-2 mb-4"} /> */}
                                <IntroWorkflowTableChange fullPlaceholder="Search for workflow..." workflowsDataInitial={workflowsDataInitial} workflowsData={workflowsData} workflowsDataSearch={workflowsDataSearch} setWorkflowsDataSearch={setWorkflowsDataSearch} handleActivate={handleEdit} triggerQueryClear={triggerQueryClear} showIcon={false} style={" xl:!h-[40px] !h-[20px] !dark:bg-[#000] !dark:border-0 !pl-2 mb-4"} />


                                <div className="workflow-tab-content">

                                    <div className="ml-4">
                                        <h2 className="text-xs font-bold mt-4 mb-2">
                                            {generalUseCaseState.currentView == 'parent' ? 'General Use Cases' : generalUseCaseState.currentView === 'sub' ? generalUseCaseState.selectedCategory : generalUseCaseState.selectedSubCategory}
                                        </h2>
                                        {generalUseCaseState.currentView !== 'parent' && (
                                            <div className="flex items-center dark:text-[#9d9f9e]" onClick={() => handleBack(generalUseCaseState, setGeneralUseCaseState)}>
                                                {arrow()}
                                                <p className="text-xs">Back</p>                                    </div>
                                        )}

                                        {filteredGeneralUseCases?.map((workflow: any, index: any) => (
                                            <div className="parent" key={index}>
                                                <Workflow
                                                    tableView={true}
                                                    workflow={workflow}
                                                    index={index}
                                                    activeTooltipIndex={activeTooltipIndex}
                                                    setActiveTooltipIndex={setActiveTooltipIndex}
                                                    withExplore={generalUseCaseState.currentView !== 'sub'}
                                                    handleExplore={() => handleExplore(workflow, generalUseCaseState, setGeneralUseCaseState)}
                                                    sideWorkflow={true}
                                                    handleActivate={handleEdit}
                                                    activate={false}
                                                    isWithSubsub={generalUseCaseState.currentView === 'sub'}
                                                    isGeneral={true}
                                                    tooltipCls={'left-start'}
                                                    handleBack={handleBack}
                                                    generalUseCaseState={generalUseCaseState}
                                                    setGeneralUseCaseState={setGeneralUseCaseState}
                                                    serviceLineState={serviceLineState}
                                                    setServiceLineState={setServiceLineState}
                                                    enablingUseCaseState={enablingUseCaseState}
                                                    setEnablingUseCaseState={setEnablingUseCaseState}
                                                    category='General Use Case'
                                                    isDesc = {!!workflow.description}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="ml-4">
                                        <h2 className="text-xs font-bold mt-4 mb-2">
                                            {serviceLineState.currentView == 'parent' ? 'Service Lines ' : serviceLineState.currentView === 'sub' ? serviceLineState.selectedCategory : serviceLineState.selectedSubCategory}
                                        </h2>
                                        {serviceLineState.currentView !== 'parent' && (
                                            <div className="flex items-center dark:text-[#9d9f9e]" onClick={() => handleBack(serviceLineState, setServiceLineState)}>
                                                {arrow()}
                                                <p className="text-xs">
                                                    Back
                                                </p>
                                            </div>
                                        )}
                                        {filteredServiceLines?.map((workflow: any, index: any) => (
                                            <div className="parent" key={index}>
                                                <Workflow
                                                    tableView={true}
                                                    workflow={workflow}
                                                    index={index}
                                                    activeTooltipIndex={activeTooltipIndex}
                                                    setActiveTooltipIndex={setActiveTooltipIndex}
                                                    withExplore={serviceLineState.currentView !== 'subsub'}
                                                    handleExplore={() => handleExplore(workflow, serviceLineState, setServiceLineState)}
                                                    sideWorkflow={true}
                                                    handleActivate={handleEdit}
                                                    activate={false}
                                                    isWithSubsub={!!workflow.subsubcategory}
                                                    isGeneral={false}
                                                    tooltipCls={'left-start'}
                                                    handleBack={handleBack}
                                                    generalUseCaseState={generalUseCaseState}
                                                    setGeneralUseCaseState={setGeneralUseCaseState}
                                                    serviceLineState={serviceLineState}
                                                    setServiceLineState={setServiceLineState}
                                                    enablingUseCaseState={enablingUseCaseState}
                                                    setEnablingUseCaseState={setEnablingUseCaseState}
                                                    category='Service Lines'
                                                    isDesc = {!!workflow.description}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    {/* end service line */}

                                    {/* start Enabling function */}


                                    <div className="ml-4 h-full">
                                        <h2 className="text-xs font-bold mt-4 mb-2">
                                            {enablingUseCaseState.currentView == 'parent' ? 'Enabling Functions ' : enablingUseCaseState.currentView === 'sub' ? enablingUseCaseState.selectedCategory : enablingUseCaseState.selectedSubCategory}
                                        </h2>
                                        {enablingUseCaseState.currentView !== 'parent' && (
                                            <div className="flex items-center dark:text-[#9d9f9e]" onClick={() => handleBack(enablingUseCaseState, setEnablingUseCaseState)}>
                                                {arrow()}
                                                <p className="text-xs">Back</p>
                                            </div>
                                        )}
                                        {filteredEnablingFunctions?.map((workflow: any, index: any) => (
                                            <div className="parent" key={index}>
                                                <Workflow
                                                    tableView={true}
                                                    workflow={workflow}
                                                    index={index}
                                                    activeTooltipIndex={activeTooltipIndex}
                                                    setActiveTooltipIndex={setActiveTooltipIndex}
                                                    withExplore={enablingUseCaseState.currentView !== 'subsub'}
                                                    handleExplore={() => handleExplore(workflow, enablingUseCaseState, setEnablingUseCaseState)}
                                                    sideWorkflow={true}
                                                    handleActivate={handleEdit}
                                                    isWithSubsub={!!workflow.subsubcategory}
                                                    activate={false}
                                                    isGeneral={false}
                                                    tooltipCls={'left-start'}
                                                    handleBack={handleBack}
                                                    generalUseCaseState={generalUseCaseState}
                                                    setGeneralUseCaseState={setGeneralUseCaseState}
                                                    serviceLineState={serviceLineState}
                                                    setServiceLineState={setServiceLineState}
                                                    enablingUseCaseState={enablingUseCaseState}
                                                    setEnablingUseCaseState={setEnablingUseCaseState}
                                                    category='Enabling Functions'
                                                    isDesc = {!!workflow.description}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                            </div>

                        </>
                    ) : null}
                </div>


                {isUploadModalOpen && (
                    <ActivateWorkflow
                        modalOpen={isUploadModalOpen}
                        setModalOpen={() => setUploadModalOpen(false)}
                        workflow={editWorkflow}
                        token={token}
                    />
                )}
            </div>
    );
};

export default HomeContent;
