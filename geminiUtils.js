// src/utils/geminiUtils.js
// (Simplified: Contains only filename parsing and metadata-based matching)

/**
 * Simple filename parser for extracting exam paper metadata directly from the filename
 * @param {string} filename - The filename to parse
 * @returns {Object} - Extracted metadata
 */
export function parseFilename(filename) {
  const metadata = {
    year: null,
    month: null,
    month_number: null,
    paper_number: null,
    exam_board: null,
    level: null,
    subject: null // Added subject extraction
  };

  if (!filename) return metadata; // Return empty metadata if filename is null or empty

  // Convert to lowercase for consistent matching
  const lower = filename.toLowerCase();

  // Extract year (4-digit or 2-digit)
  const yearMatch = lower.match(/20(\d{2})/) || lower.match(/\/(\d{2})[^0-9]/);
  if (yearMatch) {
    metadata.year = parseInt("20" + yearMatch[1]);
  }

  // Extract month
  if (lower.includes('jun') || lower.includes('june')) {
    metadata.month = 'June';
    metadata.month_number = 6;
  } else if (lower.includes('nov') || lower.includes('november')) {
    metadata.month = 'November';
    metadata.month_number = 11;
  } else if (lower.includes('jan') || lower.includes('january')) {
    metadata.month = 'January';
    metadata.month_number = 1;
  } else if (lower.includes('mar') || lower.includes('march')) {
    metadata.month = 'March';
    metadata.month_number = 3;
  } else if (lower.includes('may')) {
    metadata.month = 'May';
    metadata.month_number = 5;
  } else if (lower.includes('aug') || lower.includes('august')) {
    metadata.month = 'August';
    metadata.month_number = 8;
  }

  // Extract paper number
  // Look for patterns like "p1", "paper1", "p-1", etc.
  const paperMatch = lower.match(/p[^a-z0-9]?(\d+)/i) ||
                    lower.match(/paper[^a-z0-9]?(\d+)/i) ||
                    lower.match(/\/(\d+)f/i) ||
                    lower.match(/\/(\d+)h/i);
  if (paperMatch) {
    metadata.paper_number = parseInt(paperMatch[1]);
  }

  // Extract exam board
  if (lower.includes('aqa')) {
    metadata.exam_board = 'AQA';
  } else if (lower.includes('edexcel') || lower.includes('pearson')) {
    metadata.exam_board = 'Edexcel';
  } else if (lower.includes('ocr')) {
    metadata.exam_board = 'OCR';
  } else if (lower.includes('wjec')) {
    metadata.exam_board = 'WJEC';
  }

  // Extract level (Foundation or Higher for GCSE, etc.)
  if (lower.includes('gcse')) {
    metadata.level = 'GCSE';
  } else if (lower.includes('a-level') || lower.includes('alevel')) {
    metadata.level = 'A-Level';
  } else if (lower.includes('foundation') || lower.match(/[\/-]f[\/-]/)) {
    metadata.level = 'Foundation';
  } else if (lower.includes('higher') || lower.match(/[\/-]h[\/-]/)) {
    metadata.level = 'Higher';
  }

  // Extract subject (simple check for common subjects)
  // This is basic and might need refinement
  if (lower.includes('math')) {
      metadata.subject = 'Mathematics';
  } else if (lower.includes('physic')) {
      metadata.subject = 'Physics';
  } else if (lower.includes('chem')) {
      metadata.subject = 'Chemistry';
  } else if (lower.includes('biolog')) {
      metadata.subject = 'Biology';
  } // Add more subjects as needed

  return metadata;
}

/**
 * Match a database question with the appropriate PDF based ONLY on database fields and filename parsing.
 * @param {Object} questionData - Data about the question from the database (must include subject, level, year, month, paper_number)
 * @param {Array} paperFiles - Array of paper files (must include id, name)
 * @returns {Object} - Matching information { success: boolean, paper?: Object, score?: number, error?: string }
 */
export function matchQuestionToPaper(questionData, paperFiles) {
  if (!questionData || !paperFiles || paperFiles.length === 0) {
    return {
      success: false,
      error: 'Missing question data or paper files'
    };
  }

  // Extract information from the question
  const questionSubject = questionData.subject;
  const questionLevel = questionData.level;
  const questionYear = questionData.year;
  const questionMonth = questionData.month; // 6 for June, 11 for November
  const questionPaperNumber = questionData.paper_number;

  console.log(`Matching question: Subject=${questionSubject}, Year=${questionYear}, Month=${questionMonth}, Paper=${questionPaperNumber}`);

  // Calculate match scores for each paper based on filename parsing
  const matchScores = paperFiles.map(paper => {
    const parsedMetadata = parseFilename(paper.name);
    let score = 0;
    let matchReasons = [];

    // Match by subject (allow partial match, case-insensitive)
    if (parsedMetadata.subject && questionSubject &&
        parsedMetadata.subject.toLowerCase().includes(questionSubject.toLowerCase())) {
      score += 20; // Increased weight for subject
      matchReasons.push('subject');
    } else if (questionSubject && paper.name.toLowerCase().includes(questionSubject.toLowerCase())) {
        score += 10; // Lower score for filename match if not parsed
        matchReasons.push('filename_subject');
    }

    // Match by level (allow partial match, case-insensitive)
    if (parsedMetadata.level && questionLevel &&
        parsedMetadata.level.toLowerCase().includes(questionLevel.toLowerCase())) {
      score += 10;
      matchReasons.push('level');
    } else if (questionLevel && paper.name.toLowerCase().includes(questionLevel.toLowerCase())) {
        score += 5;
        matchReasons.push('filename_level');
    }

    // Match by year (exact match)
    if (parsedMetadata.year && questionYear && parsedMetadata.year === questionYear) {
      score += 25; // Increased weight
      matchReasons.push('year');
    } else if (questionYear && paper.name.includes(questionYear.toString())) {
        score += 10;
        matchReasons.push('filename_year');
    }

    // Match by month (exact match on number)
    if (parsedMetadata.month_number && questionMonth && parsedMetadata.month_number === questionMonth) {
      score += 25; // Increased weight
      matchReasons.push('month');
    } else if (questionMonth) {
        // Fallback to filename check
        const monthStr = questionMonth === 6 ? 'jun' : questionMonth === 11 ? 'nov' : null;
        if (monthStr && paper.name.toLowerCase().includes(monthStr)) {
            score += 10;
            matchReasons.push('filename_month');
        }
    }

    // Match by paper number (exact match)
    if (parsedMetadata.paper_number && questionPaperNumber &&
        parsedMetadata.paper_number === questionPaperNumber) {
      score += 30; // Increased weight
      matchReasons.push('paper_number');
    } else if (questionPaperNumber) {
        // Fallback to filename check
        const filenameLower = paper.name.toLowerCase();
        if (filenameLower.includes(`p${questionPaperNumber}`) ||
            filenameLower.includes(`paper${questionPaperNumber}`) ||
            filenameLower.includes(`/${questionPaperNumber}f`) ||
            filenameLower.includes(`/${questionPaperNumber}h`)) {
            score += 15;
            matchReasons.push('filename_paper_number');
        }
    }

    // Return the match information
    return {
      paper,
      score,
      matchReasons
    };
  });

  // Sort by score (highest first)
  matchScores.sort((a, b) => b.score - a.score);

  // Get the best match
  const bestMatch = matchScores[0];

  // Require a higher minimum score now that we rely only on metadata/filename
  const MIN_MATCH_SCORE = 40;

  if (bestMatch && bestMatch.score >= MIN_MATCH_SCORE) {
    console.log(`Best match found: ${bestMatch.paper.name} (Score: ${bestMatch.score}, Reasons: ${bestMatch.matchReasons.join(', ')})`);
    return {
      success: true,
      paper: bestMatch.paper,
      score: bestMatch.score,
      matchReasons: bestMatch.matchReasons
    };
  } else {
    console.log(`No suitable match found. Best score: ${bestMatch?.score || 0}`);
    return {
      success: false,
      error: `No suitable match found (Best score: ${bestMatch?.score || 0} < ${MIN_MATCH_SCORE})`,
      allMatches: matchScores // Include all matches for debugging
    };
  }
}
