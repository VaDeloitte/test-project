import React, { useState, useEffect, useContext } from 'react';
import { IconX, IconCircleCheck } from '@tabler/icons-react';
import { addWorkflow, getWorkflowById, updateWorkflowById } from '@/services/workflowService';
import Dropdown from '@/components/atoms/Dropdown/Dropdown';
import { serviceLines } from '@/utils/data/serviceLines';
import { AuthContext } from '@/utils/app/azureAD';
import { newUploadDocuments } from '@/services/uploadService';

interface AddWorkflowProps {
    setModalOpen: (open: boolean) => void;
    update: () => void;
    mode?: string;
    workflowsData: any;
    formData?: {
        _id: string;
        title: string;
        subcategory: string;
        subsubcategory: string;
        category: string;
        prompt: string;
        description: string;
        uploadRequired: boolean;
        uploadDescription: string;
    };
}

function AddWorkflow({ setModalOpen, update, formData: initialFormData, mode, workflowsData }: AddWorkflowProps): JSX.Element | null {
    const [modalOpen, setModalVisibility] = useState<boolean>(true);
    const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
    const [serviceLinesData, setServiceLinesData] = useState<any>([]);
    const [subCategoryData, setSubCategoryData] = useState<any>([]);
    const [subSubCategoryData, setSubSubCategoryData] = useState<any>([]);
    const [numbers, setNumbers]: any = useState("");
    const [selectedModel, setSelectedModel] = useState('');
    const [triggerInput, setTriggerInput] = useState('');
const modelOptions = [ 'GPT-5','GPT-5-mini','Aljais', 'Claude Sonnet 4.5'];
const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (!e.target.files) return;
  const filesArray = Array.from(e.target.files);
  setUploadedFiles(filesArray);
};


    const [formData, setFormData]: any = useState(
        {
            title: '',
            subcategory: '',
            subsubcategory: '',
            category: '',
            prompt: '',
            description: '',
            uploadRequired: false,
            uploadDescription: '',
            model:'',
            citation: false,
             triggers: [] as string[],
files: [] as string[],
        });

    const authContext = useContext(AuthContext)
    const user: any = authContext?.user;

    const [errors, setErrors] = useState({
        title: '',
        subcategory: '',
        subsubcategory: '',
        category: '',
        prompt: '',
        description: '',
        uploadRequired: false,
        uploadDescription: ''
    });



    const handleClose = (): void => {
        setModalOpen(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | any>): void => {
        const { name, value, type, checked } = e.target;
        setFormData((prevData: any) => ({
            ...prevData,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const validateForm = (): boolean => {
        const newErrors: any = {};
        Object.keys(formData).forEach((key) => {
            const value = formData[key as keyof typeof formData];

            // Skip validation for uploadDescription if upload is not required
            if (key === 'uploadDescription' && !formData.uploadRequired) {
                return;
            }

            // Basic validation for empty fields and length
            if (typeof value === 'string' && key !== 'subcategory' && key !== 'subsubcategory') {
                const trimmedValue = value.trim();
                if (!trimmedValue) {
                    newErrors[key] = 'This field is required';
                } else if (trimmedValue.length > 20000) {
                    newErrors[key] = 'Maximum length is 20000 characters';
                }
            }
        });

        // Conditional validation based on category
        if (formData.category === 'Service Lines' || formData.category === 'Enabling Functions') {
            if (!formData.subcategory.trim()) {
                newErrors.subcategory = 'Category is required';
            }
            if (!formData.subsubcategory.trim()) {
                newErrors.subsubcategory = 'Subcategory is required';
            }
        } else if (formData.category === 'General Use Cases') {
            // Ensure only subcategory is required for General Use Cases
            if (!formData.subcategory.trim()) {
                newErrors.subcategory = 'Category is required';
            }
            // Explicitly set subsubcategory error to an empty string if any previous error exists
            delete newErrors.subsubcategory;
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };



const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!validateForm()) return;

  try {
    let uploadedFileRefs: any[] = [];

    // ✅ 1. Upload files FIRST
   if (uploadedFiles.length > 0) {
  const fileFormData = new FormData();

  uploadedFiles.forEach((file) => {
    fileFormData.append("files", file);
  });

  // ✅ REQUIRED — this was missing
  fileFormData.append(
    "useremail",
    authContext?.user?.email || ""
  );

  // optional but safe (your service supports it)
  fileFormData.append("mode", "Upload");

  const uploadResponse = await newUploadDocuments(
    fileFormData,
    user?.idToken || ''
  );

 uploadedFileRefs = (uploadResponse?.files || []).map(
  (file: any) => file.url
);
}
    // ✅ 2. Build workflow payload (JSON only)
   const updatedFormData = {
  ...formData,
  triggers: triggerInput
    ? [...formData.triggers, triggerInput]
    : formData.triggers,
  files: uploadedFileRefs, // ✅ THIS IS THE FIX
};

    // ✅ 3. Save workflow
    const newWorkflow =
      mode === "add"
        ? await addWorkflow(
            user?.idToken || '',
            updatedFormData,
            authContext?.validateAndRefreshToken
          )
        : await updateWorkflowById(
            user?.idToken || '',
            formData._id,
            updatedFormData,
            authContext?.validateAndRefreshToken
          );

    if (newWorkflow) {
      setIsSubmitted(true);
      update();
    }
  } catch (error) {
    console.error('Error adding workflow:', error);
  }
};

    function getSubArrayByKey(key: string): void {
        const data: any = [];
        const categories = workflowsData.filter((item: any) => item.category === key);
        const filtered = Array.from(new Set(categories.map((item: any) => item.subcategory)));
        for (const element of filtered) {
            if (!data.includes(element)) {
                data.push(element);
            }
        }
        setSubCategoryData(data);
    }

    function getSubSubArrayByKey(key: string): void {
        const data: any = [];
        const categories = workflowsData.filter((item: any) => item.category === formData.category && item.subcategory === key);
        const filtered = Array.from(new Set(categories.map((item: any) => item.subsubcategory)));
        for (const element of filtered) {
            if (!data.includes(element)) {
                data.push(element);
            }
        }
        setSubSubCategoryData(data);
    }

    const handleDropdownChange = (name: string, selectedOption: string) => {
        setFormData((prevData: any) => ({
            ...prevData,
            [name]: selectedOption,
            ...(name === 'category' && { subcategory: '', subsubcategory: '' }),  // Reset subcategory and subsubcategory if category changes
            ...(name === 'subcategory' && { subsubcategory: '' })  // Reset subsubcategory if subcategory changes
        }));
        if (name === "category") {
            getSubArrayByKey(selectedOption);
        }
        if (name === "subcategory") {
            getSubSubArrayByKey(selectedOption);
        }
    };

    useEffect(() => {
        if (workflowsData) {
            const categories = workflowsData.map((item: any) => item.category);
            setServiceLinesData(Array.from(new Set(categories)));
        }
    }, [workflowsData]);

    useEffect(() => {
        if (mode == "edit") {
            getWorkflowById(initialFormData!._id, user.idToken, authContext?.validateAndRefreshToken).then((res) => {

                if (res) {
                    let workflow = JSON.parse(res).workflow;
                    setFormData({
                        _id: '',
                        title: '',
                        subcategory: '',
                        subsubcategory: '',
                        category: '',
                        prompt: '',
                        description: '',
                        uploadRequired: false,
                        uploadDescription: ''
                    });
                    setFormData(workflow)
                    getSubArrayByKey(workflow.category);
                    getSubSubArrayByKey(workflow.subcategory);
                    console.log("workflow", workflow);
                }
            });
        }

    }, [mode])

    return modalOpen ? (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[100] ">
            <div className={`bg-white text-dark p-5 rounded-lg max-w-md w-full text-black overflow-auto ${isSubmitted ? '' : 'h-full'}`}>
                <div className="relative">
                    {!isSubmitted && (
                        <>
                            <h2 className="text-lg w-full text-center font-[18px]">Agent</h2>
                            <p className="text-black text-[14px] text-center font-[200]">Please fill in the following form with any agent</p>
                        </>
                    )}
                    <button onClick={handleClose} className="absolute top-0 right-0 text-dark text-lg font-semibold">
                        <IconX stroke={2} />
                    </button>
                </div>
                {!isSubmitted && (
                    <form onSubmit={handleSubmit}>
                        <div className="mt-4">
                            <input
                                type="text"
                                name="title"
                                placeholder="Name"
                                value={formData.title}
                                onChange={handleChange}
                                className={`w-full p-2 rounded-md dark:bg-transparent border ${errors.title ? 'border-red-500' : 'dark:border-[#65687C] border-black'}`}
                            />
                            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                        </div>

                        <div className="mt-4">
                            <Dropdown
                                buttonStyle={`text-[#9ca3af] ${errors.category ? 'border-red-500' : 'dark:border-[#65687C] border-black'}`}
                                style="w-full outline-none"
                                options={serviceLinesData}
                                selectedValue={formData.category}
                                onSelect={(selectedOption: string) => handleDropdownChange('category', selectedOption)}
                                placeholder={"Type"}
                            />
                            {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
                        </div>
                        <div className="mt-4">
                            <Dropdown
                                key={numbers}
                                buttonStyle={`text-[#9ca3af] dark:border-[#65687C] border-black ${errors.subcategory ? 'border-red-500' : 'dark:border-[#65687C] border-black'}`}
                                style="w-full outline-none"
                                options={subCategoryData}
                                selectedValue={formData.subcategory}
                                onSelect={(selectedOption: string) => handleDropdownChange('subcategory', selectedOption)}
                                placeholder={"Category"}
                            />
                            {errors.subcategory && <p className="text-red-500 text-sm mt-1">{errors.subcategory}</p>}
                        </div>
                        <div className="mt-4">
                            <Dropdown
                                key={numbers}
                                buttonStyle={`text-[#9ca3af] ${errors.subsubcategory ? 'border-red-500' : 'dark:border-[#65687C] border-black'}`}
                                style="w-full outline-none"
                                options={subSubCategoryData}
                                selectedValue={formData.subsubcategory}
                                onSelect={(selectedOption: string) => handleDropdownChange('subsubcategory', selectedOption)}
                                placeholder={"Subcategory"}
                            />
                            {errors.subsubcategory && <p className="text-red-500 text-sm mt-1">{errors.subsubcategory}</p>}

                        </div>
                        <div className="mt-4">
                            <textarea
                                name="description"
                                placeholder="Description"
                                value={formData.description}
                                onChange={handleChange}
                                className={`w-full p-2 rounded-md dark:bg-transparent border ${errors.description ? 'border-red-500' : 'dark:border-[#65687C] border-black'}`}
                                cols={30}
                                rows={1}
                            ></textarea>
                            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                        </div>
                        <div className="mt-4">
                            <textarea
                                name="prompt"
                                placeholder="Prompts"
                                value={formData.prompt}
                                onChange={handleChange}
                                className={`w-full p-2 rounded-md dark:bg-transparent border ${errors.prompt ? 'border-red-500' : 'dark:border-[#65687C] border-black'}`}
                                cols={30}
                                rows={8}
                                maxLength={10000}
                            ></textarea>
                            {errors.prompt && <p className="text-red-500 text-sm mt-1">{errors.prompt}</p>}
                        </div>
                         <div className="mt-4">
                            <textarea
  placeholder="Add trigger"
  value={triggerInput}
  onChange={(e) => setTriggerInput(e.target.value)}
  className="w-full p-2 rounded-md dark:bg-transparent border dark:border-[#65687C] border-black"
  rows={1}
/>

                        </div>
                        {formData.uploadRequired && (
                            <div className="mt-4">
                                <input
                                    type="text"
                                    name="uploadDescription"
                                    placeholder="Upload description"
                                    value={formData.uploadDescription}
                                    onChange={handleChange}
                                    className={`w-full p-2 rounded-md dark:bg-transparent border ${errors.uploadDescription ? 'border-red-500' : 'dark:border-[#65687C] border-black'}`}
                                />
                                {errors.uploadDescription && <p className="text-red-500 text-sm mt-1">{errors.uploadDescription}</p>}
                            </div>
                        )}
                        {/* Model Selection */}
<div className="mt-4">
    <Dropdown
        buttonStyle="text-[#9ca3af] dark:border-[#65687C] border-black"
        style="w-full outline-none"
        options={modelOptions}
        selectedValue={formData.model || ''}
        onSelect={(selectedOption: string) =>
            setFormData((prev: any) => ({ ...prev, model: selectedOption }))
        }
        placeholder="Select Model"
    />
</div>


                        <div className="mt-4">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    name="uploadRequired"
                                    checked={formData.uploadRequired}
                                    onChange={handleChange}
                                    className="mr-2 appearance-none checked:bg-secondary checked:border-transparent h-4 w-4 rounded-sm border border-gray-300 cursor-pointer"
                                />
                                Upload Required
                            </label>
                        </div>
                        <div className="mt-4">
  <label className="flex items-center cursor-pointer">
    <input
     name="citation"
      type="checkbox"
      checked={formData.citation}
  onChange={handleChange}
      className="mr-2 appearance-none h-4 w-4 rounded-sm border border-gray-300 checked:bg-secondary checked:border-transparent"
    />
    Citation
  </label>
</div>

                      <div className="mt-4">
  <label className="flex items-center cursor-not-allowed opacity-25">
    <input
      type="checkbox"
      disabled
      className="mr-2 appearance-none  h-4 w-4 rounded-sm border border-gray-300 checked:bg-secondary checked:border-transparent"
    />
    Grounding
  </label>
</div>

{/* File Upload */}
<div className="mb-6 bg-white dark:bg-[#2A2B2E] rounded-lg shadow-md p-6 border border-gray-200 dark:border-[#3A3B3D] mt-4">
  <h2 className="text-gray-900 dark:text-gray-100 text-sm font-medium mb-2">Files</h2>
  <div className="border-dashed border-2 block border-gray-300 h-52 dark:border-[#3A3B3D] p-6 rounded-lg dark:bg-[#1E1F22]">
    <div className="text-center flex flex-col items-center justify-center">
      <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
        Drag the documents (JPG, Word, TXT, PDF, PPT, XLS)
      </div>
      <input
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
        id="fileInput"
      />
      <label
        htmlFor="fileInput"
        className="mt-2 w-full bg-gray-200 dark:bg-[#3A3B3D] text-gray-700 dark:text-gray-200 px-3 py-1 rounded-lg cursor-pointer hover:bg-gray-300 dark:hover:bg-[#2A2B2E]"
      >
        + Select document
      </label>
      {uploadedFiles.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-3">
          {uploadedFiles.map((file, index) => (
            <li key={index} className="text-sm text-gray-800 dark:text-gray-200">
              {file.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  </div>
</div>


                        <div className="mt-4">
                            <button type="submit" className="bg-secondary w-full text-[18px] text-white p-2 py-4 font-[400] rounded-md">
                                {mode === "edit" ? "Submit" : "Add"}
                            </button>
                        </div>
                    </form>
                )}
                {isSubmitted && (
                    <div className="text-center py-10 min-h-[400px] flex flex-col items-center justify-center">
                        <IconCircleCheck color='#87BE42' size={100} className="mb-6" />
                        <h1 className="text-[38px] mb-2 font-[500]">Success!</h1>
                        <p className="font-[100]">Submitted successfully.</p>
                    </div>
                )}
            </div>
        </div>
    ) : null;
}

export default AddWorkflow;
