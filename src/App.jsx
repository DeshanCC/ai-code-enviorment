import React, { useState, useEffect } from 'react';
import { CODE_SNIPPETS, LANGUAGE_VERSIONS } from './constants';
import { executeCode } from './api/piston';
import { callGemini } from './api/ai';
import RequirementsPanel from './components/RequirementsPanel';
import EditorPanel from './components/EditorPanel';
import ActionsPanel from './components/ActionsPanel';
import Toast from './components/Toast';

const LANGS = Object.keys(LANGUAGE_VERSIONS);

export default function App() {
  const [toast, setToast] = useState(null);
  const [functionalRequirements, setFunctionalRequirements] = useState('');
  const [nonFunctionalRequirements, setNonFunctionalRequirements] = useState([]);
  const [isNfrLoading, setIsNfrLoading] = useState(false);
  const [code, setCode] = useState(CODE_SNIPPETS.javascript);
  const [language, setLanguage] = useState('javascript');
  const [output, setOutput] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Output');

  const showToast = (message, status = 'info') => {
    setToast({ message, status, id: Date.now() });
  };

  const onSelectLanguage = (lang) => {
    setLanguage(lang);
    const newCode = CODE_SNIPPETS[lang] || '';
    setCode(newCode);
    setOutput(null);
    setSuggestions([]);
    setIsLanguageMenuOpen(false);
  };

  const handleCommit = () => {
    showToast('Triggering Code Review Agent...', 'info');
    setTimeout(() => {
      setSuggestions([
        "Suggestion: The function `greet` could be optimized for performance.",
        "Style: Consider adding a JSDoc block for the `greet` function.",
        "Security: Hardcoded string 'World' might be a vulnerability. Consider parameterizing."
      ]);
      setActiveTab('Suggestions');
    }, 1500);
  };

  const handleCalculateRisk = () => {
    showToast('Triggering Risk Control Agent...', 'info');
    setTimeout(() => {
      setSuggestions([
        "Risk Identified: High complexity in the main function may lead to maintenance issues.",
        "Risk Identified: Lack of input validation poses a security risk.",
      ]);
      setActiveTab('Suggestions');
    }, 1500);
  };

  const handleMerge = () => {
    showToast('Merge successful!', 'success');
    setSuggestions([]);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics([
        `Coding Time: ${Math.floor(Math.random() * 60)} minutes`,
        `Lines of Code: ${code.split('\n').length}`,
        `Commits this session: ${Math.floor(Math.random() * 5)}`,
        `Code Churn: ${Math.floor(Math.random() * 50)} lines`,
      ]);
    }, 5000);
    return () => clearInterval(interval);
  }, [code]);

  return (
    <div className="text-gray-300 p-6 bg-[#0f0a19] min-h-screen">
      {toast && <Toast message={toast.message} status={toast.status} onClose={() => setToast(null)} />}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <RequirementsPanel
          functionalRequirements={functionalRequirements}
          setFunctionalRequirements={setFunctionalRequirements}
          handleGenerateNFRs={handleGenerateNFRs}
          nonFunctionalRequirements={nonFunctionalRequirements}
          isNfrLoading={isNfrLoading}
        />

        <EditorPanel
          value={code}
          setValue={setCode}
          language={language}
          onSelectLanguage={onSelectLanguage}
          isLanguageMenuOpen={isLanguageMenuOpen}
          setIsLanguageMenuOpen={setIsLanguageMenuOpen}
          languages={LANGS}
        />

        <ActionsPanel
          handleCommit={handleCommit}
          handleMerge={handleMerge}
          handleCalculateRisk={handleCalculateRisk}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          handleRunCode={handleRunCode}
          isLoading={isLoading}
          isError={isError}
          output={output}
          suggestions={suggestions}
          metrics={metrics}
        />
      </div>
    </div>
  );
}
