import React, { useState, useEffect, useCallback } from 'react';
import { CODE_SNIPPETS, LANGUAGE_VERSIONS } from './constants';
import { executeCode } from './api/piston';
import { callGemini } from './api/ai';
import RequirementsPanel from './components/RequirementsPanel';
import EditorPanel from './components/EditorPanel';
import ActionsPanel from './components/ActionsPanel';
import Toast from './components/Toast';
import DeveloperLogin from './components/DeveloperLogin'; 
import ProjectLogin from './components/ProjectLogin'; 
import styles from './App.module.css';

const LANGS = Object.keys(LANGUAGE_VERSIONS);
const PROJECT_API_BASE = 'http://127.0.0.1:8000';

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
  
  const [loginStep, setLoginStep] = useState('developer'); 
  const [developerName, setDeveloperName] = useState(null);
  const [projectName, setProjectName] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  useEffect(() => {
    const storedDevName = sessionStorage.getItem('developerName');
    const storedProjectName = sessionStorage.getItem('projectName');
    const storedProjectId = sessionStorage.getItem('projectId');

    if (storedDevName && storedProjectName && storedProjectId) {
      setDeveloperName(storedDevName);
      setProjectName(storedProjectName);
      setProjectId(storedProjectId);
      setLoginStep('done');
    } else if (storedDevName) {
      setDeveloperName(storedDevName);
      setLoginStep('project');
    } else {
      setLoginStep('developer');
    }
  }, []);

  const handleDeveloperLogin = useCallback((name) => {
    sessionStorage.setItem('developerName', name);
    setDeveloperName(name);
    setLoginStep('project'); 
  }, []);


  const showToast = (message, status = 'info') => {
    setToast({ message, status, id: Date.now() });
  };

  const handleProjectLogin = useCallback(async (newProjectName) => {
    setIsCreatingProject(true);

    const newProjectId = crypto.randomUUID();

    try {
      const response = await fetch(PROJECT_API_BASE + "/create-project", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: newProjectId,
          name: newProjectName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        showToast(errorData.detail || 'Failed to create project.', 'error');
        throw new Error(errorData.detail || 'Failed to create project.');
      }

      sessionStorage.setItem('projectName', newProjectName);
      sessionStorage.setItem('projectId', newProjectId);

      showToast(`Project "${newProjectName}" created successfully!`, 'success');

      setProjectName(newProjectName);
      setProjectId(newProjectId);
      setLoginStep('done');

    } catch (err) {
      console.error('Project creation failed:', err);
      if (!err.message.includes('Failed to create project')) {
        showToast(err.message || 'An unknown network error occurred.', 'error');
      }
    } finally {
      setIsCreatingProject(false);
    }
  }, []); 

  const onSelectLanguage = (lang) => {
    setLanguage(lang);
    const newCode = CODE_SNIPPETS[lang] || '';
    setCode(newCode);
    setOutput(null);
    setSuggestions([]);
    setIsLanguageMenuOpen(false);
  };

  const handleGenerateNFRs = () => {
    if (!functionalRequirements) {
      showToast('Please enter functional requirements first.', 'warning');
      return;
    }
    setIsNfrLoading(true);
    showToast('✨ Generating NFRs...', 'info');
    const prompt = `Based on the following functional requirements, generate a list of key non-functional requirements (NFRs). List each NFR on a new line without any prefixes like bullet points or numbers.\n\nFunctional Requirements:\n${functionalRequirements}`;
    callGemini(prompt, (text, error) => {
      setIsNfrLoading(false);
      if (error) {
        showToast(error, 'error');
      } else if (text) {
        setNonFunctionalRequirements(text.split('\n').filter((l) => l.trim() !== ''));
        showToast('NFRs generated successfully!', 'success');
      }
    });
  };

  const handleRunCode = async () => {
    if (!code) return;
    try {
      setIsLoading(true);
      const data = await executeCode(language, code);
      const run = data.run || {};
      const out = run.output ?? run.stdout ?? '';
      const stderr = run.stderr ?? run.time ?? '';
      if (out) {
        setOutput(out.split('\n'));
      } else if (run.output) {
        setOutput(run.output.split('\n'));
      } else {
        setOutput([stderr || 'No output']);
      }
      setIsError(!!run.stderr);
    } catch (err) {
      showToast(err.message || 'Unable to run code', 'error');
    } finally {
      setIsLoading(false);
    }
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

  if (loginStep === 'developer') {
    return <DeveloperLogin onLogin={handleDeveloperLogin} />;
  }

  if (loginStep === 'project') {
    return (
      <ProjectLogin
        onLogin={handleProjectLogin}
        isLoading={isCreatingProject}
      />
    );
  }

  return (
    <div className={styles.appContainer}>
      {toast && <Toast message={toast.message} status={toast.status} onClose={() => setToast(null)} />}
      <div className={styles.mainGrid}>
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
          showToast={showToast}
        />

        <div>
          <div className={styles.userDetailsWrapper}>
            <div className={styles.projectNameDisplay}>
              Project: <strong>{projectName}</strong>
            </div>
            <div className={styles.developerNameDisplay}>
              Developer: <strong>{developerName}</strong>
            </div>
          </div>
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
    </div>
  );
}