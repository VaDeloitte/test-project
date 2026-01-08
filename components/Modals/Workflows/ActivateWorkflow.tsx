import React, { useState, useRef, useEffect, useContext } from 'react';
import { IconUpload, IconTrash, IconFileSearch, IconLoader, IconX } from '@tabler/icons-react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { getFileIcon } from '@/utils/helper/helper';
import { saveFiles } from '@/utils/app/conversation';
import { uploadDocuments } from '@/services/uploadService';
import { AuthContext } from '@/utils/app/azureAD';

interface FileDetails {
    name: string;
    size: number; // Size in KB for simplicity
    file: File;  // Add a File object to keep a reference to the actual file
    token: any;

}


function ActivateWorkflow({ setModalOpen, modalOpen, workflow, token }: any): JSX.Element | null {
    const [documents, setDocuments] = useState<FileDetails[]>([]);
    const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [textareaValue, setTextareaValue] = useState();
    const [message, setMessage] = useState('');
    const router = useRouter();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const fileInputRefs = useRef<HTMLInputElement>(null);
    const [isChecked, setIsChecked] = useState<boolean>();
    const authContext = useContext(AuthContext);

    const handleDocumentUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'document' | 'approval'): void => {
        const files = event.target.files;
        if (files) {
            const newFiles = Array.from(files).map(file => ({
                name: file.name,
                size: Math.round(file.size / 1024), // Convert bytes to KB
                file: file
            }));

            // Check if any file exceeds 20 MB
            const oversized = newFiles.some(file => {
                return file.size > 20000
            }); // 20 MB in KB
            if (oversized) {
                setMessage("File size must not exceed 20 MB.");
                return; // Exit the function if any file is too large
            }

            setMessage("");

            if (type === 'document') {
                setDocuments((prevDocuments: any) => [...prevDocuments, ...newFiles]);
            }
        }
    };

    const removeFile = (index: number, type: 'document' | 'approval'): void => {
        if (type === 'document') {
            setDocuments(prevDocuments => prevDocuments.filter((_, i) => i !== index));
        }
    };

    // Handler for textarea changes
    const handleChange = (event: any) => {
        setTextareaValue(event.target.value);
    };

    const handleClose = (): void => {
        setModalOpen(false);
    };

    const handleSubmit = async (event: any): Promise<void> => {
        event.preventDefault();
        if (isSubmitted) {
            workflow.prompt = textareaValue;
            router.push(`/chat?id=${workflow._id}&upload=1`);


            setModalOpen(true);
            return;
        }



        // Prepare form data
        const formData = new FormData();

        // Append document files to form data
        documents.forEach((doc) => {
            formData.append('files', doc.file);
        });

        let currentIdToken = authContext?.user?.idToken;
        if (!currentIdToken) {
        console.error('No ID token available');
        return;
        }

        if (authContext?.validateAndRefreshToken) {
        currentIdToken = await authContext.validateAndRefreshToken(currentIdToken) || undefined;
        }

        if (!currentIdToken) {
        console.error('Failed to refresh token');
        return;
        }

        // Post request to server
        setIsUploading(true);
        try {
            setMessage("");
            const myHeaders: any = new Headers();
            currentIdToken ? myHeaders.set('Authorization', `Bearer ${currentIdToken}`) : null;
            const result = await uploadDocuments(formData, currentIdToken);

            setIsUploading(false);
            if (result) {
                setIsSubmitted(true); // Set the submitted state to true to show success message and close the modal
                if (result && result.urls && result.urls.length != 0) {
                    let filesStorage: any = localStorage.getItem('files');
                    let filesData: any = JSON.parse(filesStorage) || {};

                    // Extract azureFileNames from result.urls
                    const azureFileNames = result.urls.map((file: any) => file.azureFileName);

                    // Define the key for new data using workflow._id
                    let selectedId = workflow._id;

                    // Update filesData with new file information under the selectedId
                    if (!filesData[selectedId]) {
                        filesData[selectedId] = [];
                    }
                    filesData[selectedId].push(...azureFileNames);  // Use spread operator to add new file names
                    saveFiles(filesData);

                }

            } else {
                console.error('Error submitting files:', result.error);
                setMessage(result.error);
            }
        } catch (error) {
            console.error('Network error:', error);
            setMessage('Network error, please try again later.'); // Show error to user

        }
    };


    // Function to handle clicking the div, no parameters needed
    const handleDivClick = () => {
        // Programmatically click the hidden file input, ensuring it exists first
        fileInputRef.current?.click();
    };

    // Function to handle clicking the div, no parameters needed
    const handleDivClicks = () => {
        // Programmatically click the hidden file input, ensuring it exists first
        fileInputRefs.current?.click();
    };

    useEffect(() => {
        if (workflow) {
            setTextareaValue(workflow.prompt)
        }
    }, [workflow])

    const isSubmitDisabled = documents.length !== 0 && textareaValue !== '' && isChecked;


    return modalOpen ? (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[100]">
            <div className="dark:bg-primary bg-white p-5 rounded-lg max-w-md w-full text-black dark:text-white text-left">
                <div className="relative">
                    {!isSubmitted && <>
                        <h2 className="text-lg w-full text-center font-[18px] text-black dark:text-white">Activate workflow</h2>
                        <p className="dark:text-white text-black text-[14px] text-center font-[200] mb-8"> {workflow?.uploadDescription ? workflow.uploadDescription : null}</p></>}
                    {!isSubmitted ? <button onClick={handleClose} className="absolute top-0 right-0 text-dark dark:text-white text-lg font-semibold">
                        <IconX stroke={2} />
                    </button> : ""}

                </div>
                {!isSubmitted && <>
                    {/* <div className="mt-4">
                        <textarea onChange={handleChange} value={textareaValue} name="Prompt" id="Prompt" placeholder="Prompt" className="w-full p-4 rounded-[15px] dark:bg-transparent border dark:border-white border-black" cols={30} rows={4}></textarea>
                    </div> */}
                    <div className="mt-4">
                        {message ? <p className="text-white	p-2 mb-2 bg-red-500 rounded-md">{message}</p> : null}
                        <label className="block mb-2 font-[500]">Upload document</label>
                        {documents.map((doc, index) => (
                            <div key={index} className="flex items-center justify-center mb-2 w-full">
                                <div className="border dark:border-[#E3E3E3] border-black rounded-md p-4 py-2 flex w-full">
                                    <Image
                                        src={getFileIcon(doc.name)}
                                        alt="Genie"
                                        height={30}
                                        width={30}
                                        className="mr-2"
                                    />
                                    <div> <div className="text-[20px] dark:text-white truncate whitespace-nowrap w-[257px] font-[200]">

                                        {doc.name}</div><div className="text-[9px] text-[#9D9D9D]">{doc.size} KB</div></div>
                                    <button disabled={isUploading} onClick={() => removeFile(index, 'document')} className="text-red-500 ml-auto"><IconTrash /></button>
                                </div>
                            </div>
                        ))}
                        {documents.length == 0 ? <div className="flex justify-between border dark:border-white p-4 rounded-[20px] mb-2 cursor-pointer" onClick={handleDivClick}>
                            <input type="file" multiple={true} accept=".pdf, .doc, .docx, .txt, .xls, .xlsx, .csv, .ppt, .pptx" className="hidden fileInputRef" ref={fileInputRef} onChange={(e) => handleDocumentUpload(e, 'document')} />
                            <span>Upload document</span> <IconUpload />
                        </div> : null}
                        <p className="text-white font-[14px]">PDF, Word, Text, Excel, or CSV files only.</p>
                    </div>

                </>}
                {isSubmitted && <>
                    <div className="text-center py-10 min-h-[400px] flex flex-col items-center justify-center">
                        <IconFileSearch size={100} className="mb-6" />
                        <h1 className="text-[38px] mb-2 font-[500]">Upload Success</h1>
                        <p className="mt-6">Your document has been successfully uploaded.</p>
                    </div></>}
                {!isSubmitted ? <div className="mt-4">
                    <label className="text-[12px]">
                        <input
                            type="checkbox"
                            name="uploadRequired"
                            onChange={(e) => {
                                setIsChecked(e.target.checked);
                            }}
                            className="mr-2 appearance-none checked:bg-Info checked:border-transparent h-3 w-3 rounded-sm border border-gray-300 cursor-pointer"
                        />I confirm that the uploaded document(s) are not Client Confidential, Deloitte Confidential, High Risk Confidential, or Personal Data.</label>
                </div> : null}

                <div className="mt-4">
                    {!isSubmitted && <button disabled={!isSubmitDisabled || isUploading} onClick={(event) => handleSubmit(event)} className="dark:bg-Info bg-default w-full text-[18px] text-white p-2 py-4 font-[400] rounded-[48px] disabled:opacity-[0.4]">
                        {isUploading ? <span className="flex gap-2 items-center justify-center ">Uploading...  <IconLoader size={18} className=" animate-spin" /></span> : 'Upload'}
                    </button>}

                    {isSubmitted && <button disabled={!isSubmitDisabled} onClick={(event) => handleSubmit(event)} className="dark:bg-Info bg-default w-full text-[18px] text-white p-2 py-4 font-[400] rounded-[48px] disabled:opacity-[0.4]">
                        Proceed to Genie
                    </button>}
                </div>
            </div>
        </div>
    ) : null;
}

export default ActivateWorkflow;
