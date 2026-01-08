import { IconCheck, IconTrash, IconX } from '@tabler/icons-react';
import { FC, useEffect, useState, useRef } from 'react';
import { useTranslation } from 'next-i18next';
import { SidebarButton } from '@/components/Sidebar/SidebarButton';
import { deleteAllConversations } from '@/utils/app/conversation';
import { useRouter } from 'next/router';
import { v4 as uuidv5 } from 'uuid';

interface Props {
  onClearConversations: () => void;
  collapsed?: boolean;
  isConfirmingStatus?: any;
}

export const ClearConversations: FC<Props> = ({ onClearConversations, collapsed, isConfirmingStatus }) => {
  const router = useRouter();

  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const { t } = useTranslation('sidebar');
  const modalRef = useRef<HTMLDivElement>(null);

  const handleClearConversations = async () => {
    let userId = localStorage.getItem("userId") || 1;
    onClearConversations();
    setIsConfirming(false);
    await deleteAllConversations(userId).then(()=>{
      // window.location.reload();
      router.push(`/chat?id=${uuidv5()}`).then((()=>{
        // window.location.reload();
      }))
    })
    localStorage.removeItem('promptWorkflow');
    localStorage.removeItem('files');
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
      setIsConfirming(false);
    }
  };

  useEffect(() => {
    if (isConfirmingStatus) {
      setIsConfirming(true);
    }
  }, [isConfirmingStatus]);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return isConfirming ? (
    <div ref={modalRef} className={collapsed ? 'absolute left-[40px] flex items-center top-[-10px] dark:bg-Info bg-[#ededed] rounded-3xl px-3 py-2 !m-0  w-[180px]' : 'flex w-full cursor-pointer items-center rounded-lg py-3 px-3 hover:bg-gray-500/10'}>
      {collapsed ? '' : <IconTrash size={18} />}
      <div className="ml-3 flex-1 text-left text-[12.5px] leading-3 text-white">
        {t('Are you sure?')}
      </div>
      <div className="flex w-[40px]">
        <IconCheck
          className="ml-auto mr-1 min-w-[20px] text-neutral-400 hover:text-neutral-100"
          size={18}
          onClick={(e) => {
            e.stopPropagation();
            handleClearConversations();
          }}
        />
        <IconX
          className="ml-auto min-w-[20px] text-neutral-400 hover:text-neutral-100"
          size={18}
          onClick={(e) => {
            e.stopPropagation();
            setIsConfirming(false);
          }}
        />
      </div>
    </div>
  ) : (
    <SidebarButton
      text={collapsed ? '' : t('Clear conversations')}
      icon={!collapsed ? <IconTrash size={18} /> : <></>}
      onClick={() => setIsConfirming(true)}
      collapsed={collapsed}
    />
  );
};
