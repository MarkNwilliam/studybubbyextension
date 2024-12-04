import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { 
  createRxDatabase, 
  addRxPlugin 
} from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { disableWarnings } from 'rxdb/plugins/dev-mode';

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

disableWarnings();
// Add RxDB plugins
addRxPlugin(RxDBDevModePlugin);
addRxPlugin(RxDBQueryBuilderPlugin);

// Define schema for web content
const webContentSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 500
    },
    url: {
      type: 'string'
    },
    content: {
      type: 'string'
    },
    timestamp: {
      type: 'string',
      format: 'date-time'
    }
  },
  required: ['id', 'url', 'content', 'timestamp']
};

const WebContentRxDBSearch = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [currentPage, setCurrentPage] = useState(null);
  const [pageContent, setPageContent] = useState('');
  const [showContent, setShowContent] = useState(true);
  const [database, setDatabase] = useState(null);

  // Initialize RxDB database
  useEffect(() => {
    const initDatabase = async () => {
      try {
        const db = await createRxDatabase({
          name: 'web_content_db',
          storage: getRxStorageDexie()
        });

        await db.addCollections({
          webcontents: {
            schema: webContentSchema
          }
        });

        setDatabase(db);
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Database Initialization Error',
          text: error.message
        });
      }
    };

    initDatabase();
  }, []);

 const getCurrentPageContent = async () => {
  if (!database) return;

  setLoading(true);
  
  try {
    const [activeTab] = await new Promise((resolve) => 
      chrome.tabs.query({ active: true, currentWindow: true }, resolve)
    );

    // First, check if content for this URL already exists
    const existingContent = await database.webcontents.findOne({
      selector: {
        url: activeTab.url
      }
    }).exec();

    // If content already exists, ask user if they want to update
    if (existingContent) {
      const result = await Swal.fire({
        icon: 'question',
        title: 'Content Already Exists',
        text: 'Content for this page is already saved. Do you want to update it?',
        showCancelButton: true,
        confirmButtonText: 'Update',
        cancelButtonText: 'Cancel'
      });

      if (!result.isConfirmed) {
        // If user cancels, show existing content
        setCurrentPage(existingContent.url);
        setPageContent(existingContent.content);
        setLoading(false);
        return;
      }
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
      
      // If content already exists, remove the old document first
      if (existingContent) {
        await database.webcontents.findOne({
          selector: {
            url: activeTab.url
          }
        }).remove();
      }
      
      // Store new content in RxDB
      await database.webcontents.insert({
        id: activeTab.url,
        url: activeTab.url,
        content: content,
        timestamp: new Date().toISOString()
      });

      setCurrentPage(activeTab.url);
      setPageContent(content);
      
      Swal.fire({
        icon: 'success',
        title: existingContent ? 'Page Content Updated' : 'Page Content Saved',
        text: `Successfully ${existingContent ? 'updated' : 'saved'} content from: ${activeTab.url}`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
    }
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: `Could not load page content: ${error.message}`,
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
    if (!input.trim() || !database) return;

    setMessages([
      ...messages,
      {
        type: 'user',
        content: input
      }
    ]);

    // Perform advanced text search with multiple query strategies
    try {
      // Strategy 1: Case-insensitive regex search
      const regexSearchResult = await database.webcontents.find({
        selector: {
          content: { 
            $regex: new RegExp(input.trim(), 'i') 
          }
        }
      }).exec();

      // Strategy 2: Full word match search
      const wordMatchResult = await database.webcontents.find({
        selector: {
          $or: [
            { content: { $regex: `\\b${input.trim()}\\b` } },
            { url: { $regex: input.trim(), $options: 'i' } }
          ]
        }
      }).exec();

      // Combine and deduplicate results
      const combinedResults = [
        ...new Set([...regexSearchResult, ...wordMatchResult])
      ];

      if (combinedResults.length > 0) {
        // Sort results by relevance (could be expanded with more complex logic)
        const sortedResults = combinedResults.sort((a, b) => 
          b.content.toLowerCase().includes(input.toLowerCase()) - 
          a.content.toLowerCase().includes(input.toLowerCase())
        );

        // Prepare response with top result
        const topResult = sortedResults[0];
        const responseContent = `Found relevant content:\n\nURL: ${topResult.url}\n\nExcerpt: ${topResult.content.substring(0, 500)}...`;

        setMessages(prev => [
          ...prev,
          {
            type: 'assistant',
            content: responseContent
          }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            type: 'assistant',
            content: 'No relevant content found. Try a different search term.'
          }
        ]);
      }
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          type: 'assistant',
          content: `Search error: ${error.message}`
        }
      ]);
    }

    setInput('');
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
      {/* Page Content Section */}
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6">
            Current Webpage
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={getCurrentPageContent}
              disabled={loading || !database}
            >
              Load Page Content
            </Button>
            {pageContent && (
              <IconButton 
                size="small" 
                onClick={() => setShowContent(!showContent)}
              >
                {showContent ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            )}
          </Box>
        </Box>
        {currentPage && (
          <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 1 }}>
            {currentPage}
          </Typography>
        )}
        {pageContent && (
          <Collapse in={showContent}>
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
          </Collapse>
        )}
      </Paper>

      {/* Chat Section */}
      <Paper elevation={3} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Messages */}
        <List sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          {messages.map((message, index) => (
            <ListItem
              key={index}
              sx={{
                justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start',
                mb: 1
              }}
            >
              <Paper
                elevation={1}
                sx={{
                  p: 1,
                  maxWidth: '80%',
                  bgcolor: message.type === 'system' 
                    ? 'grey.200'
                    : message.type === 'user' 
                    ? 'primary.main' 
                    : 'grey.100',
                  color: message.type === 'user' ? 'white' : 'text.primary'
                }}
              >
                <Typography variant="body2">
                  {message.content}
                </Typography>
              </Paper>
            </ListItem>
          ))}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
        </List>

        <Divider />

        {/* Input Section */}
        <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the loaded webpage..."
            variant="outlined"
            size="small"
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <IconButton 
            color="primary" 
            onClick={handleSendMessage}
            disabled={!input.trim() || loading || !database}
          >
            <Send />
          </IconButton>
        </Box>
      </Paper>
    </Box>
  );
};

export default WebContentRxDBSearch;