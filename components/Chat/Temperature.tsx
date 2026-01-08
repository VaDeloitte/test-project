import { FC } from 'react';
import { IconAlertTriangle } from '@tabler/icons-react';

export const TemperatureSlider: FC<any> = () => {
  return (
    <div className="flex flex-col mb-8">
      <div className="flex gap-10 items-center bg-default xl:px-0 xl:py-6 p-8 border border-secondary">
        <div className="hidden ml-6 xl:block">
          <IconAlertTriangle size={30} />
        </div>
        <ul className="flex flex-col gap-4 list-disc text-white dark:text-white">
          <li>Genie and Genie's outputs may contain errors or inaccuracies, so double-check all outputs before using them for any business activities.</li>
          <li>Genie and Genie work with publicly available data for company-related tasks and should not be used with confidential and/or sensitive client information or confidential and/or sensitive Deloitte information. </li>
          <li>Adhere to ethical standards and respect clients' policies when using Genie. </li>
          <li>Usage of this tool is monitored. Please use it responsibly.</li>
        </ul>
      </div>
    </div>
  );
};
