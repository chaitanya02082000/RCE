import { useState } from "react";
import { Code } from "./comp/code";
import { Combobox } from "./comp/dropdown";
import { ThemeProvider } from "./components/theme-provider";
import { ModeToggle } from "./comp/mode-toggle";

function App() {
  const [selectedLanguage, setSelectedLanguage] = useState("");

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="container mx-auto p-4 h-screen flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Code Executor</h1>
          <div className="flex items-center gap-3">
            <Combobox value={selectedLanguage} onChange={setSelectedLanguage} />
            <ModeToggle />
          </div>
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          <Code
            prop="Enter your code here..."
            selectedLanguage={selectedLanguage}
          />
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
