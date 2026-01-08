'use client';

import React, { useState } from 'react';
import { Listbox } from '@headlessui/react';
import { CheckIcon, SelectorIcon } from '@heroicons/react/solid';

export interface Workflow {
  _id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  subsubcategory: string;
  hitCount: number;
  uploadRequired: boolean;
  uploadDescription: string;
  workflowType?: string;
}


interface ListSelectBoxProps<T> {
  options: T[];
  selected: Workflow | null;
  onChange: (value: T) => void;
  onClick?:(value:any)=>void;
  getOptionLabel: (option: T) => string;
  className?: string;
  placeholder: { title: string };
}

export default function ListSelectBox<T>({
  options,
  onChange,
  getOptionLabel,
  onClick,
  className = '',
  placeholder
}: ListSelectBoxProps<T>) {
  const [selectedOption, setSelectedOption] = useState<T | undefined>(undefined);
  const [hasUserSelected, setHasUserSelected] = useState(false);

  const handleChange = (value: T) => {
    setSelectedOption(value);
    setHasUserSelected(true); // Only mark as selected when user does something
    onChange(value);
  };

 return (
  <div className={`w-full max-w-[450px] ${className}`}>
    <Listbox value={selectedOption} onChange={handleChange} >
      <div className="relative w-full">
        {/* Button */}
        <Listbox.Button
        onClick={onClick}
          className="
  relative 
  w-[220px] sm:w-[280px] md:w-[280px] lg:w-[280px] 
  h-10 sm:h-11 md:h-12 
  cursor-pointer border border-gray-300 dark:border-gray-600 rounded-md 
  bg-white dark:bg-[#1e1e1e]
  py-2 pl-3 pr-10 text-left 
  text-gray-900 dark:text-gray-200
  focus:outline-none shadow-sm
"

        >
<span className="block truncate text-[14px] text-gray-900 dark:text-gray-200">
            {hasUserSelected && selectedOption
              ? getOptionLabel(selectedOption)
              : placeholder.title}
          </span>
          <span className="absolute inset-y-0 right-0 flex items-center pr-2">
            <SelectorIcon className="h-4 sm:h-5 md:h-6 w-4 sm:w-5 md:w-6 text-gray-400" />
          </span>
        </Listbox.Button>

        {/* Options */}
        <Listbox.Options
         className="
  absolute z-10 mt-1 
  max-h-40 
  w-[220px] sm:w-[280px] md:w-[280px] lg:w-[280px] 
  rounded-md bg-white dark:bg-[#1e1e1e]
  py-1 text-[14px]
  text-gray-900 dark:text-gray-200
  shadow-lg ring-1 ring-black ring-opacity-5 
  focus:outline-none overflow-y-scroll
"

        >
          {options.length === 0 ? (
            <div className="py-6 px-4 text-center text-gray-500 dark:text-gray-400 text-sm">
              No agents available
            </div>
          ) : (
            options.map((option, idx) => (
            <Listbox.Option
              key={idx}
              value={option}
              className={({ active }) =>
  `cursor-pointer select-none py-2 px-3 ${
    active ? "bg-gray-100 dark:bg-[#2e2e2e] dark:text-gray-300" : ""
  }`
}
            >
              {({ selected }) => (
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`truncate ${
                      selected ? "font-medium" : "font-normal"
                    }`}
                    title={getOptionLabel(option)}
                  >
                    {getOptionLabel(option)}
                  </span>
                  {/* {selected && (
                    <CheckIcon className="ml-2 h-4 sm:h-5 md:h-6 w-4 sm:w-5 md:w-6 text-blue-600 flex-shrink-0" />
                  )} */}
                </div>
              )}
            </Listbox.Option>
            ))
          )}
        </Listbox.Options>
      </div>
    </Listbox>
  </div>
);

}
