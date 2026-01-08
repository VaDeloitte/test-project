import { IconCheck, IconPencil, IconTrash, IconX } from '@tabler/icons-react';
import {
  DragEvent,
  KeyboardEvent,
  MouseEventHandler,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  saveFiles,
  updateConversationName,
  deleteConversation,
} from '@/utils/app/conversation';

import { Conversation } from '@/types/chat';

import HomeContext from '@/context/home.context';

import SidebarActionButton from '@/components/Buttons/SidebarActionButton';
import ChatbarContext from '@/components/Chatbar/Chatbar.context';
import { MessageIcon } from '@/components/Icons/ChatIcon';


interface Props {
  conversation: Conversation;
  collapsed?: boolean;
  update?: any;
}

export const ConversationComponent = (props: Props) => {
  const {
    state: { selectedConversation, messageIsStreaming, conversations },
    dispatch: homeDispatch,
    handleSelectConversation,
    handleUpdateConversation,
    handleNewConversation,
  } = useContext(HomeContext);

  const { handleDeleteConversation } = useContext(ChatbarContext);
  const { conversation, collapsed } = props;
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  // Handle 'Enter' key press for renaming
  const handleEnterDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      selectedConversation && handleRename(selectedConversation);
    }
  };

  // Handle drag start event
  const handleDragStart = (
    e: DragEvent<HTMLButtonElement>,
    conversation: Conversation,
  ) => {
    if (e.dataTransfer) {
      e.dataTransfer.setData('conversation', JSON.stringify(conversation));
    }
  };

  // Handle rename action
  const handleRename = (conversation: Conversation) => {
    let userId = localStorage.getItem('userId') || 1;

    if (renameValue.trim().length > 0) {
      handleUpdateConversation(conversation, {
        key: 'name',
        value: renameValue,
      });
      // changeConversationNameById(conversation.id,renameValue);
      updateConversationName(conversation.id, userId, renameValue);
      setRenameValue('');
      setIsRenaming(false);
      props.update();
    }
  };
  console.log(conversations,conversation,'convo')
  // Handle confirm button click for delete or rename
  const handleConfirm: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation();
    let userId = localStorage.getItem('userId') || 1;

    if (isDeleting) {
      deleteConversation(userId, conversation.id).then((res: any) => {
        localStorage.removeItem('selectedConversation');
        // if(res.data.remainingConversationIds && res.data.remainingConversationIds.length !=0){
        //   window.location.href = "/";
        // }else{
        //   window.location.href = "/";
        // }
      });

      const updatedConversations = conversations.filter(
        (convo: any) => convo.id !== selectedConversation.id,
      );

      homeDispatch({ field: 'conversations', value: updatedConversations });
      handleNewConversation();

      let filesStorage: any = localStorage.getItem('files');
      let filesData: any = JSON.parse(filesStorage) || {};
      let id = selectedConversation.id;
      if (id in filesData) {
        delete filesData[id];
      }
      saveFiles(filesData);
    } else if (isRenaming) {
      handleRename(conversation);
    }
    setIsDeleting(false);
    setIsRenaming(false);
    props.update();
  };

  // Handle cancel button click
  const handleCancel: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation();
    setIsDeleting(false);
    setIsRenaming(false);
  };

  // Handle open rename modal
  const handleOpenRenameModal: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation();
    setIsRenaming(true);
    selectedConversation && setRenameValue(selectedConversation.name);
  };

  // Handle open delete modal
  const handleOpenDeleteModal: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation();
    setIsDeleting(true);
  };

  // Effect to handle state consistency between deleting and renaming
  useEffect(() => {
    if (isRenaming) {
      setIsDeleting(false);
    } else if (isDeleting) {
      setIsRenaming(false);
    }
  }, [isRenaming, isDeleting]);

  // Render only if conversation.name exists
  if (!conversation.name) {
    return null;
  }

  return (
    <div className="relative flex items-center">
      {isRenaming && selectedConversation?.id === conversation.id ? (
        <div className="flex w-full cursor-pointer text-black items-center gap-3 h-[34px] px-4 bg-[#F2F6F7]">
          <MessageIcon
            label={conversation.name}
            className="flex-shrink-0"
          />
          <input
            className=" flex-1 max-h-5 pr-12 overflow-hidden overflow-ellipsis bg-transparent text-left text-[11px] text-black border-b border-gray-400 focus:border-black focus:outline-none"
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={handleEnterDown}
            autoFocus
          />
        </div>
      ) : (
        <>
          {collapsed ? (
            <button
              className={`flex w-full cursor-pointer items-center gap-2.5 h-9 px-3 text-[11px] font-calibri transition-colors duration-200 rounded-md
                ${
                  selectedConversation?.id === conversation.id
                    ? 'bg-[#F2F6F7] text-black dark:bg-[#2e2e2e] dark:text-white'
                    : 'bg-white text-gray-700 hover:bg-[#F2F6F7] hover:text-black dark:bg-[#1a1a1a] dark:text-gray-300 dark:hover:bg-[#2e2e2e] dark:hover:text-white'
                }
                ${messageIsStreaming ? 'disabled:cursor-not-allowed opacity-50' : ''}
              `}
              onClick={() => {
                sessionStorage.setItem('dashboard', 'false');
                handleSelectConversation(conversation);
              }}
              disabled={messageIsStreaming}
              draggable="true"
              onDragStart={(e) => handleDragStart(e, conversation)}
            >
              <MessageIcon label={conversation.name} color="black" />
            </button>
          ) : (
            <button
              className={`flex w-full cursor-pointer items-center gap-3 h-[34px] px-4 text-[11px] font-calibri transition-colors duration-200
                ${
                  selectedConversation?.id === conversation.id
                    ? 'bg-[#F2F6F7] text-black dark:bg-black dark:text-white'
                    : 'bg-white text-gray-700 hover:bg-[#F2F6F7] hover:text-black dark:bg-[#1e1e1e] dark:text-gray-200 dark:hover:bg-[#2e2e2e] dark:hover:text-white'
                }
                ${messageIsStreaming ? 'disabled:cursor-not-allowed opacity-50' : ''}
              `}
              onClick={() => {
                sessionStorage.setItem('dashboard', 'false');
                handleSelectConversation(conversation);
              }}
              disabled={messageIsStreaming}
              draggable="true"
              onDragStart={(e) => handleDragStart(e, conversation)}
            >
              <MessageIcon
                label={conversation.name}
                color={
                  document?.documentElement.classList.contains('dark')
                    ? 'white'
                    : 'black'
                }
                className="dark:text-black"
              />
              <div
                className={`relative max-h-5 flex-1 overflow-hidden text-ellipsis whitespace-nowrap break-all text-left leading-3 ${
                  selectedConversation?.id === conversation.id
                    ? 'pr-12'
                    : 'pr-1'
                }`}
              >
                {conversation.name}
              </div>
            </button>
          )}
        </>
      )}

      {(isDeleting || isRenaming) &&
        selectedConversation?.id === conversation.id && (
          <div className="absolute right-1 z-10 flex dark:text-gray-300">
            <SidebarActionButton handleClick={handleConfirm}>
              <IconCheck size={18} color="gray" />
            </SidebarActionButton>
            <SidebarActionButton handleClick={handleCancel}>
              <IconX size={18} color="gray" />
            </SidebarActionButton>
          </div>
        )}

      {!collapsed &&
        selectedConversation?.id === conversation.id &&
        !isDeleting &&
        !isRenaming && (
          <div className="absolute right-1 z-10 flex text-gray-950">
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
};
