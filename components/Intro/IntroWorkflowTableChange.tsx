import React, { useEffect, useState } from 'react';
import { IconSearch, IconSend } from '@tabler/icons-react';
import Workflow from '../Workflow/Workflow';
import { WorkflowI } from '../../types/workflow';

interface HeaderProps {
    workflowsData: WorkflowI[];
    handleActivate: (workflowId: string) => void;
    triggerQueryClear:boolean;
    style?: string;
    showIcon?: boolean
    fullPlaceholder?: string
    setWorkflowsDataSearch?: any
    workflowsDataSearch: WorkflowI[];
    workflowsDataInitial: WorkflowI[];
}
type GroupedItems = Record<string, Record<string, Record<string, WorkflowI[]>>>;

const IntroWorkflowTableChange: React.FC<HeaderProps> = ({triggerQueryClear, workflowsDataInitial, workflowsData, setWorkflowsDataSearch, handleActivate, style, showIcon = true, fullPlaceholder = "Search for agent..." }) => {
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [searchResults, setSearchResults] = useState<WorkflowI[]>([]);
    const [showDropdown, setShowDropdown] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false); // State to handle loading
    const [activeTooltipIndex, setActiveTooltipIndex] = useState<{ index: number | null; section: string | null }>({ index: null, section: null });
    const [placeholder, setPlaceholder] = useState<string>('');
    const typingSpeed = 100;
    useEffect(()=>{
        setSearchQuery('')
    },[triggerQueryClear])
    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout>;
        if (placeholder.length < fullPlaceholder.length) {
            timeoutId = setTimeout(() => {
                setPlaceholder(fullPlaceholder.slice(0, placeholder.length + 1));
            }, typingSpeed);
        }
        return () => clearTimeout(timeoutId);
    }, [placeholder]);
    useEffect(() => {
        const uniqueCategories = new Set(searchResults.map((item) => item.category || "Uncategorized"));
        const uniqueSubcategories = new Set(searchResults.map((item) => item.subcategory || "Uncategorized"));
        const uniqueSubsubcategories = new Set(searchResults.map((item) => item.subsubcategory || "Uncategorized"));
        setExpandedCategories(uniqueCategories)
        setExpandedSubcategories(uniqueSubcategories)
        setExpandedSubsubcategories(uniqueSubsubcategories)
    }, [searchResults])
    const uniqueCategories = new Set(searchResults.map((item) => item.category || "Uncategorized"));
    const uniqueSubcategories = new Set(searchResults.map((item) => item.subcategory || "Uncategorized"));
    const uniqueSubsubcategories = new Set(searchResults.map((item) => item.subsubcategory || "Uncategorized"));

    // Initialize all states to be expanded by default
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(uniqueCategories);
    const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(uniqueSubcategories);
    const [expandedSubsubcategories, setExpandedSubsubcategories] = useState<Set<string>>(uniqueSubsubcategories);

    const toggleCategory = (category: string) => {
        setExpandedCategories((prev) => {
            const newSet = new Set(prev);
            newSet.has(category) ? newSet.delete(category) : newSet.add(category);
            return newSet;
        });
    };

    const toggleSubcategory = (subcategory: string) => {
        setExpandedSubcategories((prev) => {
            const newSet = new Set(prev);
            newSet.has(subcategory) ? newSet.delete(subcategory) : newSet.add(subcategory);
            return newSet;
        });
    };

    const toggleSubsubcategory = (subsubcategory: string) => {
        setExpandedSubsubcategories((prev) => {
            const newSet = new Set(prev);
            newSet.has(subsubcategory) ? newSet.delete(subsubcategory) : newSet.add(subsubcategory);
            return newSet;
        });
    };

    const groupedItems: GroupedItems = searchResults.reduce((acc, item) => {
        const { category = 'Uncategorized', subcategory = 'Uncategorized', subsubcategory = 'Uncategorized' } = item;
        if (!acc[category]) acc[category] = {};
        if (!acc[category][subcategory]) acc[category][subcategory] = {};
        if (!acc[category][subcategory][subsubcategory]) {
            acc[category][subcategory][subsubcategory] = [];
        }
        acc[category][subcategory][subsubcategory].push(item);
        return acc;
    }, {} as GroupedItems);

    const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);
        
    };
    const handleSearch = ()=>{
        if (searchQuery.length > 0) {
            setIsLoading(true); // Start loading
            setTimeout(() => { // Simulate delay for heavy computation or data fetching
                const results1 = filterWorkflows(searchQuery);
                const results = results1.filter(workflow=> workflow.description.length>0)
                // const filturedSubCategory = new Set(results1.map(item => item.subcategory))
                // const filturedSubSubCategory = new Set(results1.map(item => item.subsubcategory))
                // const additionalSubCategory = workflowsDataInitial.filter(item => filturedSubCategory.has(item.title))
                // const additionalSubSubCategory = workflowsDataInitial.filter(item => filturedSubSubCategory.has(item.title))
                // const resultsDuplicate = [...results1, ...additionalSubCategory, ...additionalSubSubCategory]
                // const results = Array.from(new Map(resultsDuplicate.map(item => [item._id, item])).values());
                // console.log(results,'workflowscheck')
                setWorkflowsDataSearch(results.length > 0 ? results : [])
                setSearchResults(results);
                setShowDropdown(results.length > 0 && searchQuery.length > 0);
                setIsLoading(false); // End loading
            }, 500); // Adjust timeout for real use case
        } else {
            setTimeout(() => {
                setWorkflowsDataSearch([])
                setSearchResults([]);
                setShowDropdown(false);
            }, 500);
        }
    }
    const handleKeyPress = (event:any) => {
        if (event.key === 'Enter') {
            handleSearch();
        }
      };
    const filterWorkflows = (query: string): WorkflowI[] => {
        const lowerCaseQuery = query.toLowerCase();
        return workflowsDataInitial.filter((workflow: WorkflowI) => {

            const isMatch = workflow.title.toLowerCase().includes(lowerCaseQuery)
            isMatch ? console.log(workflow, 'wfff') : null
            const isValidCategory = (

                (workflow.category === "Service Lines" || workflow.category === "Enabling Functions" ||
                    workflow.category === "General Use Cases")
            );
            return isMatch && isValidCategory;
        });
    };

    //  console.log(searchResults,'search')
    return (
        <div className="relative" style={{display:'flex',justifyContent:'flex-start'}}>
            {/* { <IconSearch className="dark:text-white absolute xl:top-7 top-[14.5px] left-4" /> } */}

            <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleKeyPress}
                // onClick={() => setShowDropdown(true)}
                placeholder={placeholder}
                className={"animated-placeholder relative z-10 px-12 text-[14px] w-full dark:text-white placeholder-[#1D1D1FB2] dark:placeholder-[#FFFFFFB2] rounded-[14px] xl:h-[80px] h-[50px] bg-transparent border-[1px] dark:border-red-50 border-[#1D1D1F] outline-none " + style}
            />
            <button style={{marginBottom:'9px', marginLeft:'10px'}} onClick={handleSearch}> <IconSend size={26} /></button>
        </div>
    );
};

export default IntroWorkflowTableChange;
