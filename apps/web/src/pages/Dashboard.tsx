import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2, LayoutDashboard, LogOut, Settings, Zap, Clock, MoreVertical, Trash2 } from 'lucide-react';
import { generateReportForConfig, getJobStatus, deleteReportConfig, type ReportConfig } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useReportCache } from '../contexts/ReportCacheContext';
import Logo from '../components/Logo';
import '../styles/dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { streams, streamsLoaded, getCachedOrFetchStreams, preloadReportsForStream, clearCache } = useReportCache();
  const [loading, setLoading] = useState(!streamsLoaded);
  const [error, setError] = useState<string | null>(null);
  const [generatingJobs, setGeneratingJobs] = useState<Map<string, string>>(new Map()); // streamId -> jobId
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Redirect to login if not authenticated
  // Add small delay to avoid race condition with login state update
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      const timeout = setTimeout(() => {
        // Double-check after delay to handle login race condition
        const token = localStorage.getItem('auth_token');
        if (!token) {
          navigate('/login');
        }
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    async function loadData() {
      console.log('Dashboard loadData:', { authLoading, isAuthenticated, streamsLoaded, user });

      // Wait for auth to finish loading
      if (authLoading) {
        console.log('Still loading auth...');
        return;
      }

      // If not authenticated, don't try to load data
      if (!isAuthenticated) {
        console.log('Not authenticated, skipping data load');
        setLoading(false);
        return;
      }

      // If already loaded from cache, skip fetch
      if (streamsLoaded) {
        console.log('Streams already loaded from cache');
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching streams...');
        await getCachedOrFetchStreams();
        console.log('Streams loaded successfully');
      } catch (err) {
        console.error('Error loading dashboard:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [authLoading, isAuthenticated, streamsLoaded, user, getCachedOrFetchStreams]);

  const handleLogout = () => {
    clearCache(); // Clear cached data on logout
    logout();
    navigate('/login');
  };

  // Check if any streams have generating reports from database
  const hasGeneratingFromDB = streams.some(stream =>
    stream.generatedReports?.[0]?.status === 'generating'
  );

  // Background polling for generating jobs (local state) AND database generating reports
  useEffect(() => {
    if (generatingJobs.size === 0 && !hasGeneratingFromDB) return;

    const pollInterval = setInterval(async () => {
      const newGeneratingJobs = new Map(generatingJobs);
      let shouldRefresh = false;

      // Poll local job states
      for (const [streamId, jobId] of generatingJobs.entries()) {
        try {
          const status = await getJobStatus(jobId);

          if (status.state === 'completed') {
            newGeneratingJobs.delete(streamId);
            shouldRefresh = true;

            // Show success message
            const streamName = streams.find(s => s.id === streamId)?.title || 'Report';
            setSuccessMessage(`${streamName} generated successfully!`);
            setTimeout(() => setSuccessMessage(null), 5000);
          } else if (status.state === 'failed') {
            newGeneratingJobs.delete(streamId);
            shouldRefresh = true;
            setError(`Report generation failed for stream`);
          }
        } catch (err) {
          console.error('Error polling job:', err);
          newGeneratingJobs.delete(streamId);
        }
      }

      setGeneratingJobs(newGeneratingJobs);

      // If we had DB-based generating or completed jobs, refresh to check status
      if (shouldRefresh || hasGeneratingFromDB) {
        await getCachedOrFetchStreams(true);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [generatingJobs, streams, getCachedOrFetchStreams, hasGeneratingFromDB]);

  const handleGenerateNow = async (streamId: string) => {
    setError(null);

    try {
      const { jobId } = await generateReportForConfig(streamId);

      // Add to generating jobs (non-blocking)
      setGeneratingJobs(prev => new Map(prev).set(streamId, jobId));
    } catch (err: any) {
      console.error('Error generating report:', err);

      // Handle "already generating" error gracefully
      if (err.code === 'ALREADY_GENERATING') {
        setError('A report is already being generated for this stream.');
        // Force refresh to get the latest state from database
        await getCachedOrFetchStreams(true);
      } else {
        setError('Failed to start report generation. Please try again.');
      }
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDeleteStream = async (streamId: string) => {
    setIsDeleting(true);
    try {
      await deleteReportConfig(streamId);
      setDeleteConfirmId(null);
      setOpenMenuId(null);
      setSuccessMessage('Stream deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      // Refresh streams
      await getCachedOrFetchStreams(true);
    } catch (err) {
      console.error('Error deleting stream:', err);
      setError('Failed to delete stream');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getFrequencyBadge = (frequency: string) => {
    const badges: Record<string, string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      biweekly: 'Bi-weekly',
      monthly: 'Monthly',
    };
    return badges[frequency] || frequency;
  };

  const getReportTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      competitor_landscape: 'Competitor Intel',
      market_landscape: 'Market Trends',
      media_monitoring: 'Media Monitoring',
    };
    return labels[type] || type;
  };

  const getImageUrl = (url?: string) => {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    return `${apiUrl}${url}`;
  };

  if (authLoading || loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-assembly">
          <div className="assembly-grid">
            {[...Array(16)].map((_, i) => (
              <div
                key={i}
                className="assembly-block"
                style={{
                  animationDelay: `${i * 0.08}s`,
                  '--final-x': `${(i % 4) * 25}%`,
                  '--final-y': `${Math.floor(i / 4) * 25}%`,
                } as React.CSSProperties}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="dashboard-logo" onClick={() => navigate('/')}>
            <Logo size={50} showWordmark={true} variant="dark" />
          </div>

          <div className="dashboard-actions">
            <div className="dashboard-user-email">
              {user?.email}
            </div>
            <button
              onClick={handleLogout}
              className="dashboard-logout-btn"
              title="Sign out"
            >
              <LogOut size={20} />
            </button>
            <button
              onClick={() => navigate('/streams/create')}
              className="dashboard-new-report-btn"
            >
              <Plus size={20} />
              New Stream
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="dashboard-header-section">
          <h1 className="dashboard-title">Your Intelligence Streams</h1>
          <p className="dashboard-subtitle">
            Automated reports delivered on your schedule
          </p>
        </div>

        {error && (
          <div className="dashboard-error">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="dashboard-success">
            {successMessage}
          </div>
        )}

        {streams.length === 0 ? (
          <div className="dashboard-empty">
            <div className="dashboard-empty-icon">
              <Zap size={40} />
            </div>
            <h3 className="dashboard-empty-title">No streams yet</h3>
            <p className="dashboard-empty-text">
              Create your first intelligence stream to receive automated reports weekly.
              Set it up once, get insights forever.
            </p>
            <button
              onClick={() => navigate('/streams/create')}
              className="dashboard-empty-btn"
            >
              <Plus size={24} />
              Create First Stream
            </button>
          </div>
        ) : (
          <div className="dashboard-reports-grid">
            {streams.map((stream) => {
              const latestReport = stream.generatedReports?.[0];
              const rawImage = latestReport?.content?.articles?.find((a: any) => a.imageUrl)?.imageUrl;
              const firstImage = getImageUrl(rawImage);
              // Check both local state AND database state for generating status
              const isGeneratingFromDB = latestReport?.status === 'generating';
              const isGenerating = generatingJobs.has(stream.id) || isGeneratingFromDB;

              return (
                <div
                  key={stream.id}
                  className="dashboard-stream-card"
                  onClick={() => navigate(`/streams/${stream.id}`)}
                  onMouseEnter={() => preloadReportsForStream(stream.id)}
                >
                  {/* 3-dot menu */}
                  <div className="dashboard-card-menu-container" ref={openMenuId === stream.id ? menuRef : null}>
                    <button
                      className="dashboard-card-menu-trigger"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === stream.id ? null : stream.id);
                      }}
                    >
                      <MoreVertical size={18} />
                    </button>
                    {openMenuId === stream.id && (
                      <div className="dashboard-card-menu-dropdown">
                        <button
                          className="dashboard-card-menu-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/streams/${stream.id}/settings`);
                          }}
                        >
                          <Settings size={16} />
                          Settings
                        </button>
                        <button
                          className="dashboard-card-menu-item danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(stream.id);
                          }}
                        >
                          <Trash2 size={16} />
                          Delete Stream
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="dashboard-report-image">
                    {firstImage ? (
                      <img src={firstImage} alt="Report cover" />
                    ) : (
                      <div className="dashboard-report-image-placeholder">
                        <LayoutDashboard size={40} />
                        <span className="dashboard-placeholder-text">
                          {stream._count?.generatedReports ? 'No preview' : 'No reports yet'}
                        </span>
                      </div>
                    )}
                    {isGenerating && (
                      <div className="dashboard-generating-overlay">
                        <Loader2 size={32} className="spinning" />
                        <span>Generating...</span>
                      </div>
                    )}
                  </div>

                  <div className="dashboard-report-content">
                    <div className="dashboard-card-top">
                      <span className="dashboard-stream-type">
                        {getReportTypeLabel(stream.reportType)}
                      </span>
                      <div className="dashboard-stream-badges-inline">
                        <span className="dashboard-frequency-badge">
                          <Clock size={10} />
                          {getFrequencyBadge(stream.frequency)}
                        </span>
                        <span className={`dashboard-status-dot ${stream.status}`} />
                      </div>
                    </div>

                    <h3 className="dashboard-report-title">
                      {stream.title}
                    </h3>

                    <p className="dashboard-stream-description">
                      {stream.description}
                    </p>

                    <div className="dashboard-card-footer">
                      <span className="dashboard-report-count">
                        {stream._count?.generatedReports || 0} reports
                      </span>
                      {latestReport && (
                        <span className="dashboard-latest-date">
                          {formatDate(latestReport.createdAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div className="dashboard-delete-modal-overlay" onClick={() => setDeleteConfirmId(null)}>
            <div className="dashboard-delete-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Delete Stream?</h3>
              <p>This will permanently delete the stream and all its generated reports. This action cannot be undone.</p>
              <div className="dashboard-delete-modal-actions">
                <button
                  className="dashboard-btn-cancel"
                  onClick={() => setDeleteConfirmId(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  className="dashboard-btn-delete"
                  onClick={() => handleDeleteStream(deleteConfirmId)}
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 size={16} className="spinning" /> : <Trash2 size={16} />}
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
