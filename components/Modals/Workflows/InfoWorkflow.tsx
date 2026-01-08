import React, { useContext, useEffect, useState } from 'react';
import { IconX } from '@tabler/icons-react';
import { getWorkflowById } from '@/services/workflowService';
import { AuthContext } from '@/utils/app/azureAD';

function InfoWorkflow(props: any): JSX.Element | null {
    const [modalOpen, setModalOpen] = useState<boolean>(true); // Assuming the modal should be open initially
    const [prompt, setPrompt] = useState<string>(""); // Assuming the modal should be open initially
    const [description, setDescription] = useState<string>(""); // Assuming the modal should be open initially
    const [uploadDescription, setUploadDescription] = useState<string>(""); // Assuming the modal should be open initially
    const authContext = useContext(AuthContext);

    const handleClose = (): void => {
        props.setModalOpen(false);
    };


    useEffect(()=>{
        if(props.id){
            getWorkflowById(props.id, props.user.idToken, authContext?.validateAndRefreshToken).then((res)=>{
                if(res){
                    let workflow = JSON.parse(res).workflow;
                    setPrompt(workflow.prompt)
                    setDescription(workflow.description)
                    setUploadDescription(workflow.uploadDescription)

                }
            });
        }
    
   },[props.id,props.user])

 
    return modalOpen ? (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[100]">
            <div className="dark:bg-[#343540] bg-white p-5 rounded-lg max-w-md w-full text-black dark:text-white h-[600px] overflow-scroll">
                <div className="relative">
                <>
                            <h2 className="text-lg w-full text-center font-[18px]">Agent info</h2>
                        </>
                    <button onClick={handleClose} className="absolute top-0 right-0 text-dark dark:text-white text-lg font-semibold">
                        <IconX stroke={2} />
                    </button>
                </div>
                <form className='flex-row justify-start'>
                    <div className="mt-4 text-left">
                     <p className='font-bold text-[18px]'>Description:</p>
                        <p>{description}</p>
                    </div>
                    <div className="mt-4 text-left">
                    <p className='font-bold text-[18px]'> Prompt:</p>
                    <p>{prompt}</p>
                    </div>
                    <div className="mt-4 text-left">
                    <span className='font-bold text-[18px]'>Upload Description:</span>
                    <p>{uploadDescription}</p>
                    </div>
                </form>
            </div>
        </div>
    ) : null;
}

export default InfoWorkflow;
