// src/components/EditorPanel.jsx
import React, { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';

export default function EditorPanel({
  value,
  setValue,
  language,
  onSelectLanguage,
  isLanguageMenuOpen,
  setIsLanguageMenuOpen,
  languages
}) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current) {
      // change language later is handled by prop change in Editor component
      editorRef.current.setValue(value);
    }
    // eslint-disable-next-line
  }, [language]);

  return (
    <div className="md:col-span-3 bg-[#1a1a2e] p-4 rounded-lg flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Coding Area (IDE)</h2>
        <div className="relative">
          <button onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md capitalize">
            {language}
          </button>
          {isLanguageMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-[#110c1b] rounded-md shadow-lg z-10 border border-gray-700">
              {languages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => onSelectLanguage(lang)}
                  className={`block w-full text-left px-4 py-2 text-sm capitalize text-gray-300 hover:bg-gray-900 hover:text-blue-400`}
                >
                  {lang}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1">
        <Editor
          height="calc(100vh - 170px)"
          defaultLanguage={language}
          language={language}
          defaultValue={value}
          value={value}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            automaticLayout: true,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace'
          }}
        />
      </div>
    </div>
  );
}
