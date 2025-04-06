// src/App.js
import React, { useState, useEffect } from 'react'; // Import useState
import { AppProvider, useAppContext } from './context/AppContext';
import DbConfigForm from './components/DbConfigForm';
import QuestionEditor from './components/QuestionEditor';
import PastPaperViewer from './components/PastPaperViewer';
import Navigation from './components/Navigation';
import Filters from './components/Filters';
import StatusBar from './components/StatusBar';
// Removed QuestionNavigator import in previous step
import { Split, ChevronUp, ChevronDown, Maximize, Minimize } from 'lucide-react'; // Add Maximize, Minimize

function MainApp() {
 const {
   isConnected,
   isLoading,
   showPastPaper,
   togglePastPaperView, // Keep this if needed elsewhere, maybe Navigation?
   isPdfMaximized, // Added
   togglePdfMaximization, // Added
   currentQuestion,      // Add this line
   selectedPastPaper,    // Add this line
 } = useAppContext();

 console.log("App State:", { isConnected, isLoading, currentQuestion, selectedPastPaper, showPastPaper, isPdfMaximized }); // Added more state for debugging

  // State for header visibility
  const [isHeaderVisible, setIsHeaderVisible] = useState(true); // Default to visible
  const toggleHeaderVisibility = () => setIsHeaderVisible(!isHeaderVisible);

 // --- Updated useEffect hook ---
 useEffect(() => {
   // Hide the launch screen once connected AND first question/paper are loaded
   // Ensure both currentQuestion and selectedPastPaper have loaded before hiding
   if (isConnected && currentQuestion && selectedPastPaper) {
     const launchScreen = document.getElementById('launch-screen');
     if (launchScreen) {
       launchScreen.style.display = 'none';
       console.log("Launch screen hidden (connected + data loaded).");
     }
   } else {
       console.log("Launch screen kept visible (isConnected:", isConnected, "currentQuestion:", !!currentQuestion, "selectedPastPaper:", !!selectedPastPaper, ")");
   }
 }, [isConnected, currentQuestion, selectedPastPaper]);
 // --- End of useEffect hook ---


  // Show loading indicator initially
  if (isLoading) {
    console.log("Loading configuration...");
    // Centered Loading indicator
    return <div className="flex justify-center items-center h-screen bg-gray-200 text-gray-600">Loading...</div>;
  }

  // Show DB config form if not connected
  if (!isConnected) {
    console.log("Not connected to the database.");
    return <DbConfigForm />;
  }

  console.log("Rendering main editor interface...");
  // --- MODIFIED RETURN STATEMENT ---
  return (
    <div className="flex flex-col h-screen bg-gray-100 text-gray-800"> {/* Main container */}

      {/* Button to toggle header (Positioned top-right) */}
      <button
        onClick={toggleHeaderVisibility}
        className="p-1 bg-gray-300 hover:bg-gray-400 text-gray-700 absolute top-1 right-1 z-20 rounded shadow"
        title={isHeaderVisible ? "Hide Header" : "Show Header"}
      >
        {isHeaderVisible ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {/* Optional Header Area */}
      {isHeaderVisible && (
        <div className="flex-shrink-0 shadow-md bg-white"> {/* Prevent header from growing, add background/shadow */}
          <Navigation />
          <Filters />
        </div>
      )}

      {/* Main Content Area */}
      <div className={`flex-1 flex ${isPdfMaximized ? 'flex-col' : ''} overflow-hidden relative`}> {/* Flex container for editor and viewer */}

        {/* Question Editor (conditionally rendered based on PDF maximization) */}
        {!isPdfMaximized && (
           <div className="w-1/2 p-4 overflow-y-auto border-r border-gray-300 bg-white"> {/* Left side */}
              <QuestionEditor />
           </div>
        )}

        {/* Past Paper Viewer (conditionally rendered and positioned) */}
        {showPastPaper && (
          <div className={`relative ${isPdfMaximized ? 'flex-1 h-full' : 'w-1/2'} flex flex-col bg-gray-200`}> {/* Right side or full height, distinct background */}
            {/* Maximize/Minimize Button for PDF */}
            <button
              onClick={togglePdfMaximization}
              className="absolute top-1 right-1 z-10 p-1 bg-gray-700 text-white rounded hover:bg-gray-800 opacity-75 hover:opacity-100 shadow"
              title={isPdfMaximized ? "Minimize PDF" : "Maximize PDF"}
            >
              {isPdfMaximized ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
            {/* PDF Viewer container */}
            <div className="flex-1 overflow-hidden">
               <PastPaperViewer />
            </div>
          </div>
        )}
         {/* Placeholder if PDF viewer is hidden but should take space */}
         {!showPastPaper && !isPdfMaximized && (
            <div className="w-1/2 p-4 flex items-center justify-center text-gray-500 bg-gray-50 border-l border-gray-300"> {/* Placeholder right side */}
                Select a paper or toggle view in Navigation to show PDF.
            </div>
         )}
      </div>

      {/* Status Bar (conditionally rendered) */}
      {!isPdfMaximized && <StatusBar />} {/* Hide status bar when PDF maximized */}
    </div>
  );
  // --- END MODIFIED RETURN STATEMENT ---
}

// Wrap the main app logic with the provider
function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}

export default App;
