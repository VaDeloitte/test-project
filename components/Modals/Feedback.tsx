import React, { useEffect, useState } from 'react';
import { IconX } from '@tabler/icons-react';
import { IconCircleCheck } from '@tabler/icons-react';


function FeedbackModal(props: any): JSX.Element | null {
    const [modalOpen, setModalOpen] = useState<boolean>(true); // Assuming the modal should be open initially
    const [isSubmitted, setisSubmitted] = useState<boolean>(false);
    const [name, setName] = useState<string>();
    const [email, setEmail] = useState<string>();
    const [description, setDescription] = useState<string>();


    const handleClose = (): void => {
        props.setModalOpen(false);
    };

    const handleSubmit = (event: any): void => {
        // Handle the submission logic and construct a mailto link
        event.preventDefault();
        if (email == "" || name == "") {
            return;
        }

        const subject = `[Feedback] - Received from ${name}`;
        // Deliberately aligning text to the left for readability of email constructed
        const body = `Feedback Submission via Genie 2.0
----------------------------------
Name: ${name}
Email: ${email}
        
Feedback:
---------
${description}
        
----------------------------------
Disclaimer: This email has been constructed using the feedback form within Genie 2.0 and is intended only for the Genie administrator team.
`;
        const mailtoLink = `mailto:dmegenie@deloitte.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoLink;
        setisSubmitted(true); // Close modal on submit
    };

    const [validForm, setValidForm] = useState(false);
    useEffect(() => {
        if (name && email && isEmailValid(email) && description) {
            setValidForm(true);
        } else {
            setValidForm(false);
        }
    }, [name, email, description])

    function isEmailValid(email: string) {
        const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
        return emailRegex.test(email);
    }


    return modalOpen ? (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[100]">
            <div className="dark:bg-primary bg-white p-5 rounded-lg max-w-md w-full text-black dark:text-white">
                <div className="relative">
                    {!isSubmitted && <>
                        <h2 className="text-lg w-full text-center font-[18px]">Feedback</h2>
                        <p className="dark:text-white text-black text-[14px] text-center font-[200]">Please fill in the following form with any feedback</p></>}
                    <button onClick={handleClose} className="absolute top-0 right-0 text-dark dark:text-white text-lg font-semibold">
                        <IconX stroke={2} />
                    </button>
                </div>
                {!isSubmitted && <>
                    <div className="mt-4">
                        <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} className="w-full p-4 rounded-md dark:bg-transparent border dark:border-[#65687C] border-black" />
                    </div>
                    <div className="mt-4">
                        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 rounded-md dark:bg-transparent border dark:border-[#65687C] border-black" />
                    </div>
                    <div className="mt-4">
                        <textarea name="Description" id="Description" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-4 rounded-md dark:bg-transparent border dark:border-[#65687C] border-black" cols={30} rows={4}></textarea>
                    </div></>}
                {isSubmitted && <>
                    <div className="text-center py-10 min-h-[400px] flex flex-col items-center justify-center">
                        <IconCircleCheck color='#87BE42' size={100} className="mb-6" />
                        <h1 className="text-[38px] mb-2 font-[500]">Success!</h1>
                        <p className="mt-6 font-[100] mb-2">Thank you! </p>
                        <p className="font-[100]">Please click send on the email message which appears.</p>
                    </div></>}
                <div className="mt-4">
                   {!isSubmitted && <button onClick={handleSubmit} disabled={!validForm} className="dark:bg-Info bg-default w-full text-[18px] text-white p-2 py-4 font-[400] rounded-md">Submit</button>}

                    {isSubmitted &&
                        <button onClick={handleClose} className="dark:bg-Info bg-default w-full text-[18px] text-white p-2 py-4 font-[400] rounded-md disabled:opacity-[.7]">Close</button>
                    }
                </div>
            </div>
        </div>
    ) : null;
}

export default FeedbackModal;
