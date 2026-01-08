
import { ReactNode, useEffect } from 'react';
import React, { useState } from 'react';
import { useContext } from 'react';
import { useTranslation } from 'react-i18next';

import { useRouter } from 'next/router';

import { AuthContext } from '@/utils/app/azureAD';
import useHtmlClass from '@/utils/app/getTheme';
import { getUser } from '@/utils/app/userData';

import AgentsTab from './components/AgentsTab';
import InfoTab from './components/InfoTab';
import SidebarChatSection from './components/SidebarChatSection';

import SpacesSection from '../Folder/NewComp/SidebarSpaceSection';
import DocumentModal from '../Modals/SubmitDataToTuneGenie';
import Search from '../Search';

import { useSpaces } from '@/context/SpacesContext';

interface Props<T> {
  side?: 'left' | 'right';
  isOpen: boolean;
  items: T[];
  itemComponent: ReactNode;
  folderComponent: ReactNode;
  footerComponent?: ReactNode;
  searchTerm: string;
  displayShowMore?: boolean;
  handleSearchTerm: (searchTerm: string) => void;
  onClose?: () => void;
  handleCreateItem: () => void;
  handleCreateFolder?: () => void;
  handleDrop: (e: any) => void;
  addItemButtonTitle?: string;
  toggleOpen?: () => void;
}

const Sidebar = <T,>({
  isOpen,
  items,
  itemComponent,
  folderComponent,
  footerComponent,
  searchTerm,
  displayShowMore,
  handleSearchTerm,
  onClose,
  handleCreateItem,
  handleCreateFolder,
  handleDrop,
}: Props<T>) => {
  const { t } = useTranslation('promptbar');
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const authContext = useContext(AuthContext);
  const user: any = authContext?.user;
  const router = useRouter();
  const { conversationId } = router.query; // Retrieve 'id' from the route
  // const theme: any = useHtmlClass();
  const { spaces, activeSpace, setActiveSpace } = useSpaces();
  const [isLightMode, setIsLightMode] = useState<boolean>(true);
  const tab: any = sessionStorage.getItem('currentTab');
  const [activeTab, setActiveTab] = useState<
    'chats' | 'agents' | 'info' | string
  >(() => {
    if (typeof window !== 'undefined') {
      return (sessionStorage.getItem('currentTab') as any) || 'chats';
    }
    return 'chats';
  });

  useHtmlClass();

  // Initialize with "chats" tab on first load
  useEffect(() => {
    if (!sessionStorage.getItem('currentTab')) {
      sessionStorage.setItem('currentTab', 'chats');
      setActiveTab('chats');
    }
  }, []);

  const handleGetUserData = () => {
    return getUser();
  };

  const handleEditClick = (space: any) => {
    setActiveSpace(space);
    router.push('/teamspace');
  };
  const allowDrop = (e: any) => {
    e.preventDefault();
  };

  const highlightDrop = (e: any) => {
    e.target.style.background = '#343541';
  };

  // Load saved theme preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsLightMode(savedTheme === 'light');
    }
  }, []);

  // Listen for tab changes from sessionStorage
  useEffect(() => {
    let lastTab = sessionStorage.getItem('currentTab');

    const handleTabChange = () => {
      const currentTab = sessionStorage.getItem('currentTab');
      // Only update and log if tab actually changed
      if (currentTab !== lastTab) {
        console.log(
          '📱 SidebarNew: Tab changed from',
          lastTab,
          'to:',
          currentTab,
        );
        lastTab = currentTab;
        if (currentTab) {
          setActiveTab(currentTab);
        }
      }
    };
    const interval = setInterval(handleTabChange, 200);
    return () => clearInterval(interval);
  },[]);

    // Check every 200ms for sessionStorage changes (reduced frequency)
  // Apply theme instantly on toggle
  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
    localStorage.setItem('theme', isLightMode ? 'light' : 'dark');
    
  }, [isLightMode]);

  // Apply theme instantly on toggle
  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
    localStorage.setItem('theme', isLightMode ? 'light' : 'dark');
  }, [isLightMode]);

  const removeHighlight = (e: any) => {
    e.target.style.background = 'none';
  };

  function checkScreenSize() {
    if (window.innerWidth < 1000) {
      setCollapsed(true);
    } else {
      setCollapsed(false);
    }
  }

  window.addEventListener('resize', checkScreenSize);
  const openNewTab = () => {
    window.open('/chat-history', '_blank ');
  };
  function renderChildren() {
    switch (activeTab) {
      case 'chats':
      case 'dashboard':
      case "null":
        return (
          <div className="flex-1 flex flex-col space-y-3 overflow-hidden md:max-w-[256px] max-w-[280px]">
            <Search
              placeholder={t('Search by Spaces or Chat') || ''}
              searchTerm={searchTerm}
 onSearch={(value) => {
                handleSearchTerm(value);
                sessionStorage.setItem("searchTerm", value);}}
                collapsed={collapsed}
              openSidebar={() => {
                setCollapsed(false);
              }}
            />

            {/* Main scrollable content area */}
            <div className="flex-1 min-h-0 md:max-w-[256px] max-w-[280px] w-full flex flex-col space-y-1">
              {/* Spaces Section */}
              <div className="flex-shrink-0 max-h-[35%] overflow-hidden flex flex-col">
                <SpacesSection />
              </div>
              <div className="h-[1px] w-full bg-gray-200 dark:bg-gray-700" />
              {/* Chats Section */}
              <div className="flex-1 min-h-0">
                <SidebarChatSection
                  items={items}
                  itemComponent={itemComponent}
                  handleSearchTerm={handleSearchTerm}
                  handleCreateItem={handleCreateItem}
                  handleDrop={handleDrop}
                />
              </div>
            </div>
          </div>
        );
        break;
      case 'agents':
      case 'agents-edit':
      case 'agents-new':
        return (
         
            <div className="flex-1 flex flex-col py-2 space-y-3 overflow-hidden md:w-[256px] w-[280px] overflow">
              <AgentsTab setActiveTab={setActiveTab} />
            </div>
        );
        break;

      case 'info':
        return (
          <div className="flex-1 flex flex-col py-2 space-y-3 overflow-hidden md:w-[256px] w-[280px] overflow -mt-2">
            <InfoTab
              setActiveTab={setActiveTab}
            />
          </div>
        );
    }
  }
  return (
    <div className="relative" onClick={()=>sessionStorage.setItem("dashboard","false")}>
      {isUploadModalOpen && (
        <DocumentModal
          token={user?.idToken}
          setModalOpen={() => {
            setUploadModalOpen(false);
          }}
        />
      )}

      {/* Sidebar container */}
      <div
        className={`
           pt-2 bg-white dark:bg-[#1a1a1a] border-r border-gray-200 dark:border-gray-700 flex flex-col
          fixed md:top-[50px] top-[80px] bottom-0 left-0
          transition-transform duration-300
          overflow-hidden
          w-full max-w-[280px] md:max-w-[256px]
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}
        style={{ zIndex: 50 }}
      >
        {renderChildren()}

        {/* Footer & Bottom Navigation */}
        <div className="border-t border-gray-200 dark:border-gray-700 z-[100]">
          {/* Submit Data Section */}
          <div
            className="border-b border-gray-200 dark:border-gray-700"
            onClick={() => {setUploadModalOpen(true);window.dispatchEvent(new CustomEvent('close-drawer',{} ));}}
          >
            <button className="flex items-center text-[11px] py-3 font-small font-calibri text-gray-900 dark:text-gray-100 w-full justify-between hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md p-1.5">
              <span>Submit data to tune Genie</span>
              <svg
                className="w-4 h-4 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          {/* Mode Section */}
          <div className="py-1 border-b border-gray-200 dark:border-gray-700">
            <div className="font-calibri text-[12px] font-semibold text-gray-900 dark:text-gray-100 px-2">
              Mode
            </div>
            <div className="flex mb-1 items-center justify-between px-2">
              <span className="font-calibri text-[11px] text-gray-600 dark:text-gray-300">
                Light mode
              </span>
              <button
                onClick={() => setIsLightMode(!isLightMode)}
                className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none ${isLightMode ? 'bg-[#43B02A]' : 'bg-gray-200'
                  }`}
              >
                <span
                  className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${isLightMode ? 'translate-x-4' : 'translate-x-1'
                    }`}
                />
              </button>
            </div>
          </div>

          {/* Bottom Navigation */}
          <div className="p-1 bg-white dark:bg-[#1e1e1e] border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-2">
              <button
                className={`flex flex-col items-center px-1.5 py-0.5 
        ${
          activeTab === 'chats' || activeTab === ''
            ? 'text-black dark:text-white'
            : 'text-gray-400 dark:text-gray-300'
        } hover:text-gray-700 dark:hover:text-white transition-colors`}
                onClick={() => {
                  console.log('💬 Chats tab clicked');
                  setActiveTab('chats');
                  sessionStorage.setItem('activeInfoTab', '');
                  sessionStorage.setItem("dashboard","false");
                  sessionStorage.setItem('currentTab', 'chats');
                  console.log(
                    '✅ Tab set to chats:',
                    sessionStorage.getItem('currentTab'),
                  );
                   window.dispatchEvent(new CustomEvent('agentEditModeChange', {
                      detail: { isEditMode: false }
                    }));
                  // Navigate to home page for chats tab
                  router.push('/');
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
                  />
                </svg>
                <span className="font-calibri text-[11px] mt-0.5">Chats</span>
              </button>

              <button
                className={`flex flex-col items-center px-1.5 py-0.5 ${
                  activeTab === 'agents' ||
                  activeTab === 'agents-edit' ||
                  activeTab === 'agents-new'
                    ? 'text-black dark:text-white'
                    : 'text-gray-400 dark:text-gray-300'
                } hover:text-gray-600 dark:hover:text-white`}
                onClick={() => {
                  console.log('🤖 Agents tab clicked');
                  setActiveTab('agents');
                  sessionStorage.setItem("dashboard","false");
                  sessionStorage.setItem('activeInfoTab', '');
                  router.push('./');
                   window.dispatchEvent(new CustomEvent('agentEditModeChange', {
                      detail: { isEditMode: false }
                    }));
                  sessionStorage.setItem('currentTab', 'agents');
                  console.log(
                    '✅ Tab set to agents:',
                    sessionStorage.getItem('currentTab'),
                  );
                  // Stay on current page, just switch the tab view
                }}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <span className="font-calibri text-[11px] mt-0.5">Agents</span>
              </button>

              <button
                className={`flex flex-col items-center px-1.5 py-0.5 ${
                  activeTab === 'info'
                    ? 'text-black dark:text-white'
                    : 'text-gray-400 dark:text-gray-500'
                } hover:text-gray-600 dark:hover:text-white`}
                onClick={() => {
                  router.push('./');
                  sessionStorage.setItem("dashboard","false");
                  setActiveTab('info');
                   window.dispatchEvent(new CustomEvent('agentEditModeChange', {
                      detail: { isEditMode: false }
                    }));
                  sessionStorage.setItem('activeInfoTab', 'about');
                  sessionStorage.setItem('currentTab', 'info');
                }}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="font-calibri text-[11px] mt-0.5">Info</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className={`fixed ml-[280px] inset-0 bg-black/40 z-40 md:hidden`}
          onClick={onClose}
        />
      )}
    </div>
  );
};
export default Sidebar;
