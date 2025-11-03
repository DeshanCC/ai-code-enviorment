import React, { useState } from 'react';
import styles from './DeveloperLogin.module.css';

export default function DeveloperLogin({ onLogin }) {
  const [name, setName] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      setError('Name cannot be empty.');
      return;
    }
    if (trimmedName.length <= 3) {
      setError('Name must be more than 3 letters.');
      return;
    }

    // Validation passed
    setError(null);
    onLogin(trimmedName);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2>Welcome, Developer!! (Step 1/2)</h2>
        <p>Please enter your name to start your session.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            className={styles.input}
            placeholder="Enter your name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.button}>
            Next
          </button>
        </form>
      </div>
    </div>
  );
}