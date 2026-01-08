"use client";

import React, { useState, useContext,useId  } from "react";
import { createPortal } from "react-dom";
import { AuthContext } from "@/utils/app/azureAD";
import { newUploadDocuments, getMyFiles } from "@/services/uploadService";
import { AiOutlineClose } from "react-icons/ai";
import { ChatMode } from "@/types/chat-modes";
import { getFileIcon } from "@/components/Icons/FileIcons";
import { IconTrash } from '@tabler/icons-react';
import { deleteFile, downloadFile } from "@/services/fileService";


const fakeUploadDocuments = async (formData: FormData, token: string | null | undefined, onProgress: (p: number) => void) => {
  // Simulate upload
  for (let i = 0; i <= 100; i += 10) {
    await new Promise(resolve => setTimeout(resolve, 400));
    onProgress(i);
  }
  return { urls: ['https://example.com/file1.pdf', 'https://example.com/file2.pdf'] };
};

const testFile: File[] = [
  {name: "Test.txt", size: 8000000} as File,
  {name: "Test.pdf", size: 8000000} as File,
  {name: "Test.docx", size: 8000000} as File,
  {name: "Test.xlsx", size: 8000000} as File,
  {name: "Test.png", size: 8000000} as File,
  {name: "Test.jpg", size: 8000000} as File,
];

interface FileUploadModalProps {
  show: boolean;
  onClose: () => void;
  uploadedFiles: File[];
  setUploadedFiles: any;
  uploadedFilesLink: any[];
  setUploadedFilesLink: any;

  // ✅ OPTIONAL (Agent page only)
  selectedFiles?: File[];
  setSelectedFiles?: React.Dispatch<React.SetStateAction<File[]>>;
  selectedFilesLink?: any[];
  setSelectedFilesLink?: React.Dispatch<React.SetStateAction<any[]>>;

  token: string;
  maxFiles?: number;
  chatMode?: ChatMode;
}

const FileUploadModal: React.FC<FileUploadModalProps> = ({
  show,
  onClose,
  uploadedFiles,
  setUploadedFiles,
  selectedFiles,
  setSelectedFiles,
  setSelectedFilesLink,
  uploadedFilesLink,
  selectedFilesLink,
  setUploadedFilesLink,
  token,
  maxFiles = 10,  // Default to 10 if not provided
  chatMode = ChatMode.NORMAL,
}) => {
const authContext = useContext(AuthContext);
const fileInputId = useId(); // ✅ FIX
  const [myFiles, setMyFiles] = useState<any[]>([]);
  const [selectedMyFiles, setSelectedMyFiles] = useState<File[]>([]);
  const [deletingMyFileIndex, setDeletingMyFileIndex] = useState<number | null>(null);

  const [isChecked, setIsChecked] = useState<boolean>(false);
  const [files, setFiles] = useState<File[]>([]);
  const [activeTab, setActiveTab] = useState("Upload");
  const [warning, setWarning] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const MAX_FILES = maxFiles;  // Use the prop value

  // Debug: Log when MAX_FILES changes
  React.useEffect(() => {
    console.log('FileUploadModal - MAX_FILES:', MAX_FILES, 'chatMode:', chatMode);
  }, [MAX_FILES, chatMode]);

  React.useEffect(() => {
    // Add event listener for ESC key to close the modal
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    if (show) {
      document.addEventListener("keydown", handleEscKey);
    }

    // Cleanup the event listener when the modal is closed
    return () => {
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [show]);
  
  // if (!show) return null;

    // === Fetch Logic ===
    const fetchMyFiles = async () => {
      if (!authContext?.user?.email || !token) return;
  
      try {
        // API returns { files: [...], pagination: {...} } based on DTO
        const result = await getMyFiles(token, authContext.user.email);
        
        if (result && Array.isArray(result.files)) {
          const mappedFiles = result.files.map((f: any) => {

              const uploadedAt = new Date(f.uploaded_at).getTime();
              const now = new Date().getTime();
              const retentionPeriodMs = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds
              const timeRemainingMs = (uploadedAt + retentionPeriodMs) - now;
              const daysRemaining = Math.ceil(timeRemainingMs / (24 * 60 * 60 * 1000));

             // Create a fake File object for display purposes since we don't have the Blob
              const mockFile = {
                name: f.display_name || f.file_name,
                size: f.size,
                type: f.file_type || '', // optional
                url: f.download_url || f.blob_path, // Fallback if download_url is null
                azureFileName: f.file_name, // Extract filename from path
                originalFileName: f.display_name || f.file_name,
                file_id: f.file_id, // Keep ID for potential deletion later
                // We attach extra metadata if needed
                lastModified: new Date(f.uploaded_at).getTime(),
                expiresIn: daysRemaining,
              };
              console.log("mockFile", f)
             return mockFile;
          });

          setMyFiles(mappedFiles);
        }
      } catch (error) {
        console.error("Failed to load My Files", error);
      }
    };


  const handleDeleteMyFile = async (index: number) => {

    setDeletingMyFileIndex(index);
    // Get file id from array
    const id_d = myFiles[index]?.file_id;

    if (!id_d) {
      console.error("Invalid file index or missing id");
      return;
    }

    const refreshedToken = await authContext?.validateAndRefreshToken(token);

    try {
      const result = await deleteFile(id_d, authContext?.user?.email, refreshedToken);
      console.log(result.message); // 'File deleted successfully'

      //update local state after delete
      setMyFiles(prev => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setDeletingMyFileIndex(null);
    }
  };


  // === UTILITY FUNCTIONS ===

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // === Use File from myFiles ===//

const useFileFromMyFile = () => {
  // -----------------------------
  // 1️⃣ Landing page state
  // -----------------------------
  setUploadedFiles((prev: any[]) => [...prev, ...selectedMyFiles]);

  // ✅ CRITICAL FIX: Construct full blob URL for MyFiles
  // MyFiles store files in permanent 'user-files' container with blob_path format: user_id/file_name
  // Backend expects full blob URL: https://storage.blob.core.windows.net/user-files/user_id/file_name
  const BLOB_STORAGE_URL = 'https://rgtaxgenienonprodfa.blob.core.windows.net';
  const USER_FILES_CONTAINER = 'user-files';
  
  const mappedFiles = selectedMyFiles.map((f: any) => {
    // Construct full blob URL from blob_path
    // f.url contains blob_path (e.g., "developer@dev.local/91ddd4f4-7681-41af-9e9b-1705f24eab91.docx")
    const blobPath = f.url || f.blob_path || `${f.azureFileName}`;
    const fullBlobUrl = `${BLOB_STORAGE_URL}/${USER_FILES_CONTAINER}/${blobPath}`;
    
    return {
      url: fullBlobUrl,  // ✅ Full blob URL for backend processing
      azureFileName: f.azureFileName,
      originalFileName: f.originalFileName,
    };
  });

  setUploadedFilesLink((prev: any[]) => [...prev, ...mappedFiles]);

  // -----------------------------
  // 2️⃣ Agent page (ONLY if provided)
  // -----------------------------
  if (setSelectedFiles && setSelectedFilesLink) {
    setSelectedFiles((prev: File[]) => [...prev, ...selectedMyFiles]);
    setSelectedFilesLink((prev: any[]) => [...prev, ...mappedFiles]);  // ✅ Reuse mappedFiles (no duplication)
  }

  // -----------------------------
  // 3️⃣ Agent suggestions event
  // -----------------------------
  selectedMyFiles.forEach((file: any) => {
    const blobPath = file.url || file.blob_path || `${file.azureFileName}`;
    const fullBlobUrl = `${BLOB_STORAGE_URL}/${USER_FILES_CONTAINER}/${blobPath}`;

    window.dispatchEvent(
      new CustomEvent('fileUploadedForSuggestions', {
        detail: {
          fileUrl: fullBlobUrl,  // ✅ Use full blob URL for agent suggestions
          fileType: file.name?.split('.').pop()?.toLowerCase(),
          file,
          token,
        },
      })
    );
  });

  setSelectedMyFiles([]);
};

  // === CORE FILE HANDLERS ===

  const handleFiles = async (newFiles: File[]) => {

    // Check file size limit (15 MB = 15 * 1024 * 1024 bytes)
    const oversized = newFiles.find((file) => file.size > 15 * 1024 * 1024);
    if (oversized) {
        setWarning(`"${oversized.name}" exceeds 15 MB limit.`);
        return;
    }

    // Allowed file extensions
    const allowedExtensionsUpload = [
        "jpg", "jpeg", "png", "svg", // images
        "pdf",                       // documents
        "doc", "docx",               // word
        "xls", "xlsx", "csv",        // excel/spreadsheet
        "ppt", "pptx",               // powerpoint
        "txt", "md",         // text/markup
        // "mp4",'mp3', "wav", "m4a", "ogg"   // audio
    ];
    const allowedExtensions = [
        "jpg", "jpeg", "png", "svg", // images
        "pdf",                       // documents
        "doc", "docx",               // word
        "xls", "xlsx", "csv",        // excel/spreadsheet
        "ppt", "pptx",               // powerpoint
        "txt", "md",         // text/markup
    ];

    const invalidFile = newFiles.find((file) => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if(activeTab==='Upload')
        return !ext || !allowedExtensionsUpload.includes(ext)
        else
        return !ext || !allowedExtensions.includes(ext);
    });

    if (invalidFile) {
        setWarning(`"${invalidFile.name}" is not an allowed file type.`);
        return;
    }

    const combined = [...files, ...newFiles];
    if (combined.length > MAX_FILES) {
      setFiles(combined.slice(0, MAX_FILES));
      setWarning(`Maximum ${MAX_FILES} files allowed`);
      return;
    }

    setFiles(combined);
    setWarning("");

    // Auto-upload on file selection
    await handleUpload(newFiles);
  };


  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    
    // Enforce file limit - only take first MAX_FILES
    if (files.length > MAX_FILES) {
      const limitedFiles = files.slice(0, MAX_FILES);
      setWarning(`Only ${MAX_FILES} file${MAX_FILES > 1 ? 's' : ''} allowed. ${files.length - MAX_FILES} file${files.length - MAX_FILES > 1 ? 's' : ''} ignored.`);
      if (limitedFiles.length > 0) {
        requestConsent(limitedFiles);
      }
    } else if (files.length > 0) {
      setWarning("");
      requestConsent(files);
    }
  };

  const handleBrowse = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    
    // Enforce file limit - only take first MAX_FILES
    if (files.length > MAX_FILES) {
      const limitedFiles = files.slice(0, MAX_FILES);
      setWarning(`Only ${MAX_FILES} file${MAX_FILES > 1 ? 's' : ''} allowed. ${files.length - MAX_FILES} file${files.length - MAX_FILES > 1 ? 's' : ''} ignored.`);
      if (limitedFiles.length > 0) {
        requestConsent(limitedFiles);
      }
    } else if (files.length > 0) {
      setWarning("");
      requestConsent(files);
    }
    
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  // Function to show consent dialog
  const requestConsent = (files: File[]) => {
    setPendingFiles(files);
    setShowConsentDialog(true);
  };

  // edit file logic on consend modal
  const removePendingFile = (index: number) => {
    if (pendingFiles && pendingFiles.length > 1) {
      const updatedFiles = pendingFiles?.filter((_, i) => i !== index);
      setPendingFiles(updatedFiles);
    } else if (pendingFiles && pendingFiles.length === 1) {
      setPendingFiles(null);
      setShowConsentDialog(false);
    }
  }

  // Function to handle consent acceptance
  const handleConsentAccept = () => {
    if (pendingFiles) {
      handleFiles(pendingFiles);
    }
    setShowConsentDialog(false);
    setPendingFiles(null);
  };

  // Function to handle consent rejection
  const handleConsentReject = () => {
    setShowConsentDialog(false);
    setPendingFiles(null);
  };

  const removeFile = (index: number) => {
    console.log(myFiles,index,'121212121')
    const updated = myFiles.filter((_, i) => i !== index);
    setMyFiles(updated);
  };

  const removeUploadedFile = (index: number) => {
    const updatedFiles = uploadedFiles.filter((_, i) => i !== index);
    const updatedLinks = uploadedFilesLink.filter((_, i) => i !== index);
    setUploadedFiles(updatedFiles);
    setUploadedFilesLink(updatedLinks);
  };

  // === UPLOAD LOGIC ===

  const handleUpload = async (selectedFiles: File[]) => {
    try {
      setUploading(true);
      setProgress(0);

      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append("files", file));
      formData.append("useremail", authContext?.user?.email || "");

      const refreshedToken = await authContext?.validateAndRefreshToken(token);
      
      const result = await newUploadDocuments(formData, refreshedToken, (p) => {
        setProgress(p);
      }, activeTab);
      
      // ✅ DEFENSIVE: Validate upload result structure
      if (!result || (typeof result !== 'object')) {
        throw new Error('Invalid upload response from server');
      }
      
      // ✅ CRITICAL FIX: Use file metadata (not just URLs) to preserve original filenames
      // Upload API now returns: { urls: [...], files: [{url, azureFileName, originalFileName}] }
      if (result?.files && Array.isArray(result.files) && result.files.length > 0) {
        // NEW FORMAT: Use full file metadata
        // ✅ DEFENSIVE: Validate each file object has required properties
        const validFiles = result.files.filter((file: any) => 
          file && 
          typeof file === 'object' && 
          file.url && 
          file.azureFileName && 
          file.originalFileName
        );
        
        if (validFiles.length !== result.files.length) {
          console.warn("[FileUploadModal]: ⚠️ Some files missing metadata. Valid:", validFiles.length, "Total:", result.files.length);
        }

        if (validFiles.length > 0) {
          console.log("[FileUploadModal]: ✅ Using file metadata with original names:", validFiles);
          // Not adding for myfiles in inputbar
          if (activeTab !="My Files") {
            setUploadedFilesLink([...uploadedFilesLink, ...validFiles]);
            setUploadedFiles([...uploadedFiles, ...selectedFiles]);
          }
          // ✅ ADD THIS (Agent page)
        if (setSelectedFiles && setSelectedFilesLink) {
          setSelectedFiles((prev: File[]) => [...prev, ...selectedFiles]);
          setSelectedFilesLink((prev: any[]) => [...prev, ...validFiles]);
        }
        } else {
          throw new Error('No valid file metadata in upload response');
        }
      } else if (result?.urls && Array.isArray(result.urls) && result.urls.length > 0) {
        // LEGACY FORMAT: Fallback to URLs only (for backwards compatibility)
        console.warn("[FileUploadModal]: ⚠️ Using legacy URL format (no original filenames)");
        const validUrls = result.urls.filter((url: any) => url && typeof url === 'string' && url.trim() !== '');
        
        if (validUrls.length > 0) {
          setUploadedFilesLink([...uploadedFilesLink, ...validUrls]);
          setUploadedFiles([...uploadedFiles, ...selectedFiles]);
          setUploadedFilesLink([...uploadedFilesLink, ...validUrls]);
setUploadedFiles([...uploadedFiles, ...selectedFiles]);

// ✅ ADD THIS (Agent page)
if (setSelectedFiles && setSelectedFilesLink) {
  setSelectedFiles((prev: File[]) => [...prev, ...selectedFiles]);
  setSelectedFilesLink((prev: any[]) => [...prev, ...validUrls]);
}

        } else {
          throw new Error('No valid URLs in upload response');
        }
      } else {
        // ❌ CRITICAL: No files or URLs in response
        throw new Error('Upload response missing both files and urls arrays');
      }
      
      // Dispatch event for agent suggestions (file upload)
      if (selectedFiles.length > 0 && (result?.urls || result?.files)) {
          const supportedTypesForSuggestion = ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'csv', 'txt', 'pptx', 'ppt', 'jpg', 'jpeg', 'png', 'svg'];
          
        // Iterate through uploaded files and dispatch event for each supported type
        selectedFiles.forEach((file, index) => {
          const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
          
          // ✅ Get file URL from metadata or legacy urls array
          const fileUrl = result.files?.[index]?.url || result.urls?.[index];
          
          if (supportedTypesForSuggestion.includes(fileExtension) && fileUrl) {
            console.log(`[FileUploadModal]: Dispatching fileUploadedForSuggestions event for ${file.name}`);
            
            window.dispatchEvent(new CustomEvent('fileUploadedForSuggestions', {
              detail: {
                fileUrl: fileUrl,
                fileType: fileExtension,
                file: file,
                token: token
              }
            }));
          }
        });
      }

      // Refresh list to get info from Mongo
      fetchMyFiles();

      setFiles([]);
      setUploading(false);
    } catch (error:any) {
      console.error("[FileUploadModal]: ❌ Upload failed:", error);
      
      // ✅ DEFENSIVE: Better error messages for users (including cold start detection)
      let userMessage = "Upload failed. Please try again.";
      
      // ✅ COLD START: Detect timeout errors and provide helpful message
      if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT' || error?.message?.includes('timed out')) {
        userMessage = "Upload is taking longer than expected. The server may be starting up. Please try again in a few seconds.";
      } else if (error?.response?.status === 503 || error?.response?.status === 504) {
        userMessage = "Server is temporarily unavailable. Please try again in a moment.";
      } else if (error?.response?.data?.error) {
        userMessage = error.response.data.error;
      } else if (error?.message) {
        // Use enhanced error messages from uploadService
        if (error.message.includes('Azure Function') || error.message.includes('starting up')) {
          userMessage = error.message;
        } else if (error.message.includes('Invalid upload response')) {
          userMessage = "Server returned invalid response. Please refresh and try again.";
        } else if (error.message.includes('missing both files and urls')) {
          userMessage = "Upload completed but server didn't return file information. Please contact support.";
        } else if (error.message.includes('No valid')) {
          userMessage = "Upload completed but file data was corrupted. Please try uploading again.";
        } else {
          userMessage = `Upload error: ${error.message}`;
        }
      } else if (error?.code === 'ERR_NETWORK') {
        userMessage = "Network error. Please check your connection and try again.";
      }
      
      setWarning(userMessage);
      setFiles([]);
      setPendingFiles(null);
      setUploading(false);
      setProgress(0);
      
      // ✅ DEFENSIVE: Don't leave UI in broken state - reset everything
      console.log("[FileUploadModal]: Reset upload state after error");
    }
  };

  // === MODAL CLOSE ===
  const handleClose = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFiles([]);
    setWarning("");
    setProgress(0);
    setUploading(false);
    onClose();
  };

  

  // === MODAL CONTENT ===
  const modalContent = (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[100000] bg-black/60 dark:bg-black/80" onClick={handleClose}></div>

      {/* Modal */}
      <div
        className="fixed inset-0 z-[100000] flex items-start justify-center px-4 pt-16"
        onClick={(e) => e.stopPropagation()}
      >
<div className="bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-white rounded-2xl shadow-lg w-full max-w-lg p-6 relative animate-in fade-in duration-200 mt-1 max-h-[85vh] overflow-y-auto">
          {/* Close Button */}
          <button onClick={handleClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition">
            {AiOutlineClose({ size: 20 }) as JSX.Element}
          </button>

          {/* Header */}
<h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
            File Upload
          </h2>

          {/* Mode Indicator for Proactive AI */}
          {chatMode === ChatMode.PROACTIVE_AI && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    Proactive AI Mode
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    You can only upload {MAX_FILES} file in this mode
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-4">
            <button
              className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
                activeTab === "My Files"
                  ? "border-black dark:border-white text-black dark:text-white"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
              onClick={() => {
                setActiveTab("My Files")
                fetchMyFiles();
                setWarning("")
              }}
            >
              My Files 
              {/* ({myFiles.length}) */}
            </button>
            <button
              className={`px-4 py-2 ml-2 font-medium text-sm border-b-2 transition ${
                activeTab === "Upload"
                  ? "border-black dark:border-white text-black dark:text-white"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              onClick={() => {setActiveTab("Upload");setWarning("")}}
            >
              Upload
              {/* ({uploadedFiles.length}) */}
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === "Upload" ? (
                <div>
              {/* Upload Dropzone */}
              <div
className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-[#2e2e2e] text-center p-4 relative"                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
<p className="text-gray-600 text-sm mb-2 text-center px-2">
  Drag and drop {MAX_FILES === 1 ? "file" : `files here (max ${MAX_FILES})`}
</p>

<p className="text-gray-600 text-sm mb-2 text-center px-2">
  Each upload should not exceed{" "}
  <span className="font-medium dark:text-gray-600 text-gray-800">15 MB</span>
</p>

<p className="text-gray-500 text-sm mb-4 text-center px-2">or</p>

<input
  type="file"
  {...(MAX_FILES > 1 ? { multiple: true } : {})}
  id={fileInputId}              // ✅ changed
  className="hidden"
  onChange={handleBrowse}
  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.svg,.md"
/>


{/* BUTTON ROW — perfectly aligned side-by-side */}
<div className="w-full max-w-[420px] mx-auto flex gap-3 justify-center">

  <label
  htmlFor={fileInputId}        // ✅ changed
  className="px-4 py-2 rounded-lg text-sm font-medium
            bg-black dark:bg-white text-white dark:text-black
            hover:bg-gray-800 dark:hover:bg-gray-200
            transition cursor-pointer text-center"
>

    Browse {MAX_FILES === 1 ? "File" : "Files"}
  </label>

  {/* <button
    type="button"
    onClick={() => document.getElementById("fileInput")?.click()}
      className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-black text-white hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200  dark:text-black whitespace-nowrap"
  >
    Upload Image
  </button> */}

</div>
              </div>
                        {/* Warnings */}
                {warning && (
                    <p className="text-red-500 text-sm mt-2">{warning}</p>
                )}

                {uploadedFiles.length == 0 && uploading && (
                    <div className="mt-2 max-h-96 overflow-y-auto" style={{display:"block"}}>
                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-3 px-3 py-2 mb-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            <div className="col-span-1">Type</div>
                            <div className="col-span-5">Name</div>
                            <div className="col-span-3">Size</div>
                            <div className="col-span-3">Expires In</div>
                        </div>
                        
                        {/* File List */}
                        <ul className="space-y-1">
                            {files.map((file, index) => (
                                <li
                                key={index}
                                className="relative grid grid-cols-12 gap-3 items-center px-3 py-3 border border-gray-200 rounded-lg transition group overflow-hidden"
                                >
                                {/* Progress Bar Background */}
                                <div
                                    className="absolute inset-0 bg-blue-100 transition-all duration-300 ease-out"
                                    style={{ 
                                    width: `${progress}%`,
                                    zIndex: 0
                                    }}
                                />
                                
                                {/* Content Layer */}
                                <div className="col-span-1 flex items-center justify-center relative z-10">
                                    {getFileIcon(file.name)}
                                </div>
                                
                                <div className="col-span-5 min-w-0 relative z-10">
                                    <p className="text-sm font-medium text-gray-800 truncate" title={file.name}>
                                    {file.name}
                                    </p>
                                </div>
                                
                                <div className="col-span-3 relative z-10">
                                    <p className="text-sm text-gray-600">
                                    {formatFileSize(file.size)}
                                    </p>
                                </div>
                                
                                <div className="col-span-3 flex items-center justify-between relative z-10">
                                    <p className="text-xs text-gray-500 mt-0.5">
                                    {progress < 100 ? `Uploading: ${progress}%` : 'Complete'}
                                    </p>
                                </div>
                                </li>
                            ))
                            }
                        </ul>
                  </div>
                )}

                {/* Uploaded File list section */}
                {uploadedFiles.length > 0 ? (
                <div className="mt-2 max-h-[200px] overflow-y-auto small-scrollbar" style={{display:"block"}}>
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-3 px-3 py-2 mb-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    <div className="col-span-1">Type</div>
                    <div className="col-span-5">Name</div>
                    <div className="col-span-3">Size</div>
                    <div className="col-span-3">Expires In</div>
                  </div>
                  
                  {/* File List */}
                  <ul className="space-y-1">
                    {uploadedFiles.map((file, index) => {
                        return (
                      <li
                        key={index}
                        className={`grid grid-cols-12 gap-3 items-center px-3 py-3 border rounded-lg transition group cursor-pointer 
                              border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#2e2e2e]`}
                      >
                        {/* Type (Icon) */}
                        <div className="col-span-1 flex items-center justify-center">
                          {getFileIcon(file.name)}
                        </div>
                        
                        {/* Name */}
                        <div className="col-span-5 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-600 truncate" title={file.name}>
                            {file.name}
                          </p>
                        </div>
                        
                        {/* Size */}
                        <div className="col-span-3">
                          <p className="text-sm text-gray-600">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                        
                        {/* Expired In */}
                        <div className="col-span-3 flex items-center justify-between">
                          <p className="text-sm text-gray-600">
                            30 days
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeUploadedFile(index)
                            }}
                            className="text-gray-400 hover:text-red-500 transition ml-2"
                          >
                            {AiOutlineClose({size:16}) as JSX.Element}
                          </button>
                        </div>
                      </li>
                    )})}

                    {/* Upload Progress */}
                    {uploading && 
                    files.map((file, index) => (
                        <li
                        key={index}
                        className="relative grid grid-cols-12 gap-3 items-center px-3 py-3 border border-gray-200 rounded-lg transition group overflow-hidden"
                        >
                        {/* Progress Bar Background */}
                        <div
                            className="absolute inset-0 bg-blue-100 transition-all duration-300 ease-out"
                            style={{ 
                            width: `${progress}%`,
                            zIndex: 0
                            }}
                        />
                        
                        {/* Content Layer */}
                        <div className="col-span-1 flex items-center justify-center relative z-10">
                            {getFileIcon(file.name)}
                        </div>
                        
                        <div className="col-span-5 min-w-0 relative z-10">
                            <p className="text-sm font-medium text-gray-800 truncate" title={file.name}>
                            {file.name}
                            </p>
                        </div>
                        
                        <div className="col-span-3 relative z-10">
                            <p className="text-sm text-gray-600">
                            {formatFileSize(file.size)}
                            </p>
                        </div>
                        
                        <div className="col-span-3 flex items-center justify-between relative z-10">
                            <p className="text-xs text-gray-500 mt-0.5">
                                {progress < 100 ? `Uploading: ${progress}%` : 'Complete'}
                            </p>
                        </div>
                        </li>
                    ))
                    }
                  </ul>
                </div>
              ) : (
                <div className="h-28 flex items-center justify-center text-gray-500 text-sm">
                  No files uploaded yet.
                </div>
              )}

            </div>
          ) : (
<div>
  {myFiles.length > 0 ? (
    <>
      <div className="max-h-[290px] overflow-y-auto">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-3 px-4 py-2 bg-gray-50 rounded-lg mb-2 text-xs font-semibold text-gray-600 uppercase tracking-wide border border-gray-200">
          <div className="col-span-1">
            <input
              type="checkbox"
              checked={selectedMyFiles.length === myFiles.length && myFiles.length > 0}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedMyFiles(myFiles.map((file, _idx) => file));
                } else {
                  setSelectedMyFiles([]);
                }
              }}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          <div className="col-span-4">Name</div>
          <div className="col-span-3">Size</div>
          <div className="col-span-1">Expiry</div>
          {/* <div className="col-span-1">Tokens</div> */}
        </div>
        
        {/* File List */}
        <ul className="space-y-1">
          {myFiles.map((file: any, index) => (
            <li
              key={index}
              className="grid grid-cols-12 gap-3 items-center px-3 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition group"
            >
              {/* Checkbox */}
              <div className="col-span-1 flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={selectedMyFiles.includes(file)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedMyFiles([...selectedMyFiles, file]);
                    } else {
                      setSelectedMyFiles(selectedMyFiles.filter(i => i !== file));
                    }
                  }}
                  className="w-4 h-4 rounded border-gray-300 bg-transparent focus:ring-0 focus:ring-offset-0 checked:bg-green-700"
                />
              </div>
              
              {/* Type (Icon) - moved to name column */}
              <div className="col-span-4 min-w-0 flex items-center gap-2 cursor-pointer" onClick={()=> downloadFile(file.azureFileName, file.name)}>
                <span className="flex-shrink-0">{getFileIcon(file.name)}</span>
                <p className="text-sm font-medium text-gray-800 truncate" title={file.name}>
                  {file.name}
                </p>
              </div>
              
              {/* Size */}
              <div className="col-span-3">
                <p className="text-sm text-gray-600">
                  {formatFileSize(file.size)}
                </p>
              </div>
              
              {/* Expired In */}
              <div className="col-span-3">
                <p className="text-sm text-gray-600">
                  {file.expiresIn ?? "N/A"} days
                </p>
              </div>
              
              {/* Delete Button */}
              <div className="col-span-1 flex justify-end">
                {deletingMyFileIndex === index ? (
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin" />
                ) : (
                  <button
                    onClick={() => handleDeleteMyFile(index)}
                    className="text-gray-400 hover:text-red-500 transition"
                  >
                    <IconTrash size={22} stroke={1.5} />
                  </button>
                )}
              </div>
            </li>
          ))}

          {/* Uploading files */}
          {uploading &&
            files.map((file, index) => (
              <li
                key={`upload-${index}`}
                className="relative grid grid-cols-12 gap-3 items-center px-3 py-3
                          border border-gray-200 rounded-lg bg-white overflow-hidden"
              >
                {/* Progress background */}
                <div
                  className="absolute inset-y-0 left-0 bg-blue-100 transition-all"
                  style={{ width: `${progress}%` }}
                />

                {/* Checkbox placeholder */}
                <div className="col-span-1 flex justify-center z-10">
                  <div className="w-4 h-4 rounded border border-gray-300 bg-gray-100" />
                </div>

                {/* Name */}
                <div className="col-span-4 flex items-center gap-2 z-10">
                  {getFileIcon(file.name)}
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {file.name}
                  </p>
                </div>

                {/* Size */}
                <div className="col-span-3 z-10">
                  <p className="text-sm text-gray-600">
                    {formatFileSize(file.size)}
                  </p>
                </div>

                {/* Uploading status */}
                <div className="col-span-3 z-10 flex items-center gap-2 text-sm text-blue-600">
                  <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                  Uploading {progress}%
                </div>

                {/* Action placeholder */}
                <div className="col-span-1 z-10" />
              </li>

            ))}
        </ul>

      </div>
       {warning && (
                    <p className="text-red-500 text-sm mt-2">{warning}</p>
                )}
      {/* Use In Chat Button */}
      <div className="mt-4 flex gap-3">
        {/* Upload Button */}
       <input
          type="file"
          {...(MAX_FILES > 1 ? { multiple: true } : {})}
          id={fileInputId}              // ✅ changed
          className="hidden"
          onChange={handleBrowse}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.svg,.md"
        />
        <label
          htmlFor={fileInputId}        // ✅ changed
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium
                    bg-black dark:bg-white text-white dark:text-black
                    hover:bg-gray-800 dark:hover:bg-gray-200
                    transition cursor-pointer text-center"
        >
          Upload New File
        </label>

        {/* Use in Chat Button */}
        <button
          onClick={() => {
            useFileFromMyFile()
            handleClose()
          }}
          disabled={selectedMyFiles.length === 0}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium
                    disabled:opacity-50 disabled:cursor-not-allowed
                    bg-black dark:bg-[#2e2e2e] text-white transition
                    dark:text-white hover:bg-gray-800 dark:hover:bg-[#2e2e2e]"
        >
          Use In Chat ({selectedMyFiles.length})
        </button>
      </div>
    </>
  ) : (
    <div className="max-h-[290px] overflow-y-auto flex flex-col items-center justify-center gap-3 text-gray-500 text-sm">

      {uploading ? (
          <div className="mt-2 max-h-96 overflow-y-auto" style={{display:"block"}}>

            {/* File List */}
            <ul className="space-y-1">
              {/* Uploading files */}
              {uploading && files.map((file, index) => (
                <li
                  key={`upload-${index}`}
                  className="relative grid grid-cols-12 gap-3 items-center px-3 py-3
                            border border-gray-200 rounded-lg bg-white overflow-hidden"
                >
                  {/* Progress background */}
                  <div
                    className="absolute inset-y-0 left-0 bg-blue-100 transition-all"
                    style={{ width: `${progress}%` }}
                  />

                  {/* Checkbox placeholder */}
                  <div className="col-span-1 flex justify-center z-10">
                    <div className="w-4 h-4 rounded border border-gray-300 bg-gray-100" />
                  </div>

                  {/* Name */}
                  <div className="col-span-4 flex items-center gap-2 z-10">
                    {getFileIcon(file.name)}
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {file.name}
                    </p>
                  </div>

                  {/* Size */}
                  <div className="col-span-3 z-10">
                    <p className="text-sm text-gray-600">
                      {formatFileSize(file.size)}
                    </p>
                  </div>

                  {/* Uploading status */}
                  <div className="col-span-3 z-10 flex items-center gap-2 text-sm text-blue-600">
                    <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                    Uploading {progress}%
                  </div>

                  {/* Action placeholder */}
                  <div className="col-span-1 z-10" />
                </li>
              ))}
            </ul>
          </div>
      ) : (
        <span>No files uploaded yet.</span>
      )}

      <input
        type="file"
        {...(MAX_FILES > 1 ? { multiple: true } : {})}
        id={fileInputId}
        className="hidden"
        onChange={handleBrowse}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.svg,.md"
      />
      <label
        htmlFor={fileInputId}
        className="flex-1 px-4 py-2 max-h-[45px] rounded-lg text-sm font-medium
            bg-black dark:bg-white text-white dark:text-black
            hover:bg-gray-800 dark:hover:bg-gray-200
            transition cursor-pointer text-center"
      >
       Upload Files
      </label>
    </div>
  )}
</div>
      )}
        </div>
        {/* Consent Dialog */}
        {showConsentDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-[#1e1e1e] rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
              <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-2">Security and confidentiality</h3>
              
              {/* File list preview */}
              <div className="mb-4 max-h-64 overflow-y-auto">
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pendingFiles?.map((file, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-200 dark:bg-[#262D30]"
                    >
                      {/* Icon */}
                      <div className="w-9 h-9 flex items-center justify-center bg-gray-200 dark:bg-[#262D30] rounded-lg text-gray-600  flex-shrink-0">
                        {getFileIcon(file.name)}
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-medium text-gray-800 truncate dark:text-gray-500"
                          title={file.name}
                        >
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                      <div className="flex items-center">
                        <button
                          onClick={() => removePendingFile(idx)}
                          className="text-gray-400 hover:text-red-500 transition ml-2"
                        >
                          {AiOutlineClose({size:16}) as JSX.Element}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
               I confirm that I have read and understood the Rules of the Road document and agree to comply with all guidelines.
              </p>

              <div className="flex gap-4">
                <button
                  onClick={handleConsentReject}
                  className="px-4 py-2 flex-auto rounded-lg text-sm font-medium bg-gray-200 dark:bg-[#2e2e2e] text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-[#2e2e2e] transition">
                  Cancel
                </button>
               <button
                  onClick={handleConsentAccept}
                  className="px-4 py-2 flex-auto rounded-lg text-sm font-medium bg-black dark:bg-[#2e2e2e] text-white dark:text-white hover:bg-gray-800 dark:hover:bg-[#2e2e2e] transition">
                  Accept & Upload
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );

 return typeof window !== "undefined"
  ? createPortal(show ? modalContent : null, document.body) // ✅ FIX
  : null;
};

export default FileUploadModal;