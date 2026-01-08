import { FC } from 'react';

interface Props {
  text?: any;
  icon: JSX.Element;
  onClick: () => void;
  collapsed?:boolean;
  style?:any;
  
}

export const SidebarButton: FC<Props> = ({ text, icon, onClick, collapsed, style }) => {
  return (
    <button
      className={`${style} ${collapsed ? ' flex items-center justify-center relative left-[2px]':'flex w-full cursor-pointer select-none items-center gap-3 rounded-md py-3 px-3 text-[14px] leading-3  hover:bg-gray-500/10'}`}
      onClick={onClick}
    >
      <div>{icon}</div>
      {collapsed ? '':<span className='ml-[-3px]'>{text}</span>}
    </button>
  );
};
