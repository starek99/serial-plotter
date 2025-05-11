import React from 'react';
import { SerialProvider } from './contexts/SerialContext';
import {SerialPlot} from './components/SerialPlot';
import { Toaster } from 'react-hot-toast';
import {Dashboard} from './components/dashboard';
import { ThemeProvider } from "./themeProvider"
// import './app.css';

const App: React.FC = () => {
  
  return (
    <html lang="en" suppressHydrationWarning>
    <head>
      <title>EZ Plotter</title>
      <meta name="description" content="Real-time serial data visualization tool" />
    </head>
    <body>
      <ThemeProvider>
        <SerialProvider>
        <Dashboard /> 
          <Toaster position="bottom-right"/>
        </SerialProvider>
      </ThemeProvider>
    </body>
  </html>

    // <SerialProvider>
    //   <Dashboard />
    //   <Toaster position="bottom-right" />
    // </SerialProvider>
  );
};

export default App;