import React, { useState } from 'react';
import { 
  Button, 
  TextField, 
  Container, 
  Typography, 
  Box,
  Paper,
  CircularProgress,
  Stack
} from '@mui/material';
import pptxgen from 'pptxgenjs';
import { VolumeUp, VolumeOff } from '@mui/icons-material';
import { logToServiceWorker } from '../logToServiceWorker';


const PresentationConverter = () => {
  const [prompt, setPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [slides, setSlides] = useState([]); 
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [presentationFile, setPresentationFile] = useState(null);
  const [slideImages, setSlideImages] = useState({});

    // State to track currently speaking slides
    const [speakingSlides, setSpeakingSlides] = useState({});
   logToServiceWorker('we are on the Presentation page')
    const speakText = (text, slideIndex) => {
      window.speechSynthesis.cancel();
      const speech = new SpeechSynthesisUtterance(text);
      speech.lang = 'en-US';
      setSpeakingSlides((prev) => ({ ...prev, [slideIndex]: true }));
      speech.onend = () => {
        setSpeakingSlides((prev) => ({ ...prev, [slideIndex]: false }));
      };
      window.speechSynthesis.speak(speech);
    };
    
    const stopSpeaking = () => {
      window.speechSynthesis.cancel();
      setSpeakingSlides({});
    };

  // Unsplash API configuration
  const UNSPLASH_ACCESS_KEY = '';

  
  async function getAllTextFromCurrentTab() {
    try {
      // Get the current active tab
      const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
      // Execute a content script to extract the text content
      const textContent = await chrome.tabs.executeScript(currentTab.id, {
        code: `
          const textElements = Array.from(document.body.getElementsByTagName('*'))
            .filter(elem => elem.nodeName.toLowerCase() !== 'script' && elem.nodeName.toLowerCase() !== 'style');
          return textElements.map(elem => elem.innerText.trim()).filter(text => text.length > 0).join('\n');
        `
      });
  
      return textContent[0]; // The text content is returned as an array, so we take the first (and only) element
    } catch (error) {
      console.error('Error getting text from current tab:', error);
      return '';
    }
  }

  // Function to fetch images from Unsplash
  const fetchUnsplashImage = async (query) => {
    try {
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1`, 
        {
          headers: {
            'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }

      const data = await response.json();
      
      if (data.results.length > 0) {
        return data.results[0].urls.regular;
      }

      return null;
    } catch (error) {
      console.error('Unsplash Image Fetch Error:', error);
      return null;
    }
  };

  const handleGeneratePresentation = async () => {
    if (!prompt) return;
let textContent = await getAllTextFromCurrentTab();
  console.log('Text content from current tab:', textContent);
  logToServiceWorker('Text content from current tab: '+ textContent)
    //console.log('Generate PPTX clicked');
    logToServiceWorker('Generate PPTX clicked')
    setIsLoading(true);
    setError(null);
    setPresentationFile(null);

    try {
      // Check model availability
      let { available } = await ai.languageModel.capabilities();
      //console.log('AI Model Capabilities:', available);
      logToServiceWorker('AI Model Capabilities: '+ available)

      if (available !== "no") {
        // Create a session with a system prompt for presentation generation
        let session = await ai.languageModel.create({
          systemPrompt: `You are an expert presentation designer creating high-quality, professional slides. Follow these guidelines:
        
          CRITICAL INSTRUCTIONS:
          - Output MUST be VALID JSON
          - keyInsightsOrTakeaways MUST be an ARRAY of strings
          - No trailing commas
          - Ensure all fields are present

          Slide Content Rules:
          - Limit main text to 30-50 words per slide
          - Ensure each slide has a clear, concise title
          - Create meaningful key insights
          - Script should elaborate on what's not explicitly shown on the slide
          - Maintain consistent tone and professional language
          - Use active voice and clear, direct communication
          - Avoid jargon unless absolutely necessary
          - Ensure logical flow between slides
        
          Slide Structure:
          - Title: Descriptive and engaging (5-8 words)
          - Main Text: Concise, key points (30-50 words)
          - Script: In-depth explanation, context, and additional insights
          - Key Insights: 3-4 bullet points of takeaways
        
          Image Selection:
          - Choose images that complement and enhance the slide content
          - Prefer professional, high-quality, relevant imagery
          
          Output strictly as JSON with the specified structure.

          JSON Schema:
        {
          "title": "string",
          "slides": [
            {
              "title": "string",
              "text": "string",
              "script": "string",
              "keyInsightsOrTakeaways": ["string", "string", "string"],
              "imageKeyword": "string"
            }
          ]
        }`
        });

        logToServiceWorker('Session created')

        // Use promptStreaming for potentially longer responses
        let fullResponse = await session.prompt(
          `Create a professional presentation JSON for this web page: ${textContent} and user prompt: ${prompt}. 
          Format as a JSON object with:
          - title: string
          - slides: array of slide objects with:
            * title: string
            * text: string
            * script: string (This is for more explanations of each slide)
            * keyInsightsOrTakeaways: array of strings
            * imageKeyword: string (A keyword to use for searching relevant images)
          Ensure the content is clear, professional, and matches the prompt.`
        );

        logToServiceWorker('Prompted')

        //console.log('Raw AI Response:', fullResponse);
        logToServiceWorker('Raw AI Response: '+fullResponse)

        // Clean the JSON string
        //fullResponse = fullResponse.replace(/```json|```/g, '').trim();

        fullResponse = fullResponse.replace(/,\s*}/g, '}').replace(/,\s*\]/g, ']');

              // Remove any potential extra characters before and after the JSON
      fullResponse = fullResponse.trim();
      const jsonStartIndex = fullResponse.indexOf('{');
      const jsonEndIndex = fullResponse.lastIndexOf('}');
      
      if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
        fullResponse = fullResponse.slice(jsonStartIndex, jsonEndIndex + 1);
      }

        //console.log('Cleaned JSON Response:', fullResponse);
        logToServiceWorker('Cleaned JSON Response: '+fullResponse)

        // Set the raw response for display
        setAiResponse(fullResponse);

        // Parse the JSON response with error handling
        let data;
        try {
          data = JSON.parse(fullResponse);
          //console.log('Parsed JSON Data:', data);
          logToServiceWorker('Parsed JSON Data:' + data)
        } catch (parseError) {
          //console.error('JSON Parsing Error:', parseError);
          logToServiceWorker('JSON Parsing Error: '+parseError)

          setError(`Error parsing JSON: ${parseError.message}`);
          return;
        }

        // Fetch images for each slide
        const imagePromises = data.slides.map(async (slide, index) => {
          const imageUrl = await fetchUnsplashImage(slide.imageKeyword || slide.title);
          return { [index]: imageUrl };
        });

        const imageResults = await Promise.all(imagePromises);
        const imagesMap = imageResults.reduce((acc, curr) => ({ ...acc, ...curr }), {});
        setSlideImages(imagesMap);

        // Set slides for rendering
        setSlides(data.slides);

        // Create a new PowerPoint presentation
        const pptx = new pptxgen();
        pptx.title = data.title;

        // Add slides to the presentation
// Modify slide creation to prevent image overlap
for (const [index, slideData] of data.slides.entries()) {
  // Create the main content slide
  const mainSlide = pptx.addSlide();

  // Title - Full width, top of the slide
  mainSlide.addText(slideData.title, {
    x: 0.5,
    y: 0.5, // Centered vertically
    w: 9, // Full width
    fontSize: 24,
    bold: true,
    align: 'left',
    color: '000000' // Ensure good readability
  });

  // Container for text and image
  const containerX = 0.5;
  const containerY = 1.2;
  const containerW = 9;
  const containerH = 4.5; // Adjusted height to accommodate key insights

  // Main text on left side
  mainSlide.addText(slideData.text, {
    x: containerX,
    y: containerY,
    w: 5, // Left half of container
    h: containerH - 0.5, // Slightly less height to leave space for key insights
    fontSize: 18,
    color: '333333',
    align: 'left'
  });

  // Image on right side
  const imageUrl = imagesMap[index];
  if (imageUrl) {
    mainSlide.addImage({
      x: containerX + 5, // Right half of container
      y: containerY,
      w: 4, // Slightly less width than text
      h: containerH - 0.5, // Matching height with text
      path: imageUrl,
      sizing: { type: 'cover', w: 4, h: containerH - 0.5 } // Ensure image covers the area
    });
  }

  // Create a separate slide for the key insights
  const insightSlide = pptx.addSlide();

  // Title - Full width, top of the slide
  insightSlide.addText('Key Insights', {
    x: 0.5,
    y: 0.5,
    w: 9,
    fontSize: 24,
    bold: true,
    align: 'left',
    color: '000000'
  });

  // Display the key insights
  slideData.keyInsightsOrTakeaways.forEach((insight, idx) => {
    insightSlide.addText(`• ${insight}`, {
      x: 0.5,
      y: 1.5 + idx * 0.5,
      w: 9,
      fontSize: 16,
      color: '444444',
      align: 'left'
    });
  });
}

        // Save the presentation
        try {
          // Generate the file and convert to Blob
          const blob = pptx.writeFile({ fileName: `${data.title}.pptx` });
          setPresentationFile(blob);
          console.log('Presentation saved successfully');
        } catch (saveError) {
          console.error('Error saving presentation:', saveError);
          setError(`Error saving presentation: ${saveError.message}`);
        }
      } else {
        setError('AI model is not available');
      }
    } catch (error) {
      console.error('Full Error:', error);
      setError(`Error generating presentation: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to download the presentation
  const handleDownloadPresentation = () => {
    logToServiceWorker('Download Presentation clicked')
    if (!presentationFile) {
      setError('No presentation file available to download');
      logToServiceWorker('No presentation file available to download')
      return;
    }

    // Create a download link
    const link = document.createElement('a');
    link.href = URL.createObjectURL(presentationFile);
    link.download = `Presentation.pptx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 3, mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          AI Presentation Generator
        </Typography>

        <TextField
          fullWidth
          multiline
          rows={4}
          variant="outlined"
          label="Enter Presentation Prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          sx={{ mb: 2 }}
        />

        <Stack spacing={2} direction="row">
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleGeneratePresentation}
            disabled={isLoading}
            fullWidth
          >
            {isLoading ? <CircularProgress size={24} /> : 'Generate Presentation'}
          </Button>

          {presentationFile && (
            <Button 
              variant="contained" 
              color="secondary" 
              onClick={handleDownloadPresentation}
              fullWidth
            >
              Download Presentation
            </Button>
          )}
        </Stack>

        {error && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'error.light', color: 'error.contrastText', borderRadius: 2 }}>
            <Typography variant="h6">Error:</Typography>
            <Typography>{error}</Typography>
          </Box>
        )}

        {aiResponse && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
            <Typography variant="h6">AI Response:</Typography>
            <pre style={{ 
              whiteSpace: 'pre-wrap', 
              wordWrap: 'break-word', 
              fontFamily: 'monospace' 
            }}>
              {aiResponse}
            </pre>
          </Box>
        )}

        {slides.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h5" gutterBottom>
              Generated Slides:
            </Typography>
            {slides.map((slide, index) => (

              <Paper key={index} elevation={2} sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6">{slide.title}</Typography>
                <Typography variant="body1">{slide.text}</Typography>
                <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                  Script: {slide.script}
                </Typography>
                <Typography variant="body2">
                  Key Insights or Takeaways:
                </Typography>
                <ul>
                  {slide.keyInsightsOrTakeaways.map((insight, idx) => (
                    <li key={idx}>{insight}</li>
                  ))}
                </ul>
                {slideImages[index] && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2">Slide Image:</Typography>
                    <img 
                      src={slideImages[index]} 
                      alt={`Slide ${index + 1} illustration`} 
                      style={{ maxWidth: '100%', height: 'auto' }} 
                    />
                  </Box>
                )}
  <Button
      variant="text"
      startIcon={speakingSlides[index] ? <VolumeOff /> : <VolumeUp />}
      sx={{ mt: 2 }}
      onClick={() => speakingSlides[index] ? stopSpeaking() : speakText(slide.script, index)}
    >
      {speakingSlides[index] ? 'Stop' : 'Speak'}
    </Button>

              </Paper>
            ))}
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default PresentationConverter;