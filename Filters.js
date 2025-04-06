// src/components/Filters.js
import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Filter } from 'lucide-react';

function Filters() {
  const {
      papers,
      filterPaperId,
      filterVerified,
      handleFilterChange,
      isProcessing
    } = useAppContext();

  return (
    <div className="flex items-center space-x-4">
       <Filter className="w-5 h-5 text-gray-500" />

      {/* Paper Filter */}
      <div>
        <label htmlFor="paperFilter" className="sr-only">Filter by Paper:</label>
        <select
          id="paperFilter"
          value={filterPaperId}
          onChange={(e) => handleFilterChange('paper', e.target.value)}
          disabled={isProcessing}
          className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md disabled:opacity-70 disabled:bg-gray-100"
        >
          <option value="all">All Papers</option>
          {papers.map(paper => (
            <option key={paper.id} value={paper.id}>
              {paper.name}
            </option>
          ))}
        </select>
      </div>

      {/* Verified Filter */}
      <div>
        <label htmlFor="verifiedFilter" className="sr-only">Filter by Status:</label>
        <select
          id="verifiedFilter"
          value={filterVerified}
          onChange={(e) => handleFilterChange('verified', e.target.value)}
          disabled={isProcessing}
          className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md disabled:opacity-70 disabled:bg-gray-100"
        >
          <option value="all">All Statuses</option>
          <option value="true">Verified</option>
          <option value="false">Not Verified</option>
        </select>
      </div>
    </div>
  );
}

export default Filters;
