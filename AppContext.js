// src/context/AppContext.js
// Manages application state and provides functions for interacting
// with the backend via IPC (window.electronAPI).
// (Simplified: Removed Gemini features, loads PDFs from DB)

import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
// Removed Gemini imports: initGemini, findMatchingQuestion, extractPaperMetadata
import { matchQuestionToPaper } from '../utils/geminiUtils'; // Keep simplified matcher

// Create the context
const AppContext = createContext();

// Create a provider component
export const AppProvider = ({ children }) => {
  // --- State Variables ---
  const [dbConfig, setDbConfig] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [questions, setQuestions] = useState([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);

  const [papers, setPapers] = useState([]); // For filter dropdown
  const [topics, setTopics] = useState([]);

  // Filters state
  const [filterPaperId, setFilterPaperId] = useState('all');
  const [filterVerified, setFilterVerified] = useState('all'); // Keep for potential future use, though column may not exist

  // Past paper state (Simplified)
  const [pastPapers, setPastPapers] = useState([]); // Array of loaded past papers (FROM DB)
  const [selectedPastPaper, setSelectedPastPaper] = useState(null);
  const [showPastPaper, setShowPastPaper] = useState(true); // Default to showing split view initially
  const [isPdfMaximized, setIsPdfMaximized] = useState(false); // Added: Default to split PDF view
  // Removed paperMetadata, isExtractingMetadata
  const [paperMatchError, setPaperMatchError] = useState(null);

  // Removed Gemini AI state: geminiApiKey, isGeminiInitialized, isAnalyzing, analysisResult, analysisError

  // Constants
  const QUESTIONS_PER_PAGE = 1;

  // --- Effects ---

  // Effect 1: Load initial DB config on component mount
  useEffect(() => {
    const loadInitialConfig = async () => {
      console.log('AppContext: Initializing - Checking for stored DB config...');
      setIsLoading(true);
      if (!window.electronAPI || typeof window.electronAPI.getDbConfig !== 'function') {
          console.error("AppContext: window.electronAPI or getDbConfig not found! Preload script likely failed.");
          setConnectionError("Initialization Error: Preload script failed."); setIsLoading(false); return;
      }
      try {
          const storedConfig = await window.electronAPI.getDbConfig();
          console.log('AppContext: Received initial DB config:', storedConfig ? 'Object found' : 'None found');
          if (storedConfig) {
            setDbConfig(storedConfig);
            console.log('AppContext: Attempting auto-connection with stored config...');
            await connectToDatabase(storedConfig);
          } else { setIsLoading(false); }
      } catch (error) {
          console.error("AppContext: Error calling getDbConfig:", error);
          setConnectionError("Failed to communicate with main process to get config."); setIsLoading(false);
      }
    };
    loadInitialConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect 2: Fetch initial data *after* connection is established
  useEffect(() => {
    if (isConnected) {
      console.log('AppContext: Connection established (isConnected=true). Fetching initial data...');
      const fetchInitialData = async () => {
          setIsProcessing(true);
          try {
              console.log('AppContext: Calling fetchFilterData...');
              await fetchFilterData();
              console.log('AppContext: Calling loadDatabasePdfs...');
              await loadDatabasePdfs();
              // DEBUG: Log after loading PDFs
              console.log(`AppContext Effect 2: loadDatabasePdfs finished. pastPapers count: ${pastPapers.length}`);
              console.log('AppContext: Calling loadQuestions(0, true)...');
              await loadQuestions(0, true); // This will trigger Effect 3 & 6
          } catch (error) {
               console.error("AppContext: Error during initial data fetch:", error);
               setConnectionError("Failed to load initial data after connection.");
          } finally { setIsProcessing(false); }
      };
      fetchInitialData();
    } else {
        console.log('AppContext: isConnected is false, skipping initial data fetch.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]); // loadDatabasePdfs added implicitly

  // Effect 3: Update the current question object when the questions array changes
   useEffect(() => {
       console.log(`AppContext: Effect 3 triggered. questions array length: ${questions.length}`);
       if (questions && questions.length > 0) {
           setCurrentQuestion(questions[0]);
           // DEBUG: Confirm currentQuestion state update
           console.log(`AppContext Effect 3: Set currentQuestion to ID: ${questions[0]?.question_id}. State updated.`);
           console.log("AppContext: Set currentQuestion (from Effect 3):", questions[0]?.question_id);
           // Auto-matching is now handled in Effect 6
       } else {
           setCurrentQuestion(null);
           console.log("AppContext: Set currentQuestion to null (from Effect 3).");
       }
   }, [questions]);

   // Effect 4 (Removed - Was Gemini API Key Loading)

   // Effect 5 (Removed - Was local file upload prompt)

   // Effect 6: Auto-match current question to correct PDF (Simplified)
   useEffect(() => {
       if (!currentQuestion || pastPapers.length === 0) {
           // DEBUG: Log why matching is skipped
           console.log(`AppContext Effect 6: Skipping matching. Has question: ${!!currentQuestion}, Has papers: ${pastPapers.length > 0}`);
           console.log("AppContext Effect 6: Skipping matching - no question or no papers.");
           return; // Skip if no question or no papers loaded
       }

       console.log("AppContext Effect 6: Attempting to match current question:", currentQuestion.question_id);
       matchCurrentQuestionToPaperInternal(); // Call the internal matching function

   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [currentQuestion, pastPapers]); // Run when question or papers change


  // --- Database Connection ---
  const connectToDatabase = useCallback(async (config) => {
    console.log('AppContext: connectToDatabase called.');
    setIsProcessing(true); setIsLoading(false); setConnectionError(null);
    if (!window.electronAPI || typeof window.electronAPI.testDbConnection !== 'function') {
        console.error("AppContext: testDbConnection not available on window.electronAPI");
        setConnectionError("Preload script communication error."); setIsProcessing(false); return;
    }
    try {
        const result = await window.electronAPI.testDbConnection(config);
        console.log('AppContext: Connection test result:', JSON.stringify(result, null, 2));
        if (result.success) {
            console.log('AppContext: Connection successful. Updating state.');
            setDbConfig(config);
            setIsConnected(true); // This will trigger Effect 2
        } else {
            console.log('AppContext: Connection failed in main process.');
            setIsConnected(false); setConnectionError(result.error || 'Failed to connect.');
            setDbConfig(prev => ({ host: config.host, port: config.port, user: config.user, database: config.database }));
            // Clear all data on disconnect
            setQuestions([]); setTotalQuestions(0); setCurrentIndex(0); setPapers([]); setTopics([]); setPastPapers([]); setSelectedPastPaper(null);
        }
    } catch (error) {
        console.error("AppContext: Error during connectToDatabase execution:", error);
        setIsConnected(false); setConnectionError("Error communicating with main process during connection.");
        setDbConfig(prev => ({ host: config.host, port: config.port, user: config.user, database: config.database }));
        // Clear all data on error
        setQuestions([]); setTotalQuestions(0); setCurrentIndex(0); setPapers([]); setTopics([]); setPastPapers([]); setSelectedPastPaper(null);
    } finally {
        setIsProcessing(false); console.log('AppContext: connectToDatabase finished.');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // --- Data Fetching Functions ---
  const fetchFilterData = useCallback(async () => {
    console.log('AppContext: fetchFilterData called.');
    if (!window.electronAPI || typeof window.electronAPI.fetchPapers !== 'function' || typeof window.electronAPI.fetchTopics !== 'function') {
        console.error("AppContext: fetchPapers or fetchTopics not available on window.electronAPI");
        setConnectionError("Preload script communication error."); return;
    }
    console.log('AppContext: Fetching filter data (papers, topics) via IPC...');
    try {
        const [paperResult, topicResult] = await Promise.all([
            window.electronAPI.fetchPapers(),
            window.electronAPI.fetchTopics()
        ]);
        console.log('AppContext: fetchFilterData results received.');
        if (paperResult.success) { setPapers(paperResult.papers || []); } else { console.error("AppContext: Failed to fetch papers:", paperResult.error); setPapers([]); }
        if (topicResult.success) { setTopics(topicResult.topics || []); } else { console.error("AppContext: Failed to fetch topics:", topicResult.error); setTopics([]); }
    } catch (error) {
        console.error("AppContext: Error fetching filter data:", error);
        setConnectionError("Error fetching filter dropdown data."); setPapers([]); setTopics([]); throw error;
    } finally { console.log('AppContext: fetchFilterData finished.'); }
  }, []);

  const loadQuestions = useCallback(async (newIndex = 0, resetFilters = false) => {
    console.log(`AppContext: loadQuestions called. Index: ${newIndex}, Reset: ${resetFilters}`);
    if (!window.electronAPI || typeof window.electronAPI.fetchQuestions !== 'function') {
        console.error("AppContext: fetchQuestions not available on window.electronAPI");
        setConnectionError("Preload script communication error."); return;
    }
    // Ensure fetchQuestionElement is available before proceeding
    if (!window.electronAPI || typeof window.electronAPI.fetchQuestionElement !== 'function') {
        console.error("AppContext: fetchQuestionElement not available on window.electronAPI! Check preload.js.");
        setConnectionError("Preload script communication error (fetchQuestionElement)."); return;
    }

    const currentPaperFilter = resetFilters ? 'all' : filterPaperId;
    const currentVerifiedFilter = resetFilters ? 'all' : filterVerified;
    if (resetFilters) {
        console.log("AppContext: Resetting filters to 'all'");
        if (filterPaperId !== 'all') setFilterPaperId('all');
        if (filterVerified !== 'all') setFilterVerified('all');
    }
    console.log('AppContext: Fetching questions via IPC...');
    setConnectionError(null);
    try {
        const result = await window.electronAPI.fetchQuestions({
            filterPaperId: currentPaperFilter, filterVerified: currentVerifiedFilter,
            limit: QUESTIONS_PER_PAGE, offset: newIndex,
        });
        console.log('AppContext: Fetched questions result:', JSON.stringify(result, null, 2));

        if (result.success && result.questions) { // Check if questions array exists
            console.log(`AppContext: Successfully fetched ${result.questions.length} questions. Total matching: ${result.totalCount}`);

            // Process questions to replace placeholders
            const processedQuestions = await Promise.all(result.questions.map(async (question) => {
                let processedText = question.question_text;
                const placeholderRegex = /\{([a-zA-Z_]+):(\d+)\}/g; // Regex to find {type:id}
                const placeholders = [];
                let match;

                // Find all placeholders first to fetch concurrently
                while ((match = placeholderRegex.exec(question.question_text)) !== null) {
                    placeholders.push({
                        fullMatch: match[0], // The full placeholder e.g., {list:1}
                        type: match[1],      // The element type e.g., list
                        id: parseInt(match[2], 10) // The element ID e.g., 1
                    });
                }

                if (placeholders.length > 0) {
                    console.log(`AppContext: Found ${placeholders.length} placeholders in question ${question.question_id}:`, placeholders.map(p => p.fullMatch));
                    try {
                        // Fetch content for all placeholders found in this question
                        const elementContents = await Promise.all(
                            placeholders.map(async p => {
                                try {
                                    const elementResult = await window.electronAPI.fetchQuestionElement({ type: p.type, id: p.id });
                                    console.log(`Fetched element for ${p.type}:${p.id}:`, elementResult); // Log the result

                                    if (elementResult.success) {
                                        // Format the content with curly brackets and semicolon
                                        return {
                                            placeholder: p.fullMatch,
                                            content: `{${p.type}:${p.id}; ${elementResult.content}}` // Format as {type:id; content}
                                        };
                                    } else {
                                        console.warn(`Failed to fetch element for ${p.type}:${p.id}:`, elementResult.error);
                                        return {
                                            placeholder: p.fullMatch,
                                            content: `[Error loading ${p.type}:${p.id}]`
                                        };
                                    }
                                } catch (err) {
                                    console.error(`Error fetching element ${p.type}:${p.id}:`, err);
                                    return {
                                        placeholder: p.fullMatch,
                                        content: `[Error loading ${p.type}:${p.id}]`
                                    };
                                }
                            })
                        );

                        // Replace placeholders with fetched content
                        elementContents.forEach(item => {
                            console.log(`Replacing placeholder "${item.placeholder}" with content: "${item.content}"`);
                            processedText = processedText.replaceAll(item.placeholder, item.content);
                        });
                    } catch (fetchError) {
                        console.error(`AppContext: Error processing placeholders for question ${question.question_id}:`, fetchError);
                        processedText += "\n[Error processing some elements]";
                    }
                }

                // Return the question object with the processed text
                return { ...question, question_text: processedText };
            }));

            // Use the processed questions array
            setQuestions(processedQuestions || []);
            setTotalQuestions(result.totalCount || 0);
            setCurrentIndex(newIndex);
            console.log('AppContext: Processed questions state set:', processedQuestions);
            console.log('AppContext: Total Questions state set:', result.totalCount);

        } else if (result.success) {
            console.log(`AppContext: Successfully fetched 0 questions. Total matching: ${result.totalCount}`);
            setQuestions([]);
            setTotalQuestions(result.totalCount || 0);
            setCurrentIndex(newIndex);
        } else {
            setConnectionError(result.error || 'Failed to fetch questions.');
            setQuestions([]); setTotalQuestions(0);
        }
    } catch (error) {
        console.error('AppContext: Error during fetchQuestions IPC call:', error);
        setConnectionError('An unexpected error occurred while fetching questions.');
        setQuestions([]); setTotalQuestions(0); throw error;
    } finally {
        console.log('AppContext: loadQuestions finished.');
    }
}, [filterPaperId, filterVerified, QUESTIONS_PER_PAGE]);


  // --- Navigation ---
  const goToQuestion = useCallback((index) => {
      if (index >= 0 && index < totalQuestions) {
          console.log(`AppContext: goToQuestion triggered for index ${index}`);
          setCurrentIndex(index); // Update the current index
          loadQuestions(index); // Load the questions for the new index
      } else {
          console.warn(`AppContext: Attempted to navigate to invalid index: ${index}`);
      }
  }, [totalQuestions, loadQuestions]);

  const nextQuestion = useCallback(() => {
    console.log("Current Index before next:", currentIndex);
    if (currentIndex < totalQuestions - 1) {
        console.log("AppContext: nextQuestion triggered.");
        goToQuestion(currentIndex + 1);
        console.log("Current Index after next:", currentIndex + 1);
    } else {
        console.log("AppContext: Already at the last question.");
    }
  }, [currentIndex, totalQuestions, goToQuestion]);

  const prevQuestion = useCallback(() => {
    console.log("Current Index before previous:", currentIndex);
    if (currentIndex > 0) {
        console.log("AppContext: prevQuestion triggered.");
        goToQuestion(currentIndex - 1);
        console.log("Current Index after previous:", currentIndex - 1);
    } else {
        console.log("AppContext: Already at the first question.");
    }
  }, [currentIndex, goToQuestion]);


  // --- Question Updates ---
  const updateCurrentQuestionField = useCallback((field, value) => {
      setCurrentQuestion(prev => {
          if (!prev) return null;
          const updatedQuestion = { ...prev, [field]: value };
          console.log("AppContext: Updated question field in local state", field, value);
          return updatedQuestion;
      });
  }, []);

  const saveCurrentQuestion = useCallback(async () => {
    if (!isConnected || !currentQuestion || !currentQuestion.question_id) {
        console.error("AppContext: Cannot save, not connected or no current question.");
        setConnectionError("Cannot save: Not connected or no question loaded."); return false;
    }
    if (!window.electronAPI || typeof window.electronAPI.updateQuestion !== 'function') {
         console.error("AppContext: updateQuestion not available on window.electronAPI");
         setConnectionError("Preload script communication error."); return false;
     }
    console.log("AppContext: Saving question:", currentQuestion.question_id);
    setIsProcessing(true); setConnectionError(null);
    const updates = {
        question_text: currentQuestion.question_text, marks: currentQuestion.marks, topic_id: currentQuestion.topic_id,
        question_number: currentQuestion.question_number, // Added
        question_part: currentQuestion.question_part, // Added
    };
    try {
        const result = await window.electronAPI.updateQuestion({ questionId: currentQuestion.question_id, updates: updates });
        console.log("AppContext: Save result:", JSON.stringify(result, null, 2));
        if (result.success) {
            console.log("AppContext: Question saved successfully."); return true;
        } else { setConnectionError(result.error || 'Failed to save question.'); return false; }
    } catch (error) {
        console.error("AppContext: Error during saveQuestion IPC call:", error);
        setConnectionError("An unexpected error occurred while saving."); return false;
    } finally { setIsProcessing(false); }
  }, [isConnected, currentQuestion]);


  // --- Filter Changes ---
  const handleFilterChange = useCallback((filterType, value) => {
      console.log(`AppContext: Filter changed - ${filterType}: ${value}`);
      setIsProcessing(true);
      if (filterType === 'paper') {
          setFilterPaperId(value);
      } else if (filterType === 'verified') {
          setFilterVerified(value);
      }
      // Trigger question reload for index 0 with new filters
      loadQuestions(0).finally(() => setIsProcessing(false));

  }, [loadQuestions]);


  // --- Paper Matching Function (Internal) ---
  // Renamed to avoid conflict with exported util, uses context state
  const matchCurrentQuestionToPaperInternal = useCallback(() => {
    if (!currentQuestion || pastPapers.length === 0) {
      console.log("AppContext Internal Match: Cannot match - missing question or papers");
      setPaperMatchError("Missing question or papers for matching."); // Set error state
      setSelectedPastPaper(null); // Clear selection if cannot match
      return;
    }

    console.log("AppContext Internal Match: Matching question to papers:", currentQuestion.question_id);
    setPaperMatchError(null); // Clear previous error

    // Use the simplified matching function from utils
    const matchResult = matchQuestionToPaper(currentQuestion, pastPapers);

    if (matchResult.success) {
      console.log("AppContext Internal Match: Found matching paper:", matchResult.paper.name);
      // Select the matching paper only if it's different from the current one
      if (!selectedPastPaper || selectedPastPaper.id !== matchResult.paper.id) {
        console.log(`AppContext Internal Match: Selecting matched paper: ${matchResult.paper.name}`);
        setSelectedPastPaper(matchResult.paper);
       // DEBUG: Confirm selectedPastPaper state update
       console.log(`AppContext Internal Match: Set selectedPastPaper to ID: ${matchResult.paper.id}. State updated.`);
        setShowPastPaper(true); // Ensure viewer is visible
      } else {
          console.log("AppContext Internal Match: Matched paper is already selected.");
      }
    } else {
      console.log("AppContext Internal Match: No matching paper found:", matchResult.error);
      setPaperMatchError(matchResult.error || "No suitable match found.");
      // Decide whether to clear selection or keep the old one if match fails
      // For now, let's clear it to indicate no match for the *current* question
      setSelectedPastPaper(null);
    }
  }, [currentQuestion, pastPapers, selectedPastPaper]); // Dependencies


  // --- Past Paper Functions (Simplified) ---

  // Load PDFs from Database
  const loadDatabasePdfs = useCallback(async () => {
    console.log('AppContext: Loading PDFs from database...');
    if (!window.electronAPI || typeof window.electronAPI.fetchDatabasePdfs !== 'function') {
      console.error("AppContext: fetchDatabasePdfs not available on window.electronAPI");
      setConnectionError("Preload script communication error loading PDFs.");
      return;
    }
    setIsProcessing(true);
    try {
      const result = await window.electronAPI.fetchDatabasePdfs();
      if (result.success) {
        console.log(`AppContext: Successfully fetched ${result.papers?.length || 0} PDFs from database.`);
        const formattedPapers = result.papers.map(paper => ({
          id: paper.id,
          name: paper.name,
          type: 'pdf',
          data: paper.data,
          // text: '', // Text field no longer needed
        }));
        setPastPapers(formattedPapers);

        // Auto-selection is now handled by Effect 6 after questions load
        if (formattedPapers.length === 0) {
            console.log("AppContext: No PDFs found in the database.");
            setSelectedPastPaper(null);
        }
      } else {
        console.error("AppContext: Error fetching database PDFs:", result.error);
        setConnectionError(result.error || "Failed to fetch PDFs from database.");
        setPastPapers([]);
        setSelectedPastPaper(null);
      }
    } catch (error) {
      console.error("AppContext: Error calling fetchDatabasePdfs:", error);
      setConnectionError("An unexpected error occurred while fetching database PDFs.");
      setPastPapers([]);
      setSelectedPastPaper(null);
    } finally {
      setIsProcessing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Removed selectedPastPaper dependency

  // REMOVED: openPastPaperDialog function (local file loading)

  const togglePastPaperView = useCallback(() => {
    setShowPastPaper(prev => !prev);
  }, []);

  // Added: Toggle PDF maximization state
  const togglePdfMaximization = useCallback(() => {
    setIsPdfMaximized(prev => !prev);
    // Ensure split view is active when toggling maximization,
    // otherwise the toggle doesn't make sense visually.
    if (!showPastPaper) {
        setShowPastPaper(true);
    }
  }, [showPastPaper]); // Depends on showPastPaper

  const selectPastPaper = useCallback((paperId) => {
    const paper = pastPapers.find(p => p.id === paperId);
    if (paper) {
      console.log("AppContext: Manually selecting paper:", paper.name);
      setSelectedPastPaper(paper);
      setPaperMatchError(null); // Clear matching error on manual selection
    }
  }, [pastPapers]);

  // REMOVED: removePastPaper function (not practical with DB loading)

  // REMOVED: Gemini AI Functions (saveGeminiApiKey, analyzeQuestion)

  // --- Context Value ---
  const value = {
    dbConfig, isConnected, connectionError, isLoading, isProcessing,
    questions, totalQuestions, currentIndex, currentQuestion, papers, topics,
    filterPaperId, filterVerified,
    pastPapers, selectedPastPaper, showPastPaper, /* removed paperMetadata, isExtractingMetadata */ paperMatchError,
    isPdfMaximized, // Added PDF maximization state
    // Removed Gemini state and functions
    // Database functions
    connectToDatabase, loadQuestions, fetchFilterData, loadDatabasePdfs,
    nextQuestion, prevQuestion, goToQuestion,
    updateCurrentQuestionField, saveCurrentQuestion, handleFilterChange,
    setCurrentQuestion,
    // Past paper functions (Simplified)
    // openPastPaperDialog, // Removed
    togglePastPaperView, selectPastPaper, // removePastPaper removed
    togglePdfMaximization, // Added PDF maximization toggle
    matchCurrentQuestionToPaper: matchCurrentQuestionToPaperInternal, // Expose internal matcher
    // Gemini AI functions removed
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;

}; // End of AppProvider

// Custom hook to use the AppContext
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};