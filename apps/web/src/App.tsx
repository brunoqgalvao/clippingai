import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </div>
    </Router>
  );
}

function HomePage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Clipping.AI
        </h1>
        <p className="text-xl text-gray-600">
          AI-Powered Competitive Intelligence
        </p>
        <p className="mt-4 text-sm text-gray-500">
          Setting up the amazing first 30 seconds experience...
        </p>
      </div>
    </div>
  );
}

export default App;
