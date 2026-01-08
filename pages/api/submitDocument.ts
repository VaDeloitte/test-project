import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import { promisify } from 'util';
import * as formidable from 'formidable';
import { v4 as Guid } from 'uuid';
import { getAzureContainerClient, uploadFileToAzure } from '@/utils/helper/fileUpload';
import { fileTypeFromFile } from 'file-type';

export const config = {
  api: {
    bodyParser: false,
  },
};

const allowedFileTypes = ['pdf', 'doc', 'docx', 'txt'];
const fileSizeLimit = 5 * 1024 * 1024; 
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

type NextApiRequestWithFormidable = NextApiRequest & {
  files: formidable.Files;
  description: string
};

const handler = async (req: NextApiRequestWithFormidable, res: NextApiResponse) => {
  switch(req.method) {
    case 'POST':
      const form = new formidable.IncomingForm({});
      
      form.parse(req, async (err, fields, files) => {
        if (err) {
          res.status(500).json({ error: 'Error parsing the files' });
          return;
        }
        
        const refinementFile = files['refinementFile'];
        const approvalFile = files['approvalFile'];
  
        if (!refinementFile || refinementFile.length === 0) {
          res.status(400).json({ error: 'No refinement file has been uploaded.' });
          return;
        }

        if (!approvalFile || approvalFile.length === 0) {
          res.status(400).json({ error: 'No approval file has been uploaded' });
          return;
        }

        const filesToCheck = [refinementFile[0], approvalFile[0]];
        let totalFileSizes = 0;

        for (const file of filesToCheck) {
          const fileName = file.originalFilename || file.newFilename;
          const fileExtension = fileName.split('.').pop()?.toLowerCase() || "";
          
          if (!allowedFileTypes.includes(fileExtension)) {
            res.status(400).json({ error: 'Invalid file type. Only pdf, doc, docx, txt files are allowed.'});
            return;
          }

          const isValidFile = await validateFileType(file.filepath, fileExtension);
          if (!isValidFile) {
            res.status(400).json({ error: 'File type does not match its extension or is not allowed.' });
            return;
          }

          totalFileSizes += file.size;
        }

        if (totalFileSizes <= 0) {
          res.status(400).json({ error: `Invalid file type` });
          return;
        }

        if (totalFileSizes > fileSizeLimit) {
          res.status(400).json({ error: `Total file size exceeds the limit of ${fileSizeLimit / (1024 * 1024)} MB` });
          return;
        }

        const description = fields['description'];

        if(!(description && description.length > 0 && description[0] !== "")){
            res.status(400).json({ error: 'Please fill the description' });
            return;
        }

        try {
          const containerClient = getAzureContainerClient('review-data-sources'!)

          const refinementFileName = refinementFile[0].originalFilename || refinementFile[0].newFilename;
          const approvalFileName = approvalFile[0].originalFilename || approvalFile[0].newFilename;
          const approvalFileExtension = approvalFileName.split('.').pop();
          const updatedApprovalFileName = `${refinementFileName.split('.')[0]}-approval.${approvalFileExtension}`;
          const email:any = fields['user_email']?.[0];
          await uploadFileToAzure(containerClient, refinementFile[0], refinementFileName, {email});
          await uploadFileToAzure(containerClient, approvalFile[0], updatedApprovalFileName, {email});

          const descriptionFileName = `${refinementFileName.split('.')[0]}-description.txt`;
          const blockBlobClient = containerClient.getBlockBlobClient(descriptionFileName);
          await blockBlobClient.upload(`${description[0]}`, description[0].length);
          
          res.status(200).json({ message: 'Submit files successfully' });
        } catch (error) {
          console.error('Error during file upload:', error);
          res.status(500).json({ error: 'Something went wrong while uploading the file(s).' });
        } finally {
          // Clean up temporary files
          for (const file of filesToCheck) {
            if (file && file.filepath) {
              await unlinkAsync(file.filepath).catch(console.error);
            }
          }
        }
      });
      break;
    default: 
      res.status(405).json({ error: 'Method not allowed' });
  }
};

export default handler;