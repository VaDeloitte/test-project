'use client'
import { IconMistOff, IconPlus } from '@tabler/icons-react';
import { ReactNode } from 'react';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { WorkflowSkeleton } from './Skeletons';
import { ChatComponent } from '@/components/SidebarChat/ChatComponent';

interface Props<T> {
  items: T[];
  itemComponent: ReactNode;
  displayShowMore?: boolean;
  handleSearchTerm: (searchTerm: string) => void;
  handleCreateItem: () => void;
  handleDrop: (e: any) => void;
}

const SidebarChatSection = <T,>({
  items,
  itemComponent,
  displayShowMore,
  handleSearchTerm,
  handleCreateItem,
  handleDrop,
}: Props<T>) => {
  const { t } = useTranslation('promptbar');
  const [collapsed, setCollapsed] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [limit,setLimit]=useState<any>({limit:50,current:0});
  const theme = document.documentElement.classList.contains("dark") ? "dark" : "light";

  const allowDrop = (e: any) => e.preventDefault();
  const highlightDrop = (e: any) => {
    e.target.style.background = theme === 'dark' ? '#2e2e2e' : '#f3f4f6';
  };
  const removeHighlight = (e: any) => {
    e.target.style.background = 'none';
  };

  function checkScreenSize() {
    if (window.innerWidth < 1000) setCollapsed(true);
    else setCollapsed(false);
  }

  window.addEventListener('resize', checkScreenSize);

  const openNewTab = () => {
    window.open('/chat-history', '_blank');
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSkeleton(false);
    }, 5000); // ⏱ Show skeletons for 5 seconds

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="px-2 text-sm font-semibold text-gray-900 dark:text-white">
          Chats
        </h2>
      </div>

      {/* New Chat button */}
      <div className="flex items-center mb-1 flex-shrink-0">
        <button
          className={`w-full flex items-center px-4 py-2 space-x-1.5 font-calibri text-[11px] 
            bg-white text-gray-600 hover:bg-[#F2F6F7] hover:text-gray-900
            dark:hover:bg-[#2e2e2e] dark:text-white dark:bg-[#1e1e1e]`}
          onClick={() => {
            handleCreateItem();
            handleSearchTerm('');
            sessionStorage.setItem("currentTab","chats");
            sessionStorage.setItem("dashboard","false");
          }}
        >
          <div className="w-5 h-5 flex items-center justify-center border border-black dark:border-white rounded-full">
            <svg
              className="w-3 h-3 text-black dark:text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6v12m6-6H6"
              />
            </svg>
          </div>
          <span className="font-[Calibri] text-[12px] font-medium">
            New Chat
          </span>
        </button>
      </div>

      {/* Chat list */}
      <div className="flex-1 min-h-0 overflow-y-auto small-scrollbar">
        {
        // items?.length > 0 ? (
          <div
            onDrop={handleDrop}
            onDragOver={allowDrop}
            onDragEnter={highlightDrop}
            onDragLeave={removeHighlight}
          >
            {/* {React.cloneElement(itemComponent as React.ReactElement<any>, { collapsed })} */}

            <ChatComponent  />
            {displayShowMore && (
              <div className="flex items-center ml-2 mt-1">
                <IconPlus
                  onClick={openNewTab}
                  className="cursor-pointer text-black dark:text-white"
                />
                {!collapsed && (
                  <button
                    className="text-[12px] leading-normal ml-2 underline text-black dark:text-white"
                    onClick={openNewTab}
                  >
                    Show more
                  </button>
                )}
              </div>
            )}
          </div>
        }
      </div>
    </div>
  );
};

export default SidebarChatSection;
