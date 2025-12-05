import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, ArrowRight, LayoutDashboard, Loader2, Settings, Play, Zap, ChevronRight, MoreVertical, Trash2 } from 'lucide-react';
import { generateReportForConfig, getJobStatus, deleteReport, deleteReportConfig, type ReportConfig, type StoredReport } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useReportCache } from '../contexts/ReportCacheContext';
import { getCleanCompanyName } from '../lib/utils';
import Logo from '../components/Logo';
import '../styles/stream-history.css';

// Helper to get report title (uses explicit title field, parses JSON if needed)
function getReportTitle(content: any, maxLength?: number): string {
  // Use explicit title if available
  if (content?.title) {
    const title = content.title;
    if (maxLength && title.length > maxLength) {
      return title.slice(0, maxLength) + '...';
    }
    return title;
  }

  // Check if summary is JSON (broken report) and extract title from it
  const summary = content?.summary || '';
  if (summary.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(summary);
      if (parsed.title) {
        const title = parsed.title;
        if (maxLength && title.length > maxLength) {
          return title.slice(0, maxLength) + '...';
        }
        return title;
      }
    } catch {
      // Not valid JSON
    }
  }

  // Fallback for older reports without title field
  return 'Weekly Intelligence Report';
}

export default function StreamHistory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { getStream, getCachedOrFetchStream, updateStreamInCache, cacheReport, preloadReport } = useReportCache();

  // Check cache first
  const cachedStream = id ? getStream(id) : undefined;
  const [stream, setStream] = useState<ReportConfig | null>(cachedStream || null);
  const [loading, setLoading] = useState(!cachedStream);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingJobId, setGeneratingJobId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    async function loadStreamHistory() {
      if (!id || authLoading || !isAuthenticated) return;

      // Check if already loaded from cache
      const cached = getStream(id);
      if (cached) {
        setStream(cached);
        setLoading(false);
        // Check if there's a generating report from database
        const latestReport = cached.generatedReports?.[0];
        if (latestReport?.status === 'generating') {
          setIsGenerating(true);
        }
        return;
      }

      try {
        const config = await getCachedOrFetchStream(id);
        setStream(config);
        // Check if there's a generating report from database
        const latestReport = config.generatedReports?.[0];
        if (latestReport?.status === 'generating') {
          setIsGenerating(true);
        }
      } catch (err) {
        console.error('Error loading stream:', err);
        setError('Failed to load stream history');
      } finally {
        setLoading(false);
      }
    }

    loadStreamHistory();
  }, [id, authLoading, isAuthenticated, getStream, getCachedOrFetchStream]);

  // Check if there's a generating report from the stream data
  const hasGeneratingFromDB = stream?.generatedReports?.[0]?.status === 'generating';

  // Poll for job status when generating (either via job ID or DB status)
  useEffect(() => {
    if (!isGenerating && !hasGeneratingFromDB) return;

    const pollInterval = setInterval(async () => {
      // If we have a job ID, poll the job status
      if (generatingJobId) {
        try {
          const status = await getJobStatus(generatingJobId);

          if (status.state === 'completed') {
            setIsGenerating(false);
            setGeneratingJobId(null);
            setSuccessMessage('Report generated successfully!');
            setTimeout(() => setSuccessMessage(null), 5000);

            // Refresh stream data to show new report
            if (id) {
              const config = await getCachedOrFetchStream(id);
              setStream(config);
              updateStreamInCache(config);
            }
            return;
          } else if (status.state === 'failed') {
            setIsGenerating(false);
            setGeneratingJobId(null);
            setError('Report generation failed. Please try again.');
            setTimeout(() => setError(null), 5000);
            return;
          }
        } catch (err) {
          console.error('Error polling job:', err);
          setIsGenerating(false);
          setGeneratingJobId(null);
          return;
        }
      }

      // Also poll DB state if we have a generating report without job ID
      // (e.g., page was refreshed while generating)
      if (hasGeneratingFromDB && !generatingJobId && id) {
        try {
          const config = await getCachedOrFetchStream(id);
          setStream(config);
          updateStreamInCache(config);

          const latestReport = config.generatedReports?.[0];
          if (latestReport?.status === 'completed') {
            setIsGenerating(false);
            setSuccessMessage('Report generated successfully!');
            setTimeout(() => setSuccessMessage(null), 5000);
          } else if (latestReport?.status === 'failed') {
            setIsGenerating(false);
            setError('Report generation failed. Please try again.');
            setTimeout(() => setError(null), 5000);
          }
        } catch (err) {
          console.error('Error refreshing stream:', err);
        }
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [generatingJobId, isGenerating, hasGeneratingFromDB, id, getCachedOrFetchStream, updateStreamInCache]);

  const handleGenerateReport = async () => {
    if (!id || !stream) return;

    setError(null);
    setIsGenerating(true);

    try {
      const { jobId } = await generateReportForConfig(id);
      setGeneratingJobId(jobId);
    } catch (err: any) {
      console.error('Error generating report:', err);

      // Handle "already generating" error gracefully
      if (err.code === 'ALREADY_GENERATING') {
        setError('A report is already being generated for this stream.');
        // Refresh to get the latest state
        const config = await getCachedOrFetchStream(id);
        setStream(config);
        updateStreamInCache(config);
        // Check if latest report is generating
        const latestReport = config.generatedReports?.[0];
        if (latestReport?.status === 'generating') {
          // Keep isGenerating true to show loading state
        } else {
          setIsGenerating(false);
        }
      } else {
        setError('Failed to start report generation. Please try again.');
        setIsGenerating(false);
      }
    }
  };

  const handleEditStream = () => {
    if (!id) return;
    navigate(`/streams/${id}/settings`);
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

  const handleDeleteReport = async (reportId: string) => {
    setIsDeleting(true);
    try {
      await deleteReport(reportId);
      setDeleteConfirmId(null);
      setOpenMenuId(null);
      setSuccessMessage('Report deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      // Refresh stream data
      if (id) {
        const config = await getCachedOrFetchStream(id);
        setStream(config);
        updateStreamInCache(config);
      }
    } catch (err) {
      console.error('Error deleting report:', err);
      setError('Failed to delete report');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteStream = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await deleteReportConfig(id);
      navigate('/dashboard');
    } catch (err) {
      console.error('Error deleting stream:', err);
      setError('Failed to delete stream');
      setTimeout(() => setError(null), 5000);
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getImageUrl = (url?: string) => {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    return `${apiUrl}${url}`;
  };

  const groupReportsByMonth = (reports: StoredReport[]) => {
    const grouped: { [key: string]: StoredReport[] } = {};

    reports.forEach(report => {
      const date = new Date(report.createdAt);
      const monthKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(report);
    });

    return grouped;
  };

  if (authLoading || loading) {
    return (
      <div className="stream-history-loading">
        <div className="loading-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        <p>Loading stream history...</p>
      </div>
    );
  }

  if (error || !stream) {
    return (
      <div className="stream-history-error">
        <h2>Error</h2>
        <p>{error || 'Stream not found'}</p>
        <button onClick={() => navigate('/dashboard')} className="btn-back">
          <ArrowLeft size={20} />
          Back to Dashboard
        </button>
      </div>
    );
  }

  const completedReports = stream.generatedReports?.filter(r => r.status === 'completed') || [];
  const generatingReport = stream.generatedReports?.find(r => r.status === 'generating');
  const groupedReports = groupReportsByMonth(completedReports);

  return (
    <div className="stream-history-page">
      {/* Header */}
      <header className="stream-history-header">
        <div className="stream-history-header-content">
          <div className="stream-history-logo" onClick={() => navigate('/')}>
            <Logo size={40} showWordmark={true} variant="dark" />
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-back-header"
          >
            <ArrowLeft size={20} />
            Dashboard
          </button>
        </div>
      </header>

      {/* Stream Info */}
      <div className="stream-history-info">
        <div className="stream-history-info-content">
          <div className="stream-info-header">
            <div className="stream-info-text">
              <h1 className="stream-history-title">{getCleanCompanyName(stream.title)}</h1>
              <p className="stream-history-description">{getCleanCompanyName(stream.description || '')}</p>

              <div className="stream-history-meta">
                <div className="stream-meta-item">
                  <Calendar size={16} />
                  <span>Started {formatDateShort(stream.createdAt)}</span>
                </div>
                <div className="stream-meta-item">
                  <LayoutDashboard size={16} />
                  <span>{completedReports.length} reports generated</span>
                </div>
                <div className="stream-meta-item">
                  <Zap size={16} />
                  <span className={`status-badge ${stream.status}`}>
                    {stream.status === 'active' ? 'Active' : 'Paused'}
                  </span>
                </div>
              </div>
            </div>

            <div className="stream-info-actions">
              <button
                onClick={handleGenerateReport}
                className="btn-generate-report"
                disabled={isGenerating || hasGeneratingFromDB || stream.status !== 'active'}
              >
                {(isGenerating || hasGeneratingFromDB) ? (
                  <>
                    <Loader2 size={20} className="spinning" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Play size={20} />
                    Generate Report
                  </>
                )}
              </button>

              <button
                onClick={handleEditStream}
                className="btn-edit-stream"
              >
                <Settings size={20} />
                Edit Stream
              </button>
            </div>
          </div>

          {successMessage && (
            <div className="stream-success-message">
              {successMessage}
            </div>
          )}

          {error && (
            <div className="stream-error-message">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Reports History */}
      <main className="stream-history-main">
        {/* Generating Report Card */}
        {generatingReport && (
          <section className="generating-report-section">
            <div className="generating-report-card">
              <div className="generating-report-content">
                <div className="generating-spinner">
                  <Loader2 size={32} className="spinning" />
                </div>
                <div className="generating-text">
                  <h3>Generating Report...</h3>
                  <p>Your intelligence report is being generated. This usually takes 1-2 minutes.</p>
                  <span className="generating-started">Started {formatDate(generatingReport.createdAt)}</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {completedReports.length === 0 && !generatingReport ? (
          <div className="stream-history-empty">
            <LayoutDashboard size={48} />
            <h3>No reports yet</h3>
            <p>This stream hasn't generated any reports yet. Click "Generate Report" to create your first one!</p>
          </div>
        ) : completedReports.length > 0 && (
          <>
            {/* Latest Report - Featured Hero Section */}
            {completedReports[0] && (() => {
              const latestReport = completedReports[0];
              const latestImage = latestReport.content?.articles?.find((a: any) => a.imageUrl)?.imageUrl;
              const latestImageUrl = getImageUrl(latestImage);

              return (
                <section className="latest-report-section">
                  <div className="latest-report-label">Latest Report</div>
                  <div className="latest-report-hero-wrapper">
                    <div
                      className="latest-report-hero"
                      onClick={() => navigate(`/report/${latestReport.id}`)}
                      onMouseEnter={() => cacheReport(latestReport)}
                    >
                      <div className="latest-report-image">
                        {latestImageUrl ? (
                          <img src={latestImageUrl} alt="Latest report" />
                        ) : (
                          <div className="latest-report-placeholder">
                            <LayoutDashboard size={80} />
                          </div>
                        )}
                        <div className="latest-report-overlay" />
                      </div>

                      <div className="latest-report-content">
                        <div className="latest-report-date">
                          <Calendar size={16} />
                          {formatDate(latestReport.createdAt)}
                        </div>

                        <h2 className="latest-report-title">
                          {getReportTitle(latestReport.content)}
                        </h2>

                        {latestReport.content?.articles && (
                          <p className="latest-report-stats">
                            {latestReport.content.articles.length} articles analyzed
                          </p>
                        )}

                        <div className="latest-report-cta">
                          <span>View Full Report</span>
                          <ArrowRight size={20} />
                        </div>
                      </div>
                    </div>

                    {/* 3-dot menu for latest report */}
                    <div className="report-menu-container" ref={openMenuId === latestReport.id ? menuRef : null}>
                      <button
                        className="report-menu-trigger"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === latestReport.id ? null : latestReport.id);
                        }}
                      >
                        <MoreVertical size={20} />
                      </button>
                      {openMenuId === latestReport.id && (
                        <div className="report-menu-dropdown">
                          <button
                            className="report-menu-item danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(latestReport.id);
                            }}
                          >
                            <Trash2 size={16} />
                            Delete Report
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              );
            })()}

            {/* Previous Reports - Compact Grid */}
            {completedReports.length > 1 && (
              <section className="previous-reports-section">
                <h2 className="previous-reports-title">Previous Reports</h2>
                <div className="previous-reports-grid">
                  {completedReports.slice(1).map((report) => {
                    const firstImage = report.content?.articles?.find((a: any) => a.imageUrl)?.imageUrl;
                    const imageUrl = getImageUrl(firstImage);

                    return (
                      <div
                        key={report.id}
                        className="previous-report-card"
                      >
                        <div
                          className="previous-report-clickable"
                          onClick={() => navigate(`/report/${report.id}`)}
                          onMouseEnter={() => cacheReport(report)}
                        >
                          <div className="previous-report-image">
                            {imageUrl ? (
                              <img src={imageUrl} alt="Report preview" />
                            ) : (
                              <div className="previous-report-placeholder">
                                <LayoutDashboard size={24} />
                              </div>
                            )}
                          </div>

                          <div className="previous-report-content">
                            <span className="previous-report-date">
                              {formatDateShort(report.createdAt)}
                            </span>
                            <h3 className="previous-report-title">
                              {getReportTitle(report.content, 60)}
                            </h3>
                          </div>
                        </div>

                        {/* 3-dot menu */}
                        <div className="report-menu-container small" ref={openMenuId === report.id ? menuRef : null}>
                          <button
                            className="report-menu-trigger small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === report.id ? null : report.id);
                            }}
                          >
                            <MoreVertical size={16} />
                          </button>
                          {openMenuId === report.id && (
                            <div className="report-menu-dropdown">
                              <button
                                className="report-menu-item danger"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmId(report.id);
                                }}
                              >
                                <Trash2 size={16} />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div className="delete-modal-overlay" onClick={() => setDeleteConfirmId(null)}>
            <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Delete Report?</h3>
              <p>This action cannot be undone. The report and all its data will be permanently deleted.</p>
              <div className="delete-modal-actions">
                <button
                  className="btn-cancel"
                  onClick={() => setDeleteConfirmId(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  className="btn-delete"
                  onClick={() => handleDeleteReport(deleteConfirmId)}
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
