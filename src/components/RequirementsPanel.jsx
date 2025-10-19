import React from 'react';

export default function RequirementsPanel({
  functionalRequirements,
  setFunctionalRequirements,
  handleGenerateNFRs,
  nonFunctionalRequirements,
  isNfrLoading
}) {
  return (
    <div className="md:col-span-1 bg-[#1a1a2e] p-4 rounded-lg flex flex-col space-y-4">
      <h2 className="text-xl font-bold">Requirements</h2>
      <textarea
        placeholder="Enter functional requirements here..."
        value={functionalRequirements}
        onChange={(e) => setFunctionalRequirements(e.target.value)}
        className="w-full bg-[#0f0a19] border border-gray-600 rounded-md p-2 h-36 resize-none focus:ring-2 focus:ring-purple-500 focus:outline-none"
      />
      <button onClick={handleGenerateNFRs} disabled={isNfrLoading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md transition duration-200 flex items-center justify-center disabled:opacity-50">
        {isNfrLoading ? <span className="loader inline-block w-4 h-4 border-2 border-white border-b-transparent rounded-full animate-spin" /> : "✨ Generate NFRs"}
      </button>
      <h3 className="text-lg font-semibold pt-4">Non-functional Requirements</h3>
      <div className="p-2 bg-[#0f0a19] rounded-md min-h-[200px] border border-gray-700 flex-grow overflow-y-auto">
        {nonFunctionalRequirements.length > 0 ? (
          <ul className="space-y-1">
            {nonFunctionalRequirements.map((nfr, i) => <li key={i} className="text-sm">- {nfr}</li>)}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm">AI-generated NFRs will appear here.</p>
        )}
      </div>
    </div>
  );
}
