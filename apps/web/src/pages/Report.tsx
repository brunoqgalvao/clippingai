import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, ExternalLink, Share2, Mail, Copy, Check, X } from 'lucide-react';
import { getReportById, getReportBySlug, updateReportVisibility, type StoredReport } from '../lib/api';
import '../styles/report.css';

interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  imageUrl?: string;
  imageAlt?: string;
  sources: string[];
  publishedAt?: string;
}

interface ReportData {
  summary: string;
  articles: Article[];
  metadata?: {
    totalSearches: number;
    articlesFound: number;
    articlesSelected: number;
    generationTime: number;
  };
}

interface ReportProps {
  isPublic?: boolean;
}

export default function Report({ isPublic = false }: ReportProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id?: string; slug?: string }>();

  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [storedReport, setStoredReport] = useState<StoredReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Get data from navigation state or URL params
  const stateData = location.state as { reportData?: ReportData; companyInfo?: any } | null;
  const companyName =
    storedReport?.user?.companyName ||
    stateData?.companyInfo?.name ||
    searchParams.get('company') ||
    'Your Company';
  const reportType = searchParams.get('type') || 'competitor_landscape';

  useEffect(() => {
    async function loadReport() {
      try {
        // Priority 1: Load from database if ID or slug is provided
        if (params.id) {
          console.log('Loading report by ID:', params.id);
          const report = await getReportById(params.id);
          setStoredReport(report);
          setReportData(report.content);
          setLoading(false);
          setTimeout(() => setIsVisible(true), 100);
          return;
        }

        if (params.slug) {
          console.log('Loading public report by slug:', params.slug);
          const report = await getReportBySlug(params.slug);
          setStoredReport(report);
          setReportData(report.content);
          setLoading(false);
          setTimeout(() => setIsVisible(true), 100);
          return;
        }

        // Priority 2: Use data passed via navigation state
        if (stateData?.reportData) {
          setReportData(stateData.reportData);
          setLoading(false);
          setTimeout(() => setIsVisible(true), 100);
          return;
        }

        // Priority 3: No data available - redirect to onboarding
        console.log('No report data available, redirecting to onboarding');
        navigate('/onboarding');
      } catch (err) {
        console.error('Error loading report:', err);
        setError(err instanceof Error ? err.message : 'Failed to load report');
        setLoading(false);
      }
    }

    loadReport();
  }, [params.id, params.slug, stateData, navigate]);

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

  const handleShare = async () => {
    // Check if report is already public
    if (storedReport?.publicSlug) {
      const url = `${window.location.origin}/r/${storedReport.publicSlug}`;
      setShareUrl(url);
      setShowShareModal(true);
      return;
    }

    // Check if we have a report ID (only saved reports can be shared)
    const reportId = storedReport?.id || (reportData as any)?.reportId;
    if (!reportId) {
      alert('Please save the report first before sharing');
      return;
    }

    setShareLoading(true);
    try {
      const result = await updateReportVisibility(reportId, true);
      if (result.publicSlug) {
        const url = `${window.location.origin}/r/${result.publicSlug}`;
        setShareUrl(url);
        setShowShareModal(true);

        // Update stored report state
        if (storedReport) {
          setStoredReport({
            ...storedReport,
            isPublic: true,
            publicSlug: result.publicSlug,
          });
        }
      }
    } catch (err) {
      console.error('Share error:', err);
      alert('Failed to create shareable link. Please try again.');
    } finally {
      setShareLoading(false);
    }
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
        <button className="back-button" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
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
            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        <h1 className="report-title">Executive Summary</h1>

        <div className="tldr-container">
          <div className="tldr-label">TL;DR</div>
          <div className="tldr-text">
            {(() => {
              const parts = reportData?.summary.split('\n\n') || [];
              const bullets: string[] = [];
              const paragraphs: string[] = [];

              parts.forEach(part => {
                if (part.includes('•')) {
                  bullets.push(part);
                } else if (part.trim()) {
                  paragraphs.push(part);
                }
              });

              return (
                <>
                  {bullets.length > 0 && (
                    <ul className="tldr-bullets">
                      {bullets.map((bullet, idx) => {
                        const items = bullet.split('\n').filter(line => line.includes('•'));
                        return items.map((item, itemIdx) => (
                          <li key={`${idx}-${itemIdx}`}>{item.replace(/^[•\s]+/, '').trim()}</li>
                        ));
                      })}
                    </ul>
                  )}
                  {paragraphs.map((paragraph, idx) => (
                    <p key={`para-${idx}`} className="tldr-paragraph">{paragraph.trim()}</p>
                  ))}
                </>
              );
            })()}
          </div>
        </div>

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
              className={`article-card ${expandedArticle === article.id ? 'expanded' : ''}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="article-image">
                {article.imageUrl ? (
                  <img
                    src={article.imageUrl}
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
                    background: 'linear-gradient(135deg, rgba(0, 168, 232, 0.15) 0%, rgba(212, 175, 55, 0.15) 100%)',
                    fontSize: '3rem',
                    color: 'rgba(0, 168, 232, 0.3)'
                  }}>
                    📰
                  </div>
                )}
                <div className="image-overlay"></div>
              </div>

              <div className="article-content">
                <div className="article-meta">
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

                <button
                  className="read-more-button"
                  onClick={() => {
                    const slug = storedReport?.publicSlug || params.slug || params.id;
                    navigate(`/article/${slug}/${article.id}`, {
                      state: { article, reportData, companyName }
                    });
                  }}
                >
                  Read Full Analysis
                </button>
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
      {showShareModal && shareUrl && (
        <div className="modal-overlay" onClick={closeShareModal}>
          <div className="modal-content share-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Share Report</h3>
              <button className="modal-close" onClick={closeShareModal}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <p className="share-description">
                Anyone with this link can view this report. Share it with your team or on social media.
              </p>

              <div className="share-url-container">
                <input
                  type="text"
                  className="share-url-input"
                  value={shareUrl}
                  readOnly
                />
                <button
                  className="copy-button"
                  onClick={handleCopyLink}
                  disabled={copied}
                >
                  {copied ? (
                    <>
                      <Check size={18} />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={18} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="share-stats">
                {storedReport && (
                  <div className="stat-item">
                    <span className="stat-label">Views:</span>
                    <span className="stat-value">{storedReport.viewCount}</span>
                  </div>
                )}
              </div>

              <div className="share-divider"></div>

              <div className="email-share-section">
                <h4 className="email-share-title">Send via Email</h4>

                <div className="email-input-container">
                  <input
                    type="email"
                    className="email-input"
                    placeholder="Enter email address"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyPress={handleEmailKeyPress}
                  />
                  <button
                    className="add-email-button"
                    onClick={handleAddEmail}
                    disabled={!emailInput.trim()}
                  >
                    Add
                  </button>
                </div>

                {emails.length > 0 && (
                  <div className="email-tags">
                    {emails.map((email) => (
                      <div key={email} className="email-tag">
                        <span>{email}</span>
                        <button
                          className="remove-email"
                          onClick={() => handleRemoveEmail(email)}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  className="send-email-button"
                  onClick={handleSendEmails}
                  disabled={emails.length === 0 || sendingEmail}
                >
                  <Mail size={18} />
                  <span>{sendingEmail ? 'Sending...' : `Send to ${emails.length} recipient${emails.length !== 1 ? 's' : ''}`}</span>
                </button>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeShareModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
