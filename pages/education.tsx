import React from "react";
import HomeLayout from '@/components/Home/HomeLayout';

const Education = () => {
    return (
                <section className="overflow-hidden pt-10 lg:pb-[90px] dark:text-white dark:bg-dark">
                    <div className="container mx-auto">
                        <div className="flex flex-wrap items-center justify-between -mx-4">
                            <div className="w-full px-4 ">
                                <div className="mt-10 lg:mt-0">
                                    <h2 className="mb-5 text-3xl font-bold text-dark dark:text-white sm:text-[40px]/[48px]">
                                    Education
                                    </h2>
                                    <p className="mb-8 text-base text-body-color dark:text-dark-6">
                                        As you use Genie and other AI tools, it's important to be mindful of several key considerations to maximize the benefits and minimize potential drawbacks. 
                                        AI technology, while powerful and capable of processing vast amounts of information quickly, is not infallible. Always ensure that the data and documents you provide are accurate and up-to-date, as the quality of the output is directly influenced by the quality of the input. 
                                        Additionally, remember that AI models, including Genie, are designed to assist with gathering information and generating ideas, but they are not substitutes for professional judgment and expertise. 
                                        Always verify critical information and consult with qualified professionals before making significant decisions based on AI-generated insights.
                                    </p>
                                    <p className="mb-8 text-base text-body-color dark:text-dark-6">
                                        Another important aspect to consider is the ethical use of AI. 
                                        Be aware of the data privacy and security policies that govern the information you share with Genie and other AI platforms. 
                                        Ensure that sensitive information is protected and that the use of AI aligns with Deloitte's ethical standards and regulatory requirements. 
                                        As part of this, avoid uploading confidential data or asking confidential questions within the AI tool. Protecting sensitive information is paramount, and adhering to these guidelines will help safeguard both your personal and professional integrity. 
                                        As AI continues to evolve, staying informed about its capabilities and limitations will empower you to use these tools effectively and responsibly, enhancing your productivity and decision-making processes while maintaining the confidentiality of your work.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
    );
};

export default Education;
