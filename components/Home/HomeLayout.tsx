import { useContext, useEffect, useState } from 'react';
import Head from 'next/head';
import HomeSidebar from '@/components/HomeSidebar/HomeSidebar';
import HomeHeader from '@/components/HomeHeader/HomeHeader';
import { fetchWorkflows } from '@/services/workflowService';
import { AuthContext } from '@/utils/app/azureAD';
import Sidebar from '../Folder/NewComp/SideBar';
import HeaderNew from '../HomeHeader/HomeHeaderNew';

export const HomeLayout = ({ children, showSidebar = false }: any) => {
  const [topWorkflows, setTopWorkflows] = useState<any>();
  const authContext = useContext(AuthContext);
  const user = authContext?.user;

  useEffect(() => {
    const fetchAndSetWorkflows = async () => {
      const idToken = user?.idToken || '';
      if (!idToken) return;

      // Fetch top workflows with specific parameters
      const topParams: any = {
        n: 20,
      };
      const topWorkflowsResponse = await fetchWorkflows(idToken, authContext?.validateAndRefreshToken, topParams);
      if (topWorkflowsResponse) {
        setTopWorkflows(topWorkflowsResponse.workflows);
      }
    };

    fetchAndSetWorkflows();
  }, [user]);

  return (
    <>
      <Head>
        <title>Genie 3.0</title>
        <meta name="description" content="Genie Powered by Generative AI" />
        <meta
          name="viewport"
          content="height=device-height, width=device-width, initial-scale=1, user-scalable=no"
        />
        <link rel="icon" href="/logo.png" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin={'anonymous'} />
      </Head>
      <div className="container m-auto xl:px-0 px-4 font-open-sans">

        <HeaderNew />
        <div className="h-screen text-dark dark-gradient md:flex">
          <Sidebar />
          {/* {showSidebar && <HomeSidebar topWorkflows={topWorkflows} token={user?.idToken || ''} />} */}
          <div className="xl:flex-grow ">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

export default HomeLayout;
