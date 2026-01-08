import { useState, useEffect } from 'react';
import { render } from 'react-dom';

interface CustomAlertProps {
  message: string;
  onClose: () => void;
}

export function CustomAlert({ message, onClose }: CustomAlertProps) {
  return (
    <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
        <p className="text-lg font-semibold mb-4">{message}</p>
        <button
          onClick={onClose}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          OK
        </button>
      </div>
    </div>
  );
}


type ToastType = 'success' | 'error' | 'warning';

interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
}

export function Toast({ message, type, duration = 10000 }: ToastProps) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration]);

  if (!show) return null;

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
  }[type];

  return (
    <div className={`fixed top-4 right-4 p-4 rounded-md text-white shadow-lg ${bgColor} z-50`}>
      <div className="flex items-center justify-between">
        <span>{message}</span>
        <button onClick={() => setShow(false)} className="ml-4 text-white font-bold">
          ×
        </button>
      </div>
    </div>
  );
}


export function showToast(message: string, type: 'success' | 'error' | 'warning' = 'success', duration = 10000) {
  const div = document.createElement('div');
  document.body.appendChild(div);
  render(<Toast message={message} type={type} duration={duration} />, div);
}
