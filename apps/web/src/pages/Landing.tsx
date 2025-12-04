import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Target, TrendingUp, Mail } from 'lucide-react';
import Logo, { LogoSymbol } from '../components/Logo';
import { checkEmailExists } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import '../styles/landing.css';

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsAnalyzing(true);
    setStatusMessage('Checking...');

    try {
      // Check if email already exists
      const result = await checkEmailExists(email);

      if (result.exists) {
        // Email exists - redirect to login
        setStatusMessage('Welcome back! Taking you to login...');
        setTimeout(() => {
          navigate(`/login?email=${encodeURIComponent(email)}`);
        }, 1000);
      } else {
        // New user - continue to onboarding
        setStatusMessage('Analyzing...');
        setTimeout(() => {
          navigate(`/onboarding?email=${encodeURIComponent(email)}`);
        }, 1500);
      }
    } catch (error) {
      console.error('Error checking email:', error);
      // On error, default to onboarding flow
      setStatusMessage('Analyzing...');
      setTimeout(() => {
        navigate(`/onboarding?email=${encodeURIComponent(email)}`);
      }, 1500);
    }
  };

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="header">
        <a href="/" className="logo">
          <Logo size={50} showWordmark={true} variant="dark" />
        </a>
        <nav className="nav">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it Works</a>
          <a href={isAuthenticated ? "/dashboard" : "/login"} className="btn-secondary">
            {isAuthenticated ? "Go to Dashboard" : "Sign In"}
          </a>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Competitive Intelligence
            <br />
            Delivered Weekly
          </h1>

          <p className="hero-subtitle">
            Track your competitors, monitor industry trends, and stay informed with
            AI-powered intelligence reports delivered to your inbox.
          </p>

          {/* Email Form */}
          <form onSubmit={handleEmailSubmit} className="hero-form">
            <div className="form-group">
              <Mail className="form-icon" />
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                required
              />
              <button
                type="submit"
                className="btn-primary"
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <span className="analyzing">
                    <span className="spinner"></span>
                    {statusMessage || 'Analyzing...'}
                  </span>
                ) : (
                  <>
                    Get Started
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </div>
            <p className="form-hint">
              Free trial • No credit card required
            </p>
          </form>

          {/* Social Proof */}
          <div className="social-proof">
            <div className="proof-avatars">
              <div className="avatar">👤</div>
              <div className="avatar">👤</div>
              <div className="avatar">👤</div>
              <div className="avatar">👤</div>
            </div>
            <p className="proof-text">
              <strong>2,847 founders</strong> tracking their competition
            </p>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="features" id="features">
        <div className="section-header">
          <h2 className="section-title">Three Reports. Complete Intelligence.</h2>
          <p className="section-subtitle">
            Choose what matters to your business. Get weekly insights delivered.
          </p>
        </div>

        <div className="feature-grid">
          <div className="feature-card competitor">
            <div className="card-icon">
              <Target size={32} />
            </div>
            <h3>Competitor Landscape</h3>
            <p>
              Track product launches, pricing changes, and strategic moves from your
              top 5 competitors. Know what they're doing before your team asks.
            </p>
            <ul className="feature-list">
              <li>Product updates & features</li>
              <li>Pricing & positioning changes</li>
              <li>Marketing campaigns</li>
              <li>Leadership & hiring moves</li>
            </ul>
          </div>

          <div className="feature-card market">
            <div className="card-icon">
              <TrendingUp size={32} />
            </div>
            <h3>Market Landscape</h3>
            <p>
              Stay ahead of industry trends, regulatory changes, and emerging
              technologies. See the big picture others miss.
            </p>
            <ul className="feature-list">
              <li>Industry trends & shifts</li>
              <li>Regulatory updates</li>
              <li>Technology breakthroughs</li>
              <li>Market opportunities</li>
            </ul>
          </div>

          <div className="feature-card media">
            <div className="card-icon">
              <LogoSymbol size={32} variant="dark" />
            </div>
            <h3>Media Monitoring</h3>
            <p>
              Track every mention of your company across news, social media, and
              industry publications. Never miss your moment.
            </p>
            <ul className="feature-list">
              <li>News & press coverage</li>
              <li>Social media mentions</li>
              <li>Industry publications</li>
              <li>Sentiment analysis</li>
            </ul>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works" id="how-it-works">
        <div className="section-header">
          <h2 className="section-title">From Email to Insights in 30 Seconds</h2>
        </div>

        <div className="steps">
          <div className="step">
            <div className="step-number">01</div>
            <h3>Enter Your Work Email</h3>
            <p>
              Our AI instantly detects your company from your email domain and learns
              your industry.
            </p>
          </div>

          <div className="step-arrow">→</div>

          <div className="step">
            <div className="step-number">02</div>
            <h3>AI Suggests Reports</h3>
            <p>
              We analyze your market and suggest competitor tracking, market trends,
              and media monitoring.
            </p>
          </div>

          <div className="step-arrow">→</div>

          <div className="step">
            <div className="step-number">03</div>
            <h3>Get Your First Report</h3>
            <p>
              We generate a beautiful, comprehensive report in real-time. Share it or
              keep it private.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="cta-content">
          <h2>Stop playing catch-up.</h2>
          <p>
            While your competitors make moves, you're reading this. Start tracking
            them in the next 30 seconds.
          </p>
          <form onSubmit={handleEmailSubmit} className="cta-form">
            <input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="cta-input"
              required
            />
            <button type="submit" className="btn-primary-large">
              Get Your First Report
              <ArrowRight size={24} />
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <Logo size={40} showWordmark={true} variant="dark" />
          </div>
          <div className="footer-links">
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/contact">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
