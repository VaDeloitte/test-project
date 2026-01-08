import React from 'react';
import { getFileIcon } from '../Icons/FileIcons';
import {AiOutlineClose} from 'react-icons/ai';


interface FileAttachmentMiniProps {
  file: File;
  index: number;
  removeUploadedFile: (index: number) => void;
}


const FileAttachmentMini: React.FC<FileAttachmentMiniProps> = ({file, index, removeUploadedFile }) => {
    return (
          <div className='flex gap-1 bg-[#F2F6F7] dark:bg-[#2e2e2e] p-3 rounded-2xl w-auto max-w-[200px]'>
            <div className="col-span-1 flex items-center justify-center relative">
              {getFileIcon(file.name)}
            </div>
            <div className="col-span-5 min-w-0 relative">
              <p className="text-sm font-medium text-gray-800 dark:text-white  truncate" title={file.name}>
                {file.name}
              </p>
              <p className="text-xs text-gray-600">
                {formatFileSize(file.size)}
              </p>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => removeUploadedFile(index)}
                className="text-gray-400 hover:text-red-500 transition ml-2"
              >
                {AiOutlineClose({size:16}) as JSX.Element}
              </button>
            </div>
          </div>
    );
};

export { FileAttachmentMini};

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};
