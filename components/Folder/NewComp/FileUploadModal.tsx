import React, { useState, useContext } from 'react';
import { createPortal } from 'react-dom';
import { AiOutlineClose } from 'react-icons/ai';
import {
  BsFiletypeDocx,
  BsFiletypePptx,
  BsFiletypePdf,
  BsFiletypeTxt,
  BsFiletypeXlsx,
  BsFiletypePng,
  BsFiletypeJpg,
} from 'react-icons/bs';
import { FiFile } from 'react-icons/fi';

import { newUploadDocuments } from '@/services/uploadService';

import { AuthContext } from '@/utils/app/azureAD';


const fakeUploadDocuments = async (
  formData: FormData,
  token: string | null | undefined,
  onProgress: (p: number) => void,
) => {
  // Simulate upload
  for (let i = 0; i <= 100; i += 10) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    onProgress(i);
  }
  return {
    urls: ['https://example.com/file1.pdf', 'https://example.com/file2.pdf'],
  };
};

interface FileUploadModalProps {
  show: boolean;
  onClose: () => void;
  uploadedFiles: File[];
  setUploadedFiles: (files: File[]) => void;
  uploadedFilesLink: string[];
  setUploadedFilesLink: (filesLink: string[]) => void;
  selectedFiles: File[];
  setSelectedFiles: (files: File[]) => void;
  selectedFilesLink: string[];
  setSelectedFilesLink: (filesLink: string[]) => void;
  token: string;
}

const FileUploadModal: React.FC<FileUploadModalProps> = ({
  show,
  onClose,
  uploadedFiles,
  setUploadedFiles,
  uploadedFilesLink,
  setUploadedFilesLink,
  selectedFiles,
  setSelectedFiles,
  selectedFilesLink,
  setSelectedFilesLink,
  token,
}) => {
  const authContext = useContext(AuthContext);
  const [myFiles, setMyFiles] = useState<File[]>([]);
  const [isChecked, setIsChecked] = useState<boolean>(false);
  const [files, setFiles] = useState<File[]>([]);
  const [activeTab, setActiveTab] = useState('Upload');
  const [warning, setWarning] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const MAX_FILES = 10;

  React.useEffect(() => {
    // Add event listener for ESC key to close the modal
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    if (show) {
      document.addEventListener('keydown', handleEscKey);
    }

    // Cleanup the event listener when the modal is closed
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [show]);

  if (!show) return null;

  // === CONSENT PART ===
  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsChecked(event.target.checked);
  };

  // === UTILITY FUNCTIONS ===

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string): JSX.Element => {
    const extension = fileName.split('.').pop()?.toLowerCase();

    const iconMap: { [key: string]: JSX.Element } = {
      docx: BsFiletypeDocx({
        className: 'text-blue-600',
        size: 24,
      }) as JSX.Element,
      doc: BsFiletypeDocx({
        className: 'text-blue-600',
        size: 24,
      }) as JSX.Element,
      pptx: BsFiletypePptx({
        className: 'text-orange-600',
        size: 24,
      }) as JSX.Element,
      ppt: BsFiletypePptx({
        className: 'text-orange-600',
        size: 24,
      }) as JSX.Element,
      pdf: BsFiletypePdf({
        className: 'text-red-600',
        size: 24,
      }) as JSX.Element,
      txt: BsFiletypeTxt({
        className: 'text-gray-600',
        size: 24,
      }) as JSX.Element,
      xlsx: BsFiletypeXlsx({
        className: 'text-green-600',
        size: 24,
      }) as JSX.Element,
      xls: BsFiletypeXlsx({
        className: 'text-green-600',
        size: 24,
      }) as JSX.Element,
      png: BsFiletypePng({
        className: 'text-purple-600',
        size: 24,
      }) as JSX.Element,
      jpg: BsFiletypeJpg({
        className: 'text-blue-500',
        size: 24,
      }) as JSX.Element,
      jpeg: BsFiletypeJpg({
        className: 'text-blue-500',
        size: 24,
      }) as JSX.Element,
    };

    return (
      iconMap[extension || ''] ||
      (FiFile({ className: 'text-gray-500', size: 24 }) as JSX.Element)
    );
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
    const allowedExtensions = [
      'jpg',
      'jpeg',
      'png',
      'svg', // images
      'pdf', // documents
      'doc',
      'docx', // word
      'xls',
      'xlsx', // excel
      'ppt',
      'pptx', // powerpoint
      'txt',
      'html',
      'md', // text/markup
      'mp3',
      'wav',
      'm4a',
      'ogg', // audio
    ];

    const invalidFile = newFiles.find((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
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
    setWarning('');

    // Auto-upload on file selection
    await handleUpload(newFiles);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      requestConsent(files);
    }
  };

  const handleBrowse = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
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

  // Function to handle consent acceptance
  const handleConsentAccept = () => {
    if (pendingFiles) {
      // Your existing upload logic here
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

  const handleSelectedFilesLink = (index: number) => {
    const addedFileLink = uploadedFilesLink.filter((_, i) => i == index);
    setSelectedFilesLink(addedFileLink);
  };
  const removeSelectedFilesLink = (index: number) => {
    const addedFileLink = uploadedFilesLink.filter((_, i) => i !== index);
    setSelectedFilesLink(addedFileLink);
  };

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
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
      selectedFiles.forEach((file) => formData.append('files', file));
      formData.append('useremail', authContext?.user?.email || '');

      const refreshedToken = await authContext?.validateAndRefreshToken(token);

      // Using axios-based uploadDocuments with progress callback
      //   const result = await newUploadDocuments(formData, refreshedToken, (p) => {
      //     setProgress(p);
      //   });

      const result = await newUploadDocuments(formData, refreshedToken, (p) => {
        setProgress(p);
      });

      console.log('file upload result \n', result);
      if (result?.urls) {
        setUploadedFilesLink([...uploadedFilesLink, ...result.urls]);
        // FIX: Use selectedFiles instead of files (which includes previously selected files)
        setSelectedFiles([...uploadedFiles, ...selectedFiles]);
        setUploadedFiles([...uploadedFiles, ...selectedFiles]);
      }

      setUploading(false);
      // Clear the local files list after successful upload
      setFiles([]);
    } catch (error: any) {
      console.error('Upload failed:', error);
      setFiles([]);
      setPendingFiles(null);
      setWarning(error?.response?.data?.error);
      setUploading(false);
    }
  };

  // === MODAL CLOSE ===
  const handleClose = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFiles([]);
    setWarning('');
    setProgress(0);
    setUploading(false);
    onClose();
  };

  // === MODAL CONTENT ===
  const modalContent = (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[9998] bg-black/60 dark:bg-black/80"
        onClick={handleClose}
      ></div>

      {/* Modal */}
      <div
        className="fixed inset-0 z-[9999] flex items-start justify-center px-4 pt-16"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-white rounded-2xl shadow-lg w-full max-w-lg p-6 relative animate-in fade-in duration-200 mt-1 max-h-[85vh] overflow-y-auto">
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition"
          >
            {AiOutlineClose({ size: 20 }) as JSX.Element}
          </button>

          {/* Header */}
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
            File Upload
          </h2>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-4">
            <button
              className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
                activeTab === 'My Files'
                  ? 'border-black dark:border-white text-black dark:text-white'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
              onClick={() => setActiveTab('My Files')}
            >
              My Files ({myFiles.length})
            </button>
            <button
              className={`px-4 py-2 ml-2 font-medium text-sm border-b-2 transition ${
                activeTab === 'Upload'
                  ? 'border-black dark:border-white text-black dark:text-white'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
              onClick={() => setActiveTab('Upload')}
            >
              Upload ({uploadedFiles.length})
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'Upload' ? (
            <div>
              {/* Upload Dropzone */}
              <div
                className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-[#2e2e2e] text-center p-4 relative"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <p className="text-gray-600 text-sm mb-2 text-center px-2">
                  Drag and drop files here (max {MAX_FILES})
                </p>

                <p className="text-gray-600 text-sm mb-2 text-center px-2">
                  Each upload should not exceed
                  <span className="font-medium dark:text-gray-600 text-gray-800">
                    {' '}
                    15 MB
                  </span>
                </p>

                <p className="text-gray-500 text-sm mb-4 text-center px-2">
                  or
                </p>

                <input
                  type="file"
                  multiple
                  id="fileInput"
                  className="hidden"
                  onChange={handleBrowse}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.svg,.html,.md,.mp3,.wav,.m4a,.ogg"
                />

                {/* BUTTONS — side by side, equal width */}
                <div className="w-full max-w-[420px] mx-auto flex gap-3 justify-center">
                  <label
                    htmlFor="fileInput"
                    className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition cursor-pointer text-center"
                  >
                    Browse Files
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      document.getElementById('fileInput')?.click()
                    }
                    className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-black text-white hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200  dark:text-black whitespace-nowrap"
                  >
                    Upload Image
                  </button>
                </div>
              </div>

              {/* Warnings */}
              {warning && (
                <p className="text-red-500 text-sm mt-2">{warning}</p>
              )}

              {uploadedFiles.length == 0 && uploading && (
                <div
                  className="mt-2 max-h-96 overflow-y-auto"
                  style={{ display: 'block' }}
                >
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
                            zIndex: 0,
                          }}
                        />

                        {/* Content Layer */}
                        <div className="col-span-1 flex items-center justify-center relative z-10">
                          {getFileIcon(file.name)}
                        </div>

                        <div className="col-span-5 min-w-0 relative z-10">
                          <p
                            className="text-sm font-medium text-gray-800 truncate"
                            title={file.name}
                          >
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
                            {progress < 100
                              ? `Uploading: ${progress}%`
                              : 'Complete'}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Uploaded File list section */}
              {uploadedFiles.length > 0 ? (
                <div
                  className="mt-2 max-h-[200px] overflow-y-auto small-scrollbar"
                  style={{ display: 'block' }}
                >
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
                      const isSelected = selectedFiles.includes(file);
                      return (
                        <li
                          key={index}
                          onClick={() => {
                            if (isSelected) {
                              // Remove from selection
                              setSelectedFiles(
                                selectedFiles.filter((f) => f !== file),
                              );
                              removeSelectedFilesLink(index);
                            } else {
                              // Add to selection
                              setSelectedFiles([...selectedFiles, file]);
                              handleSelectedFilesLink(index);
                            }
                          }}
                          className={`grid grid-cols-12 gap-3 items-center px-3 py-3 border rounded-lg transition group cursor-pointer ${
                            isSelected
                              ? 'bg-gray-100 dark:bg-gray-700 border-gray-700 dark:border-gray-400 border-l-4'
                              : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#2e2e2e]'
                          }`}
                        >
                          {/* Type (Icon) */}
                          <div className="col-span-1 flex items-center justify-center">
                            {getFileIcon(file.name)}
                          </div>

                          {/* Name */}
                          <div className="col-span-5 min-w-0">
                            <p
                              className="text-sm font-medium text-gray-800 dark:text-gray-600 truncate"
                              title={file.name}
                            >
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
                            <p className="text-sm text-gray-600">30 days</p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeUploadedFile(index);
                              }}
                              className="text-gray-400 hover:text-red-500 transition ml-2"
                            >
                              {AiOutlineClose({ size: 16 }) as JSX.Element}
                            </button>
                          </div>
                        </li>
                      );
                    })}

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
                              zIndex: 0,
                            }}
                          />

                          {/* Content Layer */}
                          <div className="col-span-1 flex items-center justify-center relative z-10">
                            {getFileIcon(file.name)}
                          </div>

                          <div className="col-span-5 min-w-0 relative z-10">
                            <p
                              className="text-sm font-medium text-gray-800 truncate"
                              title={file.name}
                            >
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
                              {progress < 100
                                ? `Uploading: ${progress}%`
                                : 'Complete'}
                            </p>
                          </div>
                        </li>
                      ))}
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
                <div className="max-h-96 overflow-y-auto">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-3 px-3 py-2 bg-gray-50 rounded-lg mb-2 text-xs font-semibold text-gray-600 uppercase tracking-wide border border-gray-200">
                    <div className="col-span-1">Type</div>
                    <div className="col-span-5">Name</div>
                    <div className="col-span-3">Size</div>
                    <div className="col-span-3">Expires In</div>
                  </div>

                  {/* File List */}
                  <ul className="space-y-1">
                    {myFiles.map((file, index) => (
                      <li
                        key={index}
                        className="grid grid-cols-12 gap-3 items-center px-3 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition group"
                      >
                        {/* Type (Icon) */}
                        <div className="col-span-1 flex items-center justify-center">
                          {getFileIcon(file.name)}
                        </div>

                        {/* Name */}
                        <div className="col-span-5 min-w-0">
                          <p
                            className="text-sm font-medium text-gray-800 truncate"
                            title={file.name}
                          >
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
                          <p className="text-sm text-gray-600">7 days</p>
                          <button
                            onClick={() => removeUploadedFile(index)}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition ml-2"
                          >
                            {AiOutlineClose({ size: 16 }) as JSX.Element}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-gray-500 text-sm">
                  No files uploaded yet.
                </div>
              )}
            </div>
          )}
        </div>
        {/* Consent Dialog */}
        {showConsentDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-[#1e1e1e] rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
              <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {' '}
                Security and confidentiality
              </h3>

              {/* File list preview */}
              <div className="mb-4 max-h-64 overflow-y-auto">
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pendingFiles?.map((file, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-200 dark:bg-[#262D30]"
                    >
                      {/* Icon */}
                      <div className="w-9 h-9 flex items-center justify-center bg-gray-200 dark:bg-[#262D30] rounded-lg   flex-shrink-0">
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
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                I confirm that I have read and understood the Rules of the Road
                document and agree to comply with all guidelines.
              </p>

              <div className="flex gap-4">
                <button
                  onClick={handleConsentReject}
                  className="px-4 py-2 flex-auto rounded-lg text-sm font-medium bg-gray-200 dark:bg-[#2e2e2e] text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-[#2e2e2e] transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConsentAccept}
                  className="px-4 py-2 flex-auto rounded-lg text-sm font-medium bg-black dark:bg-[#2e2e2e] text-white dark:text-white hover:bg-gray-800 dark:hover:bg-[#2e2e2e] transition"
                >
                  Accept & Upload
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );

  return typeof window !== 'undefined'
    ? createPortal(modalContent, document.body)
    : null;
};

export default FileUploadModal;
