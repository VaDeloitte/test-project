"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { AiOutlineClose } from "react-icons/ai";

interface FileUploadModalProps {
  show: boolean;
  onClose: () => void;
  files: File[];
  setFiles: (files: File[]) => void;

}

const FileUploadModal: React.FC<FileUploadModalProps> = ({ show, onClose, files, setFiles }) => {
  const [activeTab, setActiveTab] = useState("Upload");
  const [warning, setWarning] = useState("");
  const [exceeded, setExceeded] = useState(false); // Track max files exceeded

  const MAX_FILES = 10;

  const handleFiles = (newFiles: File[]) => {
    const combinedFiles = [...files, ...newFiles];

    if (combinedFiles.length > MAX_FILES) {
      setFiles(combinedFiles.slice(0, MAX_FILES)); // Keep only MAX_FILES
      setWarning(`Maximum ${MAX_FILES} files allowed`);
      setExceeded(true);
    } else {
      setFiles(combinedFiles);
      setWarning("");
      setExceeded(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleBrowse = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);

    if (newFiles.length <= MAX_FILES) {
      setWarning("");
      setExceeded(false);
    }
  };

  const handleClose = () => {
    // setFiles([]);
    setWarning("");
    setExceeded(false);
    onClose();
  };

  const handleSubmit = () => {
    setFiles([]);
    setWarning("");
    setExceeded(false);
    onClose();
  };

  if (!show) return null;

  const modalContent = (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[9998] bg-black/60"></div>

      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-start justify-center px-4 pt-20">
        <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-lg w-full max-w-lg p-6 relative animate-in fade-in duration-200 mt-1 max-h-[80vh] overflow-y-auto text-gray-900 dark:text-gray-100">
          
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition"
          >
            {AiOutlineClose({ size: 20 }) as JSX.Element}
          </button>

          {/* Header */}
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            File Upload
          </h2>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
            <button
              className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
                activeTab === "My Files"
                  ? "border-black text-black dark:border-white dark:text-white"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
              onClick={() => setActiveTab("My Files")}
            >
              My Files
            </button>
            <button
              className={`px-4 py-2 ml-2 font-medium text-sm border-b-2 transition ${
                activeTab === "Upload"
                  ? "border-black text-black dark:border-white dark:text-white"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
              onClick={() => setActiveTab("Upload")}
            >
              Upload
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === "Upload" ? (
            <div>
              {/* Upload Area */}
              <div
                className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-[#2e2e2e] transition relative overflow-hidden text-center p-4"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">
                  Drag and drop files here (up to {MAX_FILES} files max)
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                  or
                </p>

                <input
                  type="file"
                  multiple
                  id="fileInput"
                  className="hidden"
                  onChange={handleBrowse}
                />
                <label
                  htmlFor="fileInput"
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-black text-white dark:bg-[#2e2e2e] dark:hover:bg-[#3a3a3a] hover:bg-gray-800 transition cursor-pointer"
                >
                  Browse Files
                </label>
              </div>

              {/* Warning Message */}
              {warning && (
                <p className="text-red-500 text-sm mt-2">{warning}</p>
              )}

              {/* File List */}
              {files?.length > 0 && (
                <div className="mt-4 max-h-48 overflow-y-auto w-full border rounded-md border-gray-200 dark:border-gray-700 p-2">
                  <ul className="text-sm text-gray-700 dark:text-gray-200">
                    {files.map((file, index) => (
                      <li
                        key={index}
                        className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 py-1 last:border-b-0"
                      >
                        <span>{file.name}</span>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700 text-xs font-medium"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Info Section */}
              <div className="mt-5">
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">
                  Files should meet the following criteria to upload successfully:
                </p>
                <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 text-sm space-y-1">
                  <li>
                    Each upload should not exceed{" "}
                    <span className="font-medium text-gray-800 dark:text-white">
                      15 MB
                    </span>
                  </li>
                  <li>
                    You can upload a maximum of <span className="font-medium text-gray-800 dark:text-white">{MAX_FILES} files</span> at once.
                  </li>
                  <li>
                    Ensure your file is fully downloaded and closed before
                    uploading.
                  </li>
                  <li>
                    Image files larger than <span className="font-medium text-gray-800 dark:text-white">3056 px</span> will be resized.
                  </li>
                </ul>
              </div>

              {/* Buttons */}
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={handleSubmit}
                  disabled={files?.length === 0 || exceeded}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    files?.length === 0 || exceeded
                      ? "bg-gray-100 text-gray-400 dark:bg-[#2e2e2e] dark:text-gray-500 cursor-not-allowed"
                      : "bg-black text-white dark:bg-[#2e2e2e] dark:hover:bg-[#3a3a3a] hover:bg-gray-800"
                  }`}
                >
                  Submit
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 dark:bg-[#2e2e2e] dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-[#3a3a3a] transition"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-gray-500 dark:text-gray-300 text-sm">
              No files to display.
            </div>
          )}
        </div>
      </div>
    </>
  );

  return typeof window !== "undefined"
    ? createPortal(modalContent, document.body)
    : null;
};

export default FileUploadModal;
