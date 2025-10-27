// src/components/Toast.jsx
import React, { useEffect } from 'react';
import styles from './Toast.module.css';

const statusStyles = {
  info: styles.info,
  success: styles.success,
  warning: styles.warning,
  error: styles.error,
};

export default function Toast({ message, status = 'info', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  // Combine the base toast class with the specific status class
  const toastClassName = `${styles.toast} ${statusStyles[status] || styles.info}`;

  return (
    <div className={toastClassName}>
      <p>{message}</p>
    </div>
  );
}