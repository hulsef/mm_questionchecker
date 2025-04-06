// main.js
// Main process for the Electron application, handling window creation,
// database connections, and inter-process communication (IPC).
// (Simplified: Removed Gemini and unused PDF text handlers)

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise'); // Using mysql2/promise for async/await support
const Store = require('electron-store'); // For storing DB configuration locally

// PDF parsing library (like pdf-parse) is no longer needed for this simplified version.

// Initialize local storage
const store = new Store();

let mainWindow; // Reference to the main application window
let dbConnection = null; // Holds the active database connection pool

// --- Window Creation ---

/**
 * Creates the main application window.
 */
function createWindow() {
  console.log("Main: Creating main window...");
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    x: 0, // Force position for debugging visibility issues
    y: 0,
    webPreferences: {
      // Preload script runs before the renderer process loads,
      // allowing secure exposure of Node.js/Electron APIs via contextBridge.
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, // Recommended security measure
      nodeIntegration: false, // Keep Node.js integration disabled in renderer
      // webSecurity: true, // Keep webSecurity enabled (default) for security
    },
  });

/**
 * IPC Handler: Fetch PDF files stored as BLOBs in the database (papers table).
 */
ipcMain.handle('fetch-database-pdfs', async () => {
  console.log('Main: Received fetch-database-pdfs request.');
  if (!dbConnection) {
    return { success: false, error: 'Not connected to database.' };
  }

  try {
    // Query the 'papers' table for ID, PDF data, and construct the name
    const query = `
      SELECT
        id,
        pdf_data,
        CONCAT(subject, ' ', level, ' ', year, '/', LPAD(month, 2, '0'), ' P', paper_number) as name
      FROM papers
      WHERE pdf_data IS NOT NULL AND LENGTH(pdf_data) > 0 -- Optional: Only fetch rows with actual PDF data
      ORDER BY year DESC, subject, level, month, paper_number;
    `;
    console.log('Main: Executing query:', query);
    const [rows] = await dbConnection.execute(query);
    console.log(`Main: Fetched ${rows.length} PDF records from database.`);

    const papers = rows.map(row => ({
      id: row.id, // Use the papers.id (likely VARCHAR) as the unique identifier
      name: row.name,
      type: 'pdf', // Assuming all are PDFs
      // Convert the LONGBLOB buffer (pdf_data) to a base64 string
      data: row.pdf_data.toString('base64'),
      // text: '', // Text extraction no longer needed
    }));

    return { success: true, papers: papers };

  } catch (error) {
    console.error('Main: Error fetching database PDFs:', error);
    if (error.code) { console.error(`Main: MySQL Error Code: ${error.code}`); }
    return { success: false, error: `Error fetching database PDFs: ${error.message}` };
  }
});


  // Load the React application's HTML file
  const indexPath = path.join(__dirname, 'build/index.html');
  console.log("Main: Loading file:", indexPath);

  mainWindow.loadFile(indexPath)
    .then(() => {
        console.log("Main: Successfully loaded file:", indexPath);
        // Ensure the window is visible after loading
        if (mainWindow && !mainWindow.isDestroyed()) {
             mainWindow.show();
             mainWindow.focus();
             console.log("Main: Window shown and focused.");
        }
    })
    .catch(err => {
        console.error('Main: Failed to load file:', indexPath, err);
        // Consider showing an error dialog to the user in a production app
        // dialog.showErrorBox('Load Error', `Failed to load the application HTML: ${err}`);
    });

  // Open Chrome DevTools automatically if in development mode
  if (!app.isPackaged) {
      console.log("Main: Development mode detected, scheduling DevTools open.");
      // Delay opening DevTools slightly to allow the window to render
      setTimeout(() => {
          if (mainWindow && mainWindow.webContents && !mainWindow.isDestroyed()) {
              mainWindow.webContents.openDevTools();
              console.log("Main: Opened DevTools.");
          } else {
              console.log("Main: Window or webContents not available to open DevTools.");
          }
      }, 500); // 500ms delay
  }

  // --- Window Event Listeners ---

  // Clean up when the window is closed.
  mainWindow.on('closed', () => {
    console.log("Main: Main window closed.");
    mainWindow = null;
    // Close the database connection pool if it exists
    if (dbConnection) {
      console.log("Main: Closing database connection pool...");
      dbConnection.end()
        .then(() => console.log('Main: Database connection pool closed successfully.'))
        .catch(err => console.error('Main: Error closing DB connection pool:', err));
      dbConnection = null;
    }
  });

  // Optional: Log when the window is ready to be shown
  mainWindow.once('ready-to-show', () => {
      console.log("Main: Window ready-to-show event fired.");
  });

  // Optional: Log if the renderer process crashes or fails to load
   mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
       console.error(`Main: Window content failed to load! URL: ${validatedURL}, Code: ${errorCode}, Desc: ${errorDescription}`);
   });
   mainWindow.webContents.on('render-process-gone', (event, details) => {
       console.error(`Main: Renderer process crashed! Reason: ${details.reason}`);
   });
}

// --- App Lifecycle Events ---

// Create the window when Electron is ready.
app.whenReady().then(() => {
  console.log("Main: App ready, creating window...");
  createWindow();

  // Handle macOS activation (recreate window if dock icon clicked with no windows open)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      console.log("Main: App activated, creating window...");
      createWindow();
    }
  });
});

// Quit the app when all windows are closed (except on macOS).
app.on('window-all-closed', () => {
  console.log("Main: All windows closed.");
  if (process.platform !== 'darwin') { // 'darwin' is macOS
    console.log("Main: Quitting app (not macOS).");
    app.quit();
  }
});

// --- IPC Handlers (Communication with Renderer Process) ---

/**
 * IPC Handler: Get stored database configuration.
 */
ipcMain.handle('get-db-config', async () => {
  console.log('Main: Received get-db-config request');
  // Retrieve 'dbConfig' object from electron-store
  return store.get('dbConfig');
});

/**
 * IPC Handler: Fetch past paper content for a specific paper ID.
 */
ipcMain.handle('fetch-past-paper', async (event, paperId) => {
  console.log(`Main: Received fetch-past-paper request for paper ID: ${paperId}`);
  if (!dbConnection) { return { success: false, error: 'Not connected to database.' }; }
  if (!paperId) { return { success: false, error: 'No paper ID provided.' }; }

  try {
    // Query to get the paper details and its questions
    const query = `
      SELECT
        p.id AS paper_id,
        p.subject,
        p.level,
        p.year,
        p.month,
        p.paper_number,
        CONCAT(p.subject, ' ', p.level, ' ', p.year, '/', LPAD(p.month, 2, '0'), ' P', p.paper_number) as paper_name,
        q.id AS question_id,
        q.question AS question_text,
        q.marks_total AS marks,
        t.topic_name
      FROM papers p
      LEFT JOIN questions q ON p.id = q.paper_id
      LEFT JOIN topics t ON q.topic = t.topic_id
      WHERE p.id = ?
      ORDER BY q.id
    `;

    console.log('Main: Executing query:', query);
    const [rows] = await dbConnection.execute(query, [paperId]);
    console.log(`Main: Fetched ${rows.length} questions for paper ID: ${paperId}`);

    // Format the result to include paper info and questions
    if (rows.length > 0) {
      const paperInfo = {
        id: rows[0].paper_id,
        name: rows[0].paper_name,
        subject: rows[0].subject,
        level: rows[0].level,
        year: rows[0].year,
        month: rows[0].month,
        paper_number: rows[0].paper_number
      };

      const questions = rows.map(row => ({
        question_id: row.question_id,
        question_text: row.question_text,
        marks: row.marks,
        topic_name: row.topic_name
      }));

      return {
        success: true,
        paperInfo,
        questions
      };
    } else {
      return {
        success: false,
        error: 'No paper found with the provided ID.'
      };
    }
  } catch (error) {
    console.error('Main: Error fetching past paper:', error);
    if (error.code) { console.error(`Main: MySQL Error Code: ${error.code}`); }
    return { success: false, error: `Error fetching past paper: ${error.message}` };
  }
});

/**
 * IPC Handler: Test database connection and save config if successful.
 */
ipcMain.handle('test-db-connection', async (event, config) => {
  console.log('Main: Received test-db-connection request with config:', config);

  // Validate required configuration fields
  if (!config || !config.host || !config.port || !config.user || !config.database) {
      console.error('Main: Invalid DB config received (missing fields)');
      return { success: false, error: 'Invalid configuration provided (missing fields).' };
  }

  // Close any existing connection pool before creating a new one
  if (dbConnection) {
    console.log("Main: Attempting to close existing DB connection pool before testing new connection...");
    try {
      await dbConnection.end();
      console.log('Main: Closed existing DB connection pool successfully.');
    } catch (err) {
       console.error('Main: Error closing existing DB connection pool:', err);
       // Continue anyway, as we want to create a new pool
    }
    dbConnection = null; // Ensure reference is cleared
  }

  try {
    // Create a new MySQL connection pool using the provided configuration
    console.log(`Main: Creating new connection pool for ${config.database} on ${config.host}:${config.port}...`);
    dbConnection = await mysql.createPool({
      host: config.host,
      port: config.port, // Use the port from config
      user: config.user,
      password: config.password, // Password can be empty/null
      database: config.database,
      waitForConnections: true, // Wait for connection if pool is full
      connectionLimit: 10,    // Max number of connections in pool
      queueLimit: 0,          // No limit on connection queue
      connectTimeout: 10000   // Timeout for establishing connection (10 seconds)
    });

    // Test the connection by getting a connection from the pool
    console.log("Main: Testing new connection pool...");
    const connection = await dbConnection.getConnection();
    console.log('Main: Database connection test successful!');
    connection.release(); // Release the test connection back to the pool

    // Save the valid configuration (including port) to electron-store
    store.set('dbConfig', config);
    console.log('Main: DB config saved.');

    return { success: true }; // Report success to the renderer process

  } catch (error) {
    // Handle connection errors
    console.error('Main: Database connection failed:', error);
    if (error.code) {
         console.error(`Main: MySQL Error Code: ${error.code}`); // Log specific MySQL error code
    }
    dbConnection = null; // Ensure pool reference is cleared on failure

    // Provide more specific error messages to the frontend
    let errorMessage = error.message;
    if (error.code === 'ETIMEDOUT') { errorMessage = `Connection timed out. Check host, port (${config.port}), firewall, and network.`; }
    else if (error.code === 'ECONNREFUSED') { errorMessage = `Connection refused. Check if server is running on host/port (${config.port}) and check bind-address.`; }
    else if (error.code === 'ER_ACCESS_DENIED_ERROR') { errorMessage = `Access denied for user '${config.user}'. Check password and user permissions.`; }
    else if (error.code === 'ER_BAD_DB_ERROR') { errorMessage = `Unknown database '${config.database}'. Check database name.`; }
    // Add more specific error checks as needed (e.g., ENOTFOUND for host)

    return { success: false, error: errorMessage }; // Report failure to the renderer process
  }
});

// Fetch questions - CORRECTED QUERY, TRYING pool.query instead of pool.execute
ipcMain.handle('fetch-questions', async (event, { filterPaperId, filterVerified, limit = 1, offset = 0 }) => {
  console.log(`Main: Received fetch-questions request. Filters: paper=${filterPaperId}, verified=${filterVerified}, limit=${limit}, offset=${offset}`);
  if (!dbConnection) { return { success: false, error: 'Not connected to database.' }; }

  try {
    // --- Query structure remains the same ---
    let query = `
        SELECT
            q.id AS question_id, q.question AS question_text, q.marks_total AS marks,
            q.paper_id, p.id AS paper_identifier, p.level, p.subject, p.year, p.month, p.paper_number,
            t.topic_id, t.topic_name, q.diagram_desc -- Added this line
        FROM questions q
        LEFT JOIN papers p ON q.paper_id = p.id
        LEFT JOIN topics t ON q.topic = t.topic_id
    `; // Base query without WHERE, ORDER BY, LIMIT, OFFSET

    const queryParams = [];
    const whereClauses = [];

    if (filterPaperId && filterPaperId !== 'all') {
      whereClauses.push('q.paper_id = ?');
      queryParams.push(filterPaperId);
    }
    // 'verified' filter remains removed

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    // Add ordering
    query += ' ORDER BY p.year DESC, p.month, p.paper_number, q.id';

    // --- IMPORTANT: Manually add LIMIT/OFFSET for pool.query ---
    // pool.query doesn't handle LIMIT/OFFSET via placeholders as reliably/consistently as execute
    // We need to ensure limit and offset are numbers before adding them directly.
    const numericLimit = Number(limit);
    const numericOffset = Number(offset);
    if (Number.isInteger(numericLimit) && numericLimit > 0) {
        query += ` LIMIT ${numericLimit}`; // Append LIMIT directly
    } else {
        query += ` LIMIT 1`; // Default limit if invalid
        console.warn("Main: Invalid or missing limit value, defaulting to 1.");
    }
    if (Number.isInteger(numericOffset) && numericOffset >= 0) {
        query += ` OFFSET ${numericOffset}`; // Append OFFSET directly
    } else {
         console.warn("Main: Invalid or missing offset value, defaulting to 0.");
         // Default offset is 0 anyway, so no need to append OFFSET 0
    }
    // --- End LIMIT/OFFSET handling ---


    // --- Count Query (can still use execute as it has no params or simple ones) ---
    let countQuery = `SELECT COUNT(*) as total FROM questions q`;
    let countParams = []; // Params for count query WHERE clause
     if (whereClauses.length > 0) {
       countQuery += ' WHERE ' + whereClauses.join(' AND ');
       // Use the same parameters as the main query's WHERE clause for count
       countParams = queryParams.slice(); // Copy params used in WHERE
     }

    console.log('Main: Executing query (using pool.query):', query);
    console.log('Main: Query Params (for WHERE):', queryParams); // These are only for WHERE now
    console.log('Main: Executing count query:', countQuery);
    console.log('Main: Count Params:', countParams);

    // --- Use pool.query for the main data fetch ---
    // Note: Pass only the parameters intended for the WHERE clause (if any)
    const [rows] = await dbConnection.query(query, queryParams);

    // --- Use pool.execute for the count query (or query, doesn't matter much here) ---
    const [countResult] = await dbConnection.execute(countQuery, countParams);
    const totalCount = countResult[0].total;
    mainWindow.webContents.send('update-question-count', totalCount); // <-- Send count to renderer

    console.log(`Main: Fetched ${rows.length} questions. Total matching: ${totalCount}`);
    return { success: true, questions: rows, totalCount: totalCount };

  } catch (error) {
    console.error('Main: Error fetching questions:', error);
    if (error.code) { console.error(`Main: MySQL Error Code: ${error.code}`); }
    return { success: false, error: `Error fetching questions: ${error.message}` };
  }
});

/**
 * IPC Handler: Fetch distinct papers for filter dropdown.
 * Contains CORRECTED SQL query based on user-provided schema.
 */
ipcMain.handle('fetch-papers', async () => {
    console.log('Main: Received fetch-papers request.');
    if (!dbConnection) { return { success: false, error: 'Not connected to database.' }; }
    try {
        // --- CORRECTED QUERY based on provided schema ---
        // Use existing columns (subject, level, year, month, paper_number)
        // to create a descriptive name for the dropdown.
        const query = `
            SELECT
                id, -- This is the VARCHAR papers.id used as the value in the dropdown
                CONCAT(subject, ' ', level, ' ', year, '/', LPAD(month, 2, '0'), ' P', paper_number) as name
                -- LPAD ensures month is two digits (e.g., 06 for June)
            FROM papers
            ORDER BY year DESC, subject, level, month, paper_number; -- Order logically
        `;
        // --- End Correction ---
        console.log('Main: Executing query:', query);
        const [papers] = await dbConnection.execute(query);
        console.log(`Main: Fetched ${papers.length} papers.`);
        // Returns array like: [{id: 'paper_xyz', name: 'Physics A-Level 2023/06 P1'}, ...]
        return { success: true, papers: papers };
    } catch (error) {
        console.error('Main: Error fetching papers:', error);
        if (error.code) { console.error(`Main: MySQL Error Code: ${error.code}`); }
        return { success: false, error: `Error fetching papers: ${error.message}` };
    }
});

/**
 * IPC Handler: Fetch topics for editor dropdown.
 * Contains CORRECTED SQL query based on user-provided schema.
 */
ipcMain.handle('fetch-topics', async () => {
    console.log('Main: Received fetch-topics request.');
     if (!dbConnection) { return { success: false, error: 'Not connected to database.' }; }
    try {
        // --- CORRECTED QUERY based on provided schema ---
        // Select topic_id (PK) and topic_name from the 'topics' table.
        // Alias topic_id AS id TEMPORARILY for frontend compatibility.
        // Ideally, frontend should be updated to use 'topic_id'.
        const query = `SELECT topic_id AS id, topic_name FROM topics ORDER BY topic_name;`;
        // --- End Correction ---
        console.log('Main: Executing query:', query);
        const [topics] = await dbConnection.execute(query);
        console.log(`Main: Fetched ${topics.length} topics.`);
        // Returns array like: [{id: 1, topic_name: 'Algebra'}, {id: 2, topic_name: 'Calculus'}, ...]
        return { success: true, topics: topics };
    } catch (error) {
        console.error('Main: Error fetching topics:', error);
         if (error.code) { console.error(`Main: MySQL Error Code: ${error.code}`); }
        return { success: false, error: `Error fetching topics: ${error.message}` };
    }
});

/**
 * IPC Handler: Update a question in the database.
 * Contains CORRECTED logic based on user-provided schema.
 */
ipcMain.handle('update-question', async (event, { questionId, updates }) => {
  // questionId comes from the frontend, corresponds to questions.id (INT)
  // updates object comes from frontend state based on QuestionEditor fields
  console.log(`Main: Received update-question request for ID ${questionId} with updates:`, updates);
  if (!dbConnection) { return { success: false, error: 'Not connected to database.' }; }
  if (!questionId || !updates) { return { success: false, error: 'Invalid update data.' }; }

  try {
    const setClauses = [];
    const queryParams = [];

    // Map frontend state keys to actual DB columns
    for (const key in updates) {
      let dbKey = null; // Database column name
      let value = updates[key]; // Value from frontend

      // Map keys based on schema differences
      if (key === 'question_text') dbKey = 'question';    // Frontend uses 'question_text', DB has 'question'
      else if (key === 'marks') dbKey = 'marks_total'; // Frontend uses 'marks', DB has 'marks_total'
      else if (key === 'topic_id') dbKey = 'topic';      // Frontend uses 'topic_id', DB has 'topic' (assuming INT FK)
      // else if (key === 'verified') { /* Cannot update 'verified', column doesn't exist */ }
      else {
          // Log and skip any unexpected keys received from the frontend
          console.warn(`Main: Ignoring unexpected update key from frontend: ${key}`);
          continue;
      }

      // Add clause and parameter if a valid DB key was found
      if (dbKey) {
          setClauses.push(`${dbKey} = ?`); // Add "column_name = ?" to SET clauses
          queryParams.push(value);        // Add corresponding value to parameter list
      }
    }

    // If no valid fields were found to update, return success without querying
    if (setClauses.length === 0) {
        console.warn('Main: No valid fields found to update.');
        return { success: true, message: 'No changes applied (no valid fields).' };
    }

    // Add the question ID for the WHERE clause (must be the last parameter)
    queryParams.push(questionId);

    // Construct the final UPDATE query
    const query = `UPDATE questions SET ${setClauses.join(', ')} WHERE id = ?`;

    // Log and execute the query
    console.log('Main: Executing query:', query);
    console.log('Main: Query Params:', queryParams);
    const [result] = await dbConnection.execute(query, queryParams);

    // Check the result of the update operation
    console.log('Main: Update result:', result);
    if (result.affectedRows > 0) {
      console.log(`Main: Question ${questionId} updated successfully.`);
      return { success: true }; // Report success
    } else {
      // This can happen if the questionId doesn't exist or if the data hasn't actually changed
      console.warn(`Main: Question ${questionId} not found or no changes were needed.`);
      return { success: false, error: 'Question not found or no changes needed.' };
    }
  } catch (error) {
    // Handle errors during the update process
    console.error(`Main: Error updating question ${questionId}:`, error);
     if (error.code) { console.error(`Main: MySQL Error Code: ${error.code}`); }
    return { success: false, error: `Error updating question: ${error.message}` };
  }
});

/**
 * IPC Handler: Fetch content for a specific question element.
 */
ipcMain.handle('fetch-question-element', async (event, { type, id }) => {
  console.log(`Main: Received fetch-question-element request for type: ${type}, id: ${id}`);
  if (!dbConnection) {
    console.error('Main: fetch-question-element - Not connected to database.');
    return { success: false, error: 'Not connected to database.' };
  }
  if (!type || id === undefined || id === null) {
     console.error(`Main: fetch-question-element - Invalid parameters received: type=${type}, id=${id}`);
    return { success: false, error: 'Invalid element type or ID provided.' };
  }

  try {
    // Assuming table 'question_elements' with columns 'element_type', 'element_id', 'content'
    const query = `
      SELECT content
      FROM question_elements
      WHERE element_type = ? AND element_id = ?
      LIMIT 1;
    `;
    console.log('Main: Executing query:', query);
    console.log('Main: Query Params:', [type, id]);

    const [rows] = await dbConnection.execute(query, [type, id]);

    if (rows.length > 0) {
      console.log(`Main: Found element content for ${type}:${id}`);
      // Assuming 'content' column holds the data (text, html, base64 image data, etc.)
      // If content is a BLOB/Buffer, you might need conversion here depending on usage
      // e.g., rows[0].content.toString('base64') for images
      return { success: true, content: rows[0].content };
    } else {
      console.warn(`Main: Element not found for type: ${type}, id: ${id}`);
      return { success: false, error: 'Element not found.' };
    }
  } catch (error) {
    console.error(`Main: Error fetching question element ${type}:${id}:`, error);
    if (error.code) { console.error(`Main: MySQL Error Code: ${error.code}`); }
    return { success: false, error: `Error fetching element content: ${error.message}` };
  }
});

/**
 * IPC Handler: Open file dialog to select PDF past papers.
 * NOTE: This is now unused by the frontend but kept for potential future use.
 */
ipcMain.handle('open-file-dialog', async () => {
  console.warn('Main: Received open-file-dialog request (currently unused by frontend).');
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'PDF Documents', extensions: ['pdf'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (canceled) {
      console.log('Main: File dialog canceled');
      return { success: true, canceled: true };
    }

    console.log('Main: Files selected:', filePaths);
    return { success: true, canceled: false, filePaths };
  } catch (error) {
    console.error('Main: Error opening file dialog:', error);
    return { success: false, error: `Error opening file dialog: ${error.message}` };
  }
});

/**
 * IPC Handler: Read a PDF file and return its contents as base64.
 * NOTE: This is now unused by the frontend but kept for potential future use.
 */
ipcMain.handle('read-pdf-file', async (event, filePath) => {
  console.warn(`Main: Received read-pdf-file request for: ${filePath} (currently unused by frontend).`);
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File does not exist.' };
    }

    const fileData = fs.readFileSync(filePath);
    const base64Data = fileData.toString('base64');
    const fileName = path.basename(filePath);

    console.log(`Main: Successfully read file: ${fileName} (${fileData.length} bytes)`);
    return {
      success: true,
      fileName,
      fileType: path.extname(filePath).substring(1),
      data: base64Data
    };
  } catch (error) {
    console.error(`Main: Error reading file ${filePath}:`, error);
    return { success: false, error: `Error reading file: ${error.message}` };
  }
});

// REMOVED: save-gemini-api-key IPC handler
// REMOVED: get-gemini-api-key IPC handler
// REMOVED: extract-pdf-text IPC handler
