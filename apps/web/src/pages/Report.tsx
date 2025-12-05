import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, ExternalLink, Share2, Sparkles, Mail } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { type StoredReport, type ArticleTag, getAuthToken } from '../lib/api';
import { useReportCache } from '../contexts/ReportCacheContext';
import ShareModal from '../components/ShareModal';
import AgentDebugPanel from '../components/AgentDebugPanel';
import '../styles/report.css';

// Tag display configuration
const TAG_CONFIG: Record<ArticleTag, { label: string; color: string }> = {
  company_news: { label: 'Company News', color: '#3b82f6' },
  competitor: { label: 'Competitor', color: '#ef4444' },
  market_trend: { label: 'Market Trend', color: '#8b5cf6' },
  technology: { label: 'Technology', color: '#06b6d4' },
  regulation: { label: 'Regulation', color: '#f59e0b' },
  funding: { label: 'Funding', color: '#22c55e' },
  product_launch: { label: 'Product Launch', color: '#ec4899' },
  opinion: { label: 'Opinion', color: '#6b7280' },
};

interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  imageUrl?: string;
  imageAlt?: string;
  sources: string[];
  publishedAt?: string;
  tag?: ArticleTag;
}

interface ReportData {
  summary: string;
  articles: Article[];
  title?: string; // Add title property
  metadata?: {
    totalSearches: number;
    articlesFound: number;
    articlesSelected: number;
    generationTime: number;
  };
}

interface ReportProps {

}

// Helper to parse summary in case it contains raw JSON (from broken reports)
function getReportTitleAndSummary(data: ReportData | null): { title: string; summary: string } {
  if (!data) return { title: 'Executive Summary', summary: '' };

  // If title exists, use it
  if (data.title) {
    return { title: data.title, summary: data.summary || '' };
  }

  // Check if summary is JSON (broken report)
  const summaryText = data.summary || '';
  if (summaryText.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(summaryText);
      return {
        title: parsed.title || 'Weekly Intelligence Report',
        summary: parsed.summary || summaryText
      };
    } catch {
      // Not valid JSON, use as-is
    }
  }

  return { title: 'Weekly Intelligence Report', summary: summaryText };
}

export default function Report({ }: ReportProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id?: string; slug?: string }>();
  const { getReport, getCachedOrFetchReport, getCachedOrFetchReportBySlug, cacheReport } = useReportCache();

  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [storedReport, setStoredReport] = useState<StoredReport | null>(null);

  // Check cache first to determine initial loading state
  const cachedReport = params.id ? getReport(params.id) : params.slug ? getReport(params.slug) : null;
  const [loading, setLoading] = useState(!cachedReport);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);

  // Hidden debug panel shortcut: Cmd/Ctrl + Shift + D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setShowDebugPanel(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Get data from navigation state or URL params
  const stateData = location.state as { reportData?: ReportData; storedReport?: StoredReport; companyInfo?: any } | null;
  
  const rawCompanyName =
    storedReport?.user?.companyName ||
    stateData?.companyInfo?.name ||
    searchParams.get('company') ||
    'Your Company';

  // Helper to clean and truncate company name
  const cleanCompanyName = (name: string) => {
    let cleaned = name;
    // Remove separators and taglines if present
    if (cleaned.includes(' — ')) cleaned = cleaned.split(' — ')[0];
    else if (cleaned.includes(' - ')) cleaned = cleaned.split(' - ')[0];
    else if (cleaned.includes(' | ')) cleaned = cleaned.split(' | ')[0];

    // Truncate if still too long
    if (cleaned.length > 30) {
      return cleaned.substring(0, 30) + '...';
    }
    return cleaned;
  };

  const companyName = cleanCompanyName(rawCompanyName);
  const reportType = searchParams.get('type') || 'competitor_landscape';

  // Detect if user is coming from onboarding (has email param, no auth token)
  const emailFromOnboarding = searchParams.get('email');
  const isFromOnboarding = !!emailFromOnboarding && !getAuthToken();

  const getImageUrl = (url?: string) => {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    return `${apiUrl}${url}`;
  };

  useEffect(() => {
    async function loadReport() {
      try {
        // Priority 1: Use data passed via navigation state (instant, no loading)
        if (stateData?.reportData) {
          setReportData(stateData.reportData);
          if (stateData.storedReport) {
            setStoredReport(stateData.storedReport);
            cacheReport(stateData.storedReport); // Cache it for future use
          }
          setLoading(false);
          setTimeout(() => setIsVisible(true), 100);
          return;
        }

        // Priority 2: Check cache for ID
        if (params.id) {
          const cached = getReport(params.id);
          if (cached) {
            setStoredReport(cached);
            setReportData(cached.content);
            setLoading(false);
            setTimeout(() => setIsVisible(true), 100);
            return;
          }

          // Fetch if not cached
          console.log('Loading report by ID:', params.id);
          const report = await getCachedOrFetchReport(params.id);
          setStoredReport(report);
          setReportData(report.content);
          setLoading(false);
          setTimeout(() => setIsVisible(true), 100);
          return;
        }

        // Priority 3: Check cache for slug
        if (params.slug) {
          const cached = getReport(params.slug);
          if (cached) {
            setStoredReport(cached);
            setReportData(cached.content);
            setLoading(false);
            setTimeout(() => setIsVisible(true), 100);
            return;
          }

          // Fetch if not cached
          console.log('Loading public report by slug:', params.slug);
          const report = await getCachedOrFetchReportBySlug(params.slug);
          setStoredReport(report);
          setReportData(report.content);
          setLoading(false);
          setTimeout(() => setIsVisible(true), 100);
          return;
        }

        // Priority 4: No data available - redirect to onboarding
        console.log('No report data available, redirecting to onboarding');
        navigate('/onboarding');
      } catch (err) {
        console.error('Error loading report:', err);
        setError(err instanceof Error ? err.message : 'Failed to load report');
        setLoading(false);
      }
    }

    loadReport();
  }, [params.id, params.slug, stateData, navigate, getReport, getCachedOrFetchReport, getCachedOrFetchReportBySlug, cacheReport]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Recent';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleContinue = () => {
    // Go directly to signup with company info
    const email = searchParams.get('email') || '';
    navigate(`/onboarding?step=signup${email ? `&email=${encodeURIComponent(email)}` : ''}`, {
      state: {
        companyInfo: stateData?.companyInfo,
        skipQuestions: true
      }
    });
  };

  const handleShare = () => {
    // Check if we have a report ID (only saved reports can be shared)
    const reportId = storedReport?.id || (reportData as any)?.reportId;
    if (!reportId) {
      alert('Please save the report first before sharing');
      return;
    }

    setShowShareModal(true);
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      // Fallback: select text
      const input = document.querySelector('.share-url-input') as HTMLInputElement;
      if (input) {
        input.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const closeShareModal = () => {
    setShowShareModal(false);
    setCopied(false);
    setEmails([]);
    setEmailInput('');
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleAddEmail = () => {
    const trimmedEmail = emailInput.trim();
    if (trimmedEmail && isValidEmail(trimmedEmail) && !emails.includes(trimmedEmail)) {
      setEmails([...emails, trimmedEmail]);
      setEmailInput('');
    } else if (!isValidEmail(trimmedEmail)) {
      alert('Please enter a valid email address');
    } else if (emails.includes(trimmedEmail)) {
      alert('This email has already been added');
    }
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setEmails(emails.filter(email => email !== emailToRemove));
  };

  const handleSendEmails = async () => {
    if (emails.length === 0) {
      alert('Please add at least one email address');
      return;
    }

    if (!shareUrl) {
      alert('No report URL available');
      return;
    }

    setSendingEmail(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/reports/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emails,
          reportUrl: shareUrl,
          companyName,
          reportTitle: 'Competitive Intelligence Report',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send emails');
      }

      alert(`Report sent successfully to ${emails.length} recipient(s)!`);
      setEmails([]);
      setEmailInput('');
    } catch (err) {
      console.error('Error sending emails:', err);
      alert('Failed to send emails. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleEmailKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEmail();
    }
  };

  if (loading) {
    return (
      <div className="report-loading">
        <div className="loading-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        <p>Analyzing competitive landscape...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="report-error">
        <div className="error-content">
          <h2>Unable to Load Report</h2>
          <p>{error}</p>
          <button className="cta-button" onClick={() => navigate('/onboarding')}>
            Return to Onboarding
          </button>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return null;
  }

  return (
    <div className={`report-container ${isVisible ? 'visible' : ''}`}>
      {/* Header */}
      <header className="report-header">
        {isFromOnboarding ? (
          <button className="back-button cta-style" onClick={handleContinue}>
            <Sparkles size={20} />
            <span>Save & Get Weekly Reports</span>
          </button>
        ) : (
          <button className="back-button" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={20} />
            <span>Dashboard</span>
          </button>
        )}
        <div className="header-actions">
          <button
            className="action-button"
            onClick={handleShare}
            disabled={shareLoading}
          >
            <Share2 size={18} />
            <span>{shareLoading ? 'Creating link...' : 'Share'}</span>
          </button>
          <button className="action-button primary">
            <Mail size={18} />
            <span>Email Report</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="report-hero">
        <div className="report-meta">
          <span className="company-name">{companyName}</span>
          <span className="separator">•</span>
          <span className="report-type">Competitive Intelligence</span>
          <span className="separator">•</span>
          <span className="report-date">
            <Calendar size={14} />
            {formatDate(storedReport?.createdAt)}
          </span>
        </div>

        {(() => {
          const { title, summary } = getReportTitleAndSummary(reportData);
          return (
            <>
              <h1 className="report-title">{title}</h1>

              <div className="tldr-container">
                <div className="tldr-label">TL;DR</div>
                <div className="tldr-text">
                  <ReactMarkdown>
                    {summary}
                  </ReactMarkdown>
                </div>
              </div>
            </>
          );
        })()}

        {reportData?.metadata && (
          <div className="report-stats">
            <div className="stat">
              <span className="stat-value">{reportData.metadata.articlesSelected}</span>
              <span className="stat-label">Key Insights</span>
            </div>
            <div className="stat">
              <span className="stat-value">{reportData.metadata.articlesFound}</span>
              <span className="stat-label">Sources Analyzed</span>
            </div>
            <div className="stat">
              <span className="stat-value">{Math.round(reportData.metadata.generationTime / 1000)}s</span>
              <span className="stat-label">Research Time</span>
            </div>
          </div>
        )}
      </section>

      {/* Articles Grid */}
      <section className="articles-section">
        <div className="section-header">
          <h2>Competitive Intelligence Briefing</h2>
          <p>AI-curated insights from {reportData?.metadata?.articlesFound} sources</p>
        </div>

        <div className="articles-grid">
          {reportData?.articles.map((article, index) => (
            <article
              key={article.id}
              className="article-card"
              style={{ animationDelay: `${index * 0.1}s`, cursor: 'pointer' }}
              onClick={() => {
                const slug = storedReport?.publicSlug || params.slug || params.id;
                navigate(`/article/${slug}/${article.id}`, {
                  state: { article, reportData, storedReport, companyName }
                });
              }}
            >
              <div className="article-image">
                {article.imageUrl ? (
                  <img
                    src={getImageUrl(article.imageUrl)}
                    alt={article.imageAlt || article.title}
                    loading="lazy"
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, var(--gray-100) 0%, var(--gray-200) 100%)',
                    fontSize: '3rem',
                    color: 'var(--text-muted)'
                  }}>
                    📰
                  </div>
                )}
                <div className="image-overlay"></div>
              </div>

              <div className="article-content">
                <div className="article-meta">
                  {article.tag && TAG_CONFIG[article.tag] && (
                    <span
                      className="article-tag"
                      style={{
                        backgroundColor: `${TAG_CONFIG[article.tag].color}20`,
                        color: TAG_CONFIG[article.tag].color,
                        border: `1px solid ${TAG_CONFIG[article.tag].color}40`,
                      }}
                    >
                      {TAG_CONFIG[article.tag].label}
                    </span>
                  )}
                  <span className="article-date">{formatDate(article.publishedAt)}</span>
                  {article.sources.length > 0 && (
                    <>
                      <span className="separator">•</span>
                      <a
                        href={article.sources[0]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="article-source"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Source
                        <ExternalLink size={12} />
                      </a>
                    </>
                  )}
                </div>

                <h3 className="article-title">{article.title}</h3>

                <p className="article-summary">{article.summary}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="report-cta">
        <div className="cta-content">
          <h2>Want reports like this delivered weekly?</h2>
          <p>Create your free account to get personalized competitive intelligence reports</p>
          <button className="cta-button" onClick={handleContinue}>
            Continue to Setup
            <span className="button-arrow">→</span>
          </button>
          <p className="cta-note">No credit card required • 2-minute setup</p>
        </div>
      </section>

      {/* Share Modal */}
      {showShareModal && storedReport && (
        <ShareModal
          reportId={storedReport.id}
          currentlyPublic={storedReport.isPublic}
          currentSlug={storedReport.publicSlug}
          companyName={companyName} // Pass company name here
          onClose={() => setShowShareModal(false)}
          onUpdate={(isPublic, publicSlug) => {
            setStoredReport({
              ...storedReport,
              isPublic,
              publicSlug,
            });
          }}
        />
      )}

      {/* Hidden Debug Panel - Cmd/Ctrl + Shift + D to toggle */}
      <AgentDebugPanel
        isOpen={showDebugPanel}
        onClose={() => setShowDebugPanel(false)}
      />
    </div>
  );
}