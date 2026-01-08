import { MouseEventHandler, ReactElement } from 'react';

interface Props {
  handleClick: MouseEventHandler<HTMLButtonElement>;
  children: ReactElement;
  className?: string;
}

const SidebarActionButton = ({ handleClick, children, className }: Props) => (
  <button
    className={`min-w-[20px] dark:text-white text-black dark:hover:text-neutral-100 ${className}`}
    onClick={handleClick}
  >
    {children}
  </button>
);

export default SidebarActionButton;
