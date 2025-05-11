import React from "react";
import { SerialProvider } from "./contexts/SerialContext";
import { SerialPlot } from "./components/SerialPlot";
import { Toaster } from "react-hot-toast";
import { Dashboard } from "./components/dashboard";
import { ThemeProvider } from "./themeProvider";
// import './app.css';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <SerialProvider>
        <Dashboard />
        <Toaster position="bottom-right" />
      </SerialProvider>
    </ThemeProvider>

    // <SerialProvider>
    //   <Dashboard />
    //   <Toaster position="bottom-right" />
    // </SerialProvider>
  );
};

export default App;
