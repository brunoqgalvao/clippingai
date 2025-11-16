import { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, Target, TrendingUp, Mail } from 'lucide-react';
import '../styles/landing.css';

export default function Landing() {
  const [email, setEmail] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDataPoints, setShowDataPoints] = useState(false);

  useEffect(() => {
    // Trigger data points animation after mount
    setTimeout(() => setShowDataPoints(true), 500);
  }, []);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setIsAnalyzing(true);
      // Navigate to onboarding after brief animation
      setTimeout(() => {
        window.location.href = '/onboarding?email=' + encodeURIComponent(email);
      }, 2000);
    }
  };

  return (
    <div className="landing-page">
      {/* Animated Background */}
      <div className="bg-grid"></div>
      <div className="bg-gradient"></div>

      {/* Floating Data Points */}
      {showDataPoints && (
        <div className="floating-data">
          <div className="data-point" style={{ top: '15%', left: '10%', animationDelay: '0s' }}>
            <span className="data-label">Competitor X</span>
            <span className="data-value">+127% mentions</span>
          </div>
          <div className="data-point" style={{ top: '25%', right: '15%', animationDelay: '0.3s' }}>
            <span className="data-label">Market Shift</span>
            <span className="data-value">Detected 2h ago</span>
          </div>
          <div className="data-point" style={{ bottom: '30%', left: '8%', animationDelay: '0.6s' }}>
            <span className="data-label">Industry News</span>
            <span className="data-value">12 new insights</span>
          </div>
          <div className="data-point" style={{ bottom: '20%', right: '12%', animationDelay: '0.9s' }}>
            <span className="data-label">Your Company</span>
            <span className="data-value">8 media mentions</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="header">
        <a href="/" className="logo">
          <Sparkles className="logo-icon" />
          <span className="logo-text">Clipping.AI</span>
        </a>
        <nav className="nav">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it Works</a>
          <button className="btn-secondary">Sign In</button>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="hero">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-dot"></span>
            <span>AI-Powered Competitive Intelligence</span>
          </div>

          <h1 className="hero-title">
            Your competitors are
            <br />
            making moves.
            <br />
            <span className="title-highlight">Know in 30 seconds.</span>
          </h1>

          <p className="hero-subtitle">
            Enter your work email. We'll instantly analyze your company, detect your
            competitors, and generate your first intelligence report. All in the time it
            takes to read this sentence.
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
                    Analyzing...
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
              Free trial • No credit card • Get your first report in ~30 seconds
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
              <strong>2,847 founders</strong> already tracking their competition
            </p>
          </div>
        </div>

        {/* Demo Preview */}
        <div className="hero-demo">
          <div className="demo-card">
            <div className="demo-header">
              <div className="demo-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="demo-title">Intelligence Report Preview</span>
            </div>
            <div className="demo-content">
              <div className="demo-report">
                <div className="report-header">
                  <h3>Competitor Landscape - Week of Nov 11</h3>
                  <span className="report-badge">Just generated</span>
                </div>
                <div className="report-summary">
                  <p className="summary-label">TL;DR</p>
                  <p className="summary-text">
                    Competitor X launched AI features, Y raised $50M Series B, and Z
                    announced enterprise pricing changes. Market shifting toward
                    AI-native solutions.
                  </p>
                </div>
                <div className="report-articles">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="article-preview" style={{ animationDelay: `${i * 0.2}s` }}>
                      <div className="article-image"></div>
                      <div className="article-content">
                        <h4>Competitor {i === 1 ? 'X' : i === 2 ? 'Y' : 'Z'} Major Update</h4>
                        <p>Key strategic move detected in market...</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
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
              <Sparkles size={32} />
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
            <Sparkles size={24} />
            <span>Clipping.AI</span>
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
