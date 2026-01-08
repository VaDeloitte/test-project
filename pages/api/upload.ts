import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import { promisify } from 'util';
import * as formidable from 'formidable';
import { v4 as Guid } from 'uuid';
import { getAzureContainerClient, uploadFileToAzure } from '@/utils/helper/fileUpload';
import { withAuth } from '../../utils/middleware/auth';
import { fileTypeFromFile } from 'file-type';

import { getEncoder } from "../../utils/lib/tokenizer";

import { File } from 'formidable';

import { convertCsvToTxt } from '../../utils/helper/csv_convertor';
import { convertPptxToTxt } from '../../utils/helper/pptx_convertor';
import { convertXlsxToTxt } from '../../utils/helper/xlsx_convertor';
import { convertDocxToText } from '../../utils/helper/docx_convertor';
import path from 'path';

// NEW IMPORTS
import axios from 'axios';
import FormData from 'form-data';

export const config = {
 api: {
  bodyParser: false,
 },
};

interface User {
 isAdmin: boolean;
 loggedIn: boolean;
 email: string;
 username: string;
 accountId: string;
 exp: number;
}

// Document files for RAG processing
const documentFileTypes = ['pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx', 'xls', 'ppt', 'pptx', 'jpg', 'png'];
// Audio files for agent suggestions
const audioFileTypes = ['mp3', 'wav', 'm4a', 'ogg','mp4'];
// Combined allowed types
const allowedFileTypes = [...documentFileTypes, ...audioFileTypes];
// Legacy formats that use binary formats not recognized by file-type library
// These will skip binary validation and rely on extension check only
// DOC: Works with fallback extraction | XLS/PPT: Require conversion to XLSX/PPTX
const legacyFormats = ['doc', 'xls', 'ppt'];

const fileSizeLimit = 20 * 1024 * 1024; // 20MB for documents
const audioFileSizeLimit = 25 * 1024 * 1024; // 25MB for audio
const unlinkAsync = promisify(fs.unlink);



const validateFileType = async (filePath: string, declaredExtension: string): Promise<boolean> => {
 try {
  const fileType = await fileTypeFromFile(filePath);

  if (!fileType) {
   // If file-type can't determine the type, we'll trust the declared extension
   return allowedFileTypes.includes(declaredExtension.toLowerCase());
  }

  const actualExtension = fileType.ext;
  return allowedFileTypes.includes(actualExtension) && actualExtension === declaredExtension.toLowerCase();
 } catch (error) {
  console.error('Error validating file type:', error);
  return false;
 }
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
 console.log(`[Upload Diagnostic] Request received: ${req.method}`);

 switch(req.method) {
  case 'POST':
   const form = new formidable.IncomingForm({allowEmptyFiles:true,minFileSize:0});

   form.parse(req, async (err, fields, files) => {
    console.log(`[Upload Diagnostic] Form parsing started.`);

    if (err) {
     console.error('Error parsing the files :', err)      
     res.status(500).json({ error: {
     code: err.code,
     httpCode: err.httpCode,
     message: err.message,
     stack: err.stack
    }});
     return;
    }
     
    const fileArray = Array.isArray(files.files) ? files.files : [files.files];
    console.log(`[Upload Diagnostic] Files found: ${fileArray.length}`);
  
    if (!fileArray || fileArray.length == 0) {
     res.status(400).json({ error: 'No file uploaded' });
     return;
    }

    let totalFileSizes = 0;

    for (const file of fileArray) {
     if (!file) continue;
     const fileExtension = file.originalFilename?.split('.').pop()?.toLowerCase() || "";
      
     if (!allowedFileTypes.includes(fileExtension)) {
      res.status(400).json({ 
       error: 'Invalid file type. Allowed: PDF, DOC, DOCX, CSV, XLSX, XLS, TXT, PPT, PPTX, JPG, PNG (documents) or MP3, WAV, M4A, OGG (audio).' 
      });
      return;
     }

     // Check if it's an audio file
     const isAudioFile = audioFileTypes.includes(fileExtension);
      
     // Check if it's a legacy format (DOC, XLS, PPT)
     const isLegacyFormat = legacyFormats.includes(fileExtension);
      
     // Audio files and legacy binary formats skip document validation
     // Legacy formats (DOC, XLS, PPT) use old binary formats not recognized by file-type library
     if (!isAudioFile && !isLegacyFormat) {
      const isValidFile = await validateFileType(file.filepath, fileExtension);
      if (!isValidFile) {
       res.status(400).json({ error: 'File type does not match its extension or is not allowed.' });
       return;
      }
     }
      
     // Check individual file size limits
     const sizeLimit = isAudioFile ? audioFileSizeLimit : fileSizeLimit;
     if (file.size > sizeLimit) {
      res.status(400).json({ 
       error: `File "${file.originalFilename}" exceeds the size limit of ${sizeLimit / (1024 * 1024)} MB for ${isAudioFile ? 'audio' : 'document'} files.` 
      });
      return;
     }
      
     totalFileSizes += file.size;
    }

    if(totalFileSizes <= 0)
    {
     res.status(400).json({ error: `This file appears to be empty. Please upload a different one.` });
     return;
    }

    // Skip total size check - already validated individual files

    try {
     const containerClient = getAzureContainerClient('temp-data-sources'!);
     const tempFilesToCleanup: string[] = []; // Track all temp files created

     const uploadPromises = fileArray.map(async (file) => {
      if (!file) return null;

      const filePath = file.filepath;
      const fileName = file.originalFilename || file.newFilename;
      const extension:any = fileName.split('.').pop()?.toLowerCase();
      const email:any = fields['useremail']?.[0];
      // const azureFileName = `${Guid()}.${extension}`;

      console.log(`[Upload Diagnostic] Processing file: ${fileName} (${extension})`);

      const azureFileName = `${Guid()}.${extension}`;

      try {
       // --- NEW LOGIC FOR MY FILES MODE ---
       const mode = fields['mode']?.[0];
       console.log(`[Upload Diagnostic] Mode: "${mode}", Email: "${email}"`);
       
       if (mode === 'My Files' && email) {
        console.log(`[Upload Diagnostic] Entering "My Files" sync logic.`);
        let azureFunctionUrl = process.env.AZURE_FUNCTION_URL || 'fa-taxgenie-nonprod-uks-001.azurewebsites.net';
        console.log(`[Upload Diagnostic] Raw AZURE_FUNCTION_URL env: ${azureFunctionUrl}`);
        
        if (azureFunctionUrl) {
           if (!azureFunctionUrl.startsWith('http://') && !azureFunctionUrl.startsWith('https://')) {
            azureFunctionUrl = `https://${azureFunctionUrl}`;
           }

           const encodedEmail = encodeURIComponent(email);
           // Construct URL: /api/users/{userId}/files
           const targetUrl = `${azureFunctionUrl}/api/users/${encodedEmail}/files`;
           
           // Create FormData for the external request
           const formData = new FormData();
           formData.append('file', fs.createReadStream(filePath), {
             filename: azureFileName,
             contentType: file.mimetype || 'application/octet-stream',
           });
           formData.append('useremail', email);
           formData.append('display_name', fileName); // Sending original name as display name

           // >>> DIAGNOSTIC START
           console.log(`\n[Upload Diagnostic] >>> OUTGOING REQUEST TO AZURE FUNCTION >>>`);
           console.log(`[Upload Diagnostic] Target URL: ${targetUrl}`);
           console.log(`[Upload Diagnostic] HEADERS:`, formData.getHeaders());
           console.log(`[Upload Diagnostic] FORM DATA FIELDS: useremail=${email}, display_name=${fileName}, file=${fileName}`);
           // <<< DIAGNOSTIC END

           try {
             const response = await axios.post(targetUrl, formData, {
               headers: {
                 ...formData.getHeaders(), // Important for multipart boundaries
               },
               maxContentLength: Infinity,
               maxBodyLength: Infinity
             });

             // >>> DIAGNOSTIC START
             console.log(`\n[Upload Diagnostic] <<< AZURE FUNCTION RESPONSE <<<`);
             console.log(`[Upload Diagnostic] Status: ${response.status} ${response.statusText}`);
             console.log(`[Upload Diagnostic] RESPONSE BODY (FULL):`);
             console.dir(response.data, { depth: null, colors: true });
             console.log(`[Upload Diagnostic] ----------------------------------------\n`);
             // <<< DIAGNOSTIC END

             console.log(`[Upload Diagnostic] Successfully synced "${fileName}" to 'My Files'.`);
           } catch (syncError: any) {
             console.error('[Upload Diagnostic] Error syncing to My Files:', syncError.message);
             if (syncError.response) {
                 console.error('[Upload Diagnostic] Error Status:', syncError.response.status);
                 console.error('[Upload Diagnostic] Error Response Body:', JSON.stringify(syncError.response.data, null, 2));
             }
             // We throw here to ensure the user knows the specific 'My Files' upload failed
             throw new Error(`Failed to upload to My Files storage: ${syncError.response?.data?.error || syncError.message}`);
           }
        } else {
            console.warn('[Upload Diagnostic] AZURE_FUNCTION_URL is not defined, skipping My Files sync.');
        }
       } else {
           console.log(`[Upload Diagnostic] Skipping "My Files" sync (Mode: ${mode}, Email present: ${!!email})`);
       }
       // -----------------------------------

       // CHANGED: Upload original files without conversion
       // Backend file_processor.py handles all text extraction with robust methods
       // This ensures both RAG and agent suggestions work correctly
        

        // Upload ALL files as-is (DOCX, XLSX, PPTX, PDF, CSV, etc.)
        // Backend will extract text when needed

      console.log(`[Upload Diagnostic] Uploading ${extension.toUpperCase()} to Azure Blob...`);
      await uploadFileToAzure(containerClient, file, azureFileName, {email});
      console.log(`[Upload Diagnostic] Azure Blob Upload Success.`);
      return { azureFileName: azureFileName, originalFileName: fileName, tokenCount: 0};

      } catch (error: any) {
        console.error(`[Upload Diagnostic] processing error:`, error.message);
        // Preserve original error message if it came from the My Files sync
        if (error.message && error.message.includes('My Files')) {
            throw error;
        }
       throw new Error('Error uploading file to Azure');
      }
     });

     const uploadedUrls = (await Promise.all(uploadPromises)).filter(Boolean);
     console.log(`[Upload Diagnostic] All files processed. Successful uploads: ${uploadedUrls.length}`);

     // ✅ FIX: Return file metadata (both Azure UUID and original filename)
     // This allows RAG to display user-friendly names instead of UUIDs
     const fileMetadata = uploadedUrls.map((fileInfo: any) => {
      if (typeof fileInfo === 'string') {
       // Legacy format - just URL
       return { url: fileInfo, azureFileName: fileInfo, originalFileName: fileInfo };
      }
      // Return full metadata with Azure UUID and original filename
      return {
       url: `${containerClient.url}/${fileInfo.azureFileName}`,
       azureFileName: fileInfo.azureFileName,
       originalFileName: fileInfo.originalFileName
      };
     });

     // Also return blob URLs for backwards compatibility
     const blobUrls = fileMetadata.map((meta: any) => meta.url);

     // Clean up converted temp files from /tmp/ directory
     for (const tempFile of tempFilesToCleanup) {
      try {
       if (fs.existsSync(tempFile)) {
        await unlinkAsync(tempFile);
       }
      } catch (cleanupError: any) {
       if (cleanupError.code !== 'ENOENT') {
        console.error('Error cleaning up converted temp file:', cleanupError);
       }
      }
     }

     // ✅ Return both URLs (legacy) and metadata (new) for file mapping
     res.status(200).json({ 
      message: 'File uploaded successfully', 
      urls: blobUrls, // Legacy support
      files: fileMetadata // New: includes original filenames
     });
    } catch (uploadError: any) {
     const errorMessage = uploadError.message || 'Something went wrong while uploading the file(s).';
     console.error(`[Upload Diagnostic] Global Upload Error: ${errorMessage}`);
     res.status(500).json({ error: errorMessage });
    } finally {
     // Clean up original temporary files from formidable (Windows temp directory)
     for (const file of fileArray) {
      if (file && file.filepath) {
       try {
        // Check if file exists before attempting to delete
        if (fs.existsSync(file.filepath)) {
         await unlinkAsync(file.filepath);
        }
       } catch (cleanupError: any) {
        // Silently ignore ENOENT errors (file already deleted)
        if (cleanupError.code !== 'ENOENT') {
         console.error('Error cleaning up formidable temp file:', cleanupError);
        }
       }
      }
     }
    }
   });
   break;
  default: 
   res.status(405).json({ error: 'Method not allowed' });
 }
};

export default withAuth(handler);