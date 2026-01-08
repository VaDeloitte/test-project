"use client";
import { useState, useContext, useEffect } from "react";
import { AuthContext } from "@/utils/app/azureAD";
import DocumentModal from "@/components/Modals/Upload";
import Header from "@/components/HomeHeader/HomeHeaderNew";
import Sidebar from "../components/Sidebar/SidebarNew"
import { useSpaces } from "@/context/SpacesContext";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { useRouter } from "next/navigation"
import { IconPencil } from "@tabler/icons-react";
import { AiOutlinePlus } from "react-icons/ai";
import { LuUserRound } from "react-icons/lu";
import { getFileIcon } from "@/components/Icons/FileIcons";
import { FileAttachmentMini } from "@/components/UI/Attachments";


export default function TeamSpacePage() {
    const authContext = useContext(AuthContext);
    const user: any = authContext?.user;
    const [open,setOpen]=useState<any>(false);
    const router = useRouter();

    // Sidebar states
    const [isLightMode, setIsLightMode] = useState(true);
    const [isUploadModalOpen, setUploadModalOpen] = useState(false);
    const [chats, setChats] = useState<string[]>(["New Chat"]);

    // Team space states
    const [selectedRegion, setSelectedRegion] = useState("");
    const regions = [
        "UAE", "KSA", "Egypt", "Jordan", "Lebanon", "Qatar", "Cyprus", "Oman",
        "Bahrain", "Kuwait", "Iraq", "Yemen",
    ];
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isSpaceCreated, setIsSpaceCreated] = useState(false);
    const { addSpace } = useSpaces();

    // New states for capturing form data
    const [searchInput, setSearchInput] = useState("");
    const [users, setUsers] = useState<string[]>(() =>
        user?.name ? [user.name] : []
    );
    const [documents, setDocuments] = useState<File[]>([]);
    const [spaces, setSpaces] = useState<string[]>([]); // NEW — created spaces

    // Handlers

    const handleSpaceClick = (space: string) => {
        router.push(`/?space=${encodeURIComponent(space)}`);
    };
    const handleInviteUser = () => {
        if (searchInput.trim()) {
            setUsers((prev) => [...prev, searchInput.trim()]);
            setSearchInput("");
        }
    };

    const handleDeleteUser = (username: string) => {
        setUsers((prev) => prev.filter((u) => u !== username));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setDocuments((prev) => [...prev, ...newFiles]); // append only
        }
    };
    // Utility function to format bytes into KB/MB/GB
    function formatFileSize(size: number) {
        if (size < 1024) return size + ' B';
        else if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
        else if (size < 1024 * 1024 * 1024) return (size / (1024 * 1024)).toFixed(1) + ' MB';
        else return (size / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    }


    const { activeSpace, setActiveSpace } = useSpaces();

    const [teamName, setTeamName] = useState("New Team Space");

    const [isEditing, setIsEditing] = useState(false);


    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            setIsEditing(false);
        }
    };

const handleCreateSpace = () => {
  const newSpaceName = teamName.trim() || "Untitled Space";

  const newSpace = {
    name: newSpaceName,
    region: selectedRegion,
    lifetime: selectedDate,
    users,
    documents,
  };

  console.log("Captured data:", newSpace);

  addSpace(newSpace);

  setUsers(user ? [user.name] : []);
  setDocuments([]);
  setIsSpaceCreated(true);

  router.push("./");
};



    // useEffect(() => {
    //     if (!activeSpace || activeSpace.name === "General Space") {
    //         setTeamName("New team space");
    //     } else {
    //         setTeamName(activeSpace.name);
    //     }
    // }, [activeSpace]);

 return (
  <div className="flex min-h-screen bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-gray-100 ">
    {isUploadModalOpen && (
      <DocumentModal
        token={user?.idToken}
        setModalOpen={() => {
          setUploadModalOpen(false);
        }}
      />
    )}

       



            {/* Main content */}
    {!isSpaceCreated && (
      <main className=" flex-1 p-8 md:mt-6 mt-16">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Title Box */}

          <div className="flex flex-col items-center space-y-2 mb-6">
            <div className="bg-black dark:bg-[#2A2B2E] text-white dark:text-gray-100 w-12 h-12 flex justify-center items-center rounded-lg font-bold text-2xl">
              {teamName.length > 0 ? teamName.charAt(0).toUpperCase() : ""}
            </div>

                            {/* team name with inline edit */}
            <div className="flex items-center gap-2">
              {isEditing ? (
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  onBlur={() => setIsEditing(false)}
                  onKeyDown={handleKeyDown}
                  className="border-b border-gray-400 dark:border-[#3A3B3D] focus:border-black dark:focus:border-gray-200 focus:outline-none text-lg font-semibold text-center bg-transparent dark:text-gray-100"
                  autoFocus
                />
              ) : (
                <h2 className="text-lg font-semibold text-center text-gray-800 dark:text-gray-100">
                  {teamName}
                </h2>
              )}


              <button
                onClick={() => setIsEditing(true)}
                className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-[#2A2B2E] transition"
              >
                <IconPencil size={18} stroke={1.5} className="text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>




          {/* Space Lifetime */}
<div className="bg-white dark:bg-[#2A2B2E] rounded-lg shadow-md p-6 border border-gray-200 dark:border-[#3A3B3D]">
  <label className="block font-medium text-gray-700 dark:text-gray-200 mb-1">
    Space lifetime
  </label>
  <p className="text-sm text-gray-500 dark:text-gray-300 mb-3">
    On this date the space will be deleted, along with the files.
    <br />
    Invited users will also no longer have access to the space, chat
    rooms and documents inside it.
  </p>
  <div className="h-px bg-gray-200 dark:bg-[#3A3B3D] mb-3"></div>

  {/* Centered Date Picker */}
  <div className="w-full flex justify-center">
                                <div className="relative w-80 ml-32"> {/* fixed width for the DatePicker box */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-300 pointer-events-none z-10"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.75 3v2.25M17.25 3v2.25M3.75 8.25h16.5M4.5 7.5v12.75c0 .414.336.75.75.75h13.5c.414 0 .75-.336.75-.75V7.5m-15 0h15"
        />
      </svg>
      <DatePicker
    selected={selectedDate}
    onChange={(date) => setSelectedDate(date)}
    dateFormat="dd MMM yyyy"
    minDate={new Date()}
    placeholderText="Select a date"
    calendarClassName="dark:bg-[#2A2B2E] dark:text-white dark:border-[#3A3B3D]"
    popperClassName="dark"
    className="pl-10 pr-3 py-2 w-full bg-gray-100 dark:bg-[#2A2B2E] rounded-full font-medium text-gray-700 dark:text-white focus:outline-none cursor-pointer"
    dayClassName={(date) => {
      // Disable past dates with a light gray background
      const today = new Date();
      today.setHours(0, 0, 0, 0);  // Set the time to midnight

      // Assuming `date` is the date you're checking
      const currentDate = new Date(date);
      currentDate.setHours(0, 0, 0, 0);  // Set the time of the `date` to midnight
      if (currentDate < today) {
        return "bg-[#f3f4f64f] hover:!bg-gray-200 !text-black cursor-not-allowed"; // Light red background and disable cursor for past dates
      }
      return "";// No special class for valid dates
    }}
  />

    </div>
  </div>


</div>




{/* Space Region */}
<div className="bg-white dark:bg-[#2A2B2E] rounded-lg shadow-md p-6 border border-gray-200 dark:border-[#3A3B3D]">
  <label className="block font-medium text-gray-700 dark:text-gray-200 mb-1">
    Space region
  </label>
  <p className="text-sm text-gray-500 dark:text-gray-300 mb-3">
    Important: Please select the correct region for your Rules of the
    Road. Cannot be changed after space is created.
  </p>
  <div className="h-px bg-gray-200 dark:bg-[#3A3B3D] mb-3"></div>
  <div className="grid md:grid-cols-8 grid-cols-3 gap-2">
    {regions.map((region) => (
      <button
        key={region}
                  className={`py-2 px-6 rounded-full border transition ${
            selectedRegion === region
                      ? "bg-black dark:bg-[#43b02a] text-white border-black dark:border-[#5A5B5D] scale-95 shadow-inner"
                      : "bg-gray-100 dark:bg-[#1E1F22] text-gray-700 dark:text-gray-200 border-gray-300 dark:border-[#3A3B3D] hover:bg-blue-100 dark:hover:bg-[#2A2B2E]"
          }`}
                  onClick={() => setSelectedRegion(region)}
      >
        {region}
      </button>
    ))}
  </div>
</div>

          {/* Space Users */}
          <div className="bg-white dark:bg-[#2A2B2E] rounded-lg shadow-md p-6 border border-gray-200 dark:border-[#3A3B3D]">
            <label className="block font-medium text-gray-700 dark:text-gray-200 mb-1">
              Space users
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-300 mb-3">
              Invite new users from your company to this space, they will be able to work with all the space files.
            </p>
            <div className="h-px bg-gray-200 dark:bg-[#3A3B3D] mb-3"></div>
            <div className="flex mb-3">
              <input
                type="text"
                placeholder=" @ Search by email or name"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="border bg-gray-100 dark:bg-[#1E1F22] border-gray-300 dark:border-[#3A3B3D] px-2 py-2.5 rounded-lg flex-[0.9] text-sm text-gray-800 dark:text-gray-200"
              />
              <button
                onClick={handleInviteUser}
                className="ml-2 bg-black dark:bg-[#1E1E1E] text-white dark:text-gray-100 px-4 py-1.5 rounded-lg hover:bg-gray-800 dark:hover:bg-[#3A3B3D] transition flex-[0.1] text-sm"
              >
                Invite user
              </button>
            </div>

            {Array.isArray(users) && users.length > 0 && (
              <div className="mt-4">
                {users.map((u, idx) => (
                  <div key={idx} className="flex items-center justify-between mb-2">
                    <span className="flex-1 flex flex-row gap-1  px-3 py-2.5 rounded-lg text-sm text-gray-800 dark:text-gray-200">
                      {LuUserRound({className:"text-gray-600", size:18})}
                      {u}
                    </span>
                    <button
                      onClick={() => handleDeleteUser(u)}
                      className="ml-2 bg-red-100 text-red-400 px-2.5 py-2 rounded-xl text-sm hover:bg-red-50 dark:hover:bg-[#3A3B3D] transition"
                    >
                      Delete user
                    </button>
                  </div>
                ))}
              </div>
            )}


          </div>

          {/* Space Documents */}
          <div className="bg-white dark:bg-[#2A2B2E] rounded-lg shadow-md p-6 border border-gray-200 dark:border-[#3A3B3D]">
            <label className="block font-medium text-gray-700 dark:text-gray-200 mb-1">
              Space documents
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-300 mb-3">
              All users in this space can work with its documents.
            </p>
            <div className="h-px bg-gray-200 dark:bg-[#3A3B3D] mb-3"></div>

            <div
              className="border-dashed border-2 border-gray-300 dark:border-[#3A3B3D] p-6 rounded-lg flex flex-col items-center dark:bg-[#1E1F22]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files) {
                  const droppedFiles = Array.from(e.dataTransfer.files);
                  setDocuments((prev) => [...prev, ...droppedFiles]);
                }
              }}
            >
              <span className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                Drag the documents (JPG, Word, TXT, PDF, PPT, XLS)
              </span>
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="fileInput"
              />
              <label
                htmlFor="fileInput"
                className="mt-2 w-full h-12 flex items-center justify-center bg-gray-200 dark:bg-[#3A3B3D] text-gray-700 dark:text-gray-200 px-3 py-1 rounded-lg cursor-pointer hover:bg-gray-300 dark:hover:bg-[#2A2B2E]"
              >
                {AiOutlinePlus({size:18})} Select document
              </label>
              {documents.length > 0 && (
                <ul className="mt-4 flex flex-wrap dark:bg-[#1E1F22] gap-3">
                  {documents.map((doc, idx) => (
                    <FileAttachmentMini
                      key={idx}
                      file={doc}
                      index={idx}
                      removeUploadedFile={() => setDocuments((prev) => prev.filter((_, i) => i !== idx))}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Create Button */}
          <div className="pt-6">
            {(() => {
              const isFormValid =
                selectedDate !== null &&
                selectedRegion.trim() !== "" &&
                users.length >= 0 &&
                documents.length > 0;

              return (
                <button
                  onClick={handleCreateSpace}
                  disabled={!isFormValid}
                  className={`w-full py-3 rounded-lg font-semibold text-lg transition ${
                    isFormValid
                      ? "bg-black dark:bg-[#3e3e3e] text-white hover:bg-[#43b02a] dark:hover:bg-[#43b02a] cursor-pointer"
                      : "bg-gray-300 dark:bg-[#2e2e2e] text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  }`}
                >
                  Create space
                </button>
              );
            })()}
          </div>
        </div>

      </main>
    )}
  </div>
    );
}
