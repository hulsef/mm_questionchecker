// src/components/Navigation.js
import React, { useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { ChevronLeft, ChevronRight } from 'lucide-react'; // Import icons

function Navigation() {
  const { questions, currentIndex, prevQuestion, nextQuestion, totalQuestions } = useAppContext();

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowLeft') {
      if (currentIndex > 0) {
        console.log('Navigating to previous question');
        prevQuestion();
      }
    } else if (event.key === 'ArrowRight') {
      if (currentIndex < totalQuestions - 1) {
        console.log('Navigating to next question');
        nextQuestion();
      }
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < totalQuestions - 1;

  return (
    <div className="flex items-center space-x-4">
      <span className="text-sm text-gray-600">
        Question {totalQuestions > 0 ? currentIndex + 1 : 0} of {totalQuestions}
      </span>
      <button
        onClick={prevQuestion}
        disabled={!canGoPrev}
        className={`p-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
        title="Previous Question"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={nextQuestion}
        disabled={!canGoNext}
        className={`p-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
        title="Next Question"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

export default Navigation;
