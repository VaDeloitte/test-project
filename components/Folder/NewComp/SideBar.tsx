"use client";
import { useRouter } from "next/navigation";
import DocumentModal from "@/components/Modals/Upload";
import { AuthContext } from "@/utils/app/azureAD";
import React, { useContext, useState } from "react";
import { useSpaces } from "@/context/SpacesContext";
import SpacesSection from "./SidebarSpaceSection";

const initialChat = "New Chat";

const Sidebar: React.FC<{ isOpen?: boolean; onClose?: () => void }> = ({
  isOpen = false,
  onClose,
}) => {
  const [isLightMode, setIsLightMode] = useState<boolean>(true);
  const [chats, setChats] = useState<string[]>([initialChat]);
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const authContext = useContext(AuthContext);
  const user: any = authContext?.user;
  const router = useRouter();
  const { spaces, activeSpace, setActiveSpace } = useSpaces();

  return (
    <>
      {isUploadModalOpen && (
        <DocumentModal
          token={user?.idToken}
          setModalOpen={() => setUploadModalOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <div
        className={`
          z-50 pt-2 bg-white border-r border-gray-200 flex flex-col
          fixed top-[80px]  md:top-[50px] bottom-0 left-0
          transition-transform duration-300
          w-full max-w-[280px] md:max-w-[256px]
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
        <div className="flex-1 overflow-y-auto py-2 space-y-3 no-scrollbar">
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
              <svg
                className="w-3.5 h-3.5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by Spaces or chat"
              className="w-full pl-7 pr-2 py-2 rounded-md bg-gray-100 font-calibri text-[11px]"
            />
          </div>

          {/* Spaces Section */}
          <div>
            <SpacesSection/>
          </div>

          {/* Chats Section */}
          <div>
            <div className="flex items-center justify-between mb-1 px-2">
              <h2 className="text-sm font-calibri font-semibold text-gray-900">Chats</h2>
            </div>
            {chats.map((chat, index) => (
              <button
                key={index}
                className={`w-full flex items-center px-3 py-2 space-x-1.5 font-calibri text-[11px] text-gray-600 hover:text-gray-900 rounded-md ${index === 0 ? "bg-gray-100" : "bg-white"
                  }`}
                onClick={() =>
                  setChats((prev) => [...prev, `Untitled ${prev.length}`])
                }
              >
                {index === 0 && (
                  <div className="w-5 h-5 flex items-center justify-center border border-black rounded-full">
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 6v12m6-6H6"
                      />
                    </svg>
                  </div>
                )}
                <span>{chat}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer & Bottom Navigation */}
        <div className="border-t border-gray-200">
          {/* Submit Data Section */}
          <div
            className="border-b border-gray-100"
            onClick={() => setUploadModalOpen(true)}
          >
            <button className="flex items-center text-[11px] py-3 px-3 font-small font-calibri text-gray-900 w-full justify-between hover:bg-gray-100 rounded-md">
              <span>Submit data to tune Genie</span>
              <svg
                className="w-4 h-4 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          {/* Mode Section */}
          <div className="ml-5 py-1 border-b border-gray-200">
            <div className="font-calibri text-[12px] text-left font-semibold text-gray-900">
              Mode
            </div>
            <div className="flex mb-1 items-center justify-between">
              <span className="font-calibri text-[11px] text-gray-600">
                Light mode
              </span>
              <button
                onClick={() => setIsLightMode(!isLightMode)}
                className={`relative inline-flex h-4 w-8 mr-2 items-center rounded-full transition-colors focus:outline-none ${
                  isLightMode ? 'bg-[#43B02A]' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${
                    isLightMode ? 'translate-x-4' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Bottom Navigation */}
          <div className="p-1 bg-white border-t border-gray-200">
            <div className="flex items-center justify-between px-2">
              <button className="flex flex-col items-center px-1.5 py-0.5 text-black-400 hover:text-gray-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
                  />
                </svg>
                <span className="font-calibri text-[11px] mt-0.5">Chats</span>
              </button>

              <button className="flex flex-col items-center px-1.5 py-0.5 text-gray-400 hover:text-gray-600">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <span className="font-calibri text-[11px] mt-0.5">Agents</span>
              </button>

              <button className="flex flex-col items-center px-1.5 py-0.5 text-gray-400 hover:text-gray-600">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="font-calibri text-[11px] mt-0.5">Info</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div className="fixed inset-0 ml-[280px] bg-black/40 z-40 md:hidden" onClick={onClose} />
      )}
    </>
  );
};

export default Sidebar;
