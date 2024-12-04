import React, { useState } from 'react';
import { 
  Button, 
  TextField, 
  Typography, 
  Container, 
  Box, 
  CircularProgress 
} from '@mui/material';
import { 
  LineChart, Line, 
  BarChart, Bar, 
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid 
} from 'recharts';
import { logToServiceWorker } from '../logToServiceWorker';
import { toPng } from 'html-to-image';



const ChartRenderer = ({ chartConfig }) => {
  const renderChart = () => {
    const { type, data, colors = ['#0088FE', '#00C49F', '#FFBB28'] } = chartConfig;

    const commonProps = {
      width: 600,
      height: 400,
      data: data
    };

    const legendProps = {
      wrapperStyle: { margin: 20 }
    };

    switch(type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend {...legendProps} />
            <Line type="monotone" dataKey="value" stroke="#8884d8" />
          </LineChart>
        );
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend {...legendProps} />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        );
      case 'pie':
        return (
          <PieChart width={400} height={400}>
            <Pie
              data={data}
              cx={200}
              cy={200}
              labelLine={false}
              outerRadius={150}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={colors[index % colors.length]} 
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend {...legendProps} />
          </PieChart>
        );
      default:
        return <div>Unsupported chart type</div>;
    }
  };

  return (
    <div>
      {renderChart()}
    </div>
  );
};

const ChartConfigApp = () => {
  const [jsonInput, setJsonInput] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [chartConfig, setChartConfig] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

  const cleanJsonLog = (log) => {
    const jsonRegex = /```json\s*([\s\S]*?)```/;
    const match = log.match(jsonRegex);
    return match ? match[1].trim() : log.trim();
  };

  const aigenerate = async () => {
    logToServiceWorker('Generating chart config with AI');
    setIsLoading(true);
    setError('');
    
    try {
      const pageText = await getAllTextFromCurrentTab();
      logToServiceWorker(`Page text: ${pageText}`);

      const systemPrompt = `
You are a data visualization expert. Extract meaningful data from the following web page text and generate a JSON configuration for a chart.

JSON Structure Guidelines:
1. Must have 'chartType': Choose from 'pie', 'bar', or 'line'
2. 'dataSource' should be an array of objects
3. Each object must have 'name' and 'value' keys
4. Optional 'chartConfig' for custom colors

Rules for Data Extraction:
- Identify numerical data with descriptive labels
- Prioritize clear, comparable metrics
- Limit to 5-7 data points
- Use meaningful, concise names

Example Output:
{
  "chartType": "bar",
  "dataSource": [
    {"name": "Sales Q1", "value": 4000},
    {"name": "Sales Q2", "value": 3000}
  ]
}
`;

      const { available } = await ai.languageModel.capabilities();
      
      const session = await ai.languageModel.create({
        systemPrompt: systemPrompt
      });

      logToServiceWorker(`System Prompt set`); 

      let result = await session.prompt(`
Extract and visualize data from this web page text:

${pageText}

Generate a JSON chart configuration focusing on the most interesting numerical insights.

User-Specific Guidance: ${userPrompt || 'Generate a general insights chart'}
`);

      logToServiceWorker(`result: ${result}`); 

      result = cleanJsonLog(result);

      const parsedConfig = JSON.parse(result);
      
      setJsonInput(JSON.stringify(parsedConfig, null, 2));
      
      const config = {
        type: parsedConfig.chartType,
        data: parsedConfig.dataSource,
        colors: parsedConfig.chartConfig?.colors
      };

      setChartConfig(config);
    } catch (err) {
      setError(`AI Generation Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenderChart = () => {
    try {
      const parsedConfig = JSON.parse(jsonInput);
      
      if (!parsedConfig.chartType || !parsedConfig.dataSource) {
        throw new Error('Invalid JSON structure');
      }

      const config = {
        type: parsedConfig.chartType,
        data: parsedConfig.dataSource,
        colors: parsedConfig.chartConfig?.colors
      };

      setChartConfig(config);
      setError('');
    } catch (err) {
      setError(`Error parsing JSON: ${err.message}`);
      setChartConfig(null);
    }
  };

  const handleDownloadChart = async () => {
    if (chartRef.current) {
      try {
        const dataUrl = await toPng(chartRef.current);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = 'chart.png';
        link.click();
      } catch (err) {
        console.error('Error downloading chart:', err);
      }
    }
  };


  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Web Page Data Visualizer
        </Typography>
        
        <TextField
          fullWidth
          variant="outlined"
          margin="normal"
          label="User Guidance for Chart Generation"
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          placeholder="E.g., Focus on economic indicators, show top 3 metrics, etc."
        />
        
        <Button 
          variant="contained" 
          color="primary" 
          onClick={aigenerate}
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
        >
          {isLoading ? 'Generating...' : 'AI Generate Chart'}
        </Button>

        <TextField
          fullWidth
          multiline
          rows={6}
          variant="outlined"
          margin="normal"
          label="Chart JSON Configuration"
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
        />

        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Button 
            variant="contained" 
            color="secondary" 
            onClick={handleRenderChart}
          >
            Render Chart
          </Button>

          <Button 
            variant="contained" 
            color="success" 
            onClick={handleDownloadChart}
            disabled={!chartConfig}
          >
            Download Chart
          </Button>
        </Box>


        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}

        {chartConfig && (
          <Box sx={{ mt: 4 }}>
            <ChartRenderer chartConfig={chartConfig} />
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default ChartConfigApp;






