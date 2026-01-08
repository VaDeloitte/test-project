import { useState, useContext } from "react";
import { AuthContext } from '@/utils/app/azureAD';

export default function FeedbackModal({ activeTab, handleClose }: { activeTab: string; handleClose: () => void }) {
  const [feedback, setFeedback] = useState("");
  const authContext = useContext(AuthContext);

//userId: userData?.id
  const email = authContext?.user?.email
  const username = authContext?.user?.username || "User"

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFeedback(e.target.value);
  };

  const handleSubmit = () => {
    const to = "dmegenie@deloitte.com";
    const subject = `[Feedback] - Received from ${username}`;
    const body = `Feedback Submission via Genie 3.0
----------------------------------
Name: ${username}
Email: ${email}

Feedback:
---------
${feedback}

----------------------------------
Disclaimer: This email has been constructed using the feedback form within Genie 3.0 and is intended only for the Genie administrator team.
`;

    // mailto (opens default mail client)
    const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;

    //  close the modal after triggering:
    handleClose();
  };

  return (
    <>
      {/* Feedback */}
      {activeTab === "feedback" && (
        <>
          <h2 className="text-xl font-semibold mb-4 text-center">User feedback</h2>
          <textarea
            onChange={handleChange}
            value={feedback}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm mb-3 dark:bg-[#2E2E2E]"
            placeholder="Add a short description"
            rows={12}
          />
          <div className="absolute bottom-0 left-0 right-0 flex justify-end px-6 py-3 bg-white dark:bg-[#1E1E1E] rounded-b-2xl">
            <button
              onClick={handleSubmit}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-[#2E2E2E]"
            >
              Submit
            </button>
          </div>
        </>
      )}
    </>
  );
}