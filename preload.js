// preload.js
// (Simplified: Removed Gemini and unused PDF text APIs)
const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script starting execution...'); // <-- Add log

try {
    // Expose protected methods that allow the renderer process to use
    // the ipcRenderer without exposing the entire object
    contextBridge.exposeInMainWorld('electronAPI', {
      // --- Database ---
      getDbConfig: () => ipcRenderer.invoke('get-db-config'),
      testDbConnection: (config) => ipcRenderer.invoke('test-db-connection', config),
      fetchQuestions: (filters) => ipcRenderer.invoke('fetch-questions', filters),
      fetchPapers: () => ipcRenderer.invoke('fetch-papers'), // For filter dropdown
      fetchTopics: () => ipcRenderer.invoke('fetch-topics'),
      updateQuestion: (data) => ipcRenderer.invoke('update-question', data),
      fetchDatabasePdfs: () => ipcRenderer.invoke('fetch-database-pdfs'), // Fetch PDF data from DB
      fetchQuestionElement: (params) => ipcRenderer.invoke('fetch-question-element', params), // Added for placeholder replacement

      // --- File Operations (Potentially unused, but kept for now) ---
      openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
      readPdfFile: (filePath) => ipcRenderer.invoke('read-pdf-file', filePath),
      // extractPdfText: (filePath) => ipcRenderer.invoke('extract-pdf-text', filePath), // REMOVED

      // --- Gemini AI Integration (REMOVED) ---
      // saveGeminiApiKey: (apiKey) => ipcRenderer.invoke('save-gemini-api-key', apiKey), // REMOVED
      // getGeminiApiKey: () => ipcRenderer.invoke('get-gemini-api-key'), // REMOVED

      // --- General ---
      // Example: Listen for messages from main process
      // handleStatusUpdate: (callback) => ipcRenderer.on('status-update', (_event, value) => callback(value)),
      // removeStatusUpdateListener: () => ipcRenderer.removeAllListeners('status-update'), // Clean up listener
      // Listen for question count updates from main process
      handleQuestionCountUpdate: (callback) => ipcRenderer.on('update-question-count', (_event, count) => callback(count)),
      // Function to remove the listener (good practice)
      removeQuestionCountUpdateListener: () => ipcRenderer.removeAllListeners('update-question-count'),
    });

    console.log('Preload script: contextBridge.exposeInMainWorld executed successfully.'); // <-- Add log
} catch (error) {
    console.error('Preload script error during contextBridge setup:', error); // <-- Add error log
}

console.log('Preload script finished execution.'); // <-- Add log
