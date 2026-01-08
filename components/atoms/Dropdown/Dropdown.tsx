import React, { useState, useEffect, useRef } from 'react';
import { IconChevronDown } from '@tabler/icons-react';

interface DropdownProps {
  options: string[];
  selectedValue: string;
  onSelect: (option: string) => void;
  style?: string;
  buttonStyle?: string;
  placeholder: string;
}

const Dropdown: React.FC<DropdownProps> = ({ options, selectedValue, onSelect, style, buttonStyle, placeholder }) => {
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
    setIsOpen(false);
    onSelect(option);
  };

  return (
    <div className={`relative inline-block text-left ${style}`} ref={dropdownRef}>
      <div>
        <button
          type="button"
          className={`inline-flex justify-start items-center w-full rounded-md border dark:border-[#65687C] border-black shadow-sm px-2 py-2  bg-white text-sm font-medium  hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${buttonStyle} ${selectedOption ? 'text-black':''}`}
          onClick={toggleDropdown}
        >
          {selectedOption || placeholder}
          <IconChevronDown className="ml-auto" />
        </button>
      </div>

      {isOpen && (
        <div
          className="origin-top-right absolute right-0 mt-2 w-full rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10"
        >
          <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
            {options.map((option) => (
              <button
                key={option}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                onClick={() => handleOptionClick(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dropdown;
