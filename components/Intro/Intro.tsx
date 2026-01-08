import React, { useEffect, useState } from 'react';
import { IconSearch } from '@tabler/icons-react';
import Workflow from '../Workflow/Workflow';
import { WorkflowI } from '../../types/workflow';

interface HeaderProps {
  workflowsData: WorkflowI[];
  handleActivate: (workflowId: string) => void;
  style?:string;
  showIcon?:boolean
  fullPlaceholder?:string
}

const Intro: React.FC<HeaderProps> = ({ workflowsData, handleActivate, style, showIcon=true, fullPlaceholder="Search for workflow..." }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<WorkflowI[]>([]);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false); // State to handle loading
  const [activeTooltipIndex, setActiveTooltipIndex] = useState<{ index: number | null; section: string | null }>({ index: null, section: null });
  const [placeholder, setPlaceholder] = useState<string>('');
  const typingSpeed = 100;

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    if (placeholder.length < fullPlaceholder.length) {
      timeoutId = setTimeout(() => {
        setPlaceholder(fullPlaceholder.slice(0, placeholder.length + 1));
      }, typingSpeed);
    }
    return () => clearTimeout(timeoutId);
  }, [placeholder]);

  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length > 0) {
      setIsLoading(true); // Start loading
      setTimeout(() => { // Simulate delay for heavy computation or data fetching
        const results = filterWorkflows(query);
        setSearchResults(results);
        setShowDropdown(results.length > 0 && query.length > 0);
        setIsLoading(false); // End loading
      }, 500); // Adjust timeout for real use case
    } else {
      setTimeout(() => {
        setSearchResults([]);
        setShowDropdown(false);
      }, 500);
    }
  };

  const filterWorkflows = (query: string): WorkflowI[] => {
    const lowerCaseQuery = query.toLowerCase();
    return workflowsData.filter((workflow: WorkflowI) => {
      const isMatch = workflow.title.toLowerCase().includes(lowerCaseQuery);
      const isValidCategory = (
        workflow.subcategory !== "" && workflow.subsubcategory !== "" &&
        (workflow.category === "Service Lines" || workflow.category === "Enabling Functions") ||
        (workflow.category === "General Use Cases" && workflow.subsubcategory === "" && workflow.subcategory !== "")
      );
      return isMatch && isValidCategory;
    });
  };

  return (
    <div className="relative">
      {showIcon ?  <IconSearch className="dark:text-white absolute xl:top-7 top-[14.5px] left-4" />:null}
     
      <input
        type="text"
        value={searchQuery}
        onChange={handleSearchChange}
        onClick={() => setShowDropdown(true)}
        placeholder={placeholder}
        className={"animated-placeholder relative z-10 px-12 text-[14px] w-full dark:text-white placeholder-[#1D1D1FB2] dark:placeholder-[#FFFFFFB2] rounded-[14px] xl:h-[80px] h-[50px] bg-transparent border-[1px] dark:border-red-50 border-[#1D1D1F] outline-none " + style}
      />
      {isLoading && (
        <div className="absolute top-1/2 right-10 transform -translate-y-1/2">
          <div className="loader" style={{ borderTopColor: 'transparent', animation: 'spin 1s linear infinite', width: '24px', height: '24px', borderStyle: 'solid', borderWidth: '2px', borderRadius: '50%' }}></div>
        </div>
      )}
      {showDropdown && searchResults.length > 0 && (
        <div>
          <div className='bg-transparent fixed inset-0 z-[9]' onClick={() => setShowDropdown(false)}></div>
          <div className="searchAutoCompleteDropDown absolute z-10 w-full bg-white dark:bg-primary border border-gray-300 dark:border-gray-700 rounded-xl max-h-60 overflow-y-auto dark:text-secondary overflow-hidden scrollbar-custom">
            <div className="text-right p-2 text-xs text-secondary">Showing {searchResults.length} results</div>
            <ul className="list-none p-0 m-0 text-left">
              {searchResults.map((workflow, index) => (
                <Workflow
                  key={workflow._id}
                  workflow={workflow}
                  index={index}
                  activeTooltipIndex={activeTooltipIndex}
                  setActiveTooltipIndex={setActiveTooltipIndex}
                  withExplore={false}
                  handleActivate={handleActivate}
                  sideWorkflow={true}
                  type={"search"}
                  isWithSubsub={true}
                  tooltipCls={'left-start'}
                />
              ))}
            </ul>
          </div>
        </div>
      )}

    </div>
  );
};

export default Intro;
