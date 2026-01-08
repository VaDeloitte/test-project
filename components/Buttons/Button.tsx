import React, { useState } from 'react';

interface ToggleButtonProps {
  disabled?: any;
  className?: string;
  enabled?: boolean;  // ✅ Add controlled state prop
  onChange?: (enabled: boolean) => void;  // ✅ Add callback prop
  enableState?: () => void;  // Keep for backward compatibility
}

export default function ToggleButton({
  disabled, 
  className, 
  enabled: controlledEnabled,
  onChange,
  enableState
}: ToggleButtonProps) {
  // Use controlled state if provided, otherwise use local state
  const [localEnabled, setLocalEnabled] = useState(false);
  const enabled = controlledEnabled !== undefined ? controlledEnabled : localEnabled;

  const handleClick = () => {
    const newValue = !enabled;
    
    if (onChange) {
      onChange(newValue);  // ✅ Call parent callback
    } else {
      setLocalEnabled(newValue);  // Fallback to local state
    }
    
    if (enableState) {
      enableState();  // Legacy support
    }
  };

  return (
    <button
      type="button"
      aria-pressed={enabled}
      onClick={handleClick}
      disabled={disabled? disabled : false}
      className={`relative inline-flex items-center h-4 rounded-full w-8 transition-colors duration-300 focus:outline-none 
        ${enabled ? 'bg-[#43B02A]' : 'bg-gray-300'} ${disabled? "disabled:cursor-not-allowed": ""}`}
    >
      <span
        className={`inline-block w-3 h-3 transform bg-white rounded-full shadow-md transition-transform duration-300 
          ${enabled ? 'translate-x-4' : 'translate-x-1'}`}
      />
    </button>
  );
}
