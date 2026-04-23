import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import UserManual from './pages/UserManual';
import { ThemeProvider } from './store/useTheme';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/editor/:id" element={<Editor />} />
          <Route path="/manual" element={<UserManual />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
