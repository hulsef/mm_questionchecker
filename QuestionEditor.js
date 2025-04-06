 // src/components/QuestionEditor.js
 import React, { useState, useEffect } from 'react';
 import { useAppContext } from '../context/AppContext';
 import { Save, CheckSquare, Square, AlertCircle, Loader } from 'lucide-react';

 function QuestionEditor() {
   const {
     currentQuestion,
     updateCurrentQuestionField,
     saveCurrentQuestion,
     isProcessing,
     connectionError, // Use connectionError for save errors too
     topics, // Get topics for the dropdown
     setCurrentQuestion, // To update local state after save if needed
   } = useAppContext();

   const [saveStatus, setSaveStatus] = useState(''); // '', 'saving', 'success', 'error'
   const [localError, setLocalError] = useState('');

   // Clear save status when question changes
   useEffect(() => {
     setSaveStatus('');
     setLocalError('');
   }, [currentQuestion?.question_id]); // Depend on question ID

   const handleInputChange = (e) => {
     const { name, value, type, checked } = e.target;
     const val = type === 'checkbox' ? checked : value;
     // Ensure marks is stored as a number if entered
     // Update: Also handle question_number as number
     const finalValue = (name === 'marks' || name === 'question_no')
        ? (value === '' ? null : Number(value))
        : val;
     updateCurrentQuestionField(name, finalValue);
     setSaveStatus(''); // Clear status on edit
   };

    const handleTopicChange = (e) => {
        const topicId = e.target.value === "" ? null : parseInt(e.target.value, 10);
        updateCurrentQuestionField('topic_id', topicId);
        setSaveStatus('');
    };


   const handleSave = async () => {
     setSaveStatus('saving');
     setLocalError('');
     const success = await saveCurrentQuestion();
     if (success) {
       setSaveStatus('success');
       // Optional: Clear success message after a delay
       setTimeout(() => setSaveStatus(''), 2000);
     } else {
       setSaveStatus('error');
       setLocalError(connectionError || 'Failed to save.'); // Show specific error if available
     }
   };

   const toggleVerified = () => {
       if (currentQuestion) {
           updateCurrentQuestionField('verified', !currentQuestion.verified);
           setSaveStatus(''); // Clear status on edit
           // Optionally auto-save on verify toggle
           // handleSave();
       }
   };


   if (!currentQuestion) {
     return (
       <div className="flex items-center justify-center h-full text-gray-500">
         {isProcessing ? (
             <Loader className="animate-spin w-8 h-8 text-indigo-600" />
         ) : (
             <p>No question loaded. Select filters or navigate.</p>
         )}
       </div>
     );
   }

   // Display paper information (read-only)
   const paperInfo = currentQuestion
     ? `${currentQuestion.exam_board || ''} ${currentQuestion.year || ''} ${currentQuestion.series || ''} P${currentQuestion.paper_number || ''}`.trim()
     : 'N/A';


   return (
     <div className="bg-white p-6 rounded-lg shadow border border-gray-200 space-y-5">
        {/* Save Status/Error Display */}
         {saveStatus === 'saving' && (
             <div className="bg-blue-100 border border-blue-300 text-blue-700 px-4 py-2 rounded-md flex items-center">
                 <Loader className="animate-spin w-4 h-4 mr-2" /> Saving...
             </div>
         )}
         {saveStatus === 'success' && (
             <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-2 rounded-md">
                 Saved successfully!
             </div>
         )}
         {saveStatus === 'error' && (
             <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative flex items-center" role="alert">
                 <AlertCircle className="w-5 h-5 mr-2 text-red-600" />
                 <span className="block sm:inline">{localError || 'An error occurred during save.'}</span>
             </div>
         )}


       {/* Question Header Info */}
       <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-200">
         <div>
             <p className="text-sm text-gray-500">Paper:</p>
             <p className="text-lg font-medium text-gray-800">{paperInfo}</p>
             <p className="text-sm text-gray-500 mt-1">Question ID: {currentQuestion.question_id}</p>
         </div>
          <button
             onClick={toggleVerified}
             className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out ${
                 currentQuestion.verified
                 ? 'bg-green-100 text-green-700 hover:bg-green-200'
                 : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
             }`}
             title={currentQuestion.verified ? 'Mark as Not Verified' : 'Mark as Verified'}
             >
             {currentQuestion.verified ? (
                 <CheckSquare className="w-5 h-5 mr-2" />
             ) : (
                 <Square className="w-5 h-5 mr-2" />
             )}
             Verified
          </button>
       </div>


       {/* --- MOVED: Question Number & Part Fields --- */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
         {/* Question Number */}
         <div>
           <label htmlFor="question_number" className="block text-sm font-medium text-gray-700 mb-1">
             Question Number:
           </label>
           <input
             type="number"
             id="question_number"
             name="question_no"
             value={currentQuestion.question_no ?? ''} // Handle null/undefined
             onChange={handleInputChange}
             min="0" // Assuming question numbers are not negative
             className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
             placeholder="e.g., 1"
           />
         </div>

         {/* Question Part */}
         <div>
           <label htmlFor="question_part" className="block text-sm font-medium text-gray-700 mb-1">
             Question Part:
           </label>
           <input
             type="text"
             id="question_part"
             name="question_part"
             value={currentQuestion.question_part || ''} // Handle null/undefined
             onChange={handleInputChange}
             className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
             placeholder="e.g., a, i, bii"
           />
         </div>
       </div>
       {/* --- END MOVED SECTION --- */}


       {/* Question Text Area */}
       <div>
         <label htmlFor="question_text" className="block text-sm font-medium text-gray-700 mb-1">
           Question Text:
         </label>
         <textarea
           id="question_text"
           name="question_text"
           rows="10"
           value={currentQuestion.question_text || ''}
           onChange={handleInputChange}
           className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base"
           placeholder="Enter question text..."
         />
       </div>

       {/* Metadata Fields (Remaining: Marks, Topic) */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         {/* Marks */}
         <div>
           <label htmlFor="marks" className="block text-sm font-medium text-gray-700 mb-1">
             Marks:
           </label>
           <input
             type="number"
             id="marks"
             name="marks"
             value={currentQuestion.marks ?? ''} // Handle null/undefined marks
             onChange={handleInputChange}
             min="0" // Assuming marks cannot be negative
             className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
             placeholder="e.g., 5"
           />
         </div>

         {/* Topic Dropdown */}
         <div>
             <label htmlFor="topic_id" className="block text-sm font-medium text-gray-700 mb-1">
                 Topic:
             </label>
             <select
                 id="topic_id"
                 name="topic_id"
                 value={currentQuestion.topic_id ?? ''} // Handle null/undefined topic_id
                 onChange={handleTopicChange}
                 className="w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
             >
                 <option value="">-- Select Topic --</option>
                 {topics.map(topic => (
                     <option key={topic.id} value={topic.id}>
                         {topic.topic_name}
                     </option>
                 ))}
             </select>
         </div>
       </div>


       {/* Save Button */}
       <div className="flex justify-end mt-6">
         <button
           onClick={handleSave}
           disabled={isProcessing || saveStatus === 'saving'}
           className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
             (isProcessing || saveStatus === 'saving')
               ? 'bg-indigo-400 cursor-not-allowed'
               : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
           }`}
         >
           <Save className="w-4 h-4 mr-2" />
           Save Changes
         </button>
       </div>
     </div>
   );
 }

 export default QuestionEditor;
