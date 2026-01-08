import React, { useState, useEffect, useRef } from 'react';
import { IconAbc, IconArrowZigZag, IconCheck, IconCircle } from '@tabler/icons-react';

interface DropdownProps {
  options: string[];
  selectedValue?: string;
  onSelect: (option: string) => void;
  buttonStyle?: string;
  placeholder: string;
  children: React.ReactNode; // Add children prop
  sendOption:any
}

const Filter: React.FC<DropdownProps> = (props:any) => {
  const { options, selectedValue, onSelect, children } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(selectedValue);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedOption(selectedValue);
  }, [selectedValue]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleOptionClick = (option: string) => {
    setSelectedOption(option);
    onSelect(option)
    setIsOpen(false);
    props.sendOption(option);
  };

  return (
    <div className={`relative inline-block text-left `} ref={dropdownRef}>
      <div onClick={toggleDropdown}>
        {children}
      </div>

      {isOpen && (
        <div className="transform scale-90 w-[180px] origin-top-right absolute right-0 mt-2 rounded-2xl shadow-lg dark:bg-black bg-white dark:text-white text-dark ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
            <span className="block px-4 py-2 text-sm text-gray-700 rounded-2xl  w-full text-left dark:text-white text-dark font-[700]">Sort by</span>
            {options.map((option:any,index:any) => (
           <>
              <button
                key={option}
                className={`flex items-center px-4 py-2 text-sm  w-full text-left dark:text-white text-dark dark:hover:text-secondary hover:text-secondary`}
                onClick={() => handleOptionClick(option)}
              >
               {index == 0 ? <IconAbc size={20} className="mr-2"/> :null} {index == 1 ? <IconArrowZigZag size={18} className="mr-2"/> :null}<span className='mr-auto'>{option} </span>
               {option === selectedOption   ? 
                    <IconCheck className="dark:bg-white bg-secondary rounded-3xl dark:text-secondary text-white w-[18px] h-[18px] " size="10" /> :
                    selectedOption == undefined && option == 'Most popular' ?<IconCheck className="dark:bg-white bg-secondary rounded-3xl dark:text-secondary text-white w-[18px] h-[18px] " size="10" />:<IconCircle className="w-[16px] h-[16px] ml-auto" />}
              </button>
              {index == 0 ? <hr className="h-px mx-4 my-2 bg-gray-200 border-0 dark:bg-[#676982] bg-[#000]"/>:""} 
           </>

            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Filter;
