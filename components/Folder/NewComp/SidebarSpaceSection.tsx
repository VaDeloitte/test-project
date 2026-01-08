"use client";
import { useState } from "react";
import { useRouter } from "next/router";
import { useSpaces } from "@/context/SpacesContext";
import { Space, general_space } from "@/types/space";
import SidebarActionButton from '@/components/Buttons/SidebarActionButton';
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { DeleteConfirmDialog } from "@/components/DialogBoxes/deleteDialog";

export default function SpacesSection() {
  const router = useRouter();
  const [deletingSpace, setDeletingSpace] = useState<boolean>(false);
  const { spaces, activeSpace, setActiveSpace, deleteSpace } = useSpaces();

  const handleEditSpace = (space: Space) => {
    router.push(`/teamspace_edit?id=${space.id}`);
  };

  const clickDeleteSpace = () => setDeletingSpace(true);
  const cancelDeleteSpace = () => setDeletingSpace(false);

  const handleDeleteSpace = () => {
    deleteSpace(activeSpace.id || "");
    setDeletingSpace(false);
  };

  return (
    <div className="flex Spaces flex-col h-full">
      <div>
        <h2 className="px-2  text-sm font-semibold text-gray-900 dark:text-gray-100">
          Spaces
        </h2>
      </div>

      {/* Space for team */}
      <div className="mt-1 flex-shrink-0">
        <button
          className="
            flex items-center justify-start gap-2 w-full 
            py-2
            bg-white text-gray-600 hover:bg-[#F2F6F7] hover:text-gray-900
            dark:bg-[#1e1e1e] dark:text-gray-300 dark:hover:bg-[#2e2e2e] dark:hover:text-white
            border-none
            rounded-none
          "
          onClick={() => {sessionStorage.setItem("currentTab","chats");router.push("/teamspace")}}
        >
          <div className="ml-4 w-5 h-5 flex items-center justify-center border border-gray-400 rounded-sm">
            <svg
              className="w-3 h-3 text-gray-600 dark:text-gray-300"
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
          <span className="font-[Calibri] text-[11px] font-medium">
            Space for team
          </span>
        </button>
      </div>


      {/* List of spaces */}
      <div className="flex-1 min-h-0 overflow-y-auto small-scrollbar mt-1">
        {spaces
          .filter((space) => space.name.trim() !== "")
          .map((space, idx) => {
            const isActive = space.name === activeSpace?.name;

            return (
              <div
                key={idx}
                onClick={() => setActiveSpace(space)}
                className={`py-2 px-4  flex justify-between items-center gap-2 font-[Calibri] text-xs w-full  ${
                  isActive
                    ? "bg-[#F2F6F7] text-black dark:bg-gray-700 dark:text-white"
                    : "bg-white text-gray-600 hover:bg-[#F2F6F7] hover:text-gray-900 dark:bg-[#1a1a1a] dark:text-gray-300 dark:hover:bg-[#2e2e2e] dark:hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-black dark:bg-white rounded-sm flex items-center justify-center text-white dark:text-black text-[10px] font-bold">
                    {(space?.name || "New Team Space").charAt(0).toUpperCase()}
                  </div>
                  <div className="font-[Calibri] text-[11px] font-medium">
                    {space.name}
                  </div>
                </div>
                {isActive && (
                  <div>
                    <SidebarActionButton handleClick={() => handleEditSpace(space)}>
                      <IconPencil size={18} className="text-gray-500 dark:text-gray-300" />
                    </SidebarActionButton>
                    <SidebarActionButton handleClick={clickDeleteSpace}>
                      <IconTrash size={18} className="text-gray-500 dark:text-gray-300" />
                    </SidebarActionButton>
                  </div>
                )}
              </div>
            );
          })}

        {/* General Space */}
        <div>
          <button
            onClick={() => setActiveSpace(general_space)}
            className={`w-full flex items-center px-4 py-2 gap-2 font-calibri text-[11px]  ${
              activeSpace?.name === "General Space"
                ? "bg-gray-200 hover:bg-gray-300 text-black dark:bg-[#2e2e2e] dark:hover:bg-[#3e3e3e] dark:text-white"
                : "bg-white text-gray-600 hover:bg-[#F2F6F7] hover:text-gray-900 dark:bg-[#1a1a1a] dark:text-gray-300 dark:hover:bg-[#2e2e2e] dark:hover:text-white"
            }`}
          >
            <div className="w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-bold bg-black text-white dark:bg-white dark:text-black">
              G
            </div>
            <span className="font-[Calibri] text-[11px] font-medium">
              General space
            </span>
          </button>
        </div>
      </div>

      <DeleteConfirmDialog
        isOpen={deletingSpace}
        onConfirm={handleDeleteSpace}
        onClose={cancelDeleteSpace}
        title="Delete Space?"
        message="This will permanently delete the space. This action cannot be undone."
      />
    </div>
  );
}
