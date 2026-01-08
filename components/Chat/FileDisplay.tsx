import {IconTrash} from '@tabler/icons-react';
import { getFileIcon } from '@/utils/helper/helper';
import Image from 'next/image';
interface FileDisplayProps {
    file: File;
    onRemove: (file: File) => void;  // Function to call when the remove button is clicked
    isUploading: boolean;

}

const FileDisplay: React.FC<FileDisplayProps> = ({ file, isUploading, onRemove }) => {
    return (
        <div className="dark:bg-[#343540] bg-[#FFF0A44D] border dark:border-[#B7B7B7] border-[#C5C5D1] mb-2 file-info flex  justify-between items-center file-info mr-2 px-4 py-1 rounded-lg text-black dark:text-white">
            <div>
                <div className="inline-flex items-center xl:text-[14px] text-[12px] xl:min-w-[180px] min-w-[100px]">
                    <Image
                        src={getFileIcon(file.name)}
                        alt="Genie"
                        height={30}
                        width={30}
                        className="min-w-[40px] mr-1"
                    />
                    <div>
                        {file.name.length > 20 ? `${file.name.substring(0, 20)}...` : file.name}
                        <p className="text-[9px] text-[#9D9D9D] ]">{Math.round(file.size / 1024)} KB</p></div></div>
            </div>
            {!isUploading && <button aria-label="Remove file" onClick={() => onRemove(file)} className="remove-btn ml-2 text-red-500 hover:text-red-700">
                <IconTrash size={26} />
            </button>}
        </div>
    );
};
export default FileDisplay