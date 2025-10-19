import React from 'react';

export default function ActionsPanel({
  handleCommit,
  handleMerge,
  handleCalculateRisk,
  activeTab,
  setActiveTab,
  handleRunCode,
  isLoading,
  isError,
  output,
  suggestions,
  metrics
}) {
  const TabButton = ({ name }) => (
    <button
      onClick={() => setActiveTab(name)}
      className={`px-4 py-2 text-sm font-medium rounded-t-lg ${activeTab === name ? 'bg-[#0f0a19] text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:bg-gray-700'}`}
    >
      {name}
    </button>
  );

  return (
    <div className="md:col-span-1 bg-[#1a1a2e] p-4 rounded-lg flex flex-col space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <button onClick={handleCommit} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-200">Commit</button>
        <button onClick={handleMerge} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-200">Merge</button>
      </div>
      <button onClick={handleCalculateRisk} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-md transition duration-200">Calculate Risk</button>

      <div className="flex-grow flex flex-col">
        <div className="border-b border-gray-700">
          <nav className="-mb-px flex space-x-4" aria-label="Tabs">
            <TabButton name="Output" />
            <TabButton name="Suggestions" />
            <TabButton name="Metrics" />
          </nav>
        </div>

        <div className="pt-4 flex-grow bg-[#0f0a19] rounded-b-md overflow-hidden">
          {activeTab === 'Output' && (
            <div className="flex flex-col h-full">
              <button onClick={handleRunCode} disabled={isLoading} className="w-full border-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-white font-bold py-2 px-4 rounded-md transition duration-200 mb-4 flex justify-center items-center disabled:opacity-50">
                {isLoading ? <span className="loader inline-block w-4 h-4 border-2 border-white border-b-transparent rounded-full animate-spin" /> : 'Run Code'}
              </button>
              <div className={`flex-grow p-2 border rounded-md overflow-y-auto font-mono text-sm ${isError ? 'border-red-500 text-red-400' : 'border-gray-700'}`}>
                {output ? output.map((line, i) => <pre key={i}>{line}</pre>) : <span className="text-gray-500">Click "Run Code" to see the output.</span>}
              </div>
            </div>
          )}
          {activeTab === 'Suggestions' && (
            <div className="p-2 h-full overflow-y-auto">
              {suggestions.length > 0 ? (
                <ul className="space-y-2">
                  {suggestions.map((sug, i) => <li key={i} className="text-sm p-2 bg-gray-800 rounded">💡 {sug}</li>)}
                </ul>
              ) : <p className="text-gray-500 text-sm">Suggestions from agents will appear here.</p>}
            </div>
          )}
          {activeTab === 'Metrics' && (
            <div className="p-2 h-full overflow-y-auto">
              <h3 className="text-lg font-semibold mb-2">Productivity Metrics</h3>
              {metrics.length > 0 ? (
                <ul className="space-y-2">
                  {metrics.map((met, i) => <li key={i} className="text-sm p-2 bg-gray-800 rounded">📊 {met}</li>)}
                </ul>
              ) : <p className="text-gray-500 text-sm">Metrics will be updated periodically.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
