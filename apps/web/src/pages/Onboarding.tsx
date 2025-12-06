import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Building2,
  TrendingUp,
  Target,
  Newspaper,
  Check,
  Loader2,
  ArrowRight,
  Clock,
  Edit3,
  AlertCircle,
  Bell,
  ChevronDown,
  X,
  Plus,
  Eye,
  EyeOff
} from 'lucide-react';
import Logo, { LogoSymbol } from '../components/Logo';
import type { CompanyDetectionResult } from '@clippingai/shared';
import { detectCompany, processManualCompany, generateReport, signup, type GeneratedReport } from '../lib/api';
import '../styles/onboarding.css';

type OnboardingStep = 'detecting' | 'verify' | 'manual' | 'focus' | 'context' | 'generating' | 'signup' | 'complete';

type IntelligenceType = 'competitors' | 'market_trends' | 'brand_mentions' | 'industry_news';

interface IntelligenceOption {
  type: IntelligenceType;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const INTELLIGENCE_OPTIONS: IntelligenceOption[] = [
  {
    type: 'competitors',
    icon: <Target size={32} />,
    title: 'Competitor Intelligence',
    description: 'Track product launches, pricing changes, and strategic moves from your rivals'
  },
  {
    type: 'market_trends',
    icon: <TrendingUp size={32} />,
    title: 'Market Trends',
    description: 'Stay ahead of industry shifts, regulatory changes, and emerging technologies'
  },
  {
    type: 'brand_mentions',
    icon: <Newspaper size={32} />,
    title: 'Brand Mentions',
    description: 'Monitor every mention of your company across news and social media'
  },
  {
    type: 'industry_news',
    icon: <Bell size={32} />,
    title: 'Industry News',
    description: 'General industry news and analysis relevant to your space'
  }
];

export default function Onboarding() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const email = searchParams.get('email') || '';
  const stepParam = searchParams.get('step') as OnboardingStep | null;

  // Get company info from navigation state (if coming from report page)
  const stateData = location.state as { companyInfo?: CompanyDetectionResult; skipQuestions?: boolean } | null;

  const [step, setStep] = useState<OnboardingStep>(stepParam || 'detecting');
  const [companyInfo, setCompanyInfo] = useState<CompanyDetectionResult | null>(stateData?.companyInfo || null);
  const [selectedLogo, setSelectedLogo] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [manualInputType, setManualInputType] = useState<'email' | 'website' | 'description'>('email');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('weekly');
  const [reportId, setReportId] = useState<string | null>(null);
  const [, setReportData] = useState<GeneratedReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setGenerationProgress] = useState(0);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);

  // New state for improved onboarding flow
  const [selectedIntelligenceTypes, setSelectedIntelligenceTypes] = useState<IntelligenceType[]>(['competitors', 'market_trends']);
  const [selectedCompetitors, setSelectedCompetitors] = useState<string[]>([]); // Detected competitors user has selected
  const [customCompetitors, setCustomCompetitors] = useState<string[]>([]); // User-added custom competitors
  const [competitorInput, setCompetitorInput] = useState('');
  const [showLogoOptions, setShowLogoOptions] = useState(false);
  const [failedLogos, setFailedLogos] = useState<Set<string>>(new Set());

  // Helper function to extract clean company name
  const getCleanCompanyName = (fullName: string): string => {
    if (!fullName) return '';
    // If there's a pipe separator, take the part after it (usually the company name)
    if (fullName.includes('|')) {
      return fullName.split('|').pop()?.trim() || fullName;
    }
    // If there's a dash, take the last part
    if (fullName.includes(' - ')) {
      return fullName.split(' - ').pop()?.trim() || fullName;
    }
    // Otherwise return as is
    return fullName.trim();
  };

  // Initialize selected competitors from detected ones when companyInfo changes
  useEffect(() => {
    if (companyInfo?.competitors && companyInfo.competitors.length > 0) {
      // Pre-select all detected competitors by default
      setSelectedCompetitors(companyInfo.competitors);
    }
  }, [companyInfo?.competitors]);

  // Memoized logo options - include main logo as first selectable option, filter out failed ones
  const allLogoOptions = useMemo(() => {
    if (!companyInfo) return [];
    const logos: { url: string; isPrimary: boolean }[] = [];

    // Add main logo as primary option (if not failed)
    if (companyInfo.logo && !failedLogos.has(companyInfo.logo)) {
      logos.push({ url: companyInfo.logo, isPrimary: true });
    }

    // Add alternatives (filter out duplicates of main logo and failed logos)
    companyInfo.logoOptions?.forEach((opt: { url: string }) => {
      if (opt.url !== companyInfo.logo && !failedLogos.has(opt.url)) {
        logos.push({ url: opt.url, isPrimary: false });
      }
    });

    return logos;
  }, [companyInfo, failedLogos]);

  // Real company detection using API
  useEffect(() => {
    // Only detect if we're on the detecting step, have an email, and don't already have company info
    if (step === 'detecting' && email && !companyInfo) {
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
  }, [step, email, companyInfo]);

  // Toggle intelligence type selection
  const handleToggleIntelligence = (type: IntelligenceType) => {
    setSelectedIntelligenceTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // Toggle detected competitor selection
  const handleToggleDetectedCompetitor = (competitor: string) => {
    setSelectedCompetitors(prev =>
      prev.includes(competitor)
        ? prev.filter(c => c !== competitor)
        : [...prev, competitor]
    );
  };

  // Add custom competitor chip
  const handleAddCompetitor = () => {
    const trimmed = competitorInput.trim();
    if (trimmed && !customCompetitors.includes(trimmed) && !selectedCompetitors.includes(trimmed)) {
      setCustomCompetitors(prev => [...prev, trimmed]);
      setCompetitorInput('');
    }
  };

  // Remove custom competitor chip
  const handleRemoveCompetitor = (competitor: string) => {
    setCustomCompetitors(prev => prev.filter(c => c !== competitor));
  };

  // Remove detected competitor chip
  const handleRemoveDetectedCompetitor = (competitor: string) => {
    if (companyInfo) {
      setCompanyInfo({
        ...companyInfo,
        competitors: companyInfo.competitors?.filter((c: string) => c !== competitor) || []
      });
    }
  };

  // Handle keyboard input for competitor
  const handleCompetitorKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCompetitor();
    }
  };

  const handleSignup = async () => {
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSignupLoading(true);
    setError(null);

    try {
      await signup({
        email,
        password,
        name: name || undefined,
        companyName: companyInfo?.name,
        companyDomain: companyInfo?.domain,
      });

      // Log the user in automatically after signup
      await login({ email, password });

      // Update the existing temporary report config created during report generation
      // instead of creating a new one
      const { getReportConfigs, updateReportConfig } = await import('../lib/api');

      // Get all user's configs (should have the temp one from report generation)
      const configs = await getReportConfigs();

      if (configs.length > 0) {
        // Update the first (temp) config with user preferences
        const tempConfig = configs[0];

        // Combine selected detected competitors and user-added custom competitors
        const allCompetitors = [
          ...selectedCompetitors,
          ...customCompetitors
        ].filter((c: string, i, arr) => arr.indexOf(c) === i); // dedupe

        const cleanCompanyName = getCleanCompanyName(companyInfo?.name || '');

        await updateReportConfig(tempConfig.id, {
          title: `${cleanCompanyName || 'Your Company'} ${frequency === 'daily' ? 'Daily' : 'Weekly'} Intelligence`,
          description: `Automated ${frequency} competitive intelligence reports for ${cleanCompanyName || 'your company'}`,
          frequency: frequency,
          scheduleTime: '09:00',
          scheduleDay: frequency === 'weekly' ? 'monday' : undefined,
          searchParameters: {
            companyName: cleanCompanyName || companyInfo?.name,
            companyDomain: companyInfo?.domain,
            industry: companyInfo?.industry,
            competitors: allCompetitors,
            dateRange: '7d',
          },
        });
      }

      // Account created successfully with stream updated - navigate directly to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Signup error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setSignupLoading(false);
    }
  };

  // Step 2: Verify company -> Step 3: Focus
  const handleVerifyCompany = () => {
    setError(null);
    setStep('focus');
  };

  // Step 3: Focus -> Step 4: Context
  const handleFocusContinue = () => {
    if (selectedIntelligenceTypes.length === 0) {
      setError('Please select at least one intelligence type');
      return;
    }
    setError(null);
    setStep('context');
  };

  // Step 4: Context -> Step 5: Generate
  const handleContextContinue = async () => {
    setStep('generating');
    setError(null);
    setGenerationProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => Math.min(prev + 5, 95));
      }, 1000);

      // Combine selected detected competitors and user-added custom competitors
      const allCompetitors = [
        ...selectedCompetitors,
        ...customCompetitors
      ].filter((c: string, i, arr) => arr.indexOf(c) === i);

      // Generate report with all context
      const report = await generateReport({
        companyName: companyInfo!.name,
        companyDomain: companyInfo!.domain,
        industry: companyInfo!.industry,
        competitors: allCompetitors,
        reportType: 'media_monitoring',
        dateRange: 7,
        userEmail: email // Pass real email for anonymous user creation
      });

      clearInterval(progressInterval);
      setGenerationProgress(100);
      setReportData(report);

      // Navigate to report page
      if (report.reportId) {
        setReportId(report.reportId);
        setTimeout(() => {
          navigate(`/report/${report.reportId}?email=${encodeURIComponent(email)}`);
        }, 500);
      } else {
        throw new Error('Report was generated but not saved');
      }
    } catch (err) {
      console.error('Report generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate report. Please try again.');
      setStep('context');
    }
  };

  const handleNotMyCompany = () => {
    setStep('manual');
  };

  const handleManualSubmit = async () => {
    if (!manualInput.trim()) return;

    try {
      let inputText = manualInput;

      // If email, try detection again with new email
      if (manualInputType === 'email') {
        const result = await detectCompany(manualInput);
        setCompanyInfo(result);
        setSelectedLogo(result.logo || null);
        setError(null);
        setStep('verify');
        return;
      }

      // If website, format as a description with website
      if (manualInputType === 'website') {
        inputText = `Our company website is ${manualInput}`;
      }

      // Process description or formatted website input
      const result = await processManualCompany(inputText);
      setCompanyInfo(result);
      setSelectedLogo(result.logo || null);
      setError(null);
      // Go to focus step after manual company input
      setStep('focus');
    } catch (err) {
      console.error('Manual input error:', err);
      setError('Failed to process company information. Please try again.');
    }
  };

  const handleViewReport = () => {
    // After signup, navigate to dashboard instead of specific report
    navigate('/dashboard');
  };

  return (
    <div className="onboarding-page">
      {/* Background */}
      <div className="bg-grid"></div>
      <div className="bg-gradient"></div>

      {/* Header */}
      <header className="onboarding-header">
        <a href="/" className="logo">
          <Logo size={50} showWordmark={true} variant="dark" />
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
                <div className={`logo-section ${companyInfo.logoVariant === 'light' ? 'dark-bg' : ''}`}>
                  <div className="logo-with-edit">
                    {selectedLogo ? (
                      <img src={selectedLogo} alt={companyInfo.name} className="company-logo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    ) : (
                      <div className="logo-placeholder">
                        <Building2 size={48} />
                      </div>
                    )}
                    {allLogoOptions.length > 1 && (
                      <button
                        className="logo-edit-btn"
                        onClick={() => setShowLogoOptions(!showLogoOptions)}
                        title="Choose a different logo"
                        style={{ '--tooltip-delay': '0.5s' } as React.CSSProperties}
                      >
                        <Edit3 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Company Info */}
                <div className="company-info-section">
                  <h3 className="company-name-large">{getCleanCompanyName(companyInfo.name)}</h3>
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

                {/* Logo Options - Now toggled by pencil icon */}
                {allLogoOptions.length > 1 && showLogoOptions && (
                  <div className="logo-options">
                    <p className="logo-options-label">Choose a different logo:</p>
                    <div className="logo-grid">
                      {allLogoOptions.map((option, index) => (
                        <div
                          key={index}
                          className={`logo-option ${selectedLogo === option.url ? 'selected' : ''} ${option.isPrimary ? 'primary' : ''}`}
                          onClick={() => setSelectedLogo(option.url)}
                        >
                          <img
                            src={option.url}
                            alt={`${companyInfo.name} logo option`}
                            onError={(e) => {
                              // Mark this logo as failed so it gets filtered out
                              setFailedLogos(prev => new Set(prev).add(option.url));
                            }}
                          />
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
                Choose the easiest way to help us find your company
              </p>

              {/* Input type selector */}
              <div className="manual-input-type-selector">
                <button
                  className={`input-type-btn ${manualInputType === 'email' ? 'active' : ''}`}
                  onClick={() => { setManualInputType('email'); setManualInput(''); }}
                >
                  Try different email
                </button>
                <button
                  className={`input-type-btn ${manualInputType === 'website' ? 'active' : ''}`}
                  onClick={() => { setManualInputType('website'); setManualInput(''); }}
                >
                  Enter website
                </button>
                <button
                  className={`input-type-btn ${manualInputType === 'description' ? 'active' : ''}`}
                  onClick={() => { setManualInputType('description'); setManualInput(''); }}
                >
                  Describe company
                </button>
              </div>

              <div className="manual-input-section">
                {manualInputType === 'email' && (
                  <>
                    <input
                      type="email"
                      className="text-input"
                      placeholder="colleague@yourcompany.com"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                    />
                    <p className="input-hint">
                      Try a corporate email from your company
                    </p>
                  </>
                )}

                {manualInputType === 'website' && (
                  <>
                    <input
                      type="url"
                      className="text-input"
                      placeholder="https://yourcompany.com"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                    />
                    <p className="input-hint">
                      Enter your company's website URL
                    </p>
                  </>
                )}

                {manualInputType === 'description' && (
                  <>
                    <textarea
                      className="manual-textarea"
                      placeholder="Example: We're ABC Company, a B2B SaaS company that helps marketing teams automate their reporting. We compete with HubSpot and Marketo, and our website is acmecompany.com"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      rows={6}
                    />
                    <p className="input-hint">
                      Include your company name, what you do, website, and any competitors you know about
                    </p>
                  </>
                )}
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

        {/* Step 3: Intelligence Focus (NEW) */}
        {step === 'focus' && companyInfo && (
          <div className="onboarding-step focus-step">
            <div className="step-content">
              {error && (
                <div className="error-banner">
                  <AlertCircle size={20} />
                  <span>{error}</span>
                </div>
              )}

              <div className="company-context">
                <span className="company-badge">
                  <Check size={16} />
                  {getCleanCompanyName(companyInfo.name)}
                </span>
              </div>

              <h2 className="section-title">What intelligence do you need?</h2>
              <p className="section-subtitle">
                Select all that apply. We'll customize your first report based on your choices.
              </p>

              <div className="intelligence-grid">
                {INTELLIGENCE_OPTIONS.map((option, index) => (
                  <div
                    key={option.type}
                    className={`intelligence-card ${selectedIntelligenceTypes.includes(option.type) ? 'selected' : ''}`}
                    onClick={() => handleToggleIntelligence(option.type)}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="card-header">
                      <div className="card-icon">{option.icon}</div>
                      <div className="card-checkbox">
                        {selectedIntelligenceTypes.includes(option.type) && <Check size={18} />}
                      </div>
                    </div>
                    <h3 className="card-title">{option.title}</h3>
                    <p className="card-description">{option.description}</p>
                  </div>
                ))}
              </div>

              <div className="step-actions">
                <button
                  className="btn-primary-large"
                  onClick={handleFocusContinue}
                  disabled={selectedIntelligenceTypes.length === 0}
                >
                  Continue with {selectedIntelligenceTypes.length} selected
                  <ArrowRight size={20} />
                </button>
                <button className="btn-text" onClick={() => setStep('verify')}>
                  Go back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Context Collection (NEW) */}
        {step === 'context' && companyInfo && (
          <div className="onboarding-step context-step">
            <div className="step-content">
              <div className="company-context">
                <span className={`company-badge ${companyInfo.logoVariant === 'light' ? 'dark-bg' : ''}`}>
                  {selectedLogo ? (
                    <img src={selectedLogo} alt={companyInfo.name} className="badge-logo" />
                  ) : (
                    <Check size={16} />
                  )}
                  {getCleanCompanyName(companyInfo.name)}
                </span>
              </div>

              <h2 className="section-title">Let's personalize your first report</h2>
              <p className="section-subtitle">
                Help us understand your needs better
              </p>

              <div className="context-form">
                {/* Competitor Section - always show */}
                <div className="context-section">
                    <label className="form-label">
                      <Target size={20} />
                      Who are your main competitors?
                    </label>
                    <p className="section-hint">
                      Click to select competitors to track. You can also add your own.
                    </p>

                    {/* Clickable detected competitor suggestions */}
                    {companyInfo.competitors && companyInfo.competitors.length > 0 && (
                      <div className="competitor-suggestions">
                        <span className="chips-label">Suggestions based on your industry:</span>
                        <div className="competitor-chips">
                          {companyInfo.competitors.map((comp: string, i: number) => (
                            <div key={i} className="competitor-chip-wrapper">
                              <button
                                type="button"
                                className={`competitor-chip suggestion ${selectedCompetitors.includes(comp) ? 'selected' : ''}`}
                                onClick={() => handleToggleDetectedCompetitor(comp)}
                              >
                                {selectedCompetitors.includes(comp) && <Check size={14} />}
                                {comp}
                              </button>
                              <button
                                type="button"
                                className="remove-suggestion"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveDetectedCompetitor(comp);
                                }}
                                title="Remove suggestion"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* User-added custom competitors */}
                    {customCompetitors.length > 0 && (
                      <div className="custom-competitors">
                        <span className="chips-label">Your additions:</span>
                        <div className="competitor-chips">
                          {customCompetitors.map((comp, i) => (
                            <span key={i} className="competitor-chip custom">
                              {comp}
                              <button
                                type="button"
                                className="remove-chip"
                                onClick={() => handleRemoveCompetitor(comp)}
                              >
                                <X size={14} />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add custom competitor input */}
                    <div className="add-competitor">
                      <input
                        type="text"
                        placeholder="Add another competitor..."
                        className="text-input"
                        value={competitorInput}
                        onChange={(e) => setCompetitorInput(e.target.value)}
                        onKeyDown={handleCompetitorKeyDown}
                      />
                      <button
                        type="button"
                        className="add-btn"
                        onClick={handleAddCompetitor}
                        disabled={!competitorInput.trim()}
                      >
                        <Plus size={20} />
                      </button>
                    </div>

                    {/* Selected count */}
                    <p className="selected-count">
                      {selectedCompetitors.length + customCompetitors.length} competitor{selectedCompetitors.length + customCompetitors.length !== 1 ? 's' : ''} selected
                    </p>
                </div>

                {/* Frequency Section - always show */}
                <div className="context-section">
                  <label className="form-label">
                    <Clock size={20} />
                    How often do you want reports?
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
              </div>

              <div className="step-actions">
                <button
                  className="btn-primary-large"
                  onClick={handleContextContinue}
                >
                  Generate My First Report
                  <ArrowRight size={20} />
                </button>
                <button className="btn-text" onClick={() => setStep('focus')}>
                  Go back
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
                  <LogoSymbol size={64} variant="dark" className="sparkles-icon" />
                </div>
              </div>

              <h1 className="step-title">
                Generating your media monitoring digest
              </h1>

              <div className="generation-progress">
                <div className="progress-item completed">
                  <Check size={20} />
                  <span>Searching for latest news and articles...</span>
                </div>
                <div className="progress-item completed">
                  <Check size={20} />
                  <span>Analyzing industry trends and competitor activities...</span>
                </div>
                <div className="progress-item active">
                  <Loader2 className="spinner" size={20} />
                  <span>Generating insights with AI...</span>
                </div>
                <div className="progress-item">
                  <div className="item-dot"></div>
                  <span>Creating your personalized digest...</span>
                </div>
              </div>

              <p className="generation-note">
                This usually takes 30-60 seconds. We're being thorough.
              </p>
            </div>
          </div>
        )}

        {/* Step 5: Signup */}
        {step === 'signup' && (
          <div className="onboarding-step signup-step">
            <div className="step-content">
              <h2 className="section-title">Create your account</h2>
              <p className="section-subtitle">
                Almost done! Create your account to start receiving reports
              </p>

              <form className="signup-form" onSubmit={(e) => {
                e.preventDefault();
                handleSignup();
              }}>
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
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a password (min 8 characters)"
                      className="text-input"
                      style={{ paddingRight: '3rem' }}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={signupLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '1rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-tertiary)',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      disabled={signupLoading}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="form-section">
                  <label className="form-label">Confirm Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter your password"
                      className="text-input"
                      style={{ paddingRight: '3rem' }}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={signupLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{
                        position: 'absolute',
                        right: '1rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-tertiary)',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      disabled={signupLoading}
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <p className="input-hint">
                    Please confirm your password to avoid typos
                  </p>
                </div>

                <div className="form-section">
                  <label className="form-label">Name (optional)</label>
                  <input
                    type="text"
                    placeholder="Your name"
                    className="text-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={signupLoading}
                  />
                </div>

                {error && (
                  <div className="error-message">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="step-actions">
                  <button
                    type="submit"
                    className="btn-primary-large"
                    disabled={signupLoading || !password || !confirmPassword}
                  >
                    {signupLoading ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Create Account & Start Receiving Reports
                        <Check size={20} />
                      </>
                    )}
                  </button>
                </div>
              </form>
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
                Your account is created! You'll receive intelligence reports via email at {email} starting {frequency === 'daily' ? 'tomorrow morning' : 'next week'}.
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
                  Go to Dashboard
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
