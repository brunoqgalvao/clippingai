import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ReportCacheProvider } from './contexts/ReportCacheContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Report from './pages/Report';
import Article from './pages/Article';
import Dashboard from './pages/Dashboard';
import CreateStream from './pages/CreateStream';
import StreamHistory from './pages/StreamHistory';

function App() {
  return (
    <AuthProvider>
      <ReportCacheProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/streams/create" element={<CreateStream />} />
          <Route path="/streams/:id" element={<StreamHistory />} />
          <Route path="/report" element={<Report />} />
          <Route path="/report/:id" element={<Report />} />
          <Route path="/report/public/:slug" element={<Report isPublic />} />
          <Route path="/r/:slug" element={<Report isPublic />} />
          <Route path="/article/:reportSlug/:articleId" element={<Article />} />
        </Routes>
      </Router>
      </ReportCacheProvider>
    </AuthProvider>
  );
}

export default App;
