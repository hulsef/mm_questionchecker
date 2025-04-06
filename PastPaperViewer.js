// src/components/PastPaperViewer.js
// (Simplified: Removed Gemini and local upload features)
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { ChevronDown, ChevronUp, File, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
// Removed Upload, Key, Loader, Search, GeminiApiKeyForm import

function PastPaperViewer() {
  const {
    pastPapers,
    selectedPastPaper,
    // openPastPaperDialog, // Removed
    selectPastPaper,
    // removePastPaper, // Keep if manual removal from view is desired, though data comes from DB
    showPastPaper,
    togglePastPaperView,
    currentQuestion,
    paperMatchError,
    // Removed Gemini related state: isExtractingMetadata, isGeminiInitialized, analyzeQuestion, isAnalyzing, analysisResult, analysisError
  } = useAppContext();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  // Removed showApiKeyForm state
  const [autoMatchInfo, setAutoMatchInfo] = useState(null);

  // Show auto-match info when currentQuestion changes and a paper is selected
  React.useEffect(() => {
    if (currentQuestion && selectedPastPaper) {
      // Check if current paper has a likely match to the question
      const questionInfo = `${currentQuestion.subject || ''} ${currentQuestion.year || ''} ${
        currentQuestion.month === 6 ? 'June' :
        currentQuestion.month === 11 ? 'November' : ''
      } Paper ${currentQuestion.paper_number || ''}`.trim();

      setAutoMatchInfo({
        questionInfo,
        paperName: selectedPastPaper.name
      });

      // Clear auto-match info after 5 seconds
      const timer = setTimeout(() => {
        setAutoMatchInfo(null);
      }, 5000);

      return () => clearTimeout(timer);
    } else {
        setAutoMatchInfo(null); // Clear if no question or paper selected
    }
  }, [currentQuestion, selectedPastPaper]);

  // Removed handleDrop, handleDragOver

  // Toggle paper selector dropdown
  const toggleDropdown = () => {
    setIsDropdownOpen(prev => !prev);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-200 h-full flex flex-col">
      {/* Header with toggle for collapsing */}
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
        <div className="flex items-center">
          <h2 className="text-lg font-medium text-purple-800">Past Paper Viewer</h2> {/* Updated Title */}
          <button
            onClick={togglePastPaperView}
            className="ml-2 p-1 rounded-md bg-purple-100 hover:bg-purple-200"
            aria-label={showPastPaper ? "Collapse viewer" : "Expand viewer"}
          >
            {showPastPaper ? <ChevronDown size={18} className="text-purple-700" /> : <ChevronUp size={18} className="text-purple-700" />}
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {/* Paper selector dropdown */}
          {pastPapers.length > 0 && (
            <div className="relative">
              <button
                onClick={toggleDropdown}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm flex items-center bg-white hover:bg-gray-50"
              >
                {selectedPastPaper ? selectedPastPaper.name : "Select Paper"}
                <ChevronDown size={16} className="ml-1" />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-64 overflow-y-auto">
                  {pastPapers.map(paper => (
                    <button
                      key={paper.id}
                      onClick={() => {
                        selectPastPaper(paper.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center ${
                        selectedPastPaper && selectedPastPaper.id === paper.id ? 'bg-gray-100' : ''
                      }`}
                    >
                      <File size={16} className="mr-2 text-gray-500" />
                      {paper.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Removed Gemini API Key Button */}
          {/* Removed Upload button */}
        </div>
      </div>

      {/* Removed API Key Form Modal */}

      {/* Auto-match notification */}
      {autoMatchInfo && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-md flex items-start text-sm text-blue-700">
          <div className="mr-3 bg-blue-100 p-1 rounded-full flex-shrink-0">
            <CheckCircle size={16} className="text-blue-600" />
          </div>
          <div>
            <p className="font-medium">Auto-matched question with paper</p>
            <p className="mt-1">Question from: {autoMatchInfo.questionInfo}</p>
            <p>PDF selected: {autoMatchInfo.paperName}</p>
          </div>
        </div>
      )}

      {/* Removed Analysis Results Section */}
      {/* Removed Metadata extraction indicator */}

      {/* Paper matching error message */}
      {/* Updated condition to show error when matching fails, even if a paper *was* selected previously */}
      {paperMatchError && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-md flex items-start text-sm text-amber-700">
          <AlertTriangle size={16} className="mr-2 mt-0.5 text-amber-600" />
          <div>
            <p className="font-medium">No matching past paper found</p>
            <p className="mt-1">{paperMatchError}</p>
            <p className="mt-1">Please select a paper manually using the dropdown above if available.</p>
          </div>
        </div>
      )}

      {/* Collapsible content */}
      {showPastPaper ? (
        <>
          {selectedPastPaper ? (
            <div className="flex-grow overflow-auto">
              {/* Display PDF data */}
              <div className="h-full">
                <iframe
                  src={`data:application/pdf;base64,${selectedPastPaper.data}`}
                  title={selectedPastPaper.name}
                  key={selectedPastPaper.id} // Key forces re-render on paper change
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          ) : pastPapers.length > 0 ? (
            // This state occurs if papers are loaded but none match the current question
            <div className="flex-grow flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50">
              <div className="text-center">
                <XCircle size={64} className="mx-auto text-amber-400 mb-6" />
                <h3 className="text-xl font-medium text-gray-700 mb-3">No Matching Past Paper</h3>
                <p className="text-gray-600 mb-4 max-w-md">
                  We couldn't automatically match this question to any of the past papers found in the database.
                  Please select a paper manually using the dropdown above.
                </p>
                {/* Removed Upload Button */}
              </div>
            </div>
          ) : (
            // This state occurs if no papers were found in the database at all
            <div
              className="flex-grow flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50"
              // Removed onDrop, onDragOver
            >
              <div className="text-center">
                <File size={64} className="mx-auto text-gray-400 mb-6" /> {/* Changed Icon */}
                <h3 className="text-xl font-medium text-gray-700 mb-3">No Past Papers Found</h3> {/* Updated Text */}
                <p className="text-gray-600 mb-4 max-w-md">
                  No past papers were found in the connected database.
                  Please ensure PDF data is stored correctly in the 'papers' table.
                </p>
                {/* Removed Select PDF Button */}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="py-2 text-center text-gray-500 text-sm">
          Past paper view collapsed
        </div>
      )}
    </div>
  );
}

export default PastPaperViewer;
