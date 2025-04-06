// src/components/DbConfigForm.js
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Database, AlertCircle } from 'lucide-react';

function DbConfigForm() {
  const { connectToDatabase, isProcessing, connectionError, dbConfig: initialConfig } = useAppContext();
  const [host, setHost] = useState('');
  const [port, setPort] = useState('3306'); // <-- Add state for port, default to 3306
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [database, setDatabase] = useState('');

  // Pre-fill form if initial config exists
  useEffect(() => {
    if (initialConfig) {
      setHost(initialConfig.host || '');
      setPort(initialConfig.port || '3306'); // <-- Pre-fill port
      setUser(initialConfig.user || '');
      setPassword(initialConfig.password || '');
      setDatabase(initialConfig.database || '');
    }
  }, [initialConfig]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isProcessing) {
      // Pass the port to the connect function
      connectToDatabase({ host, port: parseInt(port, 10) || 3306, user, password, database });
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <form onSubmit={handleSubmit} className="space-y-4">
        {connectionError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative flex items-center" role="alert">
             <AlertCircle className="w-5 h-5 mr-2 text-red-600" />
             <span className="block sm:inline">{connectionError}</span>
          </div>
        )}

        {/* Host Field */}
        <div>
          <label htmlFor="host" className="block text-sm font-medium text-gray-700 mb-1">Host:</label>
          <input
            type="text"
            id="host"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="e.g., localhost or 127.0.0.1"
          />
        </div>

        {/* Port Field - Added */}
        <div>
          <label htmlFor="port" className="block text-sm font-medium text-gray-700 mb-1">Port:</label>
          <input
            type="number" // Use type="number" for port
            id="port"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            required
            min="1"
            max="65535"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="e.g., 3306"
          />
        </div>

        {/* User Field */}
        <div>
          <label htmlFor="user" className="block text-sm font-medium text-gray-700 mb-1">User:</label>
          <input
            type="text"
            id="user"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="e.g., root"
          />
        </div>

        {/* Password Field */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter database password"
          />
        </div>

        {/* Database Field */}
        <div>
          <label htmlFor="database" className="block text-sm font-medium text-gray-700 mb-1">Database:</label>
          <input
            type="text"
            id="database"
            value={database}
            onChange={(e) => setDatabase(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="e.g., exam_db"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isProcessing}
          className={`w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            isProcessing
              ? 'bg-indigo-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
          }`}
        >
          {/* ... (button content remains the same) ... */}
           {isProcessing ? (
             <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting...
             </>
          ) : (
            <>
              <Database className="w-4 h-4 mr-2" /> Connect
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default DbConfigForm;
