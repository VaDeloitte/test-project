import { useContext, useEffect, useState } from 'react';
import Joyride from 'react-joyride';

import { fetchWorkflows } from '@/services/workflowService';

import { AuthContext } from '@/utils/app/azureAD';
import ChatWindow from '@/components/HomeContent/HomeContentNew';
import Introduction from '@/components/Modals/Introduction';
import Welcome from '@/components/Modals/Welcome';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import { read, utils } from 'xlsx';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;

export const Home = () => {
  const [workflows, setWorkflows] = useState([]);
  const [topWorkflows, setTopWorkflows] = useState([]);
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const authContext = useContext(AuthContext);
  const [run, setRun] = useState(false);
  const [open, setOpen] = useState(false);
  const steps = [
    {
      target: '.Spaces',
      content: (
        <div>
          <b>Space for Team </b>— A collaborative workspace where teams can
          share, manage, and build AI tools together. It allows members to
          organize prompts, workflows, datasets, and outputs in one place,
          making it easier to co-create, review, and deploy AI-powered solutions
          efficiently.
        </div>
      ),
      disableBeacon: true,
    },
     {
      target: '.dashboard',
      content: (
        <div>
          <b>Dashboard </b>— View performance rankings and insights across employees, departments, and regions, Track progress, identify top performers, and monitor performance trends over time.
        </div>
      ),
      disableBeacon: true,
    },
     {
      target: '.Proactive',
      content: (
        <div>
          <b>Proactive AI</b> — Intelligent systems that predict needs and act
          in advance, providing insights, recommendations, or automated actions
          without waiting for user input. It helps enhance productivity by
          anticipating tasks and optimizing decisions in real time.
        </div>
      ),
      disableBeacon: true,
    },
    {
      target: '.Audio',
      content: (
        <div>
          <b>Audio Upload</b> — A feature that lets users upload voice
          recordings or sound files for analysis, transcription, or processing
          by AI models. It enables seamless interaction through speech, making
          content creation and data input faster and more natural.
        </div>
      ),
      disableBeacon: true,
    },
    {
      target: '.Agent',
      content: (
        <div>
          <b>Agent Builder </b>— A tool that allows users to create custom AI
          agents tailored to specific tasks or workflows. It enables easy
          configuration of behaviors, knowledge, and integrations, empowering
          teams to design intelligent assistants without deep coding expertise.
        </div>
      ),
      disableBeacon: true,
    },
     {
      target: '.dropdown1',
      content: (
        <div>
          <b>Cross Functional Agents </b>— Pick an agent to automate writing, responses, and translations.
        </div>
      ),
      disableBeacon: true,
    },
     {
      target: '.dropdown2',
      content: (
        <div>
          <b>Service Line Agents </b>— Choose an agent to help you write, refine, or translate content in one click.
        </div>
      ),
      disableBeacon: true,
    },
     {
      target: '.model',
      content: (
        <div>
          <b>AI Model </b>— Select the AI model to power your response.
        </div>
      ),
      disableBeacon: true,
    },
    {
      target: '.settings',
      content: (
        <div>
          <b>Settings </b>—Manage security, sources for more accurate and compliant responses.
        </div>
      ),
      disableBeacon: true,
    },
    {
      target: '.FileUpload',
      content: (
        <div>
          <b>File Upload</b>— A feature that enables users to easily upload
          files to create custom AI agents tailored to specific tasks or
          workflows. It allows seamless integration of custom data, behaviors,
          and knowledge, empowering teams to design intelligent assistants with
          minimal coding expertise. Simply upload relevant files, configure
          desired behaviors, and integrate with existing systems to build
          personalized AI solutions.
        </div>
      ),
      disableBeacon: true,
    },
     {
      target: '.voice',
      content: (
        <div>
       <b>Voice Dictation</b> — Use voice dictation to speak your input instead of typing.
       </div>
      ),
      disableBeacon: true,
    },
   
    
  ];

  const currentTab = sessionStorage.getItem('currentTab');
  const { user }: any = useContext(AuthContext);

  const [keywords, setKeywords] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);

  const fetchAndSetWorkflows = async (params = {}, isTop = false) => {
    const response = await fetchWorkflows(
      user?.idToken,
      authContext?.validateAndRefreshToken,
      params,
    );
    isTop
      ? setTopWorkflows(response?.workflows)
      : setWorkflows(response?.workflows);
  };

useEffect(() => {
  const interval = setInterval(() => {
    if (localStorage.getItem('runIntro') === 'true') {
      setRun(true); // start Joyride immediately
    }
  }, 200); // check every 200ms

  return () => clearInterval(interval);
}, []);


  useEffect(() => {
       
    if (user?.idToken) {
      const modalOpened = localStorage.getItem('hasConfirmed');
      if (modalOpened !== 'true') {
        localStorage.setItem('hasConfirmed', 'false');
      }
      fetchAndSetWorkflows(); // Fetch regular workflows
    }
  }, [user]);

  const handleSearch = async (event: any) => {
    if (event.key === 'Enter' && user?.idToken) {
      const value = event.currentTarget.value;
      const params = { search: value, type: 'workflow' };
      await fetchAndSetWorkflows(params);
      await fetchAndSetWorkflows(params, true);
    }
  };

  useEffect(() => {
    localStorage.setItem("worklfow","false");
    fetch('/api/getKeywords')
      .then((res) => res.json())
      .then((data) => {
        localStorage.setItem('keywords', JSON.stringify(data.keywords));
        setKeywords(data.keywords);
      })
      .catch((e) => e);
  }, []);

  return (
  <>
    <Joyride
      continuous
      run={run}
      scrollOffset={64}
      scrollToFirstStep
      showProgress
      showSkipButton={false}     // ❌ remove Skip
      hideBackButton={true}     // ❌ remove Back
      hideCloseButton={false}    // ✅ keep Cross (X)
      steps={steps}
      locale={{
        back: 'Back',
        close: 'Close',
          last: 'Got it', // 👈 change last button text here
        next: 'Next',
        skip: 'Skip',
      }}
      callback={(data) => {
        const { action, status } = data;

        // ❌ Cross icon now works like Skip
        if (
          action === 'close' ||
          status === 'skipped' ||
          status === 'finished'
        ) {
          setRun(false); // ⛔ end tour
              localStorage.removeItem('runIntro'); // stop it from running again
          sessionStorage.setItem('workflowDone', 'true');
        }
        if(
           status === 'finished'
        ){
           localStorage.setItem('introDismissed', 'true');
        }
      }}
      styles={{
        tooltipContent: {
            textAlign: 'left', // 👈 makes tooltip text left-aligned
        },
        options: {
          zIndex: 100000000,
        },
        buttonNext: {
          background: '#1e1e1e',
        },
        buttonBack: {
          color: '#333333',
        },
      }}
    />

    {!isUploadModalOpen && (
      <Introduction open={open} setRun={setRun} setOpen={setOpen} />
    )}

    <Welcome
      modalOpen={isUploadModalOpen}
      store={true}
      setModalOpen={setUploadModalOpen}
    />

    <ChatWindow
      workflowsData={workflows}
      handleSearch={handleSearch}
      token={user?.idToken}
    />
  </>
);
};
export const extractText = async (file: File): Promise<string> => {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'pdf') {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(' ');
    }
    return text;
  } else if (extension === 'xlsx' || extension === 'xls') {
    const buffer = await file.arrayBuffer();
    const workbook = read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return utils.sheet_to_csv(sheet);
  } else if (extension === 'txt') {
    return await file.text();
  } else {
    return '';
  }
};
export default Home;
export const dynamic = 'force-dynamic';
