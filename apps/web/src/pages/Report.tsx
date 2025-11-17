import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Calendar, ExternalLink, Share2, Mail } from 'lucide-react';
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

export default function Report() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Get data from navigation state or URL params
  const stateData = location.state as { reportData?: ReportData; companyInfo?: any } | null;
  const companyName = stateData?.companyInfo?.name || searchParams.get('company') || 'Your Company';
  const reportType = searchParams.get('type') || 'competitor_landscape';

  useEffect(() => {
    // If we have report data from navigation, use it
    if (stateData?.reportData) {
      setReportData(stateData.reportData);
      setLoading(false);
      setTimeout(() => setIsVisible(true), 100);
    } else {
      // Otherwise redirect back to onboarding
      navigate('/onboarding');
    }
  }, [stateData, navigate]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Recent';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleContinue = () => {
    navigate('/onboarding?step=questions');
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

  return (
    <div className={`report-container ${isVisible ? 'visible' : ''}`}>
      {/* Header */}
      <header className="report-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        <div className="header-actions">
          <button className="action-button">
            <Share2 size={18} />
            <span>Share</span>
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
          <p className="tldr-text">{reportData?.summary}</p>
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
              {article.imageUrl && (
                <div className="article-image">
                  <img src={article.imageUrl} alt={article.imageAlt || article.title} />
                  <div className="image-overlay"></div>
                </div>
              )}

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

                {expandedArticle === article.id && (
                  <div className="article-full">
                    <div className="content-divider"></div>
                    <div className="article-body">{article.content}</div>
                  </div>
                )}

                <button
                  className="read-more-button"
                  onClick={() => setExpandedArticle(
                    expandedArticle === article.id ? null : article.id
                  )}
                >
                  {expandedArticle === article.id ? 'Show Less' : 'Read Full Analysis'}
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
    </div>
  );
}
