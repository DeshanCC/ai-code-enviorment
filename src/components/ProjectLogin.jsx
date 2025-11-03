import React, { useState } from 'react';
import styles from './DeveloperLogin.module.css';

export default function ProjectLogin({ onLogin, isLoading }) { 
  const [projectName, setProjectName] = useState('');
  const [localError, setLocalError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedName = projectName.trim();

    if (trimmedName.length === 0) {
      setLocalError('Project name cannot be empty.');
      return;
    }

    setLocalError(null);
    onLogin(trimmedName);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2>Create Project (Step 2/2)</h2>
        <p>Please enter a name for your new project.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            className={styles.input}
            placeholder="Enter project name..."
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            autoFocus
          />
          {localError && (
            <p className={styles.error}>{localError}</p>
          )}
          <button type="submit" className={styles.button} disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      </div>
    </div>
  );
}