import React, { useState, useRef, useEffect } from 'react';
import { IconChevronDown, IconFlare, IconSparkles, IconCircle, IconCheck } from '@tabler/icons-react';
import { OpenAIModels } from '@/types/openai';

interface CustomDropdownProps {
  models: any;
  selectedConversation?: any;
  defaultModelId: string;
  handleChange: any;
}

const ModelDropdown: React.FC<CustomDropdownProps> = ({ models, selectedConversation, defaultModelId, handleChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(selectedConversation?.model?.id || defaultModelId);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [modelsData, setModelsData] = useState([]);

  const handleSelect = (modelId: string) => {
    setSelectedModel(modelId);
    handleChange({ target: { value: modelId } });
    setIsOpen(false);
    // changeIdForSelectedConversation(selectedConversation.id);
    // clearMessagesInSelectedConversation();
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  };

  function containsSubstring(mainString: string, subString: string): boolean {
    const sanitizedMainString = mainString.replace(/-/g, '');
    return sanitizedMainString.includes(subString);
  }
  useEffect(() => {

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  const selectedLabel = models.find((model: any) => model.id === selectedModel)?.label === "Tax Data Tuned Model" ? "Tax Genie" : "Genie";

  useEffect(() => {
    if (models && models.length != 0) {
      setModelsData(models.reverse());
    }
  }, [models])
  return (
    <div className="z-10 left-10">
      <div className="relative" ref={dropdownRef}>
        <button
          className="first-letter px-4 rounded-[70px] dark:bg-primary bg-white  p-3 text-left flex items-center justify-between w-fit dark:text-white text-black xl:text-[18px] text-[14px]"
          onClick={() => setIsOpen(!isOpen)}
        >
          {selectedLabel || 'Genie'} <IconChevronDown size={20} className="pt-1" />
        </button>
        {isOpen && modelsData && modelsData.length != 0 && (
          <ul className="absolute left-0 px-2  w-[262px] bg-white dark:bg-primary dark:text-white text-black   mt-2 z-10 rounded-[20px] models-blk">
            {modelsData?.map((model: any, index: any) => (
              <li
                key={model.id}
                className={`${index != 0 ? 'p-4 border-t-[1px] rounded-none mt-4 dark:border-[#707087] border-[#ededed]' : 'p-4 pb-0'} cursor-pointer rounded-[20px] hover:text-secondary `}
                onClick={() => handleSelect(model.id)}
              ><div className="flex items-center mb-1">
                  {index == 0 ? <IconFlare size="12" className="mr-1" /> : <IconSparkles size="12" className="mr-1" />} <p className="xl:text-[18px] text-[14px] font-bold">
                    {!model.label.includes('Standard Model') ? "Tax Genie" : " Genie"} </p>
                </div>

                <p className='flex items-center justify-between xl:text-[14px] text-[12px]'>

                  {model.id === defaultModelId ?
                    `${model.label}` : model.label}
                  {model.id === defaultModelId || containsSubstring(defaultModelId, model.id) ?
                    <IconCheck className="dark:bg-white bg-secondary rounded-3xl dark:text-secondary text-white w-[18px] h-[18px] relative top-[-12px]" size="10" /> :
                    <IconCircle className="relative top-[-12px]" />}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ModelDropdown;
