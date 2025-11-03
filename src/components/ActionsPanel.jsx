// src/components/ActionsPanel.jsx
import React from 'react';
import styles from './ActionsPanel.module.css';

export default function ActionsPanel({
  handleCommit,
  handleMerge,
  handleCalculateRisk,
  activeTab,
  setActiveTab,
  handleRunCode,
  isLoading,
  isCommitting,
  isError,
  output,
  suggestions,
  metrics
}) {
  const TabButton = ({ name }) => (
    <button
      onClick={() => setActiveTab(name)}
      className={`${styles.tabButton} ${activeTab === name ? styles.activeTab : ''}`}
    >
      {name}
    </button>
  );

  return (
    <div className={styles.panel}>
      <div className={styles.buttonGrid}>
        <button 
          onClick={handleCommit} 
          className={`${styles.button} ${styles.commitButton}`}
          disabled={isCommitting}
        >
          {isCommitting ? 'Committing...' : 'Commit'}
        </button>
        <button onClick={handleMerge} className={`${styles.button} ${styles.mergeButton}`}>Merge</button>
      </div>
      <button onClick={handleCalculateRisk} className={`${styles.button} ${styles.riskButton}`}>Calculate Risk</button>

      <div className="flex-grow flex flex-col">
        <div className={styles.tabsContainer}>
          <TabButton name="Output" />
          <TabButton name="Suggestions" />
        </div>

        <div className={styles.tabContent}>
          {activeTab === 'Output' && (
            <>
              <button onClick={handleRunCode} disabled={isLoading} className={`${styles.button} ${styles.runButton}`}>
                {isLoading ? "Running..." : 'Run Code'}
              </button>
              <div className={`${styles.outputArea} ${isError ? styles.errorText : ''}`}>
                {output ? output.map((line, i) => <pre key={i}>{line}</pre>) : <span>Click "Run Code" to see the output.</span>}
              </div>
            </>
          )}
          {activeTab === 'Suggestions' && (
             <div className={styles.outputArea}>
              {suggestions.length > 0 ? (
                <ul>
                  {suggestions.map((sug, i) => <li key={i}>💡 {sug}</li>)}
                </ul>
              ) : <p>Suggestions from agents will appear here.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}