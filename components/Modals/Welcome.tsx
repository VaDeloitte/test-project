import React, { useState, useEffect, MouseEvent } from 'react';

interface TermsProps {
  setModalOpen: (isOpen: boolean) => void;
  modalOpen: boolean;
  store?: boolean;
}

const TITLE = 'Welcome to Genie!';

const Welcome: React.FC<TermsProps> = ({ setModalOpen, modalOpen, store = true }) => {
  const [hasReadRules, setHasReadRules] = useState(false);
  const [hasReadPrivacy, setHasReadPrivacy] = useState(false);

  // Load saved progress
  useEffect(() => {
    const readRules = localStorage.getItem('hasReadRules') === 'true';
    const readPrivacy = localStorage.getItem('hasReadPrivacy') === 'true';
    setHasReadRules(readRules);
    setHasReadPrivacy(readPrivacy);

    if (store) {
      const hasConfirmed = localStorage.getItem('hasConfirmed');
      if (hasConfirmed === 'true') {
        setModalOpen(false);
      } else {
        setModalOpen(true);
      }
    }
  }, [store, setModalOpen]);

  // Handle opening each document
  const handleReadRules = () => {
    setHasReadRules(true);
    localStorage.setItem('hasReadRules', 'true');
  };

  const handleReadPrivacy = () => {
    setHasReadPrivacy(true);
    localStorage.setItem('hasReadPrivacy', 'true');
  };

  // Handle Accept
  const handleSubmit = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    localStorage.setItem('hasConfirmed', 'true');
    setModalOpen(false);
  };


//   const TERMS_ACTIVATION_DATE = '2025-11-18'; // 👈 change ONLY this

// const isTermsExpired = () => {
//   const activation = localStorage.getItem('termsDate') || TERMS_ACTIVATION_DATE;

//   return (
//     Date.now() - new Date(activation).getTime() >
//     30 * 24 * 60 * 60 * 1000
//   );
// };

// useEffect(() => {
//   if (!modalOpen) return;

//   localStorage.setItem(
//     'termsDate', localStorage.getItem('termsDate') || TERMS_ACTIVATION_DATE);

//   if (isTermsExpired()) {
//     setModalOpen(false);
//     localStorage.setItem('hasConfirmed', 'true');
//   }
// }, [modalOpen]);

  // Button state
  const canAccept = hasReadRules && hasReadPrivacy;

  return modalOpen ? (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[100]">
      <div className="dark:bg-primary bg-white p-5 rounded-lg max-w-lg w-full text-black dark:text-white text-left max-h-[100vh] overflow-y-auto">
        <h2 className="lg:text-[20px] font-[700] flex justify-center mx-auto text-black dark:text-white text-[12px]">
          {TITLE}
        </h2>

        <div className="mt-4 text-[16px] font-[Calibri] mb-4">
          <p>
            We're thrilled to have you here! Before you begin, please review and accept our updated:
          </p>
          <ul className="list-disc ml-5 mt-2 space-y-2">
            <li>
              <a
                href="assets/Tax_Genie_2.0_Rules_of_the_Road.pdf"
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleReadRules}
                className="text-blue-500 underline"
              >
                Genie 3.0 Rules of the Road
              </a>
              {hasReadRules && <span className="ml-2 text-green-600 font-normal font-[Calibri] text-sm">✔ Read</span>}
            </li>
            <li>
              <a
                href="assets/TG_3.0_Privacy_Notice.pdf"
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleReadPrivacy}
                className="text-blue-500 underline"
              >
                Privacy Notice
              </a>
              {hasReadPrivacy && <span className="ml-2 text-green-600 font-normal font-[Calibri] text-sm">✔ Read</span>}
            </li>
          </ul>
        </div>

        <p className="mt-4 pb-3 font-[Calibri] px-4 pl-0 font-[700] text-[14px]">
          Click Accept to agree and get started!
        </p>
        <hr className="border-1 border-[#707087] mb-2 pb-2" />

        <div className="mt-4">
          <button
            onClick={handleSubmit}
            disabled={!canAccept}
            className="dark:bg-Info bg-default w-[80%] flex mx-auto  justify-center text-[18px] text-white p-2 py-2 font-[400] rounded-[48px] disabled:opacity-40"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  ) : null;
};

export default Welcome;
