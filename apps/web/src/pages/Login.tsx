import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import Logo from '../components/Logo';
import { login } from '../lib/api';
import '../styles/login.css';

export default function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fromLanding = searchParams.get('email'); // User came from landing page

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login({ email, password });

      // Token is automatically stored by the login function
      // Navigate to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <a href="/" className="login-logo">
            <Logo size={50} showWordmark={true} variant="dark" />
          </a>
          <h1>Welcome back</h1>
          <p>
            {fromLanding
              ? 'We found your account! Sign in to continue.'
              : 'Sign in to your account to continue'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {fromLanding && !error && (
            <div className="login-info">
              <Mail size={20} />
              <span>We recognized your email. Please enter your password.</span>
            </div>
          )}

          {error && (
            <div className="login-error">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-field">
            <label htmlFor="email">Email</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={20} />
              <input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-login"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="loading">
                <span className="spinner"></span>
                Signing in...
              </span>
            ) : (
              <>
                Sign In
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>
            Don't have an account?{' '}
            <a href="/" className="link-primary">Get started</a>
          </p>
        </div>
      </div>
    </div>
  );
}
