import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  TextField, 
  Button, 
  Typography, 
  Card, 
  CardContent, 
  Grid, 
  FormControlLabel, 
  Checkbox, 
  Radio, 
  RadioGroup, 
  FormGroup, 
  Skeleton,
  CircularProgress,
  Collapse
} from '@mui/material';
import nlp from 'compromise';
import Swal from 'sweetalert2';
import { logToServiceWorker } from '../logToServiceWorker';


const AIQuizGenerator = () => {
    const [prompt, setPrompt] = useState('');
    const [questions, setQuestions] = useState([]);
    const [userAnswers, setUserAnswers] = useState({});
    const [results, setResults] = useState({});
    const [revealedAnswers, setRevealedAnswers] = useState({});
    const [allCorrect, setAllCorrect] = useState(false);
    const [confettiParticles, setConfettiParticles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [explanations, setExplanations] = useState({});
    const [isExplaining, setIsExplaining] = useState({});
    const [currentPage, setCurrentPage] = useState(null);
    const [pageContent, setPageContent] = useState('');
    const [webpagecontent, setWebpageContent] = useState('');   

    useEffect(() => {
      logToServiceWorker('This is a log message from ExampleComponent');
    }, []);


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
    
  // Confetti Particle Component
  const ConfettiParticle = ({ x, y, color }) => (
    <div 
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        width: '10px',
        height: '10px',
        backgroundColor: color,
        transform: 'rotate(45deg)',
        animation: 'fall 3s linear infinite',
      }}
    />
  );

// Advanced text similarity function using pure JavaScript

const compareTextAnswers = (userAnswer, correctAnswer) => {
    // If user answer is undefined, null, or empty string, return false
    if (!userAnswer) {
      return false;
    }
    // Normalization function using compromise
    const normalizeText = (text) => {
      let doc = nlp(text);
      
      doc = doc.normalize({
        whitespace: true,
        case: true,
        punctuation: true,
        contractions: true,
        acronyms: true,
        parentheses: true,
        possessives: true,
        plurals: true,
        verbs: true,
        honorifics: true
      });
  
      // Convert to lowercase and remove extra whitespace
      return doc.text().toLowerCase().replace(/\s+/g, ' ').trim();
    };
  
    // Normalize both answers
    const normalizedUserAnswer = normalizeText(userAnswer);
    const normalizedCorrectAnswer = normalizeText(correctAnswer);
  
    // Exact match check
    if (normalizedUserAnswer === normalizedCorrectAnswer) {
      return true;
    }
  
    // Use NLP to extract semantic meaning
    const userDoc = nlp(normalizedUserAnswer);
    const correctDoc = nlp(normalizedCorrectAnswer);
  
    // Compare nouns and verbs
    const userNouns = userDoc.nouns().text().split(' ');
    const correctNouns = correctDoc.nouns().text().split(' ');
    const userVerbs = userDoc.verbs().text().split(' ');
    const correctVerbs = correctDoc.verbs().text().split(' ');
  
    // Calculate noun and verb overlap
    const commonNouns = userNouns.filter(noun => correctNouns.includes(noun));
    const commonVerbs = userVerbs.filter(verb => correctVerbs.includes(verb));
  
    // Calculate semantic similarity
    const nounSimilarity = commonNouns.length / Math.max(correctNouns.length, 1);
    const verbSimilarity = commonVerbs.length / Math.max(correctVerbs.length, 1);
  
    // Overall similarity calculation
    const semanticSimilarity = (nounSimilarity + verbSimilarity) / 2;
  
    // Flexible matching criteria
    return semanticSimilarity > 0.5;
  };
  // Generate Quiz Questions Using Chrome Prompt API
   // Generate Quiz Questions Using Chrome Prompt API
   const generateQuizQuestions = async () => {
    logToServiceWorker('generate ai clicked');
    setIsLoading(true);

    let urltext = await getAllTextFromCurrentTab();
     try {
       // Check if AI language model is available
       const { available } = await ai.languageModel.capabilities();
 
       logToServiceWorker('generate ai model ' + available);
         // Create a session
         const session = await ai.languageModel.create({
        systemPrompt: `You are an expert quiz generator. Generate a JSON array of minium 10 quiz questions based on user's prompt and content passed. 
           IMPORTANT: 
           - Ensure the output is VALID JSON
           - Use DOUBLE QUOTES for all strings
           - Ensure no trailing commas
           - Include these properties for each question:
             * question: string
             * type: "text", "radio", or "checkbox"
             * answer: string or string array
             * options (optional): string array for radio/checkbox questions
             * guidance (optional): string for additional instructions
   
           Example:
           [
             {
               "question": "What is the capital of France?",
               "type": "text",
               "answer": "Paris"
             },
             {
               "question": "Select prime numbers",
               "type": "checkbox",
               "answer": ["2", "3", "5"],
               "options": ["1", "2", "3", "4", "5"],
               "guidance": "Select all that apply"
             }
           ]`
     
         });

         logToServiceWorker('finished loading system prompt');
 

         // Prompt the model to generate questions
         const result = await session.prompt(`Generate a quiz from this content: ${urltext} and here is user prompt for guidance: ${prompt | 'atleast 10 questions'}`);
       //  console.log()
       logToServiceWorker('here is the ai response' +result);
         //alert('here is the ai response' +result)
         setIsLoading(false);
         try {
           // Parse the generated JSON
           const generatedQuestions = JSON.parse(result);
           setQuestions(generatedQuestions);
         setIsLoading(false);
         } catch (parseError) {
          logToServiceWorker('Failed to parse AI-generated questions', parseError);
          // console.error();
           alert('Failed to generate quiz. Please try again.');
           setIsLoading(false);
         }
      
     } catch (error) {
      logToServiceWorker('Error generating quiz questions:', error);
       alert('Failed to generate quiz questions. Please check your Chrome settings.');
       setIsLoading(false);
     }
   };
  

  // Handle user answer changes
  const handleChange = (index, event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setUserAnswers({
      ...userAnswers,
      [index]: event.target.type === 'checkbox' ? { ...userAnswers[index], [event.target.name]: value } : value
    });
  };

    // Toggle answer reveal
    const toggleAnswerReveal = (index) => {
        setRevealedAnswers(prev => ({
          ...prev,
          [index]: !prev[index]
        }));
      };

      const handleSubmit = (event) => {
        // Prevent default form submission behavior
        event.preventDefault();
        event.stopPropagation();
      
        // Log for debugging
        logToServiceWorker('Submit button clicked');
        logToServiceWorker(`Total questions: ${questions.length}`);
        logToServiceWorker(`User answers: ${JSON.stringify(userAnswers)}`);
      
        try {
          const newResults = {};
          let isAllCorrect = true;
      
          questions.forEach((q, index) => {
            try {
              // Add more granular logging
              logToServiceWorker(`Processing question ${index}: ${q.question}`);
              logToServiceWorker(`Question type: ${q.type}`);
              logToServiceWorker(`User answer: ${JSON.stringify(userAnswers[index])}`);
      
              if (q.type === 'text') {
                const userAnswer = (userAnswers[index] || '').trim();
                const correctAnswer = String(q.answer).trim();
                newResults[index] = compareTextAnswers(userAnswer, correctAnswer);
                isAllCorrect = isAllCorrect && newResults[index];
              } else if (q.type === 'checkbox') {
                // Convert all answers to strings and lowercase
                const userAnswer = Object.keys(userAnswers[index] || {})
                  .filter(key => userAnswers[index][key])
                  .map(String)
                  .map(a => a.toLowerCase());
                
                const correctAnswer = (q.answer || [])
                  .map(String)
                  .map(a => a.toLowerCase());
                
                newResults[index] = JSON.stringify(userAnswer.sort()) === JSON.stringify(correctAnswer.sort());
                isAllCorrect = isAllCorrect && newResults[index];
              } else if (q.type === 'radio') {
                const userAnswer = String(userAnswers[index] || '').toLowerCase().trim();
                const correctAnswer = String(q.answer).toLowerCase().trim();
                newResults[index] = userAnswer === correctAnswer;
                isAllCorrect = isAllCorrect && newResults[index];
              }
      
              logToServiceWorker(`Question ${index} result: ${newResults[index]}`);
            } catch (questionError) {
              logToServiceWorker(`Error processing question ${index}: ${questionError}`);
              newResults[index] = false;
              isAllCorrect = false;
            }
          });
      
          setResults(newResults);
          logToServiceWorker(`Final results: ${JSON.stringify(newResults)}`);
          logToServiceWorker(`All correct: ${isAllCorrect}`);
      
          if (isAllCorrect) {
            setAllCorrect(true);
            generateConfetti();
          } else {
            Swal.fire({
              title: 'Quiz Results',
              text: 'Not all answers are correct. Please review and try again.',
              icon: 'warning'
            });
          }
        } catch (submitError) {
          logToServiceWorker(`Submit error: ${submitError}`);
          Swal.fire({
            title: 'Error',
            text: 'An error occurred while submitting the quiz. Please try again.',
            icon: 'error'
          });
        }
      };

    // New function to generate explanation using Chrome Prompt API
    const generateExplanation = async (index) => {
      logToServiceWorker('Ai generate explanation clicked');
        const question = questions[index];
        
        // Set explanation loading state
        setIsExplaining(prev => ({
          ...prev,
          [index]: true
        }));
    
        try {
          // Check AI language model capabilities
          const { available } = await ai.languageModel.capabilities();
       logToServiceWorker('Ai generate explanation clicked' + available);
          if (available !== "no") {
            // Create a session
            const session = await ai.languageModel.create({
              systemPrompt: `You are an educational assistant. Provide a clear, concise, and informative explanation for a quiz question. 
              
              Format your explanation to:
              1. Briefly restate the question
              2. Explain the correct answer
              3. Provide context or additional insights
              4. Use simple, easy-to-understand language`
            });

            logToServiceWorker('Ai generate session created');
    
            // Streaming explanation generation
            const stream = session.promptStreaming(
              `Generate an educational explanation for this quiz question:
              Question: ${question.question}
              Correct Answer: ${Array.isArray(question.answer) ? question.answer.join(', ') : question.answer}
              Question Type: ${question.type}`
            );

            logToServiceWorker('Ai generate explanation clicked' + stream);
    
            let fullExplanation = '';
            let previousChunk = '';
    
            // Process the streaming explanation
            for await (const chunk of stream) {
              // Handle both standard and non-standard streaming behaviors
              const newChunk = chunk.startsWith(previousChunk)
                ? chunk.slice(previousChunk.length)
                : chunk;
              
              // Update explanation incrementally
              fullExplanation += newChunk;
              setExplanations(prev => ({
                ...prev,
                [index]: fullExplanation
              }));
    
              previousChunk = chunk;
            }
    
            // Finish explanation
            setIsExplaining(prev => ({
              ...prev,
              [index]: false
            }));
          } else {
            alert('AI explanation generation is not available.');
            setIsExplaining(prev => ({
              ...prev,
              [index]: false
            }));
          }
        } catch (error) {
          console.error('Error generating explanation:', error);
          alert('Failed to generate explanation. Please try again.');
          setIsExplaining(prev => ({
            ...prev,
            [index]: false
          }));
        }
      };

  // Generate confetti particles
  const generateConfetti = () => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FDCB6E', '#6C5CE7'];
    const particles = Array(50).fill().map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)]
    }));
    setConfettiParticles(particles);
  };

  // Reset the quiz
  const handleReset = () => {
    setUserAnswers({});
    setResults({});
    setAllCorrect(false);
    setConfettiParticles([]);
    setQuestions([]);
    setPrompt('');
  };

  // Render success page when all questions are correct
  if (allCorrect) {
    return (
      <div 
        style={{ 
          position: 'relative', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100vh', 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
          overflow: 'hidden'
        }}
      >
        {confettiParticles.map((particle, index) => (
          <ConfettiParticle 
            key={index} 
            x={particle.x} 
            y={particle.y} 
            color={particle.color} 
          />
        ))}
        <div 
          style={{
            textAlign: 'center', 
            backgroundColor: 'white', 
            padding: '2rem', 
            borderRadius: '1rem', 
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)', 
            position: 'relative', 
            zIndex: 10
          }}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="64" 
            height="64" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="#10B981" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            style={{ 
              margin: '0 auto', 
              display: 'block', 
              marginBottom: '1rem',
              animation: 'bounce 1s infinite'
            }}
          >
            <path d="M12 22v-7l-2-2c-2.667-2.667-1.333-4 1-4h4c2.667 0 3.333 1.333 1 4l-2 2v7"/>
            <path d="M9 7c-3 0-3.5 4-4.5 6h11c-1-2-.5-6-3.5-6"/>
            <path d="M5.75 16h12.5"/>
          </svg>
          <Typography variant="h4" style={{ color: '#10B981', marginBottom: '1rem' }}>
            Congratulations! 🎉
          </Typography>
          <Typography variant="h6" style={{ marginBottom: '1.5rem' }}>
            You've answered all questions correctly!
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleReset}
            style={{ 
              animation: 'pulse 2s infinite',
              backgroundColor: '#10B981'
            }}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }



  // Main quiz rendering
  return (
    <div className='App'>
    {isLoading ? (
  <Grid style={{ padding: "80px 5px 0 5px" }}>
    <Card style={{ maxWidth: 600, margin: "0 auto" }}>
      <CardContent style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <TextField
          fullWidth
          margin="normal"
          variant="outlined"
          label="Enter a topic for your quiz"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          multiline
          rows={3}
          disabled={isLoading}
        />
        <Button 
          variant="contained" 
          color="primary" 
          onClick={generateQuizQuestions}
          disabled={!prompt || isLoading}
          style={{ marginTop: '1rem' }}
        >
          {isLoading ? 'Generating Quiz...' : 'Generate Quiz'}
          {isLoading && <CircularProgress size={24} style={{ marginLeft: 10 }} />}
        </Button>
      </CardContent>
    </Card>
  </Grid>
      ) : questions.length === 0 ? (
        // Prompt input screen
        <Grid style={{ padding: "80px 5px 0 5px" }}>
          <Card style={{ maxWidth: 600, margin: "0 auto" }}>
            <CardContent>
              <Typography variant="h4" color="primary">
                AI Quiz Generator
              </Typography>
              <TextField
                fullWidth
                margin="normal"
                variant="outlined"
                label="Enter a topic for your quiz"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                multiline
                rows={3}
              />
        <Button 
  variant="contained" 
  color="primary" 
  onClick={generateQuizQuestions} 
  disabled={!prompt || isLoading} 
  style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
>
  {isLoading ? (
    <>
      <CircularProgress size={24} style={{ marginRight: '8px', color: 'white' }} />
      Generating...
    </>
  ) : (
    'Generate Quiz'
  )}
</Button>

            </CardContent>
          </Card>
        </Grid>
      ) : (
        <Grid style={{ padding: "80px 5px 0 5px" }}>
          <Card style={{ maxWidth: 600, margin: "0 auto" }}>
            <CardContent>
              <Typography variant="h4" color="primary">
                AI Generated Quiz
              </Typography>
              <form onSubmit={handleSubmit}>
                {questions.map(
                  (q, index) => (
                    <div key={index} style={{ marginBottom: '1rem' }}>
                      <Typography variant="body1">{q.question}</Typography>
                      {q.guidance && (
                        <Typography variant="body2" color="textSecondary">
                          {q.guidance}
                        </Typography>
                      )}
                      {q.type === 'text' ? (
                        <>
                          <TextField
                            fullWidth
                            margin="normal"
                            variant="outlined"
                            value={userAnswers[index] || ''}
                            onChange={(e) => handleChange(index, e)}
                            error={results[index] !== undefined && !results[index]}
                            helperText={
                              results[index] !== undefined && !results[index] 
                                ? "Answer does not match expected response" 
                                : ""
                            }
                          />
                          <Grid container spacing={1}>
                            <Grid item>
                              <Button 
                                variant="outlined" 
                                color="secondary" 
                                size="small"
                                onClick={() => toggleAnswerReveal(index)}
                                style={{ marginTop: '0.5rem' }}
                              >
                                {revealedAnswers[index] ? "Hide Answer" : "Show Answer"}
                              </Button>
                            </Grid>
                            <Grid item>
                              <Button 
                                variant="outlined" 
                                color="primary" 
                                size="small"
                                onClick={() => generateExplanation(index)}
                                disabled={isExplaining[index]}
                                style={{ marginTop: '0.5rem', marginLeft: '0.5rem' }}
                              >
                                {isExplaining[index] ? "Generating..." : "Explain Answer"}
                              </Button>
                            </Grid>
                          </Grid>
                          <Collapse in={revealedAnswers[index]}>
                            <Typography 
                              variant="body2" 
                              color="textSecondary" 
                              style={{ 
                                backgroundColor: '#f0f0f0', 
                                padding: '10px', 
                                marginTop: '10px',
                                borderRadius: '4px'
                              }}
                            >
                              {q.answer}
                            </Typography>
                          </Collapse>
                          {explanations[index] && (
                            <Collapse in={!!explanations[index]}>
                              <Card 
                                variant="outlined"
                                style={{ 
                                  marginTop: '10px',
                                  backgroundColor: '#f9f9f9',
                                }}
                              >
                                <CardContent>
                                  {isExplaining[index] ? (
                                    <CircularProgress size={24} />
                                  ) : (
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
                                      {explanations[index]}
                                    </ReactMarkdown>
                                  )}
                                </CardContent>
                              </Card>
                            </Collapse>
                          )}
                        </>
                      ) : q.type === 'checkbox' ? (
                        <FormGroup>
                          {q.options.map((option, i) => (
                            <FormControlLabel
                              key={i}
                              control={
                                <Checkbox
                                  checked={userAnswers[index] && userAnswers[index][option] ? true : false}
                                  onChange={(e) => handleChange(index, e)}
                                  name={option}
                                />
                              }
                              label={option}
                            />
                          ))}
                        </FormGroup>
                      ) : (
                        <RadioGroup
                          value={userAnswers[index] || ''}
                          onChange={(e) => handleChange(index, e)}
                        >
                          {q.options.map((option, i) => (
                            <FormControlLabel
                              key={i}
                              value={option}
                              control={<Radio />}
                              label={option}
                            />
                          ))}
                        </RadioGroup>
                      )}
                      {results[index] !== undefined && (
                        <Typography variant="body2" color={results[index] ? 'green' : 'red'}>
                          {results[index] ? 'Correct' : 'Wrong'}
                        </Typography>
                      )}
                    </div>
                  )
                )}
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Button 
                      variant="outlined" 
                      color="secondary" 
                      onClick={handleReset}
                    >
                      New Quiz
                    </Button>
                  </Grid>
                  <Grid item xs={6} align="right">
                    <Button type="submit" variant="contained" color="primary">Submit</Button>
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>
        </Grid>
      )}
    </div>
  );
}

export default AIQuizGenerator;





