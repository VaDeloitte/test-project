import React from 'react';

// Define an interface for the props
interface InactivityModalProps {
  isOpen: boolean;
  onContinue: () => void;
  onLogout: () => void;
}

const InactivityModal: React.FC<InactivityModalProps> = ({ isOpen, onContinue, onLogout }) => {
  if (!isOpen) return null; // Don't render the modal if it's not open

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[100]">
      <div className="dark:bg-primary bg-white p-5 rounded-lg max-w-lg w-full text-black dark:text-white text-center">
        <div className="relative flex flex-col justify-center items-center space-y-4">
          <h2 className="text-lg font-semibold">Session Timeout Warning</h2>
          <p>You have been inactive for a while. Do you want to continue your session?</p>
          <div className="flex space-x-4">
            <button className="model-button model-button-continue dark:bg-Info bg-default" onClick={onContinue}>
              Continue
            </button>
            <button className="model-button model-button-leave" onClick={onLogout}>
              Leave
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InactivityModal;
