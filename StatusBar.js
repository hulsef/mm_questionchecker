// src/components/StatusBar.js
import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Wifi, WifiOff, AlertTriangle, Loader, ChevronLeft, ChevronRight } from 'lucide-react'; // Import icons

function StatusBar() {
  // Get connection status, question navigation data, AND navigation functions
  const {
    isConnected,
    connectionError,
    isProcessing,
    currentIndex,
    totalQuestions,
    prevQuestion, // Add this
    nextQuestion  // Add this
  } = useAppContext();

  // --- Connection Status Logic (unchanged) ---
  let statusIcon;
  let statusText;
  let statusColor;

  if (isProcessing) {
      statusIcon = <Loader className="animate-spin w-4 h-4 text-blue-500" />;
      statusText = "Processing...";
      statusColor = "text-blue-600";
  } else if (isConnected) {
    statusIcon = <Wifi className="w-4 h-4 text-green-500" />;
    statusText = "Connected";
    statusColor = "text-green-600";
  } else if (connectionError) {
    statusIcon = <AlertTriangle className="w-4 h-4 text-red-500" />;
    statusText = `Error: ${connectionError.length > 30 ? connectionError.substring(0, 27) + '...' : connectionError}`; // Truncate long errors
    statusColor = "text-red-600";
  } else {
    statusIcon = <WifiOff className="w-4 h-4 text-gray-400" />;
    statusText = "Disconnected";
    statusColor = "text-gray-500";
  }
  // --- End Connection Status Logic ---

  // Determine if buttons should be disabled
  const isPrevDisabled = currentIndex === 0;
  const isNextDisabled = currentIndex >= totalQuestions - 1;

  return (
    // Use flex justify-between to push connection status left and question nav right
    <div className="flex items-center justify-between px-4 py-1 bg-gray-100 border-t border-gray-300 text-sm">
      {/* Connection Status (Left) */}
      <div className={`flex items-center space-x-2 ${statusColor}`}>
        {statusIcon}
        <span>{statusText}</span>
      </div>

      {/* Question Navigation Controls (Right) */}
      {/* Only show if connected and there are questions */}
      {isConnected && totalQuestions > 0 && (
        <div className="flex items-center space-x-3 text-gray-600">
          {/* Previous Button */}
          <button
            onClick={prevQuestion}
            disabled={isPrevDisabled}
            className={`p-1 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed ${isPrevDisabled ? '' : 'text-gray-700'}`}
            title="Previous Question"
          >
            <ChevronLeft size={18} />
          </button>

          {/* Question Count */}
          <span>Question {currentIndex + 1} of {totalQuestions}</span>

          {/* Next Button */}
          <button
            onClick={nextQuestion}
            disabled={isNextDisabled}
            className={`p-1 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed ${isNextDisabled ? '' : 'text-gray-700'}`}
            title="Next Question"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
       {/* Placeholder if not connected or no questions */}
       {(!isConnected || totalQuestions === 0) && (
         <div className="text-gray-400">&nbsp;</div> // Keep space consistent
       )}
    </div>
  );
}

export default StatusBar;
