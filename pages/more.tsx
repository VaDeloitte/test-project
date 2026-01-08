import React from 'react';
import { HiExternalLink } from 'react-icons/hi';

const More = () => {
  return (
    <section className=" mt-2 pt-4 md:px-8  overflow-auto h-[90vh] bg-gray-50 text-black dark:bg-[#121212] dark:text-gray-100">
      <div className="container mx-auto">
        <div className="flex flex-wrap items-center justify-between ">
          <div className="w-full px-2">
            <div className="mt-2 lg:mt-0">
              <h3 className="mb-3 text-[22px] font-bold text-dark dark:text-white">
                Education
              </h3>
              <p className="mb-3 text-[14px] text-body-color dark:text-gray-300">
                Text-description on several lines to reveal the essence of
                topic. Below is a dummy text for example of composition. Lorem
                ipsum dolor sit amet, consectetur adipiscing elit, sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
                enim ad minim veniam, quis nostrud exercitation ullamco laboris
                nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor
                in reprehenderit in voluptate velit esse cillum dolore eu fugiat
                nulla pariatur. Excepteur sint occaecat cupidatat non proident,
                sunt in culpa qui officia deserunt mollit anim id est Baborum.
              </p>
              <div className="mb-6 bg-gray-200 dark:bg-[#1E1E1E] rounded-md w-fit p-2 px-3 text-sm flex gap-2 items-center cursor-pointer" onClick={()=>{window.open("https://resources.deloitte.com/sites/global/Services/ai/aiacademy/Pages/AI_Academy_Library.aspx","_blank")}}>
                Go to Tax Genie education page {HiExternalLink({ size: 16 }) as JSX.Element}
              </div>

              <h3 className="mb-3 text-[22px] font-bold text-dark dark:text-white">
                Deloitte Al Institute
              </h3>
              <p className="mb-3 text-[14px] text-body-color dark:text-gray-300">
                Text-description on several lines to reveal the essence of
                topic. Below is a dummy text for example of composition. Lorem
                ipsum dolor sit amet, consectetur adipiscing elit, sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
                enim ad minim veniam, quis nostrud exercitation ullamco laboris
                nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor
                in reprehenderit in voluptate velit esse cillum dolore eu fugiat
                nulla pariatur. Excepteur sint occaecat cupidatat non proident,
                sunt in culpa qui officia deserunt mollit anim id est Baborum.
              </p>
              <div className="mb-6 bg-gray-200 dark:bg-[#1E1E1E] rounded-md w-fit p-2 px-3 text-sm flex gap-2 items-center cursor-pointer" onClick={()=>window.open("https://www2.deloitte.com/xe/en/pages/strategy-operations/articles/ai-institute.html","_blank")}>
                Go to Deloitte Al Institute page {HiExternalLink({ size: 16 }) as JSX.Element}
              </div>
              <h3 className="mb-3 text-[22px] font-bold text-dark dark:text-white">
                Gen Al Lamp
              </h3>
              <p className="mb-3 text-[14px] text-body-color dark:text-gray-300">
                Text-description on several lines to reveal the essence of
                topic. Below is a dummy text for example of composition. Lorem
                ipsum dolor sit amet, consectetur adipiscing elit, sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
                enim ad minim veniam, quis nostrud exercitation ullamco laboris
                nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor
                in reprehenderit in voluptate velit esse cillum dolore eu fugiat
                nulla pariatur. Excepteur sint occaecat cupidatat non proident,
                sunt in culpa qui officia deserunt mollit anim id est Baborum.
              </p>
              <div className="mb-6 bg-gray-200 dark:bg-[#1E1E1E] rounded-md w-fit p-2 px-3 text-sm flex gap-2 items-center cursor-pointer" onClick={()=>{window.open("https://resources.deloitte.com/sites/dme/services/tax/Pages/genie.aspx","_blank")}}>
                Go to Gen Al Lamp page {HiExternalLink({ size: 16}) as JSX.Element}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default More;
