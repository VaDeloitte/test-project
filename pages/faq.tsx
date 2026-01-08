'use client'
import { useState } from 'react';


const tabs = [
  {
    id: 'id-1',
    label: 'What is Tax Genie?',
    children: [],
    content:
      "Tax Genie is an innovative AI-powered and tax & legal use case driven tool designed specifically for Deloitte's tax and legal professionals. It leverages the latest ChatGPT 4 Omni model from Open AI to streamline daily technical and non-technical tasks, enhance productivity, and provide quick access to relevant information and insights.",
  },
  {
    id: 'id-2',
    label: 'Who can use Tax Genie?',
    children: [],
    content:
      'Tax Genie is available to all staff, including Partners and Directors, in the Deloitte Middle East Tax and Legal Services Practice across all 13 countries where we operate.',
  },
  {
    id: 'id-3',
    label: 'What can I use Tax Genie for?',
    content: '',
    children: [
      'Accessing tax and legal information.',
      'Generating tax and legal draft documents.',
      'Analyzing complex tax and legal scenarios.',
      ' Staying updated on tax laws and regulations.',
      'Enhancing your productivity in daily technical and non-technical tasks.',
    ],
  },
];
const tabs2 = [
  {
    id: 'id-4',
    label: 'How do I access Tax Genie?',
    children: [],
    content:
      "Tax Genie can be accessed through your Deloitte work account. If you're having trouble accessing it, please contact your local IT support.",
  },
  {
    id: 'id-5',
    label: 'How to access agents in Tax Genie?',
    content:
      "Tax Genie's interface offers multiple ways to access agents. These include:",
    children: [
      'A Monthly Top 20 Agents list.',
      'Service Line and Enabling Function agent categories.',
      'Activity Type agent categories.',
      'A search bar for specific agents.',
      'A freestyle option for flexible open-ended Tax Genie interactions, i.e., normal Large Language Model mode.',
    ],
  },
  {
    id: 'id-6',
    label: 'What are agents, and how do I use them?',
    content:
      'Agents are pre-designed interaction paths for specific tasks or queries. To use a agent:',
    children: [
      ' Select the relevant agent from the categories or search results.',
      'Answer the questions put to you by Tax Genie as comprehensively as possible, including uploading any documents you may have if you are asked for them or if you think they are relevant to answering the question.',
      'Carefully review the initial output provided by Tax Genie.',
      'Choose an option a set of suggestions made by Tax Genie, to further refine the initial output or instruct Genie on any additional changes you wish to make to the initial output or ask questions about the output.',
    ],
  },
  {
    id: 'id-7',
    children: [],
    label: 'Can I use Tax Genie without a specific agent?',
    content:
      'Yes, you can click on the "Freestyle Tax Genie" button at the bottom of the User Interface to interact with Tax Genie without a agent. This option is for open-ended Tax Genie interactions relying on prompting i.e., a normal and more regular Large Language Model interaction.',
  },
];
export default function VerticalTabs() {
  const [activeTab, setActiveTab] = useState('id-1');

  return (
    // <div className="bg-gray-50 text-black dark:bg-[#121212] dark:text-gray-100 min-h-screen rounded-lg w-full overflow-hidden mt-2 ">
    <section className="overflow-hidden mt-2  bg-gray-50 text-black dark:bg-[#121212] dark:text-gray-100">
      <div className="px-6 text-[24px]/[28px] py-5 font-bold border-b border-gray-200 dark:border-gray-700">
        Tax Genie FAQ
      </div>
      <div className="flex flex-row md:flex-row h-[calc(100vh-140px)]  ">
        {/* Left Tabs */}
        <div className="md:w-1/4 w-[25%] h-full overflow-y-auto border-r border-gray-200 dark:border-gray-700">
          <nav className="flex md:flex-col flex-col">
            <div>
              <div className="font-[Calibri] font-bold text-[14px]/[16px] px-4 py-3 text-dark dark:text-white">
                General Information
              </div>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-4 my-1 font-normal text-left text-[14px]/[16px] transition-colors duration-150 w-full
                    ${
                      activeTab === tab.id
                        ? 'bg-gray-200 dark:bg-[#1E1E1E]'
                        : 'hover:bg-gray-100 dark:hover:bg-[#1E1E1E]'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <hr className="my-2 border-gray-200 dark:border-gray-700" />
            <div>
              <div className="font-bold text-[14px]/[16px] px-4 py-3 text-dark dark:text-white">
                Using Tax Genie
              </div>
              {tabs2.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 my-1 px-4 font-normal text-left text-[14px]/[16px] transition-colors duration-150 w-full
                    ${
                      activeTab === tab.id
                        ? 'bg-gray-200 dark:bg-[#1E1E1E]'
                        : 'hover:bg-gray-100 dark:hover:bg-[#1E1E1E]'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </nav>
        </div>

        {/* Right Content */}
        <div className="md:w-3/4 w-[75%] md:py-1 p-3 md:px-10 px-4 overflow-y-auto h-full">
          {tabs.map(
            (tab) =>
              activeTab === tab.id && (
                <div key={tab.id}>
                  <h2 className="text-[24px]/[40px] font-semibold mb-2 capitalize dark:text-white">
                    {tab.label}
                  </h2>
                  <p className="text-[14px]/[24px] text-gray-600 dark:text-gray-300 w-[87%]">
                    {tab.content}
                  </p>
                  {tab.children?.length > 0 &&
                    tab.children.map((ele, index) => (
                      <ul
                        key={index}
                        className="mb-2 mt-2 list-disc md:mx-2 list-inside text-[14px]/[24px] text-gray-600 dark:text-gray-300"
                      >
                        <li>{ele}</li>
                      </ul>
                    ))}
                </div>
              ),
          )}
          {tabs2.map(
            (tab) =>
              activeTab === tab.id && (
                <div key={tab.id}>
                  <h2 className="text-[24px]/[40px] font-semibold mb-2 capitalize dark:text-white">
                    {tab.label}
                  </h2>
                  <p className="text-[14px]/[24px] text-gray-600 dark:text-gray-300 w-[87%]">
                    {tab.content}
                  </p>
                  {tab.children?.length > 0 &&
                    tab.children.map((ele, index) => (
                      <ul
                        key={index}
                        className="mb-2 mt-2 list-disc md:mx-2 list-inside text-[14px]/[24px] text-gray-600 dark:text-gray-300"
                      >
                        <li>{ele}</li>
                      </ul>
                    ))}
                </div>
              )
          )}
        </div>
      </div>
    {/* </div> */}
    </section>
  );
}
