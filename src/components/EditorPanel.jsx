// src/components/EditorPanel.jsx
import React from 'react';
import Editor from '@monaco-editor/react';
import styles from './EditorPanel.module.css'; // Import the CSS module

export default function EditorPanel({
  value,
  setValue,
  language,
  onSelectLanguage,
  isLanguageMenuOpen,
  setIsLanguageMenuOpen,
  languages
}) {
  function handleEditorDidMount(editor, monaco) {
    editor.onDidChangeModelContent(() => {
      setValue(editor.getValue());
    });
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>Coding Area (IDE)</h2>
        <div className={styles.languageSelector}>
          <button onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)} className={styles.languageButton}>
            {language}
          </button>
          {isLanguageMenuOpen && (
            <div className={styles.languageMenu}>
              {languages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => onSelectLanguage(lang)}
                  className={styles.languageOption}
                >
                  {lang}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.editorContainer}>
        <Editor
          height="calc(100vh - 170px)"
          language={language}
          value={value}
          theme="vs-dark"
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            automaticLayout: true,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            background: '#0d1117' // Set editor background explicitly
          }}
        />
      </div>
    </div>
  );
}