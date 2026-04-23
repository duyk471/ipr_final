import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import { ThemeProvider } from './store/useTheme';

function App() {
  const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-[#121A13] flex items-center justify-center p-8 z-[9999] text-center font-sans">
        <div className="max-w-md space-y-6">
          <div className="text-6xl mb-4 animate-pulse">🌿</div>
          <h1 className="text-2xl font-black text-[#E0E8E1] tracking-tight">Desktop Only</h1>
          <p className="text-[#8BA890] text-lg leading-relaxed">
            Our editor is optimized for desktop browsers only. Please switch to a PC or Laptop for the best experience.
          </p>
          <div className="pt-4">
            <div className="inline-block px-6 py-3 bg-[#2D3A30] border border-[#2E3D2F] rounded-2xl text-[#A8C69F] text-sm font-bold shadow-lg">
              Switch to Desktop
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/editor/:id" element={<Editor />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
