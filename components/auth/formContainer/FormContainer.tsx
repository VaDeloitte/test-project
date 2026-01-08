import React from 'react';

import { FormContainerProps } from './FormContainer.index';

const FormContainer: React.FC<FormContainerProps> = ({
  formContent,
  formFooter = () => null,
  formLabel,
  formDesc,
}) => {
  return (
    <div
      className={`w-[500px] min-h-[220px] bg-[#1E1D22] rounded-[17px] flex justify-between flex-col`} //changed min-h from 420
    >
      <div
        className={`w-[500px] min-h-[240px] bg-[#26252A] rounded-[17px] drop-shadow-lg shadow-black p-8 flex items-center flex-col`}
      >
        <div className="mb-[24px] flex flex-col gap-6">
          <span className="text-white font-bold text-2xl text-center">
            {formLabel}
          </span>
          <span className="text-[#A5A6A8] text-[14px]">{formDesc}</span>
        </div>
        <div className="flex flex-col w-full">{formContent()}</div>
      </div>
      {/* <div className={`flex justify-center items-center h-[120px]`}>
        <div className="mb-[24px] flex flex-col">{formFooter()}</div>
      </div> */}
    </div>
  );
};

export default FormContainer;
