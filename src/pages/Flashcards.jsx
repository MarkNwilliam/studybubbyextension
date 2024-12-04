import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Pagination, 
  Box,
  Snackbar,
  Alert,
  CircularProgress,
  TextField
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { logToServiceWorker } from '../logToServiceWorker';


// Utility function to clean and validate JSON
function cleanAndValidateFlashcardJSON(jsonString) {
  try {
    // Remove code block markers if present
    const cleanedJson = jsonString
      .replace(/```json\n/, '')
      .replace(/```/, '')
      .trim();

    // Parse the JSON
    const parsedData = JSON.parse(cleanedJson);

    // Validate the structure
    if (!Array.isArray(parsedData)) {
      throw new Error('JSON must be an array of flashcards');
    }

    // Validate each flashcard
    const validatedData = parsedData.filter(card => 
      card && 
      typeof card.question === 'string' && 
      typeof card.answer === 'string' &&
      card.question.trim() !== '' &&
      card.answer.trim() !== ''
    );

    return validatedData;
  } catch (error) {
    console.error('JSON Parsing Error:', error);
    return [];
  }
}

// Chrome AI Flashcard Generator
async function generateFlashcardsWithChromeAI(input ="12 questions about the page ,use analogies and examples for better memorisation" , url) {

  logToServiceWorker('Generating flashcards with Chrome AI');
  try {
    // Create AI session with a comprehensive system prompt
    logToServiceWorker('Creating AI session');
    const session = await ai.languageModel.create({
      systemPrompt: `You are an expert educational content creator specializing in generating high-quality, concise flashcards. 

Your task is to generate a JSON array of flashcards based on the content of a specific URL. Each flashcard should have:
- A clear, precise question that tests key knowledge
- A concise, informative answer that provides essential information

Requirements:
1. Generate 7-10 flashcards
2. Focus on the most important and memorable information
3. Use academic language
4. Ensure questions are not too broad or too narrow
5. Answers should be factual and educational

JSON Format:
[
  {
    "question": "Concise question about the topic",
    "answer": "Clear, informative answer"
  },
  ...
]

Example for a Python programming tutorial:
[
  {
    "question": "What is a Python list comprehension?",
    "answer": "A compact way to create lists using a single line of code that can include conditions and transformations."
  },
  {
    "question": "How do you define a function in Python?",
    "answer": "Use the 'def' keyword, followed by the function name, parameters in parentheses, and a colon. The function body is indented."
  }
]`
    });

    logToServiceWorker('Prompting for flashcards');

    // Generate flashcards for the specific URL
    const result = await session.prompt(`Generate educational flashcards for the content: ${url}. Here is the user input for what they want ${input}`);
    logToServiceWorker('Flashcards generated:', result);
    // Clean and validate the generated JSON
    return cleanAndValidateFlashcardJSON(result);
  } catch (error) {
    console.error('Chrome AI Flashcard Generation Error:', error);
    logToServiceWorker('Error generating flashcards with Chrome AI' + error);
    return [];
  }
}

// Local Storage Helper Functions
const LocalStorageKey = {
  FLASHCARDS: (url) => `flashcards_${btoa(url)}`,
  TIMESTAMP: (url) => `flashcards_timestamp_${btoa(url)}`
};

const CACHE_EXPIRATION_DAYS = 7;

function saveFlashcardsToLocalStorage(url, flashcards) {
  try {
    localStorage.setItem(LocalStorageKey.FLASHCARDS(url), JSON.stringify(flashcards));
    localStorage.setItem(LocalStorageKey.TIMESTAMP(url), Date.now().toString());
  } catch (error) {
    console.error('Error saving to local storage:', error);
  }
}

function getFlashcardsFromLocalStorage(url) {
  try {
    const storedFlashcards = localStorage.getItem(LocalStorageKey.FLASHCARDS(url));
    const storedTimestamp = localStorage.getItem(LocalStorageKey.TIMESTAMP(url));

    if (storedFlashcards && storedTimestamp) {
      const timestampAge = (Date.now() - parseInt(storedTimestamp)) / (1000 * 60 * 60 * 24);
      
      if (timestampAge <= CACHE_EXPIRATION_DAYS) {
        return JSON.parse(storedFlashcards);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error reading from local storage:', error);
    return null;
  }
}


async function getAllTextFromCurrentTab() {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      func: () => document.body.innerText
    });

    return result.result || 'No text content found.';
  } catch (error) {
    console.error('Error getting text from current tab:', error);
    return 'Error occurred while fetching text.';
  }
}

const Flashcards = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [cardsPerPage] = useState(4);
  const [flashcardsData, setFlashcardsData] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userInput, setUserInput] = useState('');
  const fetchFlashcards = async (regenerate = false) => {
    try {
      setIsLoading(true);
      setError(null);

      // Get the current tab's URL
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = activeTab.url;
      
      logToServiceWorker(`Generating flashcards for URL: ${url}`);
      // If not regenerating, check local storage first
      if (!regenerate) {
        const cachedFlashcards = getFlashcardsFromLocalStorage(url);
        
        if (cachedFlashcards) {
          setFlashcardsData(cachedFlashcards);
          setIsLoading(false);
          return;
        }
      }

      let pagetext = await  getAllTextFromCurrentTab();

      logToServiceWorker(`Generating flashcards for page text: ${pagetext}`);

      // Generate flashcards using Chrome AI
      const generatedFlashcards = await generateFlashcardsWithChromeAI(pagetext);
      
      logToServiceWorker('Generated flashcards:', generatedFlashcards);

      if (generatedFlashcards.length > 0) {
        setFlashcardsData(generatedFlashcards);
        saveFlashcardsToLocalStorage(url, generatedFlashcards);
      } else {
        setError('Could not generate flashcards for this page.');
      }
    } catch (err) {
      console.error('Flashcard Generation Error:', err);
      setError('An error occurred while generating flashcards.');
    } finally {
      setIsLoading(false);
    }
  };





  const fetchFlashcards2 = async (input,regenerate = false) => {

    logToServiceWorker('Generating flashcards from user input '+input);
    try {
      setIsLoading(true);
      setError(null);

      // Get the current tab's URL
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = activeTab.url;
      
      logToServiceWorker(`Generating flashcards for URL: ${url}`);
      // If not regenerating, check local storage first
      if (!regenerate) {
        const cachedFlashcards = getFlashcardsFromLocalStorage(input, url);
        
        if (cachedFlashcards) {
          setFlashcardsData(cachedFlashcards);
          setIsLoading(false);
          return;
        }
      }

      let pagetext = await  getAllTextFromCurrentTab();

      logToServiceWorker(`Generating flashcards for page text: ${pagetext}`);

      // Generate flashcards using Chrome AI
      const generatedFlashcards = await generateFlashcardsWithChromeAI(pagetext);
      
      logToServiceWorker('Generated flashcards:', generatedFlashcards);

      if (generatedFlashcards.length > 0) {
        setFlashcardsData(generatedFlashcards);
        saveFlashcardsToLocalStorage(url, generatedFlashcards);
      } else {
        setError('Could not generate flashcards for this page.');
      }
    } catch (err) {
      console.error('Flashcard Generation Error:', err);
      setError('An error occurred while generating flashcards.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFlashcards();
  }, []);

  // Pagination logic
  const indexOfLastCard = currentPage * cardsPerPage;
  const indexOfFirstCard = indexOfLastCard - cardsPerPage;
  const currentCards = flashcardsData.slice(indexOfFirstCard, indexOfLastCard);

  const totalPages = Math.ceil(flashcardsData.length / cardsPerPage);

  const handleCardSelect = (card) => {
    setSelectedCard(selectedCard === card ? null : card);
  };

  const handlePageChange = (event, pageNumber) => {
    setCurrentPage(pageNumber);
    setSelectedCard(null);
  };

  const handleCloseError = () => {
    setError(null);
  };

  const handleRegenerateQuestions = () => {

    logToServiceWorker('Regenerating flashcards');
    // Clear local storage for the current URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      const url = activeTab.url;
  
      // Remove items from local storage
      localStorage.removeItem(LocalStorageKey.FLASHCARDS(url));
      localStorage.removeItem(LocalStorageKey.TIMESTAMP(url));
  
      // Confirm removal
      if (!localStorage.getItem(LocalStorageKey.FLASHCARDS(url)) && !localStorage.getItem(LocalStorageKey.TIMESTAMP(url))) {
          console.log('Local storage cleared successfully for URL:', url);
          logToServiceWorker('Local storage cleared successfully for URL:', url);
      } else {
          console.error('Failed to clear local storage for URL:', url);
          logToServiceWorker('Failed to clear local storage for URL:', url);
      }
  });

    // Fetch new flashcards
    fetchFlashcards(true);
    
    // Reset pagination to first page
    setCurrentPage(1);
    setSelectedCard(null);
  };

  // Handler for generating flashcards from user input
  const handleGenerateFlashcards = () => {
    if (userInput.trim() === '') {
      setError('Please enter some text to generate flashcards.');
      return;
    }

    logToServiceWorker('Generating flashcards from user input');
    
    // Clear previous flashcards and reset pagination
    setFlashcardsData([]);
    setCurrentPage(1);
    setSelectedCard(null);

    // Fetch new flashcards
    fetchFlashcards2(userInput, true);
  };



  return (
    <Container maxWidth="md">

<Box 
        display="flex" 
        alignItems="center" 
        sx={{ my: 3, gap: 2 }}
      >
        <TextField
          fullWidth
          variant="outlined"
          label="Enter text for flashcards"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          multiline
          rows={3}
          placeholder="Paste any text you want to generate flashcards from..."
        />

<Button 
          variant="contained" 
          color="primary" 
          onClick={handleGenerateFlashcards}
          disabled={isLoading}
          sx={{ height: '100%' }}
        >
          Generate Flashcards
        </Button>

        </Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ my: 3 }}>
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom 
          align="left"
        >
          AI-Generated Flashcards
        </Typography>
        
        {/* Regenerate Questions Button */}
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<RefreshIcon />}
          onClick={handleRegenerateQuestions}
          disabled={isLoading}
        >
          Regenerate Questions
        </Button>
      </Box>
      
      {/* Error Handling */}
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseError} 
          severity="error" 
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>

      {/* Loading State */}
      {isLoading ? (
        <Box 
          display="flex" 
          justifyContent="center" 
          alignItems="center" 
          height="300px"
        >
          <CircularProgress size={60} />
          <Typography 
            variant="body1" 
            sx={{ ml: 2 }}
          >
            Generating AI Flashcards...
          </Typography>
        </Box>
      ) : (
        <>
          {/* Flashcards Grid */}
          <Grid container spacing={2} justifyContent="center">
            {currentCards.map((card, index) => (
              <Grid item xs={6} sm={3} key={index}>
                <Card 
                  onClick={() => handleCardSelect(card)}
                  sx={{
                    height: '100%',
                    cursor: 'pointer',
                    transition: 'transform 0.3s',
                    '&:hover': {
                      transform: 'scale(1.05)',
                    },
                    border: selectedCard === card ? '2px solid primary.main' : '1px solid grey.300'
                  }}
                >
                  <CardContent>
                    <Typography 
                      variant="h6" 
                      component="div" 
                      color={selectedCard === card ? 'primary.main' : 'text.secondary'}
                      align="center"
                      gutterBottom
                    >
                      {selectedCard === card ? 'Answer' : 'Question'}
                    </Typography>
                    <Typography 
                      variant="body1" 
                      color={selectedCard === card ? 'success.main' : 'text.primary'}
                      align="center"
                    >
                      {selectedCard === card ? card.answer : card.question}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {flashcardsData.length > cardsPerPage && (
            <Box 
              display="flex" 
              justifyContent="center" 
              alignItems="center" 
              my={3}
            >
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
                size="large"
              />
            </Box>
          )}
        </>
      )}
    </Container>
  );
};

export default Flashcards;