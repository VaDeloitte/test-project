"use client";

import { useState, useContext, useEffect } from "react";
import { AiOutlineClose } from "react-icons/ai";
import { MdAudioFile } from "react-icons/md";
import { AuthContext } from "@/utils/app/azureAD";
import { getCSRFToken } from '@/utils/app/csrf';

export default function AudioUploadModal({ 
  isOpen, 
  onClose, 
  isProactiveAIMode = false, 
  onAudioUploaded 
}) {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [isChecked, setIsChecked] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const authContext = useContext(AuthContext);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    console.log(selectedFile.type,'selectedFile.type')
    // Validate audio type (mp3, wav, m4a, ogg)
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/ogg','video/mp4'];
    if (!allowedTypes.includes(selectedFile.type)) {
      alert("Only .mp3, .wav, .m4a, and .ogg files are allowed!");
      e.target.value = "";
      return;
    }

    // Check file size (25 MB max)
    const maxSizeMB = 25;
    if (selectedFile.size / 1024 / 1024 > maxSizeMB) {
      alert(`File size exceeds ${maxSizeMB} MB`);
      e.target.value = "";
      return;
    }

    setFile(selectedFile);
    setFileName(selectedFile.name);
  };

  const handleSubmit = async () => {
    if (!file) {
      alert("Please upload an audio file before submitting.");
      return;
    }

    if (!isChecked) {
      alert("Please confirm that you have the right to upload this file.");
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Step 1: Upload file to Azure Blob via /api/upload
      const formData = new FormData();
      formData.append("files", file);
      formData.append("useremail", authContext?.user?.email || "");

      const refreshedToken = await authContext?.validateAndRefreshToken(authContext?.user?.idToken);
      const csrfToken = await getCSRFToken();

      console.log('[AudioUploadModal]: Uploading audio file to Azure Blob...');

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${refreshedToken}`,
          'X-XSRF-Token': csrfToken, // Match the header name expected by auth middleware
        },
        credentials: 'include', // Include cookies for authentication
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Audio upload failed');
      }

      const uploadResult = await uploadResponse.json();
      const audioUrl = uploadResult.files?.[0];

      if (!audioUrl) {
        throw new Error('No URL returned from upload');
      }

      console.log('[AudioUploadModal]: Audio uploaded successfully:', audioUrl);
      setUploadProgress(50);

      // Step 2: Always trigger agent suggestion (no mode restriction)
      if (onAudioUploaded) {
        console.log('[AudioUploadModal]: Triggering agent suggestions...');
        setUploadProgress(75);
        
        // Pass both the audio URL and the File object
        await onAudioUploaded(audioUrl, file);
        
        setUploadProgress(100);
        console.log('[AudioUploadModal]: Agent suggestions triggered successfully');
      }
      // Reset and close
      setFile(null);
      setFileName(null);
      setIsChecked(false);
      setUploadProgress(0);
      setIsUploading(false);
      onClose();

    } catch (error) {
      console.error('[AudioUploadModal]: Upload error:', error);
      alert(`Upload failed: ${error.message}`);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  useEffect(() => {
    // Add event listener for ESC key to close the modal
    const handleEscKey = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscKey);
    }

    // Cleanup the event listener when the modal is closed
    return () => {
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [isOpen]);
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-none px-4">
      <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-lg w-full max-w-md p-6 relative animate-in fade-in duration-200 text-gray-900 dark:text-gray-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition"
        >
          <AiOutlineClose size={20} />
        </button>

        {/* Header */}
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
          Upload Audio File for Agent Suggestions
        </h2>

        {/* Info Text */}
        <p className="text-sm text-gray-500 dark:text-gray-300 mb-3">
          Upload audio to get AI-suggested agents. Supported: <span className="font-medium text-gray-700 dark:text-gray-200">.mp3, .mp4, .wav, .m4a, .ogg</span> (max <span className="font-medium">25 MB</span>)
        </p>

        {/* Upload Area */}
        <label
          htmlFor="audio-upload"
          className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-[#2e2e2e] transition relative overflow-hidden"
        >
          <MdAudioFile className="w-12 h-12 text-black dark:text-white mb-2" />
          <span className="text-gray-600 dark:text-gray-300 text-sm text-center px-2">
            {fileName ? fileName : "Click or drag to upload"}
          </span>
        </label>

        <input
          id="audio-upload"
          type="file"
          accept=".mp3,.mp4,.wav,.m4a,.ogg"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Progress Bar (shown during upload) */}
        {isUploading && (
          <div className="mt-4 mb-2">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
              {uploadProgress < 50 ? 'Uploading...' : uploadProgress < 75 ? 'Processing...' : 'Generating suggestions...'}
            </p>
          </div>
        )}

        {/* Checkbox */}
        <div className="flex items-start mt-4 mb-5 space-x-2">
          <input
            type="checkbox"
            id="agreement"
            checked={isChecked}
            onChange={(e) => setIsChecked(e.target.checked)}
            className="mt-1 accent-black dark:accent-white cursor-pointer"
          />
          <label
            htmlFor="agreement"
            className="text-sm text-gray-600 dark:text-gray-300"
          >
            By uploading, you confirm that this is your own .mp3 file and you have
            the right to share it.
          </label>
        </div>

        {/* Buttons */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={handleSubmit}
            disabled={!file || !isChecked || isUploading}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              !file || !isChecked || isUploading
                ? "bg-gray-100 text-gray-400 dark:bg-[#2e2e2e] dark:text-gray-500 cursor-not-allowed"
                : "bg-black text-white dark:bg-[#2e2e2e] dark:hover:bg-[#3a3a3a] hover:bg-gray-800"
            }`}
          >
            {isUploading ? 'Uploading...' : 'Submit'}
          </button>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 dark:bg-[#2e2e2e] dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-[#3a3a3a] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
