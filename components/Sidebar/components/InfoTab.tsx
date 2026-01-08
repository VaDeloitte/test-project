"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import '@/styles/sidebar.css';



export default function InfoTab({
  setActiveTab,
}: any) {
  const router = useRouter();
  const activeInfoTab=sessionStorage.getItem("activeInfoTab");
  return (
    <div className="flex flex-col gap-[.5] font-[Calibri] dark:bg-[#1E1E1E]">
      <div
        className={`${
          activeInfoTab === 'about'
            ? 'text-black bg-gray-200 dark:text-white dark:bg-[#2E2E2E]'
            : 'text-gray-700 dark:text-gray-300'
        } text-[17px]/[16px] hover:bg-gray-200 dark:hover:bg-[#2E2E2E] cursor-pointer p-4 px-3`}
        onClick={() => {
          sessionStorage.setItem("activeInfoTab",'about');
          router.push("./")
          setActiveTab('info');
          sessionStorage.setItem("dashboard","false");
        }}
      >
        About
      </div>
      <div
        className={`${
          activeInfoTab === 'models'
            ? 'text-black bg-gray-200 dark:text-white dark:bg-[#2E2E2E]'
            : 'text-gray-700 dark:text-gray-300'
        } text-[17px]/[16px] hover:bg-gray-200 dark:hover:bg-[#2E2E2E] cursor-pointer p-4 px-3`}
        onClick={() => {
          sessionStorage.setItem("activeInfoTab",'models');
          router.push("./")
          setActiveTab('info');
        }}
      >
        Models
      </div>
     
      <div
        className={`${
          activeInfoTab === 'faq'
            ? 'text-black bg-gray-200 dark:text-white dark:bg-[#2E2E2E]'
            : 'text-gray-700 dark:text-gray-300'
        } text-[17px]/[16px] hover:bg-gray-200 dark:hover:bg-[#2E2E2E] cursor-pointer p-4 px-3`}
        onClick={() => {
          sessionStorage.setItem("activeInfoTab",'faq');
          router.push("./")
          setActiveTab('info');
        }}
      >
        FAQ
      </div>
      <div
        className={`${
          activeInfoTab === 'more'
            ? 'text-black bg-gray-200 dark:text-white dark:bg-[#2E2E2E]'
            : 'text-gray-700 dark:text-gray-300'
        } text-[17px]/[16px] hover:bg-gray-200 dark:hover:bg-[#2E2E2E] cursor-pointer p-4 px-3`}
        onClick={() => {
          router.push("./")
          sessionStorage.setItem('activeInfoTab','more');
          setActiveTab('info');
        }}
      >
        More
      </div>
    </div>
  );
}
