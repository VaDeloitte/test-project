import { IconRobot } from '@tabler/icons-react';
import Image from 'next/image';
import { FC } from 'react';

interface Props {}

export const ChatLoader: FC<Props> = () => {
  return (
    <div
      className="group  text-gray-800  dark:bg-transparent dark:text-gray-100"
      style={{ overflowWrap: 'anywhere' }}
    >
      <div className="ml-5 flex gap-4 p-4 text-base md:max-w-2xl md:gap-6 md:py-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
        <div className="items-end flex gap-4">
          <Image src={`/assets/logo-with-shadow.svg`} alt="Tax Genie logo" height={20} width={20} />
          <span className="text-sm loading-dots">Loading</span>
        </div>
        {/* <span className="animate-pulse cursor-default mt-1">▍</span> */}
      </div>
    </div>
  );
};
