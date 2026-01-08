// import { FaRedo, FaCopy } from "react-icons/fa";

type Message = {
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
};


const Chatbox = (message:any[]) =>{
    return (
      <div className="flex flex-col gap-6 px-6 py-8 max-w-4xl ms-[300px]">
        {/* Box 1 */}
        {message.map((item:any)=>(
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-6">
          <p className="font-calibri text-gray-700 text-sm leading-relaxed mb-4">
            {item.content}
          </p>
  
          {/* Buttons */}
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200">
              {/* <FaRedo className="text-sm" /> */}
              <span className=" font-calibri text-sm font-medium">Regenerate</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200">
              {/* <FaCopy className="text-sm" /> */}
              <span className="font-calibri text-sm font-medium">Copy</span>
            </button>
          </div>
        </div>
        ))}
        
  
        {/* Box 2 */}
        
      </div>
    );
  }
  
  export default Chatbox
  
  
  
  