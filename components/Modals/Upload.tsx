"use client";
//New Layout for V3.0
import React, { useState, ChangeEvent, useRef, useContext } from "react";
import { IconX, IconUpload, IconTrash, IconFileSearch } from "@tabler/icons-react";
import Image from "next/image";
import { getFileIcon } from "@/utils/helper/helper";
import { getCSRFToken } from "@/utils/app/csrf";
import { AuthContext } from "@/utils/app/azureAD";
import { extractText } from "../../pages/homePage";

interface FileDetails {
    name: string;
    size: number;
    file: File;
}

function DocumentModal(props: any): JSX.Element | null {
    const [documents, setDocuments] = useState<FileDetails[]>([]);
    const [approvals, setApprovals] = useState<FileDetails[]>([]);
    const [modalOpen, setModalOpen] = useState<boolean>(true);
    const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
    const [textareaValue, setTextareaValue] = useState("");
    const [message, setMessage] = useState("");
    const [isChecked, setIsChecked] = useState<boolean>(false);

    const [activeTab, setActiveTab] = useState<"submit" | "files">("submit"); // NEW TAB STATE

    const CONFIRMATION_TEXT = `I confirm that the uploaded document(s) are not Client Confidential, Deloitte Confidential, High Risk Confidential, or Personal Data.`;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const fileInputRefs = useRef<HTMLInputElement>(null);
    const fileInputMyFiles = useRef<HTMLInputElement>(null); // NEW
    const authContext = useContext(AuthContext);

    const handleDocumentUpload = (event: ChangeEvent<HTMLInputElement>, type: "document" | "approval") => {
        const files = event.target.files;
        if (files) {
            const newFiles = Array.from(files).map((file) => ({
                name: file.name,
                size: Math.round(file.size / 1024),
                file,
            }));

            const oversized = newFiles.some((file) => file.size > 20000);
            if (oversized) {
                setMessage("File size must not exceed 20 MB.");
                return;
            }
            setMessage("");

            if (type === "document") {
                setDocuments((prev) => [...prev, ...newFiles]);
            } else {
                setApprovals((prev) => [...prev, ...newFiles]);
            }
        }
    };

    const removeFile = (index: number, type: "document" | "approval") => {
        if (type === "document") {
            setDocuments((prev) => prev.filter((_, i) => i !== index));
        } else {
            setApprovals((prev) => prev.filter((_, i) => i !== index));
        }
        setMessage("");
    };

    const handleCheckboxChange = (event: ChangeEvent<HTMLInputElement>) => {
        setIsChecked(event.target.checked);
    };

    const handleChange = (event: any) => {
        setTextareaValue(event.target.value);
    };

    const handleClose = () => {
        props.setModalOpen(false);
    };

    const handleDivClick = () => fileInputRef.current?.click();
    const handleDivClicks = () => fileInputRefs.current?.click();

    const handleSubmit = async (event: any) => {
        event.preventDefault();
        if (isSubmitted) return;

        if (!isChecked) {
            setMessage("Please confirm the uploaded files.");
            return;
        }

        let currentIdToken = authContext?.user?.idToken;
        if (!currentIdToken) {
            console.error("No ID token available");
            return;
        }

        const formData = new FormData();
        formData.append("user_email", authContext?.user?.email || "");
        documents.forEach((doc) => formData.append("refinementFile", doc.file));
        approvals.forEach((doc) => formData.append("approvalFile", doc.file));
        if (textareaValue) formData.append("description", textareaValue);

        const storedKeywords = JSON.parse(localStorage.getItem("keywords") || "[]");
        const allFiles = [...documents, ...approvals];

        for (const fileData of allFiles) {
            const text = await extractText(fileData.file);
            const found = storedKeywords.filter((kw: string) => text.includes(kw));
            if (found.length > 0) {
                setMessage("Upload blocked: sensitive keywords found");
                return;
            }
        }

        try {
            const csrfToken = getCSRFToken();
            const myHeaders: any = new Headers();
            if (currentIdToken) myHeaders.set("Authorization", `Bearer ${currentIdToken}`);
            if (csrfToken) myHeaders.set("X-XSRF-TOKEN", csrfToken);

            const response = await fetch("/api/submitDocument", {
                method: "POST",
                body: formData,
                headers: myHeaders,
                credentials: "include" as RequestCredentials,
            });

            const result = await response.json();
            if (response.ok) setIsSubmitted(true);
            else setMessage(result.error || "Error submitting files.");
        } catch (error) {
            setMessage("Network error, please try again later.");
        }
    };

    const isSubmitDisabled = !(documents.length > 0 && approvals.length > 0 && textareaValue.trim() !== "" && isChecked);

    return modalOpen ? (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 px-4">
            <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-lg w-full max-w-md max-h-[80vh] flex flex-col relative animate-in fade-in duration-200 text-gray-800 dark:text-gray-100 overflow-hidden">

                {/* Top Tabs */}
             <div className="flex justify-center border-b border-gray-200 dark:border-gray-700 mt-6 pb-1">
    <button
        className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
            activeTab === "submit"
                ? "border-black dark:border-white text-black dark:text-white"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        }`}
        onClick={() => setActiveTab("submit")}
    >
        Submit Documents
    </button>

    <button
        className={`px-4 py-2 ml-2 font-medium text-sm border-b-2 transition ${
            activeTab === "files"
                ? "border-black dark:border-white text-black dark:text-white"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        }`}
        onClick={() => setActiveTab("files")}
    >
        Feedback
    </button>
</div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-6 pt-6 pb-24"> {/* smaller padding bottom */}
                    {/* Close */}
                    <button
                        onClick={handleClose}
                        className="absolute top-3 right-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
                    >
                        <IconX stroke={2} />
                    </button>

                    {/* MESSAGES */}
                    {message && (
                        <p className="text-white bg-red-500 p-2 mb-3 text-sm rounded-md text-center">{message}</p>
                    )}

                    {/* TAB CONTENT */}
                    {activeTab === "submit" && !isSubmitted && (
                        <>
                            <h2 className="text-xl font-semibold mb-2 text-center">Submit Documents</h2>

                            {/* Document Upload */}
                            <label className="block mb-2 font-medium">Upload document for model refinement</label>
                            {documents.map((doc, i) => (
                                <div key={i} className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg p-3 mb-2 bg-white dark:bg-[#2E2E2E]">
                                    <Image src={getFileIcon(doc.name)} alt="file" height={24} width={24} className="mr-2" />
                                    <div className="flex-1 text-sm">
                                        <div className="truncate">{doc.name}</div>
                                        <div className="text-xs text-gray-400 dark:text-gray-500">{doc.size} KB</div>
                                    </div>
                                    <button onClick={() => removeFile(i, "document")} className="text-red-500 hover:text-red-600 ml-2">
                                        <IconTrash size={16} />
                                    </button>
                                </div>
                            ))}
                            {documents.length === 0 && (
                                <div
                                    className="flex items-center justify-between border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-3 mb-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#2E2E2E] transition"
                                    onClick={handleDivClick}
                                >
                                    <span className="text-sm text-gray-600 dark:text-gray-300">Click or drag to upload document</span>
                                    <IconUpload />
                                    <input
                                        type="file"
                                        accept=".pdf,.doc,.docx,.txt,.ppt,.pptx"
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={(e) => handleDocumentUpload(e, "document")}
                                    />
                                </div>
                            )}

                            {/* Approvals Upload */}
                            <label className="block mb-2 font-medium">Upload approvals</label>
                            {approvals.map((doc, i) => (
                                <div key={i} className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg p-3 mb-2 bg-white dark:bg-[#2E2E2E]">
                                    <Image src={getFileIcon(doc.name)} alt="file" height={24} width={24} className="mr-2" />
                                    <div className="flex-1 text-sm">
                                        <div className="truncate">{doc.name}</div>
                                        <div className="text-xs text-gray-400 dark:text-gray-500">{doc.size} KB</div>
                                    </div>
                                    <button onClick={() => removeFile(i, "approval")} className="text-red-500 hover:text-red-600 ml-2">
                                        <IconTrash size={16} />
                                    </button>
                                </div>
                            ))}
                            {approvals.length === 0 && (
                                <div
                                    className="flex items-center justify-between border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-3 mb-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#2E2E2E] transition"
                                    onClick={handleDivClicks}
                                >
                                    <span className="text-sm text-gray-600 dark:text-gray-300">Upload service line approval email</span>
                                    <IconUpload />
                                    <input
                                        type="file"
                                        accept=".pdf,.doc,.docx,.txt,.ppt,.pptx"
                                        className="hidden"
                                        ref={fileInputRefs}
                                        onChange={(e) => handleDocumentUpload(e, "approval")}
                                    />
                                </div>
                            )}

                            {/* Description */}
                            <textarea
                                onChange={handleChange}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white rounded-lg text-sm mb-3 dark:bg-[#2E2E2E]"
                                placeholder="Add a short description"
                                rows={3}
                            />

                            {/* Checkbox */}
                            <div className="flex items-start mb-5 space-x-2">
                                <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={handleCheckboxChange}
                                    className="mt-1 accent-black dark:accent-white cursor-pointer"
                                />
                                <label className="text-sm text-gray-500 dark:text-gray-300">{CONFIRMATION_TEXT}</label>
                            </div>
                        </>
                    )}

                    {/* MY FILES TAB CONTENT */}
                    {activeTab === "files" && (
                        <>
                            <h2 className="text-xl font-semibold mb-4 text-center">User feedback</h2>

                             <textarea
                                onChange={handleChange}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm mb-3 dark:bg-[#2E2E2E]"
                                placeholder="Add a short description"
                                rows={3}
                            />
                        </>
                    )}

                    {/* Submitted */}
                    {isSubmitted && (
                        <div className="text-center py-6">
                            <IconFileSearch size={80} className="mb-4 text-gray-600 dark:text-gray-300" />
                            <h1 className="text-xl font-semibold mb-2">Submitted for Review</h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Your document has been uploaded and submitted for approval.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                {!isSubmitted && activeTab === "submit" && (
                    <div className="absolute bottom-0 left-0 right-0 flex justify-end space-x-3 px-6 py-3 bg-white dark:bg-[#1E1E1E] rounded-b-2xl">
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitDisabled}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                                isSubmitDisabled
                                    ? "bg-gray-100 dark:bg-[#2E2E2E] text-gray-400 cursor-not-allowed"
                                    : "bg-black dark:bg-white text-white dark:text-black"
                            }`}
                        >
                            Submit
                        </button>
                        <button
                            onClick={handleClose}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-[#2E2E2E]"
                        >
                            Close
                        </button>
                    </div>
                )}

                {/* Footer when in MY FILES tab */}
                {activeTab === "files" && (
                    <div className="absolute bottom-0 left-0 right-0 flex justify-end px-6 py-3 bg-white dark:bg-[#1E1E1E] rounded-b-2xl">
                        <button
                            onClick={handleClose}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-[#2E2E2E]"
                        >
                            Submit
                        </button>
                    </div>
                )}
            </div>
        </div>



    ) : null;
}

export default DocumentModal;
