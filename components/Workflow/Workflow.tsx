import React, { useEffect, useState } from 'react';
import { IconExclamationCircle } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { WorkflowI } from '../../types/workflow';
import { Tooltip } from 'react-tooltip';
import { v4 as uuidv5 } from 'uuid';
interface WorkflowProps {
    handleExplore?: (title: string) => void;

    buttonStyle?: string;
    workflow: WorkflowI;
    index: number;
    activeTooltipIndex: { index: number | null; section: string | null };
    setActiveTooltipIndex: (index: { index: number | null; section: string | null }) => void;
    withExplore?: boolean;
    handleActivate?: (workflow: any) => void;
    sideWorkflow?: boolean;
    type?: string;
    tooltipCls?: string;
    isWithSubsub?: boolean;
    isGeneral?: boolean;
    tableView?:boolean
    activate?:boolean
    showButton?:boolean
    handleBack?:any
    generalUseCaseState?:any
    setGeneralUseCaseState?:any
    enablingUseCaseState?:any
    setEnablingUseCaseState?:any
    serviceLineState?:any
    setServiceLineState?:any
    category?:string
    isDesc?:boolean
}

let isHandlingClick = false;

const Workflow: React.FC<WorkflowProps> = (props) => {
    const { workflow, index, activeTooltipIndex, setActiveTooltipIndex, withExplore, buttonStyle, sideWorkflow = false, type, tooltipCls, isWithSubsub, tableView=false, activate=true, showButton = false,handleBack,category,generalUseCaseState,setGeneralUseCaseState,serviceLineState,setServiceLineState,enablingUseCaseState,setEnablingUseCaseState,isGeneral,isDesc } = props;
    const router = useRouter();
    const { id } = router.query;
    const [buttonWidth, setButtonWidth] = useState<string>('w-[113.5px]');
    const [isHandlingClick, setIsHandlingClick] = useState(false);

    const handleExplore = (title: string) => {
        if (props.handleExplore) {
            props.handleExplore(title);
        }
    }

    const openEditModal = () => {
        if (props.handleActivate) {
            props.handleActivate(workflow);
        }
    }

    const handleClick = async (event: any) => {
        event.preventDefault();
        console.log(workflow,'event')
        console.log(withExplore,'event')
        if(category=='Service Lines')
        {
            handleBack(generalUseCaseState,setGeneralUseCaseState,'yes')
            handleBack(enablingUseCaseState,setEnablingUseCaseState,'yes')
        }
        else if(category =='Enabling Functions')
        {
            handleBack(generalUseCaseState,setGeneralUseCaseState,'yes')
            handleBack(serviceLineState,setServiceLineState,'yes')
        }
        else if(category == 'General Use Case'){
            handleBack(serviceLineState,setServiceLineState,'yes')
            handleBack(enablingUseCaseState,setEnablingUseCaseState,'yes')


        }
        if (isHandlingClick) {
            return;
        }

        setIsHandlingClick(true);

        try {
            if (withExplore) {
                handleExplore(workflow.title);
            } else {
                if (activate) {
                    localStorage.removeItem("file");
                    
                    // Always use handleActivate to properly initialize the workflow
                    // This ensures sessionStorage is set before navigation
                    if (props.handleActivate) {
                        console.log('[Workflow]: Calling handleActivate for workflow:', workflow.title);
                        props.handleActivate(workflow);
                    } else {
                        // Fallback: direct navigation if handleActivate not provided
                        console.warn('[Workflow]: No handleActivate provided, using direct navigation (may not work properly)');
                        await router.push(`/chat?id=${uuidv5()}_${workflow._id}&wid=${workflow._id}`);
                    }
                }
            }
        } finally {
            setIsHandlingClick(false);
        }
    }

    useEffect(() => {
        if (withExplore) {
            setButtonWidth('w-[92.5px]');
        }
    }, [withExplore]);

    return (
        <ul
            key={index}
            dir="ltr"
            className={`${type === "number" || showButton   ? "" : "list-disc1"} space-y-2 ${sideWorkflow ? 'w-full' : ''} ${tableView ? 'list-none':'list-none'}`}
        >
            <li className='relative'>
                <div 
                    className={`relative dark:text-[#fff] text-white text-xs flex gap-2 items-baseline mb-2  ${showButton ? '':isDesc?'':' cursor-pointer dark:hover:bg-main dark:hover:bg-gray-100 dark:hover:text-black'} rounded-md leading-6 px-2 -mx-2 transition-all duration-200`}
                    >
                    {type === "number" ? <span className='w-3 text-secondary'>{index + 1}.</span> : ""}
                    {showButton ?  <span   onClick={(event) => handleClick(event)} className=" cursor-pointer text-[#729c3e] italic font-bold block w-full text-center">Click to activate {'>>'}</span>
                   :<span onClick={(event) => handleClick(event)} className="w-full block">  {workflow.title}</span> }
               
               
                   
                        {/* {isWithSubsub && !tableView ? (
                            <IconExclamationCircle size="15"
                            data-tooltip-id={`my-tooltip`+workflow._id}
                            data-tooltip-place={tooltipCls}
                            data-tooltip-wrapper="html"
                            data-tooltip-position-strategy="fixed"
                            data-tooltip-delay-show={100}
                            data-tooltip-delay-hide={200}
                            data-tooltip-offset={-4}
                            className="relative right-0 top-1 ml-auto w-8 text-yellow-600 dark:text-yellow-200"
                            />
                        ) : null} */}


                   <Tooltip clickable id={'my-tooltip'+workflow._id}    data-tooltip-offset="100" className="pointer-events-none z-20 max-w-[200px] !bg-main  arrow">
                        <div>
                            <p>
                            <span className='block' title={workflow.description.split('.\n')[0]}>
                                {workflow.description.includes('.') ? 
                                workflow.description.split('.')[0] + '...' :
                                (workflow.description.length > 100 ? workflow.description.substring(0, 97) + '...' : workflow.description)
                                }
                            </span>
                                </p>
                                {workflow.description.split('.\n')[1] && (
                               <p className="mt-2">
                               <span className="font-bold">Description</span>: 
                               <span className='line-clamp-3' title={
                                   workflow.description.split('.\n')[1].includes(':') ? 
                                   workflow.description.split('.\n')[1].split(':').slice(1).join(':') : 
                                   workflow.description.split('.\n')[1]
                               }>
                                   {workflow.description.split('.\n')[1].includes(':') ? 
                                   workflow.description.split('.\n')[1].split(':').slice(1).join(':') : 
                                   workflow.description.split('.\n')[1]
                                   }
                               </span>
                           </p>
                            )}
                                {workflow.category && (
                                    <p className="mt-2">
                                        <span className="font-bold">Category</span>: {workflow.category}
                                    </p>
                                )}
                                {workflow.subcategory && (
                                    <p className="mt-2">
                                        <span className="font-bold">Subcategory</span>: {workflow.subcategory}
                                    </p>
                                )}
                        </div>
                    </Tooltip>

                  
                 
                </div>
            </li>
        </ul>
    );
};

export default Workflow;
