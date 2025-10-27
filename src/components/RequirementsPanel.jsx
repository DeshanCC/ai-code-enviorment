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
        placeholder="Enter functional requirements here..."
        value={functionalRequirements}
        onChange={(e) => setFunctionalRequirements(e.target.value)}
        className={styles.textArea}
      />
      <button
        onClick={handleGenerateNFRs}
        disabled={isNfrLoading}
        className={styles.button}
      >
        {isNfrLoading ? "..." : "✨ Generate NFRs"}
      </button>
      <h3 className={styles.title}>Non-functional Requirements</h3>
      <div className={styles.nfrContainer}>
        {nonFunctionalRequirements.length > 0 ? (
          <ul>
            {nonFunctionalRequirements.map((nfr, i) => (
              <li key={i}>- {nfr}</li>
            ))}
          </ul>
        ) : (
          <p>AI-generated NFRs will appear here.</p>
        )}
      </div>
    </div>
  );
}
