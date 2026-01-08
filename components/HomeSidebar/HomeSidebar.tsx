import { useState } from 'react';
import useHtmlClass from '@/utils/app/getTheme';
import Workflow from '../Workflow/Workflow';
import ActivateWorkflow from '../Modals/Workflows/ActivateWorkflow';
import { useRouter } from 'next/router';

interface WorkflowProps {
    id: number;
    name: string;
    description: string;
    // Add other relevant properties
  }
  
  interface HomeSidebarProps {
    topWorkflows: WorkflowProps[];
    token: string;
  }

const HomeSidebar: React.FC<HomeSidebarProps> = ({ topWorkflows, token }: any) => {
    const theme: any = useHtmlClass();
    const [activeTooltipIndex, setActiveTooltipIndex] = useState<any>(null);
    const [isUploadModalOpen, setUploadModalOpen] = useState(false);
    const [editWorkflow, setEditWorkflow] = useState(false);
    const router = useRouter();


    const handleActivate =(workflow:any)=>{
        if(workflow.uploadRequired){
            setEditWorkflow(workflow);
            setUploadModalOpen(true);
        }else{
            router.push(`/chat?id=${workflow._id}`)
        }
    };

    const currentMonth = new Date().toLocaleString('default', { month: 'long' });

    return (
        <div className="dark:bg-primary dark:bg-opacity-[0.8] bg-white h-full md:m-4 p-5 mx-auto  rounded-[30px] md:w-[390px]  xl:block pb-[52px] sidebar-blk">
        <p className="dark:text-secondary text-center text-md mb-2 font-open-sans-semibold">{currentMonth} Top 20 Agents </p>
        <hr className='-mx-5 mb-4 mt-4 border-grey' />
            <div className={`relative flex flex-col  max-h-[1000px] home-sidebar ${topWorkflows && topWorkflows.length > 4 ? '':''}`} dir="rtl">
            {topWorkflows && topWorkflows.map((workflow:any, index:any) => (
                <Workflow
                    key={index}
                    workflow={workflow}
                    index={index}
                    activeTooltipIndex={activeTooltipIndex}
                    setActiveTooltipIndex={setActiveTooltipIndex}
                    handleActivate={handleActivate} 
                    sideWorkflow={false}
                    type="number"
                    isWithSubsub={true}
                    tooltipCls={'right-start'}
                />
            ))}
            </div>
            {isUploadModalOpen && <ActivateWorkflow 
             modalOpen={isUploadModalOpen}
             setModalOpen={()=>{
                setUploadModalOpen(false)
             }}
            workflow={editWorkflow}
            token={token}
             />}
        </div>
    );
};

export default HomeSidebar;
