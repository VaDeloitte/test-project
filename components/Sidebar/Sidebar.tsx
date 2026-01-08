'use client';
import { IconFolderPlus, IconMistOff, IconPlus } from '@tabler/icons-react';
import { ReactNode, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import Search from '../Search';
import { getUser } from '@/utils/app/userData';
import DocumentModal from '../Modals/Upload';
import useHtmlClass from '@/utils/app/getTheme';
import { useRouter } from 'next/router';
import { IconChevronLeft, IconBrandAsana, IconUpload } from '@tabler/icons-react';
import Image from 'next/image';
import {
  useContext,
} from 'react';
import { AuthContext } from '@/utils/app/azureAD';
import { v4 as uuidv5 } from 'uuid';

import {
  CloseSidebarButton,
  OpenSidebarButton,
} from './components/OpenCloseButton';
import Link from 'next/link';
interface Props<T> {
  isOpen: boolean;
  addItemButtonTitle: string;
  side: 'left' | 'right';
  items: T[];
  itemComponent: ReactNode;
  folderComponent: ReactNode;
  footerComponent?: ReactNode;
  searchTerm: string;
  displayShowMore?: boolean;
  handleSearchTerm: (searchTerm: string) => void;
  toggleOpen: () => void;
  handleCreateItem: () => void;
  handleCreateFolder: () => void;
  handleDrop: (e: any) => void;
}

const Sidebar = <T,>({
  isOpen,
  addItemButtonTitle,
  side,
  items,
  itemComponent,
  folderComponent,
  footerComponent,
  searchTerm,
  displayShowMore,
  handleSearchTerm,
  toggleOpen,
  handleCreateItem,
  handleCreateFolder,
  handleDrop,
}: Props<T>) => {
  const { t } = useTranslation('promptbar');
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const authContext = useContext(AuthContext)
  const user:any = authContext?.user;
  const router = useRouter();
  const { conversationId } = router.query;  // Retrieve 'id' from the route
  const theme: any = useHtmlClass();
  const handleGetUserData = () => {
    return getUser();
  };

  const allowDrop = (e: any) => {
    e.preventDefault();
  };

  const highlightDrop = (e: any) => {
    e.target.style.background = '#343541';
  };

  const removeHighlight = (e: any) => {
    e.target.style.background = 'none';
  };

  function checkScreenSize() {
    if (window.innerWidth < 1000) {
      setCollapsed(true)
    }
  }

  window.addEventListener("resize", checkScreenSize);
const openNewTab = ()=>{
  window.open('/chat-history','_blank ')
}
  return isOpen ? (
    <div className="relative">
      {isUploadModalOpen && <DocumentModal token={user?.idToken} setModalOpen={() => { setUploadModalOpen(false) }} />}
      <div
        className={`fixed top-0 ${side}-0 left-4 z-40 flex   flex-none flex-col space-y-2 bg-white dark:bg-primary xl:p-5 lg:p-4 text-[14px] transition-all sm:relative sm:top-0 rounded-[40px] ${collapsed ? 'w-[80px] flex items-center justify-center' : '2xl:w-[360px] xl:w-[306px] lg:w-[306px]'}`}
      >
        <div className="flex justify-center mb-4 mt-1 w-100">
          <Link href="/">
            {collapsed ?
              <img src={theme == 'dark' ? "/assets/d-logo-white.svg" : "/assets/d-logo.svg"} alt="D logo" height={40} width={40} />
              : <div className="flex items-center gap-2">
                <Image src={theme == 'dark' ? "/assets/deloitte-white-logo.svg" : "/assets/deloitte-logo.svg"} alt="Deloitte logo" height={40} width={40} className="cursor-pointer w-[80px] md:w-[120px]" />

              </div>}
          </Link>
        </div>

        <Search
          placeholder={t('Search in chat...') || ''}
          searchTerm={searchTerm}
          onSearch={handleSearchTerm}
          collapsed={collapsed}
          openSidebar={() => { setCollapsed(false) }}
        />

        <div className="flex items-center">
          <button
            className={`text-sidebar flex w-full flex-shrink-0 cursor-pointer select-none items-center gap-3 rounded-[40px] dark:hover:bg-black ${collapsed ? 'p-[15px]' : 'p-3'} dark:text-white text-black hover:bg-gray-500/10 dark:bg-main bg-[#ededed] ${collapsed ? 'w-[45px] h-[45px] flex items-center justify-center mb-2' : ''}`}
            onClick={() => {
              handleCreateItem();
              handleSearchTerm('');
              window.location.href = '/chat?id='+uuidv5()

            }}
          >
            <IconPlus size={16} />
            {collapsed ? "" : addItemButtonTitle}
          </button>
        </div>
        <div className="flex items-center">
          <button
            className={`text-sidebar flex w-full flex-shrink-0 cursor-pointer select-none items-center gap-3 rounded-[40px] dark:hover:bg-black  ${collapsed ? 'p-[15.6px]' : 'p-3'} dark:text-white hover:bg-gray-500/10 dark:bg-main bg-[#ededed] text-black ${collapsed ? 'w-[45px] h-[45px] flex items-center justify-center mb-2' : ''}`}
            onClick={() => {
              setUploadModalOpen(true);
            }}
          >
            <IconUpload size={14} />
            {collapsed ? "" : " Submit data to tune Genie"}

          </button>
        </div>
        <div className="flex items-center">
          <a href="/" target="_blank"
            className={`text-sidebar flex w-full flex-shrink-0 cursor-pointer select-none items-center gap-3 rounded-[40px] dark:hover:bg-black ${collapsed ? 'p-[15.6px]' : 'p-3'} dark:text-white hover:bg-gray-500/10 dark:bg-main bg-[#ededed] text-black ${collapsed ? 'w-[45px] h-[45px] flex items-center justify-center mb-2' : ''}`}>
            <IconBrandAsana size={14} />
            {collapsed ? "" : "Agent Homepage"}

          </a>
        </div>
        <div className=" overflow-auto hide-scrollbar xl:min-h-[170px] min-h-auto">
          {items?.length > 0 && (
            <div className="flex border-b dark:border-white/20 border-black pb-2">
              {folderComponent}
            </div>
          )}

          {items?.length > 0 ? (
            <div
              className="pt-6 h-30 overflow-y-auto"
              onDrop={handleDrop}
              onDragOver={allowDrop}
              onDragEnter={highlightDrop}
              onDragLeave={removeHighlight}
            >
              {React.cloneElement(itemComponent as React.ReactElement<any>, { collapsed })}
               {displayShowMore && <div style={{display:'flex', marginLeft:'10px'}}> <IconPlus onClick={openNewTab} className="cursor-pointer" />
               {!collapsed && <button className="text-[12px] leading-normal dark:text-white text-black" style={{marginLeft:'10px', textDecoration: 'underline', color: theme == 'dark'?'#fff':'#000'}} onClick={openNewTab}>Show more</button>}
               </div>}
            </div>
          ) : (
            <div className="mt-8 select-none text-center dark:text-white text-black opacity-50">
              <IconMistOff className="mx-auto mb-3" />
              <span className="text-[14px] leading-normal dark:text-white text-black">
                {t('No data')}
              </span>
            </div>
          )}
        </div>
        {React.cloneElement(footerComponent as React.ReactElement<any>, { collapsed })}
      </div>
      <div className="hidden xl:block lg:block absolute  top-1/2 right-[-28px] z-50 mt-[-40px] cursor-pointer" onClick={() => { setCollapsed(!collapsed) }}>
        {collapsed ?
          <>
            <IconChevronLeft size={14} className={`relative top-[30px] left-2 dark:text-white text-black ${collapsed ? 'rotate-180' : ''}`} />
            <svg width="29" height="47" viewBox="0 0 29 47" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path className='dark:fill-primary fill-white' d="M26.7148 18.3708C29.1957 21.3403 29.1957 25.6597 26.7148 28.6292L14.3893 43.3821C9.59523 49.1203 0.250001 45.7303 0.250001 38.2529L0.250003 8.74713C0.250003 1.26975 9.59524 -2.12033 14.3893 3.61795L26.7148 18.3708Z" fill="#4F5165" />
            </svg>
          </> : <>
            <IconChevronLeft size={14} className={`relative top-[30px] left-2  dark:text-white text-black${collapsed ? 'rotate-180' : ''}`} />
            <svg width="29" height="47" viewBox="0 0 29 47" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path className='dark:fill-main fill-[#d5d5e3]' d="M2.28522 28.6292C-0.195658 25.6597 -0.195656 21.3403 2.28522 18.3708L14.6107 3.61794C19.4048 -2.12034 28.75 1.26974 28.75 8.74713L28.75 38.2529C28.75 45.7303 19.4048 49.1203 14.6107 43.3821L2.28522 28.6292Z" fill="#27282E" />
            </svg></>}


      </div>

      <span className="block sm:hidden">
        <CloseSidebarButton onClick={toggleOpen} side={side} />
      </span>

    </div>
  ) : (
    <span><OpenSidebarButton onClick={toggleOpen} side={side} /></span>
  );
};
export default Sidebar;

