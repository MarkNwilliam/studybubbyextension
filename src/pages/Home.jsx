import React from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  CardActions, 
  Button,
  IconButton
} from '@mui/material';
import { 
  Timer, 
  EventNote, 
  Create, 
  Psychology,
  BarChart,
  Notifications,
  Chat,
  Language,
  Animation ,
  QuestionAnswer,
  HelpOutline,
  ThumbUp,
  Schema
} from '@mui/icons-material';
import { styled } from '@mui/system';

const GradientBox = styled(Box)({
  background: 'linear-gradient(to right, #38b2ac, #4299e1, #805ad5)',
  padding: '16px',
  borderRadius: '8px',
  marginBottom: '24px'
});

const FeatureCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  }
}));

const Home = ({ onNavigate }) => {
  const features = [
    {
      id: 'webchat',
      title: 'Web Chat Assistant',
      description: 'Chat with any webpage for quick study insights',
      icon: (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chat fontSize="large" color="primary" />
          <Language fontSize="large" color="primary" />
        </Box>
      ),
      action: 'Start Chat'
    },

    {
      id: 'animation',
      title: 'make your own testd',
      description: 'make tests ,do them and have naswers explained',
      icon: (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Animation fontSize="large" color="primary" />
        </Box>
      ),
      action: 'Make Animation'
    },
    {
      id: "questions",
      title: "Questions",
      description: "Ask and answer questions to enhance your learning",
      icon: (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <QuestionAnswer fontSize="large" color="primary" />
          <HelpOutline fontSize="large" color="primary" />
        </Box>
      ),
      action: "Ask Question"
    },
    {
      id: 'flashcard',
      title: 'Flashcards',
      description: 'Create and study with interactive flashcards',
      icon: (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Psychology fontSize="large" color="primary" />
          <Create fontSize="large" color="primary" />
        </Box>
      ),
      action: 'Create Cards'
    },
    /*
    {
      id: 'webcontent',
      title: 'Study webcontent',
      description: 'Track your study sessions with Pomodoro timer',
      icon: (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Timer fontSize="large" color="primary" />
          <EventNote fontSize="large" color="primary" />
        </Box>
      ),
      action: 'webcontent'
    },*/
    {
      id: 'analysis',
      title: 'Study Analytics',
      description: 'Visualise data on the web page',
      icon: (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <BarChart fontSize="large" color="primary" />
          <Notifications fontSize="large" color="primary" />
        </Box>
      ),
      action: 'View the data'
    },
    {
      id: 'recommendation',
      title: 'Recommendations',
      description: 'Get personalized study recommendations',
      icon: (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <ThumbUp fontSize="large" color="primary" />
        </Box>
      ),
      action: 'Get Recommendations'
    },
    {
      id: 'flowchart',
      title: 'Flow Charts',
      description: 'Study with interactive flow charts',
      icon: (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Schema fontSize="large" color="primary" />
        </Box>
      ),
      action: 'Create Flow Chart'
    }
  ];

  return (
    <Box sx={{ maxWidth: '100%' }}>
      <GradientBox>
        <Typography variant="h4" component="h1" gutterBottom sx={{ color: 'white', fontWeight: 'bold' }}>
          Welcome to Study Buddy
        </Typography>
        <Typography variant="body1" sx={{ color: 'white', opacity: 0.9 }}>
          Your personal assistant for productive studying
        </Typography>
      </GradientBox>
      <Grid container spacing={3}>
        {features.map((feature) => (
          <Grid item xs={12} sm={6} key={feature.id}>
            <FeatureCard>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                  {feature.icon}
                </Box>
                <Typography variant="h6" component="h2" gutterBottom align="center">
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" align="center">
                  {feature.description}
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'center', mt: 'auto', pb: 2 }}>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => onNavigate(feature.id)}
                >
                  {feature.action}
                </Button>
              </CardActions>
            </FeatureCard>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Home;