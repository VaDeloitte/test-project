import React, { useContext, useState } from 'react';
import { IconX, IconCircleCheck } from '@tabler/icons-react';
import { deleteWorkflowById } from '@/services/workflowService';
import { AuthContext } from '@/utils/app/azureAD';

function RemoveWorkflow(props: any): JSX.Element | null {
    const [modalOpen, setModalOpen] = useState<boolean>(true); // Assuming the modal should be open initially
    const [isSumbited, setIsSumbited] = useState<boolean>(false);
    const authContext = useContext(AuthContext)
    const user = authContext?.user;

    const handleClose = (): void => {
        props.setModalOpen(false);
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const newWorkflow = await deleteWorkflowById(user?.idToken || '' ,props.id, authContext?.validateAndRefreshToken);
            if (newWorkflow) {
                setIsSumbited(true); // Close modal on submit
                props.update();
            }
        } catch (error) {
            console.error('Error adding workflow:', error);
        }
    };

    return modalOpen ? (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[100]">
            <div className="bg-white p-5 rounded-lg max-w-md w-full text-black dark:text-white">
                <div className="relative">
                    {!isSumbited && (
                        <>
                            <h2 className="text-lg w-full text-center font-[18px]">Remove Agents</h2>
                        </>
                    )}
                    <button onClick={handleClose} className="absolute top-0 right-0 text-dark dark:text-white text-lg font-semibold">
                        <IconX stroke={2} />
                    </button>
                </div>
                {!isSumbited && (
                    <form onSubmit={handleSubmit}>
                        <div className="mt-4 text-center">
                            Are you sure you want to delete the agent?
                        </div>

                        <div className="mt-4 flex">
                            <button type="submit" className="bg-white mr-2 w-full text-[18px] border border-2 text-black p-2 py-4 font-[400] rounded-md">
                                Yes
                            </button>
                            <button type="button" className="bg-white mr-2 w-full text-[18px] border border-2 text-black p-2 py-4 font-[400] rounded-md">
                                No
                            </button>
                        </div>
                    </form>
                )}
                {isSumbited && (
                    <div className="text-center py-10 min-h-[400px] flex flex-col items-center justify-center">
                        <IconCircleCheck color='#87BE42' size={100} className="mb-6" />
                        <h1 className="text-[38px] mb-2 font-[500]">Removed!</h1>
                        <p className="font-[100]">Agent has been removed successfully.</p>
                    </div>
                )}
            </div>
        </div>
    ) : null;
}

export default RemoveWorkflow;
