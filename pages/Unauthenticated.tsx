import React from "react";
import HomeLayout from '@/components/Home/HomeLayout';

const Unauthenticated = () => {
    return (
                <section className="overflow-hidden pt-10 lg:pb-[90px] dark:text-white dark:bg-dark">
                    <div className="container mx-auto">
                        <div className="flex flex-wrap items-center justify-between -mx-4">
                            <div className="w-full px-4 text-center mt-40">
                                <div className="mt-10 lg:mt-0">
                                <h1 className="mb-5 text-6xl font-bold text-dark dark:text-white sm:text-[40px]/[48px]">
                                    403
                                    </h1>
                                    <h2 className="mb-5 text-3xl font-bold text-dark dark:text-white sm:text-[40px]/[48px]">
                                    You are not authenticated
                                    </h2>
                                    <p className="mb-8 text-base text-body-color dark:text-dark-6">
                                    Please log in to access this page
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
    );
};

export default Unauthenticated;
