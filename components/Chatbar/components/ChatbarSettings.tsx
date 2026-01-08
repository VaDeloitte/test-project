import { useContext, useState, useEffect } from 'react';

import { useTranslation } from 'next-i18next';
import { useDispatch } from 'react-redux';

import HomeContext from '@/context/home.context';

import { SettingDialog } from '@/components/Settings/SettingDialog';
import { IconLogout } from '@tabler/icons-react';

import { SidebarButton } from '@/components/Sidebar/SidebarButton';
import { ClearConversations } from './ClearConversations';
import ChatbarContext from '../Chatbar.context';
import { msalInstance as pca, initializeMsal } from '../../../msal/msal'; // Import pca from msal.js
import ThemeSwitcher from '@/components/ThemeSwitcher/ThemeSwitcher';
import { IconStar, IconBulb, IconLink, IconTrash } from '@tabler/icons-react';
import { IconChevronUp } from '@tabler/icons-react';
import { IconChevronDown } from '@tabler/icons-react';
import FeedbackModal from '@/components/Modals/Feedback';
import { AuthContext } from '@/utils/app/azureAD';
import { getInitials } from '@/utils/helper/helper';

import Link from 'next/link';
// import { getAllConversationsFromLocalStorage } from '@/utils/app/conversation';

export const ChatbarSettings = ({ collapsed }: any) => {
  const { t } = useTranslation('sidebar');
  const [isSettingDialogOpen, setIsSettingDialog] = useState<boolean>(false);
  const [logoutTimer, setLogoutTimer] = useState<NodeJS.Timeout | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const authContext = useContext(AuthContext);
  let logout: () => void;
  if (authContext) {
    logout = authContext.logout;
  }

  const user = authContext?.user;

  const {
    state: {
      conversations,
    },
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const dispatchRedux = useDispatch();

  const toggleVisibility = () => {
    setIsOpen(!isOpen);
  };

  const handleSSOLogout = async () => {
    // const msalConfig = {
    //   auth: {
    //     clientId: authConfig.appId,
    //     authority: authConfig.authority,
    //     redirectUri: authConfig.redirectUrl,
    //     postLogoutRedirectUri: '/auth/login',
    //   },
    // };

    // const pca = new PublicClientApplication(msalConfig);

    try {
      // Initialize the MSAL instance
      await initializeMsal(); // Initialize MSAL

      const logoutRequest = {
        onRedirectNavigate: (url: string) => {
          // Perform your custom logic before redirecting
          alert(`You will now be redirected to: ${url}`);
        }
      };

      await pca.logoutRedirect(logoutRequest);
    } catch (error) {
      console.error('Login failed', error);
      // Handle login failure here, if necessary
    }
  };
  // Function to log the logged-in user information
  const logLoggedInUser = () => {
    const account = pca.getAllAccounts()[0];
    if (account) {
      const username = account.username;
      const email = account.idTokenClaims?.email;
    }
  };


  const handleLogout = async () => {
    logout();
  }

  const handleRemoveConversations = () => {
    setIsConfirming(!isConfirming)
  }

  const {
    handleClearConversations,
  } = useContext(ChatbarContext);


  useEffect(() => {
    let elapsedTime = 0;
    let logoutTimer: NodeJS.Timeout;

    const handleResetTimer = () => {
      elapsedTime = 0;
    };

    const handleLogoutInactive = () => {
      // Call your logout function here
      handleLogout();
    };

    const handleInteraction = () => {
      handleResetTimer();
    };

    const handleMouseMove = () => {
      handleResetTimer();
    };

    const idleTimer = () => {
      logoutTimer = setInterval(() => {
        elapsedTime++;
        if (elapsedTime > 3600) {
          clearInterval(logoutTimer);
          handleLogoutInactive();
        }
      }, 1000);
    };



    idleTimer();

    // Event listeners for user interaction
    window.addEventListener('focus', handleInteraction);
    window.addEventListener('click', handleInteraction);
    window.addEventListener('mousemove', handleMouseMove);
    // homeDispatch({field:'conversations',value:getAllConversationsFromLocalStorage()})
    return () => {
      // Cleanup: clear the timer and remove event listeners
      if (logoutTimer) {
        clearInterval(logoutTimer);
      }
      window.removeEventListener('focus', handleInteraction);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('mousemove', handleMouseMove);
    };
   
  }, []);




  return (
    <div className={`${collapsed ? ' dark:text-white text-black relative flex flex-col items-center text-center' : 'dark:text-white text-black flex flex-col items-center space-y-1 pt-1 text-sm dark:text-white text-black'}`}>
      {isFeedbackModalOpen && <FeedbackModal setModalOpen={() => { setIsFeedbackModalOpen(false) }} />}
      <div className={`${collapsed ? "" : "border-t py-4  dark:border-white/20 border-black  w-full "}`}>
        {collapsed ? <> <div onClick={toggleVisibility} className={`${collapsed ? ' cursor-pointer  flex items-center justify-center pb-4' : 'flex gap-2 items-center cursor-pointer ml-4'}`}>
          <IconLink size="18" />
        </div>
          {isOpen && (
            <ul className={`${collapsed ? ' absolute left-[40px] top-[-10px] dark:bg-Info bg-[#ededed] rounded-3xl px-3 py-2 !m-0  w-[180px]' : 'px-4 pt-4'}`}>
              <li className={`${collapsed ? '' : 'ml-8'}`}>Technical support</li>
            </ul>
          )}</> : <>
          <div onClick={toggleVisibility} className="flex gap-2 items-center cursor-pointer ml-4">
            Quick Links {isOpen ? <IconChevronUp size="14" /> : <IconChevronDown size="14" />}
          </div>
          {isOpen && (
            <ul className="px-4 pt-4 flex flex-col gap-2">
              <li className="ml-5"><Link href="/about">
              About</Link></li>
                <li className="ml-5"><Link href="/models">
                Models</Link></li>
                <li className="ml-5"><Link href="faq">
                FAQ</Link></li>
                <li className="ml-5"><Link href="https://develop.deloitte.com/deloitte-ai-academy#/subpage/res">
                Education</Link></li>
                <li className="ml-5"><Link href="https://www2.deloitte.com/xe/en/pages/strategy-operations/articles/ai-institute.html">
                Deloitte AI institute
                </Link></li>
                <li className="ml-5"><Link href="https://resources.deloitte.com/sites/dme/services/tax/Pages/genie.aspx">
                Gen AI Lamp
                </Link></li>
            </ul>
          )}</>}

      </div>
      <div className={`${collapsed ? "p-2 border-t border-b py-4 dark:border-white/20 border-black " : "border-t border-b py-4  dark:border-white/20 border-black  w-full "}`}>
        <ul className={`${collapsed ? "p-2 flex items-center justify-center" : "pl-3 mb-1"}`}>
          <li className="flex items-center gap-2 mb-2 cursor-pointer" onClick={() => setIsFeedbackModalOpen(true)}>
            <span className={`${collapsed ? 'flex items-center ' : ''}`}>
              <IconStar size="16" />
            </span>
            {collapsed ? "" : <span className="pl-[2px]">Feedback</span>}
          </li>
        </ul>
        <div className={`${collapsed ? 'relative flex items-center justify-center cursor-pointer' : "flex gap-2 items-center cursor-pointer"}`}>
            <ClearConversations
              onClearConversations={handleClearConversations}
              collapsed={collapsed}
              isConfirmingStatus={isConfirming}
            />
          {collapsed ? <IconTrash size={18} onClick={handleRemoveConversations} /> : ""}
        </div>
      </div>
      <div className={collapsed ? 'py-4' : 'border-b py-4  border-white/20 xl:px-3 w-full  md:px-3 '}>
        <div className={collapsed ? 'flex items-center' : 'flex items-center gap-2'}>

          <ThemeSwitcher type="button" icon="lamp" collapsed={collapsed} /></div>
      </div>

      <SidebarButton
        text={t('Logout')}
        icon={<IconLogout size={18} />}
        onClick={handleLogout}
        collapsed={collapsed}
      />
      {collapsed ? <span className='dark:bg-Info w-[45px] h-[45px] flex items-center justify-center rounded-3xl mt-3 text-[17px]'>{getInitials(user?.username)}</span> :
        <span className="mt-3 mr-auto ml-3 flex gap-2">
          <span className='dark:bg-Info bg-default text-white w-[22px] h-[22px] flex items-center justify-center rounded-3xl text-[11px]'>{getInitials(user?.username)}</span>
          {user?.username}
        </span>}


      <SettingDialog
        open={isSettingDialogOpen}
        onClose={() => {
          setIsSettingDialog(false);
        }}
      />
    </div>
  );
};
