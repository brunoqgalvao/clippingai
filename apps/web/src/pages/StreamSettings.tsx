import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getReportConfigs, updateReportConfig } from '../lib/api';
import Logo from '../components/Logo';
import '../styles/login.css'; // Reuse login styles

export default function StreamSettings() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  const [formData, setFormData] = useState({
    companyName: '',
    companyDomain: '',
    industry: '',
    reportType: 'media_monitoring' as 'competitor_landscape' | 'market_landscape' | 'media_monitoring',
    frequency: 'weekly' as 'daily' | 'weekly' | 'biweekly' | 'monthly',
    scheduleTime: '09:00',
    recipients: user?.email || '',
  });

  // Load existing stream data
  useEffect(() => {
    const loadStream = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const configs = await getReportConfigs();
        const stream = configs.find(c => c.id === id);

        if (!stream) {
          setError('Stream not found');
          return;
        }

        // Populate form with existing data
        setFormData({
          companyName: stream.searchParameters?.companyName || stream.title?.split(' - ')[0] || '',
          companyDomain: stream.searchParameters?.companyDomain || '',
          industry: stream.searchParameters?.industry || '',
          reportType: stream.reportType || 'media_monitoring',
          frequency: stream.frequency || 'weekly',
          scheduleTime: stream.scheduleTime || '09:00',
          recipients: stream.recipients?.join(', ') || user?.email || '',
        });
      } catch (err) {
        console.error('Error loading stream:', err);
        setError('Failed to load stream settings');
      } finally {
        setLoading(false);
      }
    };

    loadStream();
  }, [id, user?.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setSaving(true);
    setError(null);

    try {
      // Validate
      if (!formData.companyName || !formData.companyDomain) {
        throw new Error('Company name and domain are required');
      }

      // Parse recipients
      const recipientEmails = formData.recipients
        .split(',')
        .map(e => e.trim())
        .filter(e => e);

      // Update the stream
      await updateReportConfig(id, {
        title: `${formData.companyName} - ${getReportTypeLabel(formData.reportType)}`,
        description: `Automated ${formData.frequency} intelligence reports for ${formData.companyName}`,
        reportType: formData.reportType,
        frequency: formData.frequency,
        scheduleTime: formData.scheduleTime,
        searchParameters: {
          companyName: formData.companyName,
          companyDomain: formData.companyDomain,
          industry: formData.industry || undefined,
          dateRange: '7d',
        },
        recipients: recipientEmails,
      });

      // Settings saved! Navigate back to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Error updating stream:', err);
      setError(err instanceof Error ? err.message : 'Failed to update stream');
      setSaving(false);
    }
  };

  const getReportTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      competitor_landscape: 'Competitor Intelligence',
      market_landscape: 'Market Trends',
      media_monitoring: 'Media Monitoring',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="login-page">
        <div className="login-container" style={{ maxWidth: '600px' }}>
          <div className="login-header">
            <Logo size={50} showWordmark={true} variant="dark" />
            <h1 style={{ marginTop: '2rem' }}>Loading...</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-container" style={{ maxWidth: '600px' }}>
        <div className="login-header">
          <Logo size={50} showWordmark={true} variant="dark" />
          <h1 style={{ marginTop: '2rem' }}>Stream Settings</h1>
          <p>Update your intelligence stream configuration</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          {/* Company Info */}
          <div className="form-field">
            <label htmlFor="companyName">Company Name *</label>
            <div className="input-wrapper">
              <input
                id="companyName"
                type="text"
                placeholder="Anthropic"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                required
                disabled={saving}
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="companyDomain">Company Domain *</label>
            <div className="input-wrapper">
              <input
                id="companyDomain"
                type="text"
                placeholder="anthropic.com"
                value={formData.companyDomain}
                onChange={(e) => setFormData({ ...formData, companyDomain: e.target.value })}
                required
                disabled={saving}
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="industry">Industry (optional)</label>
            <div className="input-wrapper">
              <input
                id="industry"
                type="text"
                placeholder="AI, SaaS, etc."
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                disabled={saving}
              />
            </div>
          </div>

          {/* Report Type */}
          <div className="form-field">
            <label htmlFor="reportType">Report Type</label>
            <select
              id="reportType"
              value={formData.reportType}
              onChange={(e) => setFormData({ ...formData, reportType: e.target.value as any })}
              disabled={saving}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '1rem',
              }}
            >
              <option value="media_monitoring">Media Monitoring</option>
              <option value="competitor_landscape">Competitor Intelligence</option>
              <option value="market_landscape">Market Trends</option>
            </select>
          </div>

          {/* Schedule */}
          <div className="form-field">
            <label htmlFor="frequency">Frequency</label>
            <select
              id="frequency"
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
              disabled={saving}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '1rem',
              }}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly (Every Monday)</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="scheduleTime">Time (24h format)</label>
            <input
              id="scheduleTime"
              type="time"
              value={formData.scheduleTime}
              onChange={(e) => setFormData({ ...formData, scheduleTime: e.target.value })}
              disabled={saving}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '1rem',
              }}
            />
          </div>

          {/* Recipients */}
          <div className="form-field">
            <label htmlFor="recipients">Email Recipients (comma-separated)</label>
            <div className="input-wrapper">
              <input
                id="recipients"
                type="text"
                placeholder="you@company.com, team@company.com"
                value={formData.recipients}
                onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                disabled={saving}
              />
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Reports will be emailed to these addresses
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn-secondary"
              disabled={saving}
              style={{ flex: 1 }}
            >
              <ArrowLeft size={20} />
              Cancel
            </button>

            <button
              type="submit"
              className="btn-login"
              disabled={saving}
              style={{ flex: 2 }}
            >
              {saving ? (
                <>
                  <Loader2 size={20} className="spinning" />
                  Saving...
                </>
              ) : (
                <>
                  Save Settings
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .spinning {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
