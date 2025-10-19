import React, { useEffect } from 'react';

const colors = {
  info: 'bg-blue-500',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
};

export default function Toast({ message, status = 'info', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed top-5 right-5 text-white px-6 py-3 rounded-lg shadow-lg ${colors[status] || 'bg-gray-500'}`}>
      <p>{message}</p>
    </div>
  );
}
