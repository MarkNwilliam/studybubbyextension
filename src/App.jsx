import React, { useState } from 'react';
import Home from './pages/Home';
import About from './pages/About';
import WebChat from './pages/WebChat';
import Animation from './pages/Animation';
import WebContentRxDBSearch from './pages/WebContentRxDBSearch';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import PresentationConverter from './pages/PresentationConverter';
import AIQuizGenerator from './pages/QuestionAnswerGenerator';
import Recommendation from './pages/recommendation';
import ChartConfigApp from './pages/Analysis';
import Flowchart from './pages/Flowcharts';
import Flashcards from './pages/Flashcards';

const App = () => {
  const [currentPage, setCurrentPage] = useState('home');

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home onNavigate={setCurrentPage} />;
      case 'about':
        return <About />;
      case 'webchat':
        return <WebChat />;
      case 'animation':
        return <PresentationConverter />;
      case 'webcontent':
        return <WebContentRxDBSearch />;
      case 'questions':
        return <AIQuizGenerator />;
      case 'recommendation':
        return <Recommendation />;
      case 'analysis':
        return <ChartConfigApp />;
      case 'flowchart':
        return <Flowchart />;
      case 'flashcard':
        return <Flashcards />;
       
      // Add new page cases here as needed
      default:
        return <Home onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div style={{ 
      width: '900px', 
      height: '900px', 
      display: 'flex', 
      flexDirection: 'column', 
      overflow: 'auto' 
    }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Study Buddy
          </Typography>
          <Button 
            color="inherit" 
            onClick={() => setCurrentPage('home')}
            sx={{ 
              backgroundColor: currentPage === 'home' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              mx: 1,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.2)'
              }
            }}
          >
            Home
          </Button>
          <Button 
            color="inherit" 
            onClick={() => setCurrentPage('about')}
            sx={{ 
              backgroundColor: currentPage === 'about' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.2)'
              }
            }}
          >
            About
          </Button>
        </Toolbar>
      </AppBar>
      <div style={{ 
        flexGrow: 1, 
        overflow: 'auto', 
        padding: '16px',
      }}>
        {renderPage()}
      </div>
    </div>
  );
};

export default App;