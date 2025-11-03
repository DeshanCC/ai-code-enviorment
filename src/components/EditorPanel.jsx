import React, { useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { callGemini } from '../api/ai';
import styles from './EditorPanel.module.css';

export default function EditorPanel({
  value,
  setValue,
  language,
  onSelectLanguage,
  isLanguageMenuOpen,
  setIsLanguageMenuOpen,
  languages,
  showToast
}) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const providerRef = useRef(null); // will hold { language, disposable }
  const debounceTimerRef = useRef(null);
  const lastPositionRef = useRef(null);
  const cachedSuggestionsRef = useRef([]);
  const isFetchingRef = useRef(false);
  const fetchVersionRef = useRef(0); // token to avoid stale overwrites
  const languageRef = useRef(language);

  /* -----------------------------
     Helpers: comment & context detection
     ----------------------------- */
  function getLine(code, lineNumber) {
    const lines = code.split('\n');
    return lines[Math.max(0, lineNumber - 1)] || '';
  }

  function isCursorInsideLineComment(lineUpToCursor) {
    const trimmed = lineUpToCursor.trim();
    return trimmed.startsWith('//');
  }

  // Basic block comment detection: scans upwards for '/*' without closing '*/'
  function isCursorInsideBlockComment(code, position) {
    const lines = code.split('\n').slice(0, position.lineNumber);
    const joined = lines.join('\n');
    const openIndex = joined.lastIndexOf('/*');
    if (openIndex === -1) return false;
    const closeIndex = joined.lastIndexOf('*/');
    return openIndex > closeIndex;
  }

  function isCursorInsideComment(code, position) {
    const line = getLine(code, position.lineNumber);
    const lineUpToCursor = line.substring(0, position.column - 1);
    return (
      isCursorInsideLineComment(lineUpToCursor) ||
      isCursorInsideBlockComment(code, position)
    );
  }

  function detectTodoLike(lineUpToCursor) {
    return /\/\/\s*(todo|fixme|optimi[sz]e|improve)/i.test(lineUpToCursor) ||
           /\/\*\s*(todo|fixme|optimi[sz]e|improve)/i.test(lineUpToCursor);
  }

  /* -----------------------------
     Prompt building and parsing
     ----------------------------- */
  const buildPrompt = useCallback((language, context, lineUpToCursor, position, intentType) => {
    // intentType: 'dot'|'paren'|'comment'|'continue'
    let instruction = '';
    if (intentType === 'comment') {
      instruction = `Interpret the comment as an instruction. Provide up to 5 concrete, runnable ${language} code snippets or completions that implement the comment's intent. Use actual variable/function names found in the CONTEXT when applicable.`;
    } else if (intentType === 'dot') {
      instruction = `The user typed a dot access. Suggest only methods/properties appropriate to the object in context. Return members as code snippets.`;
    } else if (intentType === 'paren') {
      instruction = `The user opened a parenthesis. Suggest likely function parameters/arguments for this call (comma-separated).`;
    } else {
      instruction = `Suggest up to 5 concise code completions that continue from the current line.`;
    }

    // Be explicit about strict JSON-only response and maximum suggestions to simplify parsing.
    return `You are a strict, non-verbose code completion assistant.
CONTEXT (${language}):
\`\`\`${language}
${context}
\`\`\`

LINE_UP_TO_CURSOR: "${lineUpToCursor}"
POSITION: Line ${position.lineNumber}, Column ${position.column}

TASK: ${instruction}

RESPONSE_FORMAT:
You MUST respond with ONLY a valid JSON array (no explanation, no markdown, no other keys, no "reasoning" fields).
Your entire response must start with '[' and end with ']'.
Return a maximum of 5 items.
[
  {
    "label": "short label shown in autocomplete",
    "insertText": "exact text to insert at cursor",
    "detail": "brief one-line explanation",
    "kind": "method|property|function|variable|keyword"
  }
]
`;
  }, []);

  const parseAIResponse = useCallback((rawText) => {
    try {
      // strip triple backticks and other markdown wrappers
      let cleaned = rawText.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
      // find the first JSON array
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (!match) {
        throw new Error('No JSON array found');
      }
      const parsed = JSON.parse(match[0]);
      if (!Array.isArray(parsed)) throw new Error('Parsed response not an array');
      return parsed;
    } catch (e) {
      console.warn('parseAIResponse failed:', e);
      return null;
    }
  }, []);

  /* -----------------------------
     Mock fallback suggestions
     ----------------------------- */
  function generateMockFallback(lineUpToCursor, language) {
    // Very simple heuristics — keeps editor usable offline or on AI failure.
    const fallback = [];
    if (/convert.*async|async/i.test(lineUpToCursor)) {
      fallback.push({
        label: 'async/await refactor',
        insertText: 'async function name() { /* ... */ }',
        detail: 'Fallback: basic async function skeleton',
        kind: 'function'
      });
    }
    if (/handle error|error/i.test(lineUpToCursor)) {
      fallback.push({
        label: 'try/catch',
        insertText: 'try {\n  // ...\n} catch (err) {\n  console.error(err);\n}',
        detail: 'Fallback: try/catch block',
        kind: 'method'
      });
    }
    if (fallback.length === 0) {
      // generic
      fallback.push({
        label: 'example snippet',
        insertText: '// TODO: implement',
        detail: 'Fallback suggestion',
        kind: 'keyword'
      });
    }
    return fallback;
  }

  /* -----------------------------
     Core: request AI, process, cache
     ----------------------------- */
  const getAICompletions = useCallback(async (code, position, language) => {
    // Build minimal context window
    const lines = code.split('\n');
    const startLine = Math.max(0, position.lineNumber - 15);
    const contextLines = lines.slice(startLine, position.lineNumber);
    const context = contextLines.join('\n');
    const currentLine = lines[position.lineNumber - 1] || '';
    const lineUpToCursor = currentLine.substring(0, position.column - 1);

    const lastChar = lineUpToCursor.trim().slice(-1);
    const isDotAccess = lastChar === '.';
    const isOpenParen = lastChar === '(';
    const insideComment = isCursorInsideComment(code, position);
    const isTodo = detectTodoLike(lineUpToCursor);

    let intentType = 'continue';
    if (insideComment) intentType = 'comment';
    else if (isDotAccess) intentType = 'dot';
    else if (isOpenParen) intentType = 'paren';

    const prompt = buildPrompt(language, context, lineUpToCursor, position, intentType);

    return new Promise((resolve) => {
      callGemini(prompt, (text, error) => {
        if (error) {
          console.error('❌ Gemini API error:', error);
          resolve({ success: false, raw: null, fallback: generateMockFallback(lineUpToCursor, language), info: error });
          return;
        }

        const parsed = parseAIResponse(text);
        if (!parsed) {
          console.warn('⚠️ No valid JSON parsed from Gemini response');
          resolve({ success: false, raw: text, fallback: generateMockFallback(lineUpToCursor, language) });
          return;
        }

        // Normalize entries
        const normalized = parsed.slice(0, 6).map((item, idx) => ({
          label: item.label || `suggestion ${idx + 1}`,
          insertText: item.insertText || item.label || '',
          detail: item.detail || 'AI suggestion',
          kind: item.kind || 'method'
        }));

        resolve({ success: true, suggestions: normalized });
      });
    });
  }, [buildPrompt, parseAIResponse]);

  const processAndEnhanceSuggestions = useCallback((rawCompletions, code, position) => {
    // Basic context heuristics for ranking
    const lines = code.split('\n');
    const currentLine = lines[position.lineNumber - 1] || '';
    const lineUpToCursor = currentLine.substring(0, position.column - 1);
    const objectContextMatch = lineUpToCursor.match(/(\w+)\.\s*$/);
    const objectName = objectContextMatch ? objectContextMatch[1] : null;

    const ranked = rawCompletions.map((c, i) => {
      let insertText = c.insertText;
      let label = c.label;
      let detail = c.detail;
      let kind = c.kind;

      // If dot access: remove object prefix if AI returned it
      if (objectName) {
        const prefixRegex = new RegExp(`^${objectName}\\.`);
        insertText = insertText.replace(prefixRegex, '');
        label = label.replace(prefixRegex, '');
      }

      // ensure parentheses pairing for method-ish suggestions
      if (insertText.includes('(') && !insertText.includes(')')) insertText += ')';

      // heuristics score
      let score = 0;
      if (/await|async/.test(insertText) || /await|async/.test(detail)) score += 50;
      if (/try|catch/.test(insertText) || /try|catch/.test(detail)) score += 40;
      if (objectName && (label.includes(objectName) || insertText.includes(objectName))) score += 20;
      if (i < 2) score += 10; // favor top items

      return { label, insertText, detail: `🤖 ${detail}`, kind, score, index: i };
    });

    // sort descending by score, then by original index
    ranked.sort((a, b) => (b.score - a.score) || (a.index - b.index));

    // map to Monaco-ready suggestion shape (done later in fetchAndCacheSuggestions)
    return ranked;
  }, []);

  const fetchAndCacheSuggestions = useCallback(async (code, position, language, monaco, editor, triggerChar = null) => {
    if (isFetchingRef.current) {
      console.log('⏭️ Already fetching, skipping new fetch');
      return;
    }

    isFetchingRef.current = true;
    const currentFetchToken = ++fetchVersionRef.current;
    console.log('🔄 Fetching AI completions... token=', currentFetchToken, 'lang=', language);

    try {
      const result = await getAICompletions(code, position, language);

      // if newer fetch started, discard this result
      if (currentFetchToken !== fetchVersionRef.current) {
        console.log('⛔ Stale fetch result - ignoring');
        return;
      }

      let rawSuggestions = [];
      if (result.success) {
        rawSuggestions = result.suggestions;
      } else {
        // show a toast once for failure (don't flood)
        if (showToast) showToast('⚠️ AI suggestion failed, using fallback suggestions', 'warning');
        rawSuggestions = result.fallback || [];
      }

      const processed = processAndEnhanceSuggestions(rawSuggestions, code, position);

      const kindMap = {
        function: monaco.languages.CompletionItemKind.Function,
        variable: monaco.languages.CompletionItemKind.Variable,
        keyword: monaco.languages.CompletionItemKind.Keyword,
        method: monaco.languages.CompletionItemKind.Method,
        property: monaco.languages.CompletionItemKind.Property,
        class: monaco.languages.CompletionItemKind.Class,
        constant: monaco.languages.CompletionItemKind.Constant,
      };

      // Check if we're in a comment to decide insert behavior
      const insideComment = isCursorInsideComment(code, position);
      const model = editor.getModel();
      const currentLine = model.getLineContent(position.lineNumber);
      const indentationMatch = currentLine.match(/^\s*/);
      const indentation = indentationMatch ? indentationMatch[0] : '';
      
      let range;
      
      if (insideComment) {
        // If in a comment, we want to insert on the *next* line.
        // Set the range to the *end* of the current line.
        range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: model.getLineMaxColumn(position.lineNumber), // End of the current line
          endColumn: model.getLineMaxColumn(position.lineNumber),   // End of the current line
        };
      } else {
        // Original logic for in-line completion
        const word = model.getWordUntilPosition(position);
        range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word ? word.startColumn : position.column,
          endColumn: word ? word.endColumn : position.column,
        };
      }

      // convert to Monaco suggestions
      cachedSuggestionsRef.current = processed.map((s, idx) => {
        
        // Adjust insertText if it's a comment-based generation
        let finalInsertText = s.insertText;
        if (insideComment) {
          // Add indentation to each new line of the snippet
          const indentedSnippet = s.insertText
            .split('\n')
            .map(line => line.trim().length > 0 ? indentation + line : line) // Apply indent
            .join('\n');
          finalInsertText = '\n' + indentedSnippet; // Add a newline *before*
        }

        return {
          label: s.label,
          kind: kindMap[s.kind] || monaco.languages.CompletionItemKind.Text,
          detail: s.detail,
          insertText: finalInsertText,
          range: range,
          documentation: s.detail,
          sortText: `${String(1000 - s.score).padStart(4, '0')}_${idx}` // better sort by score (lower sortText appears first)
        };
      });

      console.log('💾 Cached', cachedSuggestionsRef.current.length, 'suggestions');
      // trigger suggest only if the editor still has focus & we're at same position
      setTimeout(() => {
        try {
          editor.trigger('ai', 'editor.action.triggerSuggest', {});
          console.log('🎯 Triggered suggestion widget');
        } catch (e) {
          console.warn('Failed to trigger suggest:', e);
        }
      }, 120);
    } catch (error) {
      console.error('❌ Error in fetchAndCacheSuggestions:', error);
      if (showToast) showToast('❌ Unexpected AI error', 'error');
    } finally {
      isFetchingRef.current = false;
    }
  }, [getAICompletions, processAndEnhanceSuggestions, showToast, isCursorInsideComment, buildPrompt, parseAIResponse]);

  /* -----------------------------
     Completion provider registration
     ----------------------------- */
  const registerCompletionProvider = useCallback((monaco, editor) => {
    // avoid re-registering for same language
    if (providerRef.current && providerRef.current.language === language) {
      console.log('🔒 Provider already registered for', language);
      return;
    }

    // dispose previous provider if exists
    if (providerRef.current && providerRef.current.disposable) {
      try {
        providerRef.current.disposable.dispose();
      } catch (e) {
        console.warn('Failed to dispose previous provider', e);
      }
      providerRef.current = null;
    }

    const provider = monaco.languages.registerCompletionItemProvider(language, {
      triggerCharacters: ['.', '('],
      provideCompletionItems: async (model, position, context) => {
        const code = model.getValue();
        const isManualTrigger = context.triggerKind === monaco.languages.CompletionTriggerKind.Invoke;
        const triggerChar = context.triggerCharacter || null;

        console.log('📞 provideCompletionItems called, trigger:', context.triggerKind, 'char:', triggerChar);

        // If manual trigger, force fetch immediately
        if (isManualTrigger) {
          cachedSuggestionsRef.current = [];
          await fetchAndCacheSuggestions(code, position, language, monaco, editor, triggerChar);
          return { suggestions: cachedSuggestionsRef.current };
        }

        // Adaptive debounce: short delay for '.' or '('
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        const delay = (triggerChar === '.' || triggerChar === '(') ? 800 : 2500;
        lastPositionRef.current = { line: position.lineNumber, column: position.column };

        debounceTimerRef.current = setTimeout(() => {
          console.log(`⏱️ ${delay}ms debounce elapsed - fetching suggestions...`);
          fetchAndCacheSuggestions(code, position, language, monaco, editor, triggerChar);
        }, delay);

        // If we have cached suggestions already and the cursor hasn't moved much, return them immediately
        if (cachedSuggestionsRef.current.length > 0) {
          return { suggestions: cachedSuggestionsRef.current };
        }

        // Otherwise, return empty and wait for fetch to populate cache
        return { suggestions: [] };
      }
    });

    providerRef.current = { language, disposable: provider };
    console.log('✅ Registered provider for', language);
  }, [language, fetchAndCacheSuggestions]);

  /* -----------------------------
     Editor mount + keybinding behaviour
     ----------------------------- */
  function handleEditorDidMount(editor, monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.onDidChangeModelContent(() => {
      setValue(editor.getValue());
      // clear cache because context changed
      if (cachedSuggestionsRef.current.length > 0) {
        cachedSuggestionsRef.current = [];
      }
    });

    // Alt+Enter -> comment-aware AI trigger (less intrusive than plain Shift)
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.Enter, async () => {
      console.log('⚡ Alt+Enter pressed - comment-aware AI trigger');
      const position = editor.getPosition();
      const code = editor.getValue();
      const insideComment = isCursorInsideComment(code, position);

      if (!insideComment) {
        // If not in comment, give a friendly hint
        if (showToast) showToast('Place cursor inside a comment to use comment-intent suggestions (Alt+Enter)', 'info');
      }

      cachedSuggestionsRef.current = [];
      await fetchAndCacheSuggestions(code, position, languageRef.current, monaco, editor);
      setTimeout(() => {
        try {
          editor.trigger('ai', 'editor.action.triggerSuggest', {});
        } catch (e) {
          console.warn('Failed to trigger suggest after Alt+Enter', e);
        }
      }, 80);
    });

    // Keep Ctrl/Cmd + Space as manual trigger
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, async () => {
      console.log('⚡ Ctrl+Space pressed - manual AI completions');
      const position = editor.getPosition();
      const code = editor.getValue();
      cachedSuggestionsRef.current = [];
      await fetchAndCacheSuggestions(code, position, languageRef.current, monaco, editor);
      setTimeout(() => {
        try {
          editor.trigger('ai', 'editor.action.triggerSuggest', {});
        } catch (e) {
          console.warn('Failed to trigger suggest after Ctrl+Space', e);
        }
      }, 80);
    });

    registerCompletionProvider(monaco, editor);

    if (showToast) {
      showToast('✨ AI completion ready — Alt+Enter for comment-intent, Ctrl+Space for manual', 'info');
    }
  }

  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      // dispose provider on unmount
      if (providerRef.current?.disposable) {
        try {
          providerRef.current.disposable.dispose();
        } catch (e) {}
      }
    };
  }, []);

  React.useEffect(() => {
    languageRef.current = language;
  }, [language]);

  React.useEffect(() => {
    if (monacoRef.current && editorRef.current) {
      cachedSuggestionsRef.current = [];
      registerCompletionProvider(monacoRef.current, editorRef.current);
    }
  }, [language, registerCompletionProvider]);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>Coding Area (IDE) ✨</h2>
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
            background: '#0d1117',
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnCommitCharacter: true,
            acceptSuggestionOnEnter: 'on',
            wordBasedSuggestions: 'off',
            suggest: {
              showWords: false,
              showSnippets: false,
            },
          }}
        />
      </div>
    </div>
  );
}