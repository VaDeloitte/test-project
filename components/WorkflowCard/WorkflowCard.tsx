import Image from 'next/image';
import { IconSettings2, IconSettingsQuestion, IconChevronDown } from '@tabler/icons-react';

interface WorkflowCardProps {
    title: string;
}

const WorkflowCard: React.FC<WorkflowCardProps> = ({ title }) => {
    console.log(title,'title');
    return (
        <div className={`dark:bg-primary bg-white p-8 rounded-[30px] w-full cursor-pointer dark:text-white text-dark `} >
            <p className="dark:text-white text-[22px]">{title}</p>
        </div>
    );
};

export default WorkflowCard;
