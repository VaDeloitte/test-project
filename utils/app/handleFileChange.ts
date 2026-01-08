import {extractText} from '../../pages/homePage'
export const handleFileChange = async (
  event: React.ChangeEvent<HTMLInputElement>,
  files: File[],
  setFiles: (files: File[]) => void,
  setMessageError: (errorMessage: string) => void,
  setShowpopup: (showPopup: boolean) => void,
) => {
  const fileInput = event.target;
  const newFiles = fileInput.files ? Array.from(fileInput.files) : [];
  setMessageError("");

  // Filter files by acceptable formats
  const filteredFiles = newFiles.filter(file => /\.(pdf|docx?|txt|xls|xlsx|csv|pptx|jpg|png|jpeg?)/i.test(file.name));
  if (filteredFiles.length < newFiles.length) {
    setMessageError("Some files were not added because of unacceptable file formats.");
    fileInput.value = "";  // Reset the file input
    return;
  }

  // Calculate total size of existing and new files
  const totalSize = filteredFiles.reduce((acc, file) => acc + file.size, files.reduce((acc, file) => acc + file.size, 0));
  if (totalSize > 20 * 1024 * 1024) {
    setMessageError("Total file size cannot exceed 20MB.");
    fileInput.value = "";  // Reset the file input
    return;
  }

  // Update the files state
  setFiles([...files, ...filteredFiles]);

  const storedKeywords = JSON.parse(localStorage.getItem('keywords') || '[]');
  const allFiles = [...files, ...filteredFiles];

  for(const fileData of allFiles){
      const text = await extractText(fileData);
      const found = storedKeywords.filter((kw: string) => (text).includes(kw));
      if(found.length > 0){
          setMessageError(`Upload blocked: found sensitive keywords: ${found.join(', ')}`);
          setShowpopup(true);
          return;
      }
  }

  // Reset the file input after adding the files
  fileInput.value = "";
};
