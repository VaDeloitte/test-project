import React from "react";
import HomeLayout from '@/components/Home/HomeLayout';

const Help = () => {
    return (
                <section className="overflow-hidden pt-10 lg:pb-[90px] dark:text-white dark:bg-dark">
                    <div className="container mx-auto">
                        <div className="flex flex-wrap items-center justify-between -mx-4">
                            <div className="w-full px-4 ">
                                <div className="mt-10 lg:mt-0">
                                    <h2 className="mb-5 text-3xl font-bold text-dark dark:text-white sm:text-[40px]/[48px]">
                                    Help
                                    </h2>
                                    <p className="mb-8 text-base text-body-color dark:text-dark-6">
                                    If you have any queries, feedback, or questions about using Genie, we are here to help. Please feel free to reach out to us via email at dmegenie@deloitte.com. 
                                    Your insights and inquiries are valuable to us as we strive to enhance your experience and continuously improve our services. Thank you for using Genie!
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
    );
};

export default Help;
