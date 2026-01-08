import React, { useState, useEffect, ChangeEvent, MouseEvent } from 'react';
import { IconX } from '@tabler/icons-react';

interface TermsProps {
    setModalOpen: (isOpen: boolean) => void;
    modalOpen: boolean;
    store?: boolean;
    submit?:any
}

const TITLE = 'Document Upload Confirmation';

const CONFIRMATION_TEXT = `
I confirm that the uploaded document(s) are not Client Confidential, Deloitte Confidential, High Risk Confidential, or Personal Data.`;

const Terms: React.FC<TermsProps> = (props:any) => {
    const { setModalOpen, modalOpen, store=true } = props;
    const [isChecked, setIsChecked] = useState<boolean>(false);

    useEffect(() => {
        if(store){
            const hasConfirmed = localStorage.getItem('hasConfirmed');
            if (hasConfirmed === 'true') {
                setModalOpen(false);
            }
        }
    }, []);

    const handleSubmit = async (event: MouseEvent<HTMLButtonElement>): Promise<void> => {
        event.preventDefault();
        try {
            setModalOpen(true);
            props.submit();
            if(store){
                localStorage.setItem('hasConfirmed', 'true');
            }
         
        } catch (error) {
            console.error('Network error:', error);
        }
    };

    const handleCheckboxChange = (event: ChangeEvent<HTMLInputElement>): void => {
        setIsChecked(event.target.checked);
    };

    const isSubmitDisabled = !isChecked;
    const handleClose = (): void => {
        setModalOpen(false);
    };
    return modalOpen ? (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[100]">
            <div className="dark:bg-primary bg-white p-5 rounded-lg max-w-md w-full text-black dark:text-white text-left mb-20" style={{marginBottom:'800px'}}>
                <div className="relative">
                    <h2 className="text-lg w-full text-center font-[18px] text-black dark:text-white">
                        {TITLE}
                    </h2>
                    <button onClick={handleClose} className="absolute top-0 right-0 text-dark dark:text-white text-lg font-semibold">
                        <IconX stroke={2} />
                    </button>
                </div>
                <div className="mt-4">
                    <label className="text-[12px]">
                        <input
                            type="checkbox"
                            name="uploadRequired"
                            onChange={handleCheckboxChange}
                            className="mr-2 appearance-none checked:bg-Info checked:border-transparent h-3 w-3 rounded-sm border border-gray-300 cursor-pointer"
                        />
                        {CONFIRMATION_TEXT}
                    </label>
                </div>
                <div className="mt-4">
                    <button
                        disabled={isSubmitDisabled}
                        onClick={handleSubmit}
                        className="dark:bg-Info bg-default w-full text-[18px] text-white p-2 py-4 font-[400] rounded-[48px] disabled:opacity-[0.4]"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    ) : null;
};

export default Terms;
