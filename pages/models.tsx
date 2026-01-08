import React from 'react';

import HomeLayout from '@/components/Home/HomeLayout';

const Model = () => {
  return (
    <section className="overflow-hidden mt-2 pt-4 md:px-8  lg:pb-[90px] bg-gray-50 text-black dark:bg-[#121212] dark:text-gray-100">
      <div className="container mx-auto">
        <div className="flex flex-wrap items-center justify-between ">
          <div className="w-full px-2">
            <div className="mt-2 lg:mt-0">
              <h2 className="mb-6 text-[28px]/[40px] font-bold text-dark dark:text-white ">
                Tax Genie Models
              </h2>
              <h3 className="mb-4 text-[22px]/[28px] font-bold text-dark dark:text-white">
                Cutting-Edge AI Technology
              </h3>
              <p className="mb-8 text-[16px]/[24px] text-body-color dark:text-gray-300">
                Tax Genie harnesses the power of advanced artificial
                intelligence to help enable tax and legal practice at Deloitte.
                At its core, Tax Genie is powered FAO by the latest flagship
                ChatGPT 4 Omni model, This state-of-the-art language model
                provides advanced capabilities in understanding context,
                generating human-like text, and processing complex tax and legal
                information.
              </p>
              <h3 className="mb-4 text-[22px]/[28px] font-bold text-dark dark:text-white">
                Robust Knowledge Base
              </h3>
              <p className=" mb-4 text-[16px]/[24px] text-body-color dark:text-gray-300">
                In addition to data that the ChatGPT 4 Omni model has been
                trained on, at the heart of Tax Genie is a comprehensive and
                dynamic tax and legal database that also contributes its
                knowledge foundation. This database includes:
              </p>
              <ul className="list-disc pl-5 mb-8 text-[16px]/[24px] text-body-color dark:text-gray-300">
                <li>Tax laws and regulations from multiple jurisdictions</li>
                <li>Deloitte's proprietary tax and legal publications</li>
                <li>Industry-specific publicly available tax information</li>
                <li>
                  Publicly available historical tax and legal case studies and
                  precedents
                </li>
                <li>
                  Continuously updated publicly available tax-related documents
                </li>
              </ul>
              <p className="mb-8 text-[16px]/[24px] text-body-color dark:text-gray-300">
                The system uses advanced cosine similarity algorithms to
                retrieve the most relevant documents based on user prompts,
                aiming to ensure better and higher quality responses for our tax
                and legal professionals.
              </p>
              <h3 className="mb-4 text-[22px]/[28px] font-bold text-dark dark:text-white">
                Intelligent Document Processing
              </h3>
              <p className="text-[16px]/[24px] mb-4 text-body-color dark:text-gray-300">
                Tax Genie employs cutting-edge natural language processing (NLP)
                techniques to analyze and understand uploaded documents. This
                allows the system to:
              </p>
              <ul className="list-disc pl-5 mb-8 text-[16px]/[24px] text-body-color dark:text-gray-300">
                <li>Extract key information from complex tax documents</li>
                <li>Identify relevant clauses and sections in legal texts</li>
                <li>Cross-reference information across multiple documents</li>
                <li>Provide context-aware summaries of lengthy reports</li>
              </ul>

              <h3 className="mb-4 text-[22px]/[28px] font-bold text-dark dark:text-white">
                Specialized Agents
              </h3>
              <p className="text-[16px]/[24px] mb-4 text-body-color dark:text-gray-300">
                Each agent within Tax Genie is supported by dedicated programming designed to:
              </p>
              <ul className="list-disc pl-5 mb-8 text-[16px]/[24px] text-body-color dark:text-gray-300">
                <li>Intelligently reason from provided documents</li>
                <li>Leverage extensive knowledge of tax legislations and guidelines</li>
                <li>Understand the context of user queries</li>
                <li>Retrieve multiple relevant documents per query</li>
                <li>Generate precise and insightful responses</li>
              </ul>
              <p className="text-[16px]/[24px] mb-4 text-body-color dark:text-gray-300">
                This process ensures that tax professionals can quickly access the information they need to make informed decisions and optimize their agents to achieve particular tasks or objectives.
              </p>
              <h3 className="mb-4 text-[22px]/[28px] font-bold text-dark dark:text-white">
                Continuous Learning and Updating
              </h3>
              <p className="text-[16px]/[24px] mb-4 text-body-color dark:text-gray-300">
                Tax Genie's models are designed to evolve and improve over time. This includes:
              </p>
              <ul className="list-disc pl-5 mb-8 text-[16px]/[24px] text-body-color dark:text-gray-300">
                <li>Regular updates to the underlying language model.</li>
                <li>Continuous expansion of the knowledge base with new tax laws and regulations and other relevant publications as they become available</li>
                <li>Refinement of agents based on user feedback and usage patterns.</li>
              </ul>

              <h3 className="mb-4 text-[22px]/[28px] font-bold text-dark dark:text-white">
                Data Security and Privacy
              </h3>
              <p className="text-[16px]/[24px] mb-4 text-body-color dark:text-gray-300">
                Tax Genie is built with a strong focus on data security and privacy:
              </p>
              <ul className="list-disc pl-5 mb-8 text-[16px]/[24px] text-body-color dark:text-gray-300">
                <li>All processing occurs within Deloitte's secure cloud environment.</li>
                <li>Strict access controls and encryption protocols are in place.</li>
                <li>The system is designed to handle sensitive tax information without compromising confidentiality.</li>
                <li>Regular security audits and updates ensure compliance with global data protection standards.</li>
              </ul>

              <h3 className="mb-4 text-[22px]/[28px] font-bold text-dark dark:text-white">
                Limitations and Ethical Considerations
              </h3>
              <p className="text-[16px]/[24px] mb-4 text-body-color dark:text-gray-300">
                While Tax Genie is highly advanced, it's important to note:
              </p>
              <ul className="list-disc pl-5 mb-8 text-[16px]/[24px] text-body-color dark:text-gray-300">
                <li>The system is not a substitute for professional judgment.</li>
                <li>Outputs should always be verified by qualified tax and legal professionals.</li>
                <li>Tax Genie is designed to assist and augment human expertise, not replace it.</li>
                <li>Ethical considerations are built into the system to prevent misuse or generation of misleading information.</li>
               
              </ul>

              <h3 className="mb-4 text-[22px]/[28px] font-bold text-dark dark:text-white">
                Future Developments
              </h3>
              <p className="text-[16px]/[24px] mb-4 text-body-color dark:text-gray-300">
                The Tax Genie team is constantly working on enhancing the system's capabilities. This includes:
              </p>
              <ul className="list-disc pl-5 mb-8 text-[16px]/[24px] text-body-color dark:text-gray-300">
                <li>An exploration of multi-modal AI for processing diverse types of tax and legal related data.</li>
                <li>Development of more specialized models for niche areas of tax and legal practice.</li>
                <li>Integration with other Deloitte digital tools and platforms.</li>
                <li>Expansion of language support for global tax and legal practices.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Model;
