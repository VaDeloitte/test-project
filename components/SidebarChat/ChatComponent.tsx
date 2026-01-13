'use client'
import { IconCheck, IconPencil, IconTrash, IconX } from '@tabler/icons-react';
import React, { useCallback, useContext, useMemo, useState, memo } from 'react';
import { DragEvent, KeyboardEvent, MouseEventHandler, useEffect } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';

import { useParams } from 'next/navigation';
import { useRouter } from 'next/router';

import { useCreateReducer } from '@/hooks/useCreateReducer';

import { AuthContext } from '@/utils/app/azureAD';
import {
  deleteConversation,
  getConversationsForUser,
  saveFiles,
  updateConversation,
  updateConversationName,
} from '@/utils/app/conversation';

import { Conversation } from '@/types/chat';

import HomeContext from '@/context/home.context';
import { HomeInitialState, initialState } from '@/context/home.state';

import SidebarActionButton from '../Buttons/SidebarActionButton';
import { MessageIcon } from '../Icons/ChatIcon';
import { WorkflowSkeleton } from '../Sidebar/components/Skeletons';

// Memoized conversation item component
const ConversationItem = memo(({ 
  ele, 
  index,
  isRenaming,
  RenamingItemId,
  renameValue,
  setRenameValue,
  handleEnterDown,
  show,
  onMouseEnter,
  onMouseLeave,
  onClick,
  isSelected,
  handleConfirm,
  handleCancel,
  handleOpenRenameModal,
  handleOpenDeleteModal,
  isDeleting
}: any) => {
  const isHovered = show === ele.id;
  const isThisItemRenaming = isRenaming && RenamingItemId === ele.id;
  const isThisItemDeleting = isDeleting && RenamingItemId === ele.id;
  
  if (isThisItemRenaming) {
    return (
      <div key={index} className="flex w-full cursor-pointer text-black items-center gap-3 h-[34px] px-4 bg-[#F2F6F7]">
        <MessageIcon
          label={ele?.name}
          className="flex-shrink-0"
          color="black"
        />
        <input
          className="flex-1 max-h-5 pr-12 overflow-hidden overflow-ellipsis bg-transparent text-left text-[11px] text-black border-b border-gray-400 focus:border-black focus:outline-none"
          type="text"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={handleEnterDown}
          autoFocus
        />
        <div className="absolute right-1 z-10 flex dark:text-gray-300">
          <SidebarActionButton handleClick={handleConfirm}>
            <IconCheck size={18} color="gray" id={ele.id}/>
          </SidebarActionButton>
          <SidebarActionButton handleClick={handleCancel}>
            <IconX size={18} color="gray" />
          </SidebarActionButton>
        </div>
      </div>
    );
  }

  return (
    <div
      key={index}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      className={
        isSelected
          ? 'flex items-center gap-2 px-3 font-[Calibri] py-[.5px] bg-gray-200 text-black dark:bg-[#2e2e2e] dark:text-white'
          : 'flex items-center gap-2 px-3 font-[Calibri] py-[.5px] bg-white text-gray-700 hover:bg-gray-200 hover:text-black dark:bg-[#1a1a1a] dark:text-gray-300 dark:hover:bg-[#2e2e2e] dark:hover:text-white'
      }
    >
      <div className="ml-1">
        <MessageIcon label={ele?.name} color="black" />
      </div>
      <span className="flex min-w-0 w-[160px] overflow-hidden text-ellipsis whitespace-nowrap text-left leading-3 cursor-pointer items-center gap-2.5 h-9 text-[11px] transition-colors duration-200 rounded-md">
        {ele?.name?.length > 30 ? ele?.name?.slice(0, 30) + '...' : ele?.name}
      </span>

      {isThisItemDeleting && (
        <div className="absolute right-1 z-10 flex dark:text-gray-300">
          <SidebarActionButton handleClick={handleConfirm}>
            <IconCheck size={18} color="gray" id={ele.id}/>
          </SidebarActionButton>
          <SidebarActionButton handleClick={handleCancel}>
            <IconX size={18} color="gray" />
          </SidebarActionButton>
        </div>
      )}

      {!isDeleting && !isRenaming && (
        <div className="absolute right-1 z-10 flex text-gray-950" style={{opacity: isHovered ? "1" : "0"}}>
          <SidebarActionButton handleClick={handleOpenRenameModal}>
            <IconPencil size={18} color="gray" />
          </SidebarActionButton>
          <SidebarActionButton handleClick={handleOpenDeleteModal}>
            <IconTrash size={18} color="gray" />
          </SidebarActionButton>
        </div>
      )}
    </div>
  );
});

ConversationItem.displayName = 'ConversationItem';

export const ChatComponent = () => {
  const collapsed = false;
  const [totalLength, setTotalLength] = useState(0);
  const [conversation, setconversation] = useState<any>({});
  const [limit, setLimit] = useState(50);
  const [show, setShow] = useState<string | null>(null);
  const [skip, setSkip] = useState(0);
  const [conversationList, setConversationList] = useState<any>([]);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const {
    state: { selectedConversation},
    dispatch: homeDispatch,
    handleSelectConversation,
    handleUpdateConversation,
    handleNewConversation,
  } = useContext(HomeContext);
  const router = useRouter();
  const { id } = router.query || "";
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [RenamingItemId, setRenamingItemId] = useState("");
  const [renameValue, setRenameValue] = useState<any>('');
  const contextValue = useCreateReducer<HomeInitialState>({
    initialState,
  });
  const authContext = useContext(AuthContext);
  const [userData, setUserData]: any = useState(null);
  const [conversationSelected, setConversationSelected] = useState<Conversation|null>(null);
  
  useEffect(() => {
    if (authContext) {
      setUserData(authContext.user);
      return;
    }
  }, [authContext]);
  
  const { dispatch } = contextValue;

  // Memoize search term to prevent recalculation
  const searchTerm = useMemo(() => {
    return (sessionStorage.getItem('searchTerm') || '').toLowerCase();
  }, []);

  // Memoize filtered list with proper dependencies
  const filteredList = useMemo(() => {
    return conversationList.filter((c: any) =>
      c?.name?.toLowerCase().includes(searchTerm)
    );
  }, [conversationList, searchTerm]);

  // Memoize event handlers
  const handleEnterDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRename(conversationSelected);
    }
  }, [conversationSelected, renameValue]);

  const handleDragStart = useCallback((
    e: DragEvent<HTMLButtonElement>,
    conversation: Conversation,
  ) => {
    if (e.dataTransfer) {
      e.dataTransfer.setData('conversation', JSON.stringify(conversation));
    }
  }, []);

  const handleRename = useCallback((conversation: any) => {
    let userId = localStorage.getItem('userId') || 1;

    if (renameValue.trim().length > 0) {
      handleUpdateConversation(conversation, {
        key: 'name',
        value: renameValue,
      });
      setRenameValue('');
      getMessages(limit, skip);
      updateConversationName(conversation.id, userId, renameValue);
      setIsRenaming(false);
    }
  }, [renameValue, limit, skip]);

  const handleConfirm: MouseEventHandler<HTMLButtonElement> = useCallback((e: any) => {
    e.stopPropagation();
    let userId = localStorage.getItem('userId') || 1;

    if (isDeleting && e.target.id !== "") {
      deleteConversation(userId, e.target.id).then((res: any) => {
        localStorage.removeItem('selectedConversation');
        setRenameValue("");
        getMessages(limit, skip);
        handleNewConversation();
      });

      let filesStorage: any = localStorage.getItem('files');
      let filesData: any = JSON.parse(filesStorage) || {};
      let id = e.target.id;
      if (id in filesData) {
        delete filesData[id];
      }
      saveFiles(filesData);
    } else if (isRenaming) {
      handleRename(conversation);
    }
    setIsDeleting(false);
    setIsRenaming(false);
  }, [isDeleting, isRenaming, conversation, limit, skip]);

  const handleCancel: MouseEventHandler<HTMLButtonElement> = useCallback((e) => {
    e.stopPropagation();
    setIsDeleting(false);
    setIsRenaming(false);
  }, []);

  const handleOpenRenameModal = useCallback((e: any, ele: any) => {
    setConversationSelected(ele);
    e.stopPropagation();
    setIsRenaming(true);
    setRenamingItemId(ele.id);
    setRenameValue(ele.name);
  }, []);

  const handleOpenDeleteModal = useCallback((e: any, ele: any) => {
    e.stopPropagation();
    setRenamingItemId(ele.id);
    setIsDeleting(true);
  }, []);

  useEffect(() => {
    if (isRenaming) {
      setIsDeleting(false);
    } else if (isDeleting) {
      setIsRenaming(false);
    }
  }, [isRenaming, isDeleting]);

  const getMessages = useCallback((limit: number, skip: number) => {
    getConversationsForUser(limit, skip)?.then(async (conversations: any) => {
      setHasLoadedInitialData(true);
      if (conversations.data && conversations.data.length !== 0) {
        setTotalLength(conversations.length);
        if (skip > 0) {
          setConversationList((prev: any) => [...prev, ...conversations.data]);
        } else {
          setConversationList([...conversations.data]);
        }
      } else {
        setConversationList([]);
        setTotalLength(0);
      }
    });
  }, []);

  useEffect(() => {
    // Run getMessages after 1500ms on mount or pathname change
    const timer = setTimeout(() => {
      getMessages(limit, skip); // Assuming limit and skip are defined in your scope
    }, 1500);

    // Define the event listener function
    const handleRefreshChatHistory = () => {
      getMessages(limit, skip); // Trigger getMessages when the event is fired
    };

    // Attach the event listener
    window.addEventListener('refresh-chat-history', handleRefreshChatHistory);
    // Clean up the event listener and the timer when the component is unmounted
    return () => {
      clearTimeout(timer); // Clean up the timeout
      window.removeEventListener('refresh-chat-history', handleRefreshChatHistory); // Clean up the event listener
    };
  }, [router.pathname]); 

  // Memoized handlers for each conversation item
  const createHandlers = useCallback((ele: any) => ({
    onMouseEnter: () => setShow(ele.id),
    onMouseLeave: () => setShow(null),
    onClick: () => {
      setconversation(ele);
      sessionStorage.setItem('currentTab', 'null');
      sessionStorage.setItem('dashboard', 'false');
      handleSelectConversation(ele);
    },
    handleOpenRenameModal: (e: any) => handleOpenRenameModal(e, ele),
    handleOpenDeleteModal: (e: any) => handleOpenDeleteModal(e, ele),
  }), [handleSelectConversation, handleOpenRenameModal, handleOpenDeleteModal]);

  // Optimized children rendering
  const children = useMemo(() => {
    return filteredList.map((ele: any, index: number) => {
      const handlers = createHandlers(ele);
      
      return (
        <ConversationItem
          key={ele.id}
          ele={ele}
          index={index}
          isRenaming={isRenaming}
          RenamingItemId={RenamingItemId}
          renameValue={renameValue}
          setRenameValue={setRenameValue}
          handleEnterDown={handleEnterDown}
          show={show}
          onMouseEnter={handlers.onMouseEnter}
          onMouseLeave={handlers.onMouseLeave}
          onClick={handlers.onClick}
          isSelected={id === ele.id}
          handleConfirm={handleConfirm}
          handleCancel={handleCancel}
          handleOpenRenameModal={handlers.handleOpenRenameModal}
          handleOpenDeleteModal={handlers.handleOpenDeleteModal}
          isDeleting={isDeleting}
        />
      );
    });
  }, [
    filteredList,
    id,
    isDeleting,
    isRenaming,
    RenamingItemId,
    renameValue,
    show,
    handleEnterDown,
    handleConfirm,
    handleCancel,
    createHandlers
  ]);

  return (
    <div id="scrollableDiv" className="h-full overflow-y-auto">
      <InfiniteScroll
        dataLength={conversationList.length}
        next={() => {
          setLimit(50);
          setSkip(conversationList.length);
        }}
        scrollThreshold={0.9}
        hasMore={totalLength !== conversationList.length}
        loader={<h5 className="text-sm px-3">Loading...</h5>}
        scrollableTarget="scrollableDiv"
      >
        {conversationList.length > 0 ? (
          children
        ) : !hasLoadedInitialData ? (
          Array.from({ length: 10 }, (_, i) => (
            <WorkflowSkeleton key={`skeleton-${i}`} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <svg
              className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              No conversations found
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Start a new chat to begin
            </p>
          </div>
        )}
      </InfiniteScroll>
    </div>
  );
};