import React from 'react';

interface MessageIconProps {
  label: string;
  className?: string;
  color?: string;
}

// Hash the label to generate a consistent color
const getColorFromLabel = (label: string): string => {
    let hash = 0;
    for (let i = 0; i < label.length; i++) {
        hash = label.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = '#' + ((hash >> 24) & 0xFF).toString(16).padStart(2, '0') +
                        ((hash >> 16) & 0xFF).toString(16).padStart(2, '0') +
                        ((hash >> 8) & 0xFF).toString(16).padStart(2, '0');
    return color;
};

// Function to generate a random hex color
const getRandomColor = (): string => {
    const letters = '0123456789ABCDEF';
    let color = '';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
};

const MessageIcon: React.FC<MessageIconProps> = ({label, className}) => {
    return (
        <div
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-black dark:text-black dark:bg-white ${className}`}
        >
            {label?.charAt(0).toUpperCase()}
        </div>
    );
};

const ColoredMessageIcon: React.FC<MessageIconProps> = ({label, className, color }) => {
    const randomColor = color || getColorFromLabel(label);
    return (
        <div
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-bold ${className}`}
            style={{ backgroundColor: `${randomColor}` }}
        >
            {label?.charAt(0).toUpperCase()}
        </div>
    );
};

export { MessageIcon, ColoredMessageIcon};
