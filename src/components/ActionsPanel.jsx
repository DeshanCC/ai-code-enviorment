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
  isMerging, 
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
          disabled={isCommitting || isMerging} // Also disable commit while merging
        >
          {isCommitting ? 'Committing...' : 'Commit'}
        </button>
        {/* --- Button is updated --- */}
        <button 
          onClick={handleMerge} 
          className={`${styles.button} ${styles.mergeButton}`}
          disabled={isCommitting || isMerging} // Disable while committing or merging
        >
          {isMerging ? 'Merging...' : 'Merge'}
        </button>
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
                  {/* Updated to handle formatted strings from both commit and merge */}
                  {suggestions.map((sug, i) => (
                    <li 
                      key={i} 
                      // Render the bold markdown text as HTML
                      dangerouslySetInnerHTML={{ __html: `💡 ${sug}` }} 
                    />
                  ))}
                </ul>
              ) : <p>Commit to see AI code review suggestions.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}