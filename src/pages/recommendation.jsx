import React, { useState, useEffect } from 'react';
import xml2js from 'xml2js';
import { 
  Container, 
  Typography, 
  Button, 
  Grid, 
  CircularProgress, 
  Alert, 
  Card, 
  CardContent, 
  CardActions,
  Pagination,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Box
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { logToServiceWorker } from '../logToServiceWorker';


// Utility function to get text from the current tab
async function getAllTextFromCurrentTab() {
  try {
    console.log('Querying for the active tab in the current window...');
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log('Active tab:', activeTab);
    
    console.log('Executing script to get text content...');
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      func: () => document.body.innerText
    });
    console.log('Text content result:', result);

    return result.result || 'No text content found.';
  } catch (error) {
    console.error('Error getting text from current tab:', error);
    return 'Error occurred while fetching text.';
  }
}

// Function to search arXiv papers
async function searchArxiv(query, maxResults = 10) {
  // Limit query length to prevent extremely long searches
  const truncatedQuery = query.slice(0, 200).replace(/[^\w\s]/g, '');
  
  const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(truncatedQuery)}&start=0&max_results=${maxResults}`;
  console.log('Searching arXiv with URL:', url);

  try {
    const response = await fetch(url);
    const text = await response.text();
    const parser = new xml2js.Parser({ explicitArray: false, trim: true });
    
    return new Promise((resolve, reject) => {
      parser.parseString(text, (err, result) => {
        if (err) {
          console.error('XML Parsing Error:', err);
          reject(err);
          return;
        }

        console.log('Parsed arXiv result:', result);

        if (result.feed.entry) {
          const entries = Array.isArray(result.feed.entry) ? result.feed.entry : [result.feed.entry];
          const papers = entries.map(entry => ({
            title: entry.title,
            summary: entry.summary,
            authors: Array.isArray(entry.author) 
              ? entry.author.map(author => author.name) 
              : [entry.author.name],
            published: entry.published,
            link: entry.id
          }));
          resolve(papers);
        } else {
          resolve([]);
        }
      });
    });
  } catch (error) {
    console.error('Error fetching data from arXiv:', error);
    return [];
  }
}

// Function to generate AI explanation
async function generatePaperExplanation(paper) {
  try {
    // Check AI language model capabilities
    const { available } = await ai.languageModel.capabilities();

    if (available !== "no") {
      // Create an AI session
      const session = await ai.languageModel.create();

      // Generate an explanation
      const explanation = await session.prompt(`
        Provide a comprehensive yet concise explanation of the research paper with the following details:
        Title: ${paper.title}
        Summary: ${paper.summary}

        Break down the key points, significance, and potential implications of this research in a way that is accessible to a general academic audience. 
        Explain the main contribution of the paper in 3-4 sentences.
      `);

      // Destroy the session to free resources
      session.destroy();

      return explanation;
    }

    return "AI explanation unavailable.";
  } catch (error) {
    console.error('Error generating AI explanation:', error);
    return "Error generating explanation.";
  }
}

const Recommendation = () => {
  const [text, setText] = useState('');
  const [papers, setPapers] = useState([]);
  const [paperExplanations, setPaperExplanations] = useState({});
  const [explanationLoading, setExplanationLoading] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const papersPerPage = 3;
  // New state for paper chat
  const [paperChats, setPaperChats] = useState({});
  const [chatInputs, setChatInputs] = useState({});
  const [chatLoading, setChatLoading] = useState({});
    // Speech Synthesis State
    const [speechStatus, setSpeechStatus] = useState({});
    const [currentlySpeakingPaper, setCurrentlySpeakingPaper] = useState(null);
  
    // Speech Synthesis Functions
    const startSpeech = (paper) => {
      // Stop any currently speaking paper
      if (currentlySpeakingPaper) {
        stopSpeech(currentlySpeakingPaper);
      }
  
      const utterance = new SpeechSynthesisUtterance(
        `Title: ${paper.title}. Summary: ${paper.summary}`
      );
  
      // Optional: Customize speech synthesis
      utterance.rate = 0.9; // Slightly slower speech rate
      utterance.pitch = 1.0; // Default pitch
  
      // Track speaking status
      setSpeechStatus(prev => ({...prev, [paper.title]: 'playing'}));
      setCurrentlySpeakingPaper(paper.title);
  
      // Event listeners for speech
      utterance.onend = () => {
        setSpeechStatus(prev => ({...prev, [paper.title]: 'stopped'}));
        setCurrentlySpeakingPaper(null);
      };
  
      // Speak the text
      window.speechSynthesis.speak(utterance);
    };
  
    const pauseSpeech = (paper) => {
      window.speechSynthesis.pause();
      setSpeechStatus(prev => ({...prev, [paper.title]: 'paused'}));
    };
  
    const resumeSpeech = (paper) => {
      window.speechSynthesis.resume();
      setSpeechStatus(prev => ({...prev, [paper.title]: 'playing'}));
    };
  
    const stopSpeech = (paper) => {
      window.speechSynthesis.cancel();
      setSpeechStatus(prev => ({...prev, [paper.title]: 'stopped'}));
      setCurrentlySpeakingPaper(null);
    };

  useEffect(() => {
    const fetchPapersAndExplanations = async () => {
      try {
        // Get text from current tab
        const textContent = await getAllTextFromCurrentTab();
        console.log('Text content:', textContent);
        logToServiceWorker(`Text content: ${textContent}`);

        const session = await ai.languageModel.create();

        // Prompt the model to extract keywords from the text content
        const promptText = `Extract the main keyword from the following text for our search query mention ony the main keyword for search: ${textContent}`;
        const result = await session.prompt(promptText);
        console.log('Extracted keywords:', result);
        logToServiceWorker(`Extracted keywords: ${result}`);
      
        
        setText(textContent);


        // Search arXiv for related papers
        const arxivPapers = await searchArxiv(result, 10);
        
        if (arxivPapers.length === 0) {
          setError('No papers found related to the content.');
        }
        
        setPapers(arxivPapers);
      } catch (err) {
        setError(err.message || 'An unexpected error occurred');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPapersAndExplanations();
  }, []); // Empty dependency array means this runs once on component mount

  // Function to generate explanation for a specific paper
  const handleGenerateExplanation = async (paper) => {
    // Set loading state for this specific paper
    setExplanationLoading(prev => ({...prev, [paper.title]: true}));

    try {
      // Generate explanation
      const explanation = await generatePaperExplanation(paper);

      // Update explanations state
      setPaperExplanations(prev => ({
        ...prev, 
        [paper.title]: explanation
      }));
    } catch (error) {
      console.error('Explanation generation error:', error);
      setPaperExplanations(prev => ({
        ...prev, 
        [paper.title]: "Failed to generate explanation."
      }));
    } finally {
      // Clear loading state for this paper
      setExplanationLoading(prev => ({...prev, [paper.title]: false}));
    }
  };

  // Calculate pagination
  const indexOfLastPaper = currentPage * papersPerPage;
  const indexOfFirstPaper = indexOfLastPaper - papersPerPage;
  const currentPapers = papers.slice(indexOfFirstPaper, indexOfLastPaper);

  // Change page
  const handlePageChange = (event, value) => {
    setCurrentPage(value);
  };

  // Chat with Paper Function
  const chatWithPaper = async (paper) => {
    // Ensure we have a chat input for this paper
    const userQuery = chatInputs[paper.title] || '';
    
    logToServiceWorker(`Chatting with paper: ${paper.title}`);
    logToServiceWorker(`User query: ${userQuery}`);
    logToServiceWorker(`paper summary: ${paper.summary}`);
    // If no query, return early
    if (!userQuery.trim()) return;

    // Set loading state for this paper's chat
    setChatLoading(prev => ({...prev, [paper.title]: true}));

    try {
      // Create an AI session specific to this paper
      const session = await ai.languageModel.create({
        context: `You are a teacher who loves in discussing research papers. You love using emojis and analogies to make things simple`
      });

      // Generate response based on user's query
      const response = await session.prompt(
        `Given the paper details above, answer this specific question: ${userQuery}
        Title: ${paper.title}
        Summary: ${paper.summary}`
      );

      // Update chat history for this paper
      setPaperChats(prev => ({
        ...prev,
        [paper.title]: [
          ...(prev[paper.title] || []),
          { type: 'user', message: userQuery },
          { type: 'ai', message: response }
        ]
      }));

      // Clear input after sending
      setChatInputs(prev => ({...prev, [paper.title]: ''}));

      // Destroy the session to free resources
      session.destroy();
    } catch (error) {
      console.error('Chat error:', error);
      setPaperChats(prev => ({
        ...prev,
        [paper.title]: [
          ...(prev[paper.title] || []),
          { type: 'ai', message: 'Sorry, an error occurred while processing your request.' }
        ]
      }));
    } finally {
      // Clear loading state
      setChatLoading(prev => ({...prev, [paper.title]: false}));
    }
  };

  // Handler for chat input changes
  const handleChatInputChange = (paper, value) => {
    setChatInputs(prev => ({
      ...prev,
      [paper.title]: value
    }));
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom>
        Open access Research Paper Recommender
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {isLoading && (
        <Grid 
          container 
          justifyContent="center" 
          alignItems="center" 
          sx={{ mt: 2 }}
        >
          <CircularProgress />
        </Grid>
      )}

      {papers.length > 0 && (
        <>
          <Typography variant="h5" sx={{ mt: 3, mb: 2 }}>
            Recommended Papers
          </Typography>
          <Grid container spacing={2}>
            {currentPapers.map((paper, index) => (
              <Grid item xs={12} key={index}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {paper.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {paper.summary.slice(0, 300)}...
                    </Typography>
                    <Typography variant="body2">
                      <strong>Authors:</strong> {paper.authors.join(', ')}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Published:</strong> {new Date(paper.published).toLocaleDateString()}
                    </Typography>
                    
                    {/* AI Explanation Accordion */}
                    <Accordion sx={{ mt: 2 }}>
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls="panel-explanation"
                        id="panel-explanation-header"
                      >
                        <Typography variant="subtitle1">AI Paper Explanation</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        {!paperExplanations[paper.title] ? (
                          <Button 
                            variant="contained" 
                            color="primary" 
                            onClick={() => handleGenerateExplanation(paper)}
                            disabled={explanationLoading[paper.title]}
                          >
                            {explanationLoading[paper.title] 
                              ? <CircularProgress size={24} /> 
                              : 'Generate Explanation'}
                          </Button>
                        ) : (
                          <Typography variant="body2">
                              <ReactMarkdown 
                                      remarkPlugins={[remarkGfm]}
                                      components={{
                                        h2: ({node, ...props}) => (
                                          <Typography variant="h6" color="primary" {...props} />
                                        ),
                                        h3: ({node, ...props}) => (
                                          <Typography variant="subtitle1" color="textSecondary" {...props} />
                                        ),
                                        p: ({node, ...props}) => (
                                          <Typography variant="body2" paragraph {...props} />
                                        )
                                      }}
                                    >
                                                 {paperExplanations[paper.title]}
                                    </ReactMarkdown>
                 
                          </Typography>
                        )}
                      </AccordionDetails>
                    </Accordion>


                    {/* Speech Synthesis Controls */}
                    <Grid container spacing={1} sx={{ mt: 2 }}>
                      {!speechStatus[paper.title] || speechStatus[paper.title] === 'stopped' ? (
                        <Grid item>
                          <Button
                            variant="contained"
                            color="primary"
                            startIcon={<PlayCircleOutlineIcon />}
                            onClick={() => startSpeech(paper)}
                          >
                            Listen
                          </Button>
                        </Grid>
                      ) : (
                        <>
                          {speechStatus[paper.title] === 'playing' ? (
                            <Grid item>
                              <Button
                                variant="contained"
                                color="secondary"
                                startIcon={<PauseCircleOutlineIcon />}
                                onClick={() => pauseSpeech(paper)}
                              >
                                Pause
                              </Button>
                            </Grid>
                          ) : (
                            <Grid item>
                              <Button
                                variant="contained"
                                color="primary"
                                startIcon={<PlayCircleOutlineIcon />}
                                onClick={() => resumeSpeech(paper)}
                              >
                                Resume
                              </Button>
                            </Grid>
                          )}
                          <Grid item>
                            <Button
                              variant="outlined"
                              color="error"
                              startIcon={<StopCircleIcon />}
                              onClick={() => stopSpeech(paper)}
                            >
                              Stop
                            </Button>
                          </Grid>
                        </>
                      )}
                    </Grid>

                      {/* Paper Chat Accordion */}
                  <Accordion sx={{ mt: 2 }}>
                    <AccordionSummary
                      expandIcon={<ChatBubbleOutlineIcon />}
                      aria-controls="panel-chat"
                      id="panel-chat-header"
                    >
                      <Typography variant="subtitle1">Chat with Paper</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {/* Chat History */}
                      <Box 
                        sx={{ 
                          maxHeight: 300, 
                          overflowY: 'auto', 
                          mb: 2, 
                          p: 2, 
                          bgcolor: 'grey.100',
                          borderRadius: 2
                        }}
                      >
                        {paperChats[paper.title]?.map((chat, index) => (
                          <Box 
                            key={index}
                            sx={{ 
                              mb: 1,
                              textAlign: chat.type === 'user' ? 'right' : 'left'
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                display: 'inline-block',
                                p: 1,
                                borderRadius: 2,
                                bgcolor: chat.type === 'user' 
                                  ? 'primary.light' 
                                  : 'grey.300',
                                color: chat.type === 'user' ? 'white' : 'black'
                              }}
                            >
                                   <ReactMarkdown 
                                      remarkPlugins={[remarkGfm]}
                                      components={{
                                        h2: ({node, ...props}) => (
                                          <Typography variant="h6" color="primary" {...props} />
                                        ),
                                        h3: ({node, ...props}) => (
                                          <Typography variant="subtitle1" color="textSecondary" {...props} />
                                        ),
                                        p: ({node, ...props}) => (
                                          <Typography variant="body2" paragraph {...props} />
                                        )
                                      }}
                                    >
                              {chat.message}
                              </ReactMarkdown>
                            </Typography>
                          </Box>
                        ))}
                        
                        {/* Loading indicator */}
                        {chatLoading[paper.title] && (
                          <Box sx={{ textAlign: 'center', mt: 2 }}>
                            <CircularProgress size={24} />
                          </Box>
                        )}
                      </Box>

                      {/* Chat Input */}
                      <Grid container spacing={1} alignItems="center">
                        <Grid item xs={10}>
                          <TextField
                            fullWidth
                            variant="outlined"
                            placeholder="Ask a question about this paper"
                            value={chatInputs[paper.title] || ''}
                            onChange={(e) => handleChatInputChange(paper, e.target.value)}
                            disabled={chatLoading[paper.title]}
                          />
                        </Grid>
                        <Grid item xs={2}>
                          <Button
                            fullWidth
                            variant="contained"
                            color="primary"
                            endIcon={<SendIcon />}
                            onClick={() => chatWithPaper(paper)}
                            disabled={
                              chatLoading[paper.title] || 
                              !chatInputs[paper.title]?.trim()
                            }
                          >
                            Send
                          </Button>
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>

                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      color="primary" 
                      href={paper.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      Read Paper
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Pagination Component */}
          <Grid 
            container 
            justifyContent="center" 
            sx={{ mt: 3, mb: 3 }}
          >
            <Pagination
              count={Math.ceil(papers.length / papersPerPage)}
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
              size="large"
              showFirstButton
              showLastButton
            />
          </Grid>
        </>
      )}
    </Container>
  );
};

export default Recommendation;