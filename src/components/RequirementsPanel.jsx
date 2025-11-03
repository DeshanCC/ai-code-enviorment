import React from "react";
import styles from "./RequirementsPanel.module.css";

export default function RequirementsPanel({
  functionalRequirements,
  setFunctionalRequirements,
  handleGenerateNFRs,
  nonFunctionalRequirements,
  isNfrLoading,
}) {
  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>Requirements</h2>
      <textarea
        placeholder="Enter functional requirements here... (one per line)"
        value={functionalRequirements}
        onChange={(e) => setFunctionalRequirements(e.target.value)}
        className={styles.textArea}
      />
      <button
        onClick={handleGenerateNFRs}
        disabled={isNfrLoading}
        className={styles.button}
      >
        {isNfrLoading ? "Generating..." : "✨ Generate NFRs"}
      </button>
      <h3 className={styles.title}>Non-functional Requirements</h3>
      <div className={styles.nfrContainer}>
        {isNfrLoading ? (
          <p>Loading...</p>
        ) : nonFunctionalRequirements.length > 0 ? (
          <ul>
            {nonFunctionalRequirements.map((nfr) => (
              <li key={nfr.id || nfr.statement}>
                <strong>{nfr.category}:</strong> {nfr.statement}
              </li>
            ))}
          </ul>
        ) : (
          <p>AI-generated NFRs will appear here.</p>
        )}
      </div>
    </div>
  );
}