import React, { useState } from 'react';
import {
  IconLogout,
  IconMessageChatbot,
} from '@tabler/icons-react';
import Link from 'next/link';

const Sidebar = ({ menuItems }:any) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const baseUrl = window.location.origin;
  const fullUrl = `${baseUrl}`;
  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <div className={`bg-[#C9C9D5] h-screen relative z-50 `}>
      <span
        className="absolute text-white text-4xl top-5 left-4 cursor-pointer"
        onClick={toggleSidebar}
      >
        <i className={`bi bi-filter-${isOpen ? 'left' : 'right'} px-2 bg-gray-900 rounded-md`}></i>
      </span>
      {isOpen && (
        <div className="sidebar fixed top-0 bottom-0 lg:left-0 p-4 w-[300px] overflow-y-auto text-center bg-[#f2f2f2] border-r-2  border-[#729c3e]">
              <a href={fullUrl}  className={"w-full block text-left underline text-secondary"} title={"back"}>
                Back</a>
          <div className="text-[#000] text-xl">
      
            <div className="p-2.5 mt-1 flex items-center">
         
              <h1 className="font-bold  text-[#000] text-[15px] ml-3 flex justify-center items-center gap-2">
                <div className="relative w-10 h-10 overflow-hidden bg-[#ededed]rounded-full bg-white rounded-3xl  border-black-100">
                  <svg className="absolute w-12 h-12 text-gray-400 -left-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path></svg>
                </div>
                Admin
              </h1>
              <i
                className="bi bi-x cursor-pointer ml-28 lg:hidden"
                onClick={toggleSidebar}
              ></i>
            </div>
            {/* <div className="my-2 bg-gray-600 h-[1px]"></div> */}
          </div>
          {/* <div className="p-2.5 flex items-center rounded-md px-4 duration-300 cursor-pointer bg-white text-white">
            <i className="bi bi-search text-sm"></i>
            <input
              type="text"
              placeholder="Search"
              className="text-[15px] ml-4 w-full bg-transparent text-black focus:outline-none"
            />
          </div> */}
          {menuItems.map((menuItem:any, index:any) => (
            <div key={index} className={`p-2.5 mt-3 flex items-center rounded-md px-4 duration-300 cursor-pointer hover:bg-[#C9C9D5] text-white ${menuItem.isActive ? 'bg-[#C9C9D5] text-black' : ''}`}>
              <i className={menuItem.icon}></i>
              <span className="text-[15px] ml-4 text-[#000] font-bold">{menuItem.title}</span>
            </div>
          ))}
          {/* <div className="my-4 bg-gray-600 h-[1px]"></div> */}
          {false ? <><div
            className="p-2.5 mt-3 flex items-center rounded-md px-4 duration-300 cursor-pointer hover:bg-[#C9C9D5] text-white"
            onClick={toggleDropdown}
          >
            <div className="flex w-full">
              <IconMessageChatbot className="text-black" />
              <span className="text-[15px] ml-4 text-[#000] font-bold">Chatbox</span>
              <span className={`text-sm ${isDropdownOpen ? 'rotate-180' : ''}`} id="arrow">
                <i className="bi bi-chevron-down"></i>
              </span>
            </div>
          </div>
          {isDropdownOpen && (
            <div className="text-left text-sm mt-2 w-4/5 mx-auto text-[#000] font-bold" id="submenu">
              <h1 className="cursor-pointer p-2 hover:bg-[#C9C9D5] rounded-md mt-1">Models</h1>
              <h1 className="cursor-pointer p-2 hover:bg-[#C9C9D5] rounded-md mt-1">Limit</h1>
              <h1 className="cursor-pointer p-2 hover:bg-[#C9C9D5] rounded-md mt-1">Subscription</h1>
            </div>
          )}</>:null}
          {/* <div className="p-2.5 mt-3 flex items-center rounded-md px-4 duration-300 cursor-pointer hover:bg-[#C9C9D5] text-white">
            <i className="bi bi-box-arrow-in-right"></i>
            <IconLogout className="text-black" />
            <span className="text-[15px] ml-4 text-[#000] font-bold">Logout</span>
          </div> */}
        </div>
      )}
    </div>
  );
};

export default Sidebar;
