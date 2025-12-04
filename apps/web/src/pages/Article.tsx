import ReactMarkdown from 'react-markdown';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Calendar } from 'lucide-react';
import '../styles/article.css';

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

interface ArticleState {
  article: Article;
  reportData?: any;
  storedReport?: any;
  companyName?: string;
}

export default function Article() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ reportSlug?: string; articleId?: string }>();

  const state = location.state as ArticleState | null;
  const article = state?.article;
  const companyName = state?.companyName || 'Your Company';

  // Navigate back to report with data preserved (no refetch)
  const handleBack = () => {
    const reportSlug = params.reportSlug;
    if (reportSlug && state?.reportData) {
      // Navigate back with state to avoid refetch
      navigate(`/report/${reportSlug}`, {
        state: {
          reportData: state.reportData,
          storedReport: state.storedReport,
          companyInfo: { name: companyName }
        },
        replace: true
      });
    } else {
      navigate(-1);
    }
  };

  if (!article) {
    return (
      <div className="article-error">
        <h2>Article not found</h2>
        <button onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Recent';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getImageUrl = (url?: string) => {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    return `${apiUrl}${url}`;
  };

  // Parse and format the article content with inline citations
  const formatContent = (content: string) => {
    // Split content into sections based on markdown-style headers
    const sections = content.split(/\*\*(.*?)\*\*/g);
    const formatted: JSX.Element[] = [];

    const formatTextWithCitations = (text: string) => {
      // Replace [1], [2], etc. with styled citation links
      const parts = text.split(/(\[\d+\])/g);
      return parts.map((part, idx) => {
        if (/^\[\d+\]$/.test(part)) {
          const citationNum = part.replace(/[\[\]]/g, '');
          const sourceIndex = parseInt(citationNum) - 1;
          const sourceUrl = article.sources[sourceIndex];

          return (
            <a
              key={idx}
              href={sourceUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-citation"
              title={`Source ${citationNum}`}
            >
              {part}
            </a>
          );
        }
        return <span key={idx}>{part}</span>;
      });
    };

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i].trim();
      if (!section) continue;

      // Check if this is a header (odd indices after split)
      if (i % 2 === 1) {
        formatted.push(
          <h3 key={`header-${i}`} className="content-section-header">
            {section}
          </h3>
        );
      } else {
        // Regular content - split into paragraphs
        const paragraphs = section.split(/\n\n+/).filter(p => p.trim());
        paragraphs.forEach((para, idx) => {
          // Check if it's a bullet list
          if (para.includes('•') || para.includes('-')) {
            const items = para.split(/\n/).filter(line => line.trim());
            formatted.push(
              <ul key={`list-${i}-${idx}`} className="content-list">
                {items.map((item, itemIdx) => {
                  const cleaned = item.replace(/^[•\-]\s*/, '').trim();
                  if (!cleaned) return null;
                  return <li key={itemIdx}>{formatTextWithCitations(cleaned)}</li>;
                })}
              </ul>
            );
          } else {
            formatted.push(
              <p key={`para-${i}-${idx}`} className="content-paragraph">
                {formatTextWithCitations(para.trim())}
              </p>
            );
          }
        });
      }
    }

    return formatted;
  };

  return (
    <div className="article-page">
      {/* Header */}
      <header className="article-header">
        <button className="back-button" onClick={handleBack}>
          <ArrowLeft size={20} />
          <span>Back to Report</span>
        </button>
      </header>

      {/* Article Content */}
      <article className="article-container">
        {/* Hero Image */}
        {article.imageUrl && (
          <div className="article-hero-image">
            <img src={getImageUrl(article.imageUrl)} alt={article.imageAlt || article.title} />
          </div>
        )}

        {/* Meta */}
        <div className="article-meta-section">
          <span className="article-company">{companyName}</span>
          <span className="separator">•</span>
          <span className="article-date">
            <Calendar size={14} />
            {formatDate(article.publishedAt)}
          </span>
          {article.sources.length > 0 && (
            <>
              <span className="separator">•</span>
              <a
                href={article.sources[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="article-source-link"
              >
                Source
                <ExternalLink size={14} />
              </a>
            </>
          )}
        </div>

        {/* Title */}
        <h1 className="article-main-title">{article.title}</h1>

        {/* Summary */}
        <div className="article-summary-section">
          <div className="summary-label">Executive Summary</div>
          <div className="summary-text">
            <ReactMarkdown>{article.summary}</ReactMarkdown>
          </div>
        </div>

        {/* Main Content */}
        <div className="article-main-content">
          {formatContent(article.content)}
        </div>

        {/* Sources - Compact Thumbnails */}
        {article.sources.length > 0 && (
          <div className="article-sources-compact">
            <div className="sources-label">Sources</div>
            <div className="sources-thumbnails">
              {article.sources.map((source, idx) => {
                const domain = new URL(source).hostname.replace('www.', '');
                const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
                return (
                  <a
                    key={idx}
                    href={source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="source-thumbnail"
                    title={domain}
                  >
                    <img src={faviconUrl} alt={domain} className="source-favicon" />
                    <span className="source-domain">{domain.split('.')[0]}</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
