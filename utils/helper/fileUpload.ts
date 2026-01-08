import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { promisify } from 'util';
import fs from 'fs'
import formidable from 'formidable';
const unlinkAsync = promisify(fs.unlink);

const getAzureContainerClient = (azureContainer: string): ContainerClient  => {
    const blobServiceClient = BlobServiceClient.fromConnectionString('DefaultEndpointsProtocol=https;AccountName=rgtaxgenienonprodfa;AccountKey=9ADNrp73Dl9cELdMolPUFBdUXfTmpe+kjFZ9M6b9znhESLQJ1XR9s80UJE/gXH04tsLFSTPU8bQy+ASt40OGfw==;EndpointSuffix=core.windows.net'!);
    const containerClient = blobServiceClient.getContainerClient(azureContainer);
    return containerClient;
}

const uploadFileToAzure = async (
    containerClient: ContainerClient,
    file: formidable.File,
    fileName: string,
    metadata?: { [key: string]: string }
) => {
    try {
        const blockBlobClient = containerClient.getBlockBlobClient(fileName);
        await blockBlobClient.uploadFile(file.filepath, {
            metadata: metadata,
        });
    } catch (uploadError) {
        throw new Error("Error in uploading the file");
    } finally {
        await unlinkAsync(file.filepath); // Clean up the temporary file
    }
};


export { getAzureContainerClient, uploadFileToAzure };