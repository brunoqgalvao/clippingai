import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/report/:id" element={<div style={{ padding: '100px', textAlign: 'center', color: 'white' }}>Report viewer coming next...</div>} />
      </Routes>
    </Router>
  );
}

export default App;
