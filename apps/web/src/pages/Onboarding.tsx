import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Building2,
  TrendingUp,
  Target,
  Newspaper,
  Check,
  Loader2,
  ArrowRight,
  Clock
} from 'lucide-react';
import '../styles/onboarding.css';

type OnboardingStep = 'detecting' | 'suggestions' | 'questions' | 'generating' | 'complete';

interface CompanyInfo {
  name: string;
  domain: string;
  industry?: string;
  competitors?: string[];
}

interface ReportSuggestion {
  type: 'competitor_landscape' | 'market_landscape' | 'media_monitoring';
  title: string;
  description: string;
  icon: React.ReactNode;
  selected: boolean;
}

export default function Onboarding() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email') || '';

  const [step, setStep] = useState<OnboardingStep>('detecting');
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [suggestions, setSuggestions] = useState<ReportSuggestion[]>([]);
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('weekly');
  const [reportId, setReportId] = useState<string | null>(null);

  // Simulate company detection
  useEffect(() => {
    if (step === 'detecting') {
      setTimeout(() => {
        // Extract domain from email
        const domain = email.split('@')[1] || 'company.com';
        const companyName = domain.split('.')[0];

        setCompanyInfo({
          name: companyName.charAt(0).toUpperCase() + companyName.slice(1),
          domain: domain,
          industry: 'Technology',
          competitors: ['Competitor A', 'Competitor B', 'Competitor C']
        });

        setStep('suggestions');
      }, 2500);
    }
  }, [step, email]);

  // Generate report suggestions
  useEffect(() => {
    if (step === 'suggestions' && companyInfo) {
      setTimeout(() => {
        setSuggestions([
          {
            type: 'competitor_landscape',
            title: 'Competitor Intelligence',
            description: `Track your top competitors in the ${companyInfo.industry} space. Get weekly updates on their product launches, pricing, and strategic moves.`,
            icon: <Target size={32} />,
            selected: true
          },
          {
            type: 'market_landscape',
            title: 'Market Trends',
            description: `Stay ahead of ${companyInfo.industry} industry trends, regulatory changes, and emerging technologies that impact your business.`,
            icon: <TrendingUp size={32} />,
            selected: true
          },
          {
            type: 'media_monitoring',
            title: 'Media Monitoring',
            description: `Track every mention of ${companyInfo.name} across news, social media, and industry publications. Never miss your moment.`,
            icon: <Newspaper size={32} />,
            selected: false
          }
        ]);
      }, 800);
    }
  }, [step, companyInfo]);

  const handleToggleSuggestion = (index: number) => {
    setSuggestions(prev => prev.map((s, i) =>
      i === index ? { ...s, selected: !s.selected } : s
    ));
  };

  const handleContinue = () => {
    if (step === 'suggestions') {
      setStep('questions');
    } else if (step === 'questions') {
      setStep('generating');
      // Simulate report generation
      setTimeout(() => {
        setReportId('demo-report-123');
        setStep('complete');
      }, 3000);
    }
  };

  const handleViewReport = () => {
    navigate(`/report/${reportId}`);
  };

  return (
    <div className="onboarding-page">
      {/* Background */}
      <div className="bg-grid"></div>
      <div className="bg-gradient"></div>

      {/* Header */}
      <header className="onboarding-header">
        <div className="logo">
          <Sparkles className="logo-icon" />
          <span className="logo-text">Clipping.AI</span>
        </div>
      </header>

      <main className="onboarding-main">
        {/* Step 1: Detecting Company */}
        {step === 'detecting' && (
          <div className="onboarding-step detecting-step">
            <div className="step-content">
              <div className="analyzing-animation">
                <div className="pulse-ring"></div>
                <div className="pulse-ring delay-1"></div>
                <div className="pulse-ring delay-2"></div>
                <Building2 size={48} className="building-icon" />
              </div>

              <h1 className="step-title">
                Analyzing {email}
              </h1>

              <div className="detection-steps">
                <div className="detection-item active">
                  <div className="item-icon">
                    <Loader2 className="spinner" size={20} />
                  </div>
                  <span>Detecting company from email domain...</span>
                </div>
                <div className="detection-item">
                  <div className="item-icon">
                    <div className="item-dot"></div>
                  </div>
                  <span>Researching industry and competitors...</span>
                </div>
                <div className="detection-item">
                  <div className="item-icon">
                    <div className="item-dot"></div>
                  </div>
                  <span>Generating personalized report suggestions...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Report Suggestions */}
        {step === 'suggestions' && companyInfo && (
          <div className="onboarding-step suggestions-step">
            <div className="step-content">
              <div className="company-detected">
                <div className="company-badge">
                  <Check size={20} />
                  <span>Company Detected</span>
                </div>
                <h1 className="company-name">{companyInfo.name}</h1>
                <p className="company-meta">
                  {companyInfo.domain} • {companyInfo.industry}
                </p>
              </div>

              <div className="suggestions-header">
                <h2 className="section-title">
                  We've prepared these intelligence reports for you
                </h2>
                <p className="section-subtitle">
                  Select the reports you want to receive. We recommend starting with 2-3.
                </p>
              </div>

              <div className="suggestions-grid">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className={`suggestion-card ${suggestion.selected ? 'selected' : ''}`}
                    onClick={() => handleToggleSuggestion(index)}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="card-header">
                      <div className="card-icon">{suggestion.icon}</div>
                      <div className="card-checkbox">
                        {suggestion.selected && <Check size={18} />}
                      </div>
                    </div>
                    <h3 className="card-title">{suggestion.title}</h3>
                    <p className="card-description">{suggestion.description}</p>
                  </div>
                ))}
              </div>

              <div className="step-actions">
                <button
                  className="btn-primary-large"
                  onClick={handleContinue}
                  disabled={!suggestions.some(s => s.selected)}
                >
                  Continue with {suggestions.filter(s => s.selected).length} report{suggestions.filter(s => s.selected).length !== 1 ? 's' : ''}
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Quick Questions */}
        {step === 'questions' && (
          <div className="onboarding-step questions-step">
            <div className="step-content">
              <h2 className="section-title">Just a few quick questions</h2>
              <p className="section-subtitle">
                This helps us tailor your reports perfectly
              </p>

              <div className="questions-form">
                <div className="form-section">
                  <label className="form-label">
                    <Clock size={20} />
                    How often do you want to receive reports?
                  </label>
                  <div className="frequency-options">
                    <button
                      className={`frequency-btn ${frequency === 'daily' ? 'active' : ''}`}
                      onClick={() => setFrequency('daily')}
                    >
                      <span className="freq-label">Daily</span>
                      <span className="freq-desc">Every morning at 9am</span>
                    </button>
                    <button
                      className={`frequency-btn ${frequency === 'weekly' ? 'active' : ''}`}
                      onClick={() => setFrequency('weekly')}
                    >
                      <span className="freq-label">Weekly</span>
                      <span className="freq-desc">Every Monday at 9am</span>
                    </button>
                  </div>
                </div>

                <div className="form-section">
                  <label className="form-label">
                    <Target size={20} />
                    Who are your top competitors? (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Competitor X, Competitor Y, Competitor Z"
                    className="text-input"
                  />
                  <p className="input-hint">
                    We've already detected some competitors, but you can add more
                  </p>
                </div>
              </div>

              <div className="step-actions">
                <button
                  className="btn-primary-large"
                  onClick={handleContinue}
                >
                  Generate My First Report
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Generating Report */}
        {step === 'generating' && (
          <div className="onboarding-step generating-step">
            <div className="step-content">
              <div className="generating-animation">
                <div className="report-icon-wrapper">
                  <div className="rotating-border"></div>
                  <Sparkles size={64} className="sparkles-icon" />
                </div>
              </div>

              <h1 className="step-title">
                Generating your intelligence report
              </h1>

              <div className="generation-progress">
                <div className="progress-item completed">
                  <Check size={20} />
                  <span>Searching the web for latest updates...</span>
                </div>
                <div className="progress-item completed">
                  <Check size={20} />
                  <span>Analyzing competitor activities...</span>
                </div>
                <div className="progress-item active">
                  <Loader2 className="spinner" size={20} />
                  <span>Generating insights with AI...</span>
                </div>
                <div className="progress-item">
                  <div className="item-dot"></div>
                  <span>Creating beautiful report...</span>
                </div>
              </div>

              <p className="generation-note">
                This usually takes 20-30 seconds. We're being thorough.
              </p>
            </div>
          </div>
        )}

        {/* Step 5: Complete */}
        {step === 'complete' && (
          <div className="onboarding-step complete-step">
            <div className="step-content">
              <div className="success-animation">
                <div className="success-checkmark">
                  <Check size={64} />
                </div>
              </div>

              <h1 className="step-title">
                Your report is ready! 🎉
              </h1>

              <p className="step-subtitle">
                We've generated your first intelligence report with the latest insights
                from the past 7 days. You'll receive future reports via email at {email}.
              </p>

              <div className="report-preview-card">
                <div className="preview-header">
                  <h3>Competitor Intelligence - Week of Nov 11</h3>
                  <span className="preview-badge">Just generated</span>
                </div>
                <p className="preview-summary">
                  5 major updates detected across your competitors. Market shifting toward
                  AI-native solutions with 3 new product launches this week.
                </p>
                <div className="preview-stats">
                  <div className="stat">
                    <span className="stat-value">5</span>
                    <span className="stat-label">Articles</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">12</span>
                    <span className="stat-label">Sources</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">7</span>
                    <span className="stat-label">Days</span>
                  </div>
                </div>
              </div>

              <div className="step-actions">
                <button
                  className="btn-primary-large"
                  onClick={handleViewReport}
                >
                  View Your Report
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
