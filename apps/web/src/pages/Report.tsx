import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const companyName = searchParams.get('company') || 'Your Company';
  const reportType = searchParams.get('type') || 'competitor_landscape';

  useEffect(() => {
    // Simulate loading report (in real app, fetch from API)
    setTimeout(() => {
      setReportData({
        summary: "OpenAI is aggressively consolidating its market dominance with a staggering $500B valuation while diversifying critical dependencies through a $38B AWS cloud deal and AMD partnership, reducing reliance on Microsoft and NVIDIA. The company is simultaneously executing a major strategic pivot toward enterprise markets through partnerships with Salesforce, Zillow, and Figma, positioning its AI models for demanding business use cases.",
        articles: [
          {
            id: '1',
            title: 'OpenAI Signs $38B Cloud Deal with AWS, Diversifying Beyond Microsoft',
            summary: 'OpenAI has entered a $38 billion multiyear partnership with AWS for cloud infrastructure, marking a strategic shift following its corporate restructuring.',
            content: 'OpenAI\'s $38 billion partnership with AWS represents a pivotal shift in the competitive AI infrastructure landscape. This deal follows OpenAI\'s corporate restructuring that reduced its exclusive dependence on Microsoft, allowing greater flexibility in compute procurement. The partnership underscores the rising capital intensity of AI and accelerates the shift toward multicloud architectures among leading AI companies.',
            imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
            sources: ['https://www.ciodive.com/news/openai-aws-partnership/'],
            publishedAt: '2025-01-15'
          },
          {
            id: '2',
            title: 'OpenAI Reaches $500B Valuation Through SoftBank Share Sale',
            summary: 'OpenAI has achieved a $500 billion valuation following a secondary share sale to SoftBank, significantly widening the competitive gap.',
            content: 'The $500 billion valuation places OpenAI at approximately 10-15x competitors\' valuations, creating asymmetric competitive dynamics. This capital advantage enables OpenAI to significantly outspend competitors on compute infrastructure, talent acquisition, and model development.',
            imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80',
            sources: ['https://www.reuters.com/technology/openai-valuation/'],
            publishedAt: '2025-01-14'
          },
          {
            id: '3',
            title: 'OpenAI and AMD Announce Strategic Partnership',
            summary: 'OpenAI has formed a strategic partnership with AMD to deploy AI infrastructure, diversifying beyond NVIDIA.',
            content: 'This partnership indicates OpenAI is diversifying its hardware dependencies beyond NVIDIA, potentially seeking cost advantages and supply chain resilience. The move could democratize access to high-performance AI accelerators across the industry.',
            imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
            sources: ['https://openai.com/partnership-amd/'],
            publishedAt: '2025-01-13'
          },
          {
            id: '4',
            title: 'OpenAI Pivots to Enterprise Market with Strategic Partnerships',
            summary: 'OpenAI announced a major strategic shift toward enterprise growth, unveiling partnerships with Zillow and Figma.',
            content: 'OpenAI\'s explicit declaration of a "huge focus" on enterprise growth intensifies competition in the enterprise AI market. The partnership strategy with established brands demonstrates an aggressive go-to-market approach that leverages ecosystem integration.',
            imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=80',
            sources: ['https://www.reuters.com/openai-enterprise/'],
            publishedAt: '2025-01-12'
          },
          {
            id: '5',
            title: 'Salesforce and OpenAI Form Strategic Alliance',
            summary: 'Salesforce and OpenAI have announced a major partnership integrating AI across Agentforce 360 Platform.',
            content: 'The partnership combines OpenAI\'s reasoning capabilities with Salesforce\'s enterprise workflows, reaching over 800 million weekly ChatGPT users and 5.2 billion weekly Slack messages. This creates one of the largest enterprise AI distribution channels in the market.',
            imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
            sources: ['https://investor.salesforce.com/salesforce-openai-partnership/'],
            publishedAt: '2025-01-11'
          }
        ],
        metadata: {
          totalSearches: 7,
          articlesFound: 35,
          articlesSelected: 5,
          generationTime: 137500
        }
      });
      setLoading(false);
      setTimeout(() => setIsVisible(true), 100);
    }, 1000);
  }, []);

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
