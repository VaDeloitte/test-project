import React from 'react';

interface IconButtonProps {
  icon: React.ReactNode;
  label: string;
  id?:string;
   onClick?: () => void;
}

const IconButton: React.FC<IconButtonProps> = ({ icon,id, label, onClick }) => {
  return (
    <button onClick={onClick} className={`${id} flex items-center space-x-2 md:px-3 px-1 justify-center mx-auto py-2 hover:bg-gray-200 rounded text-sm font-calibri font-medium text-gray-700`}>
      {icon}
      <span>{label}</span>
    </button>
  );
};

export default IconButton;
