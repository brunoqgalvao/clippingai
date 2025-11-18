import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Report from './pages/Report';
import Article from './pages/Article';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/report" element={<Report />} />
        <Route path="/report/:id" element={<Report />} />
        <Route path="/report/public/:slug" element={<Report isPublic />} />
        <Route path="/r/:slug" element={<Report isPublic />} />
        <Route path="/article/:reportSlug/:articleId" element={<Article />} />
      </Routes>
    </Router>
  );
}

export default App;
