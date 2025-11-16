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
  Clock,
  Edit3,
  AlertCircle
} from 'lucide-react';
import type { CompanyDetectionResult } from '@clippingai/shared';
import { detectCompany, processManualCompany } from '../lib/api';
import '../styles/onboarding.css';

type OnboardingStep = 'detecting' | 'verify' | 'manual' | 'suggestions' | 'generating' | 'viewing' | 'questions' | 'signup' | 'complete';

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
  const [companyInfo, setCompanyInfo] = useState<CompanyDetectionResult | null>(null);
  const [selectedLogo, setSelectedLogo] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [suggestions, setSuggestions] = useState<ReportSuggestion[]>([]);
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('weekly');
  const [reportId, setReportId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Real company detection using API
  useEffect(() => {
    if (step === 'detecting' && email) {
      detectCompany(email)
        .then((result) => {
          setCompanyInfo(result);
          setSelectedLogo(result.logo || null);
          setStep('verify');
        })
        .catch((err) => {
          console.error('Detection error:', err);
          setError('Failed to detect company. Please try again.');
          // Still show verification step with minimal info
          const domain = email.split('@')[1] || 'company.com';
          const name = domain.split('.')[0];
          setCompanyInfo({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            domain,
            website: `https://${domain}`,
            confidence: 'low',
          });
          setStep('verify');
        });
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
      // Go straight to generating the report
      setStep('generating');
      // Simulate report generation
      setTimeout(() => {
        setReportId('demo-report-123');
        setStep('viewing');
      }, 3000);
    } else if (step === 'viewing') {
      // After seeing the report, ask questions
      setStep('questions');
    } else if (step === 'questions') {
      // After questions, create account
      setStep('signup');
    }
  };

  const handleSignup = () => {
    // Simulate account creation
    setTimeout(() => {
      setStep('complete');
    }, 1500);
  };

  const handleVerifyCompany = () => {
    setStep('suggestions');
  };

  const handleNotMyCompany = () => {
    setStep('manual');
  };

  const handleManualSubmit = async () => {
    if (!manualInput.trim()) return;

    try {
      const result = await processManualCompany(manualInput);
      setCompanyInfo(result);
      setSelectedLogo(result.logo || null);
      setStep('suggestions');
    } catch (err) {
      console.error('Manual input error:', err);
      setError('Failed to process company information. Please try again.');
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
        <a href="/" className="logo">
          <Sparkles className="logo-icon" />
          <span className="logo-text">Clipping.AI</span>
        </a>
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

        {/* Step 2: Company Verification */}
        {step === 'verify' && companyInfo && (
          <div className="onboarding-step verify-step">
            <div className="step-content">
              {error && (
                <div className="error-banner">
                  <AlertCircle size={20} />
                  <span>{error}</span>
                </div>
              )}

              <h2 className="section-title">Is this your company?</h2>
              <p className="section-subtitle">Please verify the information we found</p>

              <div className="company-verification-card">
                {/* Company Logo Section */}
                <div className="logo-section">
                  {selectedLogo ? (
                    <img src={selectedLogo} alt={companyInfo.name} className="company-logo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  ) : (
                    <div className="logo-placeholder">
                      <Building2 size={48} />
                    </div>
                  )}
                </div>

                {/* Company Info */}
                <div className="company-info-section">
                  <h3 className="company-name-large">{companyInfo.name}</h3>
                  <p className="company-domain">{companyInfo.website}</p>
                  {companyInfo.description && (
                    <p className="company-description">{companyInfo.description}</p>
                  )}
                  {companyInfo.industry && (
                    <div className="company-meta">
                      <span className="meta-label">Industry:</span>
                      <span className="meta-value">{companyInfo.industry}</span>
                    </div>
                  )}
                </div>

                {/* Logo Options */}
                {companyInfo.logoOptions && companyInfo.logoOptions.length > 0 && (
                  <div className="logo-options">
                    <p className="options-label">Or choose a different logo:</p>
                    <div className="logo-grid">
                      {companyInfo.logoOptions.map((option, index) => (
                        <div
                          key={index}
                          className={`logo-option ${selectedLogo === option.url ? 'selected' : ''}`}
                          onClick={() => setSelectedLogo(option.url)}
                        >
                          <img src={option.url} alt={`${companyInfo.name} logo option`} onError={(e) => { e.currentTarget.parentElement!.style.display = 'none'; }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="step-actions">
                <button className="btn-primary-large" onClick={handleVerifyCompany}>
                  Yes, that's correct
                  <Check size={20} />
                </button>
                <button className="btn-secondary-large" onClick={handleNotMyCompany}>
                  <Edit3 size={20} />
                  This isn't my company
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2b: Manual Company Input */}
        {step === 'manual' && (
          <div className="onboarding-step manual-step">
            <div className="step-content">
              <h2 className="section-title">Tell us about your company</h2>
              <p className="section-subtitle">
                Describe your company in your own words - our AI will understand
              </p>

              <div className="manual-input-section">
                <textarea
                  className="manual-textarea"
                  placeholder="Example: We're a B2B SaaS company that helps marketing teams automate their reporting. We compete with HubSpot and Marketo, and our website is acme.com"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  rows={6}
                />
                <p className="input-hint">
                  Include your company name, what you do, website, and any competitors you know about
                </p>
              </div>

              <div className="step-actions">
                <button
                  className="btn-primary-large"
                  onClick={handleManualSubmit}
                  disabled={!manualInput.trim()}
                >
                  Continue
                  <ArrowRight size={20} />
                </button>
                <button className="btn-text" onClick={() => setStep('verify')}>
                  Go back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Report Suggestions */}
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
                  Continue to Account Setup
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

        {/* Step 5: Viewing Report */}
        {step === 'viewing' && reportId && (
          <div className="onboarding-step viewing-step">
            <div className="step-content">
              <h2 className="section-title">
                Here's your first intelligence report!
              </h2>
              <p className="section-subtitle">
                This is what you'll receive automatically based on your preferences
              </p>

              <div className="report-preview-card large">
                <div className="preview-header">
                  <h3>Competitor Intelligence - Week of Nov 11</h3>
                  <span className="preview-badge">Just generated</span>
                </div>
                <p className="preview-summary">
                  <strong>TL;DR:</strong> 5 major updates detected across your competitors.
                  Market shifting toward AI-native solutions with 3 new product launches this week.
                </p>

                <div className="preview-articles">
                  <div className="preview-article">
                    <div className="article-img-placeholder"></div>
                    <h4>Competitor X Launches AI-Powered Platform</h4>
                    <p>Major product announcement with new AI capabilities targeting enterprise customers...</p>
                  </div>
                  <div className="preview-article">
                    <div className="article-img-placeholder"></div>
                    <h4>Competitor Y Raises $50M Series B</h4>
                    <p>Significant funding round to accelerate product development and market expansion...</p>
                  </div>
                  <div className="preview-article">
                    <div className="article-img-placeholder"></div>
                    <h4>Industry Shifts Toward AI-Native Solutions</h4>
                    <p>Market analysis shows 73% increase in AI feature adoption across the sector...</p>
                  </div>
                </div>

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
                  onClick={handleContinue}
                >
                  I love it! Set up delivery
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Signup */}
        {step === 'signup' && (
          <div className="onboarding-step signup-step">
            <div className="step-content">
              <h2 className="section-title">Create your account</h2>
              <p className="section-subtitle">
                Almost done! Create your account to start receiving reports
              </p>

              <div className="signup-form">
                <div className="form-section">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="text-input disabled"
                  />
                </div>

                <div className="form-section">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    placeholder="Create a password (min 8 characters)"
                    className="text-input"
                  />
                  <p className="input-hint">
                    We'll use this to secure your account and dashboard
                  </p>
                </div>

                <div className="form-section">
                  <label className="form-label">Name (optional)</label>
                  <input
                    type="text"
                    placeholder="Your name"
                    className="text-input"
                  />
                </div>
              </div>

              <div className="step-actions">
                <button
                  className="btn-primary-large"
                  onClick={handleSignup}
                >
                  Create Account & Start Receiving Reports
                  <Check size={20} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 7: Complete */}
        {step === 'complete' && (
          <div className="onboarding-step complete-step">
            <div className="step-content">
              <div className="success-animation">
                <div className="success-checkmark">
                  <Check size={64} />
                </div>
              </div>

              <h1 className="step-title">
                You're all set! 🎉
              </h1>

              <p className="step-subtitle">
                Your account is created and your first report is ready! You'll receive future
                reports via email at {email} starting {frequency === 'daily' ? 'tomorrow morning' : 'next week'}.
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
