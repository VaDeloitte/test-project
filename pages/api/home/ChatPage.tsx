import { useContext, useEffect, useState, useRef } from 'react';
import { fetchWorkflows } from '@/services/workflowService';
import { HomeLayout} from '@/components/Home/HomeLayoutNew';
import { AuthContext } from '@/utils/app/azureAD';
import ChatWindow from '@/components/HomeContent/HomeContentNew';
// import HomeContext from '@/pages/api/home/home.context';
import { useRouter } from 'next/router';

export const ChatPage = () => {
  const [workflows, setWorkflows] = useState([]);
  const [topWorkflows, setTopWorkflows] = useState([]);
  const authContext = useContext(AuthContext);
  const router = useRouter();
  const { id } = router.query;
  
  // ✅ Prevent redundant fetches with ref
  const isFetchingRef = useRef(false);
  const hasFetchedRef = useRef(false);
  
  // ✅ Track when auth is fully ready (both token AND validator available)
  const [isAuthReady, setIsAuthReady] = useState(false);

//   const {
//     state: { conversations, selectedConversation, messages },
//     dispatch: chatDispatch,
//   } = useContext(HomeContext);

  const { user }:any = useContext(AuthContext);
 
//   const activeConversation = conversations.find((e: any) => e.id == id);
//   if (conversations && conversations.length != 0) {
//         if (activeConversation) {
//             chatDispatch({
//                 field: 'selectedConversation',
//                 value: activeConversation,
//             });
//         }
//   }

  const fetchAndSetWorkflows = async (params = {}, isTop = false) => {
    // ✅ Prevent redundant fetches
    if (isFetchingRef.current) {
      console.log('[ChatPage]: Already fetching, skipping...');
      return;
    }
    
    try {
      isFetchingRef.current = true;
      
      // ✅ FIX: Validate and refresh token BEFORE API call to prevent 401 on first load
      let validToken = user?.idToken;
      if (authContext?.validateAndRefreshToken && validToken) {
        validToken = await authContext.validateAndRefreshToken(validToken);
      }
      
      if (!validToken) {
        console.warn('[ChatPage]: No valid token available, skipping workflow fetch');
        return;
      }
      
      const response = await fetchWorkflows(validToken, authContext?.validateAndRefreshToken, params);
      isTop ? setTopWorkflows(response?.workflows) : setWorkflows(response?.workflows);
      
      // Mark as fetched on first successful fetch
      if (!hasFetchedRef.current) {
        hasFetchedRef.current = true;
      }
    } catch (error) {
      console.error('[ChatPage]: Error fetching workflows:', error);
      // Don't throw - gracefully handle 401 by retrying on next render
    } finally {
      isFetchingRef.current = false;
    }
  };


  // ✅ SAFEST SOLUTION: Monitor token + use boolean flag for validator existence
  // Convert validator function to boolean to avoid reference instability
  const hasValidator = !!authContext?.validateAndRefreshToken;
  
  useEffect(() => {
    const hasToken = !!user?.idToken;
    const authFullyReady = hasToken && hasValidator;
    
    console.log('[ChatPage]: Auth readiness check:', { 
      hasToken, 
      hasValidator, 
      authFullyReady,
      currentIsAuthReady: isAuthReady
    });
    
    // Only update state if it actually changed
    if (authFullyReady !== isAuthReady) {
      console.log('[ChatPage]: 🔄 Auth readiness changed:', isAuthReady, '→', authFullyReady);
      setIsAuthReady(authFullyReady);
    }
  }, [user?.idToken, hasValidator, isAuthReady]); // Depend on boolean, not function

  // ✅ FIX: Fetch workflows when auth becomes ready
  useEffect(() => {
    if (isAuthReady && !hasFetchedRef.current && authContext?.validateAndRefreshToken) {
      console.log('[ChatPage]: ✅ Auth fully ready, fetching workflows...');
      fetchAndSetWorkflows(); // Fetch regular workflows
    } else if (!isAuthReady) {
      console.log('[ChatPage]: ⏳ Waiting for auth to be ready...', {
        isAuthReady,
        hasFetched: hasFetchedRef.current,
        hasValidator: !!authContext?.validateAndRefreshToken
      });
    }
  }, [isAuthReady]); // Only depend on isAuthReady (stable boolean)

  const handleSearch = async (event:any) => {
    if (event.key === 'Enter' && user?.idToken) {
      const value = event.currentTarget.value;
      const params = { search: value, type: 'workflow' };
      await fetchAndSetWorkflows(params);
      await fetchAndSetWorkflows(params, true);
    }
  };

//    <HomeLayout showSidebar={true} workflowsData={topWorkflows}>
  return (
    <HomeLayout >
      <ChatWindow workflowsData={workflows} handleSearch={handleSearch} token={user?.idToken}/>
      {/* <HomeContent workflowsData={workflows} handleSearch={handleSearch} token={user?.idToken} /> */}
    </HomeLayout>
  );
};


export default ChatPage;
