import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  IconButton,
  Divider,
  List,
  ListItem,
  CircularProgress,
  Collapse
} from '@mui/material';
import { Send, Download, ExpandMore, ExpandLess } from '@mui/icons-material';

const Animation = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [currentPage, setCurrentPage] = useState(null);
  const [pageContent, setPageContent] = useState('');
  const [showContent, setShowContent] = useState(true);
  const [geminiSession, setGeminiSession] = useState(null);

  useEffect(() => {
    const initializeGeminiSession = async () => {
      try {
        const { available, defaultTemperature, defaultTopK } = await ai.languageModel.capabilities();

        if (available !== "no") {
            const session = await ai.languageModel.create({
                systemPrompt: `You are an expert in generating 2D animations using Konva and explaining webpage content. 
                When given a webpage summary and animation request:
                1. Create a JSON configuration for shapes and animations
                2. Provide a concise explanation of the animation concept`,
                temperature: defaultTemperature,
                topK: defaultTopK
              });
          setGeminiSession(session);
        } else {
          Swal.fire({
            icon: 'error',
            title: 'AI Unavailable',
            text: 'Gemini Nano is not available',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
          });
        }
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Initialization Error',
          text: `Could not initialize AI: ${error.message}`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        });
      }
    };

    initializeGeminiSession();
    return () => geminiSession?.destroy();
  }, []);

  const getSummaryFromStorage = (url) => {
    try {
      const storedSummaries = JSON.parse(localStorage.getItem('pageSummaries') || '{}');
      return storedSummaries[url] || null;
    } catch (error) {
      console.error('Storage retrieval error:', error);
      return null;
    }
  };

  const saveSummaryToStorage = (url, summary) => {
    try {
      const storedSummaries = JSON.parse(localStorage.getItem('pageSummaries') || '{}');
      storedSummaries[url] = summary;
      localStorage.setItem('pageSummaries', JSON.stringify(storedSummaries));
    } catch (error) {
      console.error('Storage save error:', error);
    }
  };

  const getCurrentPageContent = async () => {
    if (!geminiSession) return;

    setLoading(true);
    
    try {
      const [activeTab] = await new Promise((resolve) => 
        chrome.tabs.query({ active: true, currentWindow: true }, resolve)
      );

      const storedSummary = getSummaryFromStorage(activeTab.url);
      
      if (storedSummary) {
        setCurrentPage(activeTab.url);
        setPageContent(storedSummary);
        
        Swal.fire({
          icon: 'info',
          title: 'Cached Summary',
          text: `Retrieved from cache: ${activeTab.url}`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2000
        });

        setMessages([{
          type: 'system',
          content: `Loaded cached summary from: ${activeTab.url}`
        }]);

        setLoading(false);
        return;
      }

      const [scriptResult] = await new Promise((resolve) => 
        chrome.scripting.executeScript(
          {
            target: { tabId: activeTab.id },
            func: () => document.body.innerText,
          },
          resolve
        )
      );

      if (scriptResult?.result) {
        const content = scriptResult.result;
        
        try {
          const summaryPrompt = `Create a concise, informative summary of the following webpage content. Focus on key points and main ideas:\n\n${content}`;
          const summaryResult = await geminiSession.prompt(summaryPrompt);
          
          saveSummaryToStorage(activeTab.url, summaryResult);
          
          setCurrentPage(activeTab.url);
          setPageContent(summaryResult);
          
          setMessages([{
            type: 'system',
            content: `Created summary for: ${activeTab.url}`
          }]);
        } catch (summarizeError) {
          Swal.fire({
            icon: 'error',
            title: 'Summary Failed',
            text: `Error: ${summarizeError.message}`,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
          });
        }
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Load Error',
        text: `Could not load content: ${error.message}`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !pageContent || !geminiSession) return;

    const userMessage = {
      type: 'user',
      content: input
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const fullPrompt = `Webpage Summary:\n${pageContent}\n\nUser Question: ${input}\n\nProvide a concise, relevant konva @D animation to help explain.`;
      
      const stream = geminiSession.promptStreaming(fullPrompt);
      
      let assistantResponse = '';
      let previousChunk = '';

      const assistantMessage = {
        type: 'assistant',
        content: ''
      };
      setMessages(prev => [...prev, assistantMessage]);

      for await (const chunk of stream) {
        const newChunk = chunk.startsWith(previousChunk)
          ? chunk.slice(previousChunk.length)
          : chunk;
        
        assistantResponse += newChunk;
        
        setMessages(prev => {
          const updatedMessages = [...prev];
          const lastMessageIndex = updatedMessages.length - 1;
          updatedMessages[lastMessageIndex].content = assistantResponse;
          return updatedMessages;
        });
        
        previousChunk = chunk;
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Response Error',
        text: `Could not generate response: ${error.message}`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6">
            Webpage Summary
          </Typography>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={getCurrentPageContent}
            disabled={loading || !geminiSession}
          >
            Load Summary
          </Button>
        </Box>
        {currentPage && (
          <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 1 }}>
            {currentPage}
          </Typography>
        )}
        {pageContent && (
          <Paper 
            variant="outlined" 
            sx={{ 
              mt: 1, 
              p: 2, 
              maxHeight: '200px', 
              overflow: 'auto',
              backgroundColor: 'grey.50'
            }}
          >
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {pageContent}
            </Typography>
          </Paper>
        )}
      </Paper>

      <Paper elevation={3} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <List sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          {messages.map((message, index) => (
            <ListItem
              key={index}
              sx={{
                flexDirection: 'column',
                alignItems: 'stretch',
                mb: 1
              }}
            >
              {message.type !== 'system' && (
                <Paper
                  elevation={1}
                  sx={{
                    p: 1,
                    mb: 1,
                    bgcolor: message.type === 'user' ? 'primary.main' : 'grey.100',
                    color: message.type === 'user' ? 'white' : 'text.primary'
                  }}
                >
                  <Typography variant="body2">
                    {message.content}
                  </Typography>
                </Paper>
              )}
            </ListItem>
          ))}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
        </List>

        <Divider />

        <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the webpage summary..."
            variant="outlined"
            size="small"
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={!pageContent || !geminiSession}
          />
          <IconButton 
            color="primary" 
            onClick={handleSendMessage}
            disabled={!input.trim() || !pageContent || !geminiSession || loading}
          >
            <Send />
          </IconButton>
        </Box>
      </Paper>
    </Box>
  );
};

export default Animation;