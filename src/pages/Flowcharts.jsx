import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  CircularProgress, 
  Container, 
  Paper, 
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import mermaid from 'mermaid';
import PropTypes from 'prop-types';

const Flowchart = () => {
  const [text, setText] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [flowchart, setFlowchart] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({
    inputText: '',
    aiPrompt: '',
    rawResponse: null,
    errorDetails: null
  });
  const mermaidRef = useRef(null);

  const extractMermaidCode = (text) => {
    // Remove markdown code fence and 'mermaid' keyword
    const mermaidRegex = /```mermaid\s*([\s\S]*?)```/;
    const match = text.match(mermaidRegex);
    
    // Return the first match or the original text if no match
    return match ? match[1].trim() : text.trim();
  };
  // Initialize mermaid
  useEffect(() => {
    mermaid.initialize({ 
      startOnLoad: false,
      theme: 'default'
    });
  }, []);

  // Render mermaid diagram when flowchart changes
  useEffect(() => {
    if (flowchart && mermaidRef.current) {
      try {
        mermaid.run({
          querySelector: '.mermaid'
        });
      } catch (err) {
        setError('Failed to render flowchart');
        setDebugInfo(prev => ({
          ...prev,
          errorDetails: {
            message: err.message,
            stack: err.stack
          }
        }));
      }
    }
  }, [flowchart]);

  // Function to fetch text from current tab
 const getAllTextFromCurrentTab = async () => {
    try {
      // Ensure chrome API is available
      if (!chrome || !chrome.tabs || !chrome.scripting) {
        throw new Error('Chrome extension APIs are not available');
      }

      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!activeTab || !activeTab.id) {
        throw new Error('No active tab found');
      }

      const [result] = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: () => {
          const contentSelectors = [
            'main', 
            'article', 
            '.content', 
            '#content', 
            'body'
          ];
          
          for (const selector of contentSelectors) {
            const element = document.querySelector(selector);
            if (element) {
              return element.innerText;
            }
          }
          
          return document.body.innerText;
        }
      });

      return result.result || 'No text content found.';
    } catch (error) {
      console.error('Error getting text from current tab:', error);
      throw new Error('Failed to retrieve page content: ' + error.message);
    }
  };


  // Function to generate flowchart using AI
  // Function to generate flowchart using AI
  const generateFlowchart = async (textContent) => {
    try {
      setIsLoading(true);
      setError(null);

      // Limit text to prevent overwhelming the API
      const limitedText = textContent.slice(0, 5000);

      // Ensure the AI API is available 
      if (!window.ai || !window.ai.languageModel || !window.ai.languageModel.create) {
        throw new Error('AI Language Model API is not configured');
      }

      const session = await window.ai.languageModel.create({
        systemPrompt: `You are an expert at creating precise, concise Mermaid flowcharts. Follow these strict guidelines:

1. Generate ONLY ONE flowchart that captures the core essence of the content
2. Use Mermaid flowchart syntax exclusively
3. Return ONLY the raw Mermaid syntax without any additional text, markdown, or explanations
4. Prioritize clarity and simplicity in the diagram
5. Use meaningful, descriptive node labels
6. Choose the most appropriate flowchart type (LR, TD, etc.) based on content

Flowchart Types:
- flowchart LR: Left to Right (default)
- flowchart TD: Top Down
- flowchart TB: Top to Bottom (same as TD)

Recommended Syntax Elements:
- Use square [] for rectangular nodes
- Use () for rounded nodes
- Use {} for diamond decision nodes
- Use --> for standard connections
- Use ==> for thicker links
- Use --- for invisible links

ALWAYS use 'flowchart' keyword, NOT 'graph'
   - Use 'flowchart LR' or 'flowchart TD' explicitly

Node Formatting Rules:
   - Rectangular nodes: [Node Name]
   - Rounded nodes: (Node Name)
   - Decision nodes: {Node Decision}

Connection Types:
   - Standard connection: -->
   - Thick link: ==>
   - Text on links: -->|Link Text|
   - Invisible link: ---

Validation Checklist:
   - No extra text or markdown
   - Single, coherent flowchart
   - Meaningful, concise labels
   - Logical flow and connections
`
      });

      // Combine page content with user prompt
      const fullPrompt = userPrompt 
        ? `Create a Mermaid flowchart based on these additional instructions: ${userPrompt}\n\nContent to analyze:\n${limitedText}  Remember DONOT USE graph TD USE flowchart TD`
        : `Create a single, concise Mermaid flowchart that captures the key process or structure in this content:\n${limitedText} Remember DONOT USE graph TD USE flowchart TD`;


    
      // Prepare debug information
      setDebugInfo(prev => ({
        ...prev,
        inputText: limitedText,
        aiPrompt: fullPrompt
      }));

      const result = await session.prompt(fullPrompt);


      console.log('here is the ai response '+result);

    
      // Clean and extract Mermaid code
      const cleanedFlowchart = extractMermaidCode(result);

      // Store raw response in debug info
      setDebugInfo(prev => ({
        ...prev,
        rawResponse: cleanedFlowchart
      }));

      setFlowchart(cleanedFlowchart);
      setIsLoading(false);
    } catch (error) {
      console.error('Error generating flowchart:', error);
      setError(error.message);
      setDebugInfo(prev => ({
        ...prev,
        errorDetails: {
          message: error.message,
          stack: error.stack
        }
      }));
      setIsLoading(false);
    }
  };

  // Handle flowchart generation
  const handleGenerateFlowchart = async () => {
    try {
      const textContent = await getAllTextFromCurrentTab();
      //const textContent = "This is a test text content";
      setText(textContent);
      await generateFlowchart(textContent);
    } catch (err) {
      setError(err.message);
      setDebugInfo(prev => ({
        ...prev,
        errorDetails: {
          message: err.message,
          stack: err.stack
        }
      }));
    }
  };

  // Download SVG function
  const downloadFlowchartSVG = () => {
    const svgElement = document.querySelector('.mermaid svg');
    if (svgElement) {
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgElement);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = 'webpage_flowchart.svg';
      a.click();
      
      URL.revokeObjectURL(url);
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <Container maxWidth="sm">
        <Box 
          display="flex" 
          flexDirection="column" 
          alignItems="center" 
          justifyContent="center" 
          height="300px"
        >
          <CircularProgress />
          <Typography variant="body1" sx={{ mt: 2 }}>
            Generating flowchart from current webpage...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 2 }}>
        {/* User Prompt Input */}
        <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
          <TextField
            fullWidth
            label="Custom Prompt (Optional)"
            multiline
            rows={3}
            variant="outlined"
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Box display="flex" justifyContent="center">
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleGenerateFlowchart}
            >
              Generate Flowchart
            </Button>
          </Box>
        </Paper>

        {/* Flowchart Rendering */}
        {flowchart && (
          <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
            <div ref={mermaidRef} className="mermaid">
              {flowchart}
            </div>
            <Box display="flex" justifyContent="center" mt={2}>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={downloadFlowchartSVG}
              >
                Download Flowchart SVG
              </Button>
            </Box>
          </Paper>
        )}

        {/* Debug Information Accordion */}
        <Accordion>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="debug-content"
            id="debug-header"
          >
            <Typography>Debug Information</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box>
              <Typography variant="h6">Input Text</Typography>
              <pre style={{ 
                backgroundColor: '#f0f0f0', 
                padding: '10px', 
                borderRadius: '4px', 
                overflowX: 'auto' 
              }}>
                {debugInfo.inputText || 'No input text'}
              </pre>

              <Typography variant="h6" sx={{ mt: 2 }}>AI Prompt</Typography>
              <pre style={{ 
                backgroundColor: '#f0f0f0', 
                padding: '10px', 
                borderRadius: '4px', 
                overflowX: 'auto' 
              }}>
                {debugInfo.aiPrompt || 'No AI prompt'}
              </pre>

              {error && (
                <>
                  <Typography variant="h6" sx={{ mt: 2, color: 'error.main' }}>Error Details</Typography>
                  <pre style={{ 
                    backgroundColor: '#ffebee', 
                    padding: '10px', 
                    borderRadius: '4px', 
                    overflowX: 'auto' 
                  }}>
                    {JSON.stringify(debugInfo.errorDetails, null, 2)}
                  </pre>
                </>
              )}

              {debugInfo.rawResponse && (
                <>
                  <Typography variant="h6" sx={{ mt: 2 }}>Raw AI Response</Typography>
                  <pre style={{ 
                    backgroundColor: '#f0f0f0', 
                    padding: '10px', 
                    borderRadius: '4px', 
                    overflowX: 'auto' 
                  }}>
                    {debugInfo.rawResponse}
                  </pre>
                </>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
      </Box>
    </Container>
  );
};

// PropTypes for type checking (optional but recommended)
Flowchart.propTypes = {
  // Add any props if needed
};

export default Flowchart;