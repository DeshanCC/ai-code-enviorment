import React, { useState, useEffect, useCallback } from 'react';
import { CODE_SNIPPETS, LANGUAGE_VERSIONS } from './constants';
import { executeCode } from './api/piston';
import RequirementsPanel from './components/RequirementsPanel';
import EditorPanel from './components/EditorPanel';
import ActionsPanel from './components/ActionsPanel';
import Toast from './components/Toast';
import DeveloperLogin from './components/DeveloperLogin';
import ProjectLogin from './components/ProjectLogin';
import styles from './App.module.css';

const LANGS = Object.keys(LANGUAGE_VERSIONS);
const API_BASE_URL = '/api'; 

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
  const [isCommitting, setIsCommitting] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

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
      const response = await fetch(`${API_BASE_URL}/create-project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const handleGenerateNFRs = async () => {
    if (!functionalRequirements) {
      showToast('Please enter functional requirements first.', 'warning');
      return;
    }
    setIsNfrLoading(true);
    showToast('✨ Generating NFRs with AI...', 'info');
    const frList = functionalRequirements.split('\n').filter(fr => fr.trim().length > 0);
    if (frList.length === 0) {
      showToast('No valid functional requirements entered.', 'warning');
      setIsNfrLoading(false);
      return;
    }
    const payload = {
      functional_requirements: frList,
      domain: "Web App", 
      project_id: projectId,
      save_to_db: true, 
    };
    try {
      const response = await fetch(`${API_BASE_URL}/nfr/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate NFRs.');
      }
      const data = await response.json();
      if (data && data.non_functional_requirements) {
        setNonFunctionalRequirements(data.non_functional_requirements); 
        showToast('NFRs generated successfully!', 'success');
      } else {
        throw new Error('Invalid response format from NFR generator.');
      }
    } catch (err) {
      console.error('NFR generation failed:', err);
      showToast(err.message || 'An unknown error occurred.', 'error');
      setNonFunctionalRequirements([]); 
    } finally {
      setIsNfrLoading(false);
    }
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

  const handleCommit = async () => {
    if (isCommitting) return;
    setIsCommitting(true);
    showToast('Committing and starting code review...', 'info');

    const parentCommitId = sessionStorage.getItem('lastCommitId') || null;
    const newCommitId = crypto.randomUUID();

    const payload = {
      parent_commit_id: parentCommitId,
      commit_id: newCommitId,
      project_id: projectId,
      developer_name: developerName,
      code_text: code,
      language: language,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/agents/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Commit failed.');
      }
      const data = await response.json();
      showToast('Commit successful! Review suggestions added.', 'success');
      const formattedSuggestions = data.llm_review_suggestions.map(s => (
        `[L${s.line_start}-${s.line_end} | ${s.severity}]: ${s.suggestion}`
      ));
      setSuggestions(formattedSuggestions);
      setActiveTab('Suggestions');
      sessionStorage.setItem('lastCommitId', newCommitId);
    } catch (err) {
      console.error('Commit failed:', err);
      showToast(err.message || 'An unknown error occurred.', 'error');
    } finally {
      setIsCommitting(false);
    }
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

  const handleMerge = async () => {
    if (isMerging) return;

    const parentCommitId = sessionStorage.getItem('lastCommitId');
    if (!parentCommitId) {
      showToast("You must commit your code at least once before merging.", "warning");
      return;
    }

    setIsMerging(true);
    showToast('Merging code and starting classification...', 'info');

    const newMergeCommitId = crypto.randomUUID();

    const payload = {
      parent_commit_id: parentCommitId,
      commit_id: newMergeCommitId,
      project_id: projectId,
      developer_name: developerName,
      code_text: code,
      language: language,
    };

    let requestError = null;

    fetch(`${API_BASE_URL}/classify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    .then(async response => { 
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Merge failed with HTTP error.' }));
        requestError = new Error(errorData.detail || 'Merge failed.');
      }
    })
    .catch(err => { // Catch network errors
      requestError = err;
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    if (requestError) {
      console.error('Merge failed:', requestError);
      showToast(requestError.message || 'An unknown error occurred.', 'error');
      setIsMerging(false); 
      return;
    }

    // No error flagged, proceed with success
    showToast('Merge request sent! Classifications are processing in the background.', 'success');
    
    setSuggestions([
      "Merge accepted. Your review classifications are being processed."
    ]);
    setActiveTab('Suggestions'); 

    sessionStorage.removeItem('lastCommitId');

    setIsMerging(false);
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
            isCommitting={isCommitting}
            isMerging={isMerging}
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