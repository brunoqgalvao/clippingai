import { useState } from 'react';
import { X, Copy, Check, Twitter, Linkedin, Mail, Globe } from 'lucide-react';
import { updateReportVisibility } from '../lib/api';

interface ShareModalProps {
  reportId: string;
  currentlyPublic: boolean;
  currentSlug: string | null;
  companyName: string;
  onClose: () => void;
  onUpdate: (isPublic: boolean, slug: string | null) => void;
}

export default function ShareModal({
  reportId,
  currentlyPublic,
  currentSlug,
  companyName,
  onClose,
  onUpdate,
}: ShareModalProps) {
  const [isPublic, setIsPublic] = useState(currentlyPublic);
  const [slug, setSlug] = useState(currentSlug);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = slug ? `${window.location.origin}/r/${slug}` : null;

  const handleTogglePublic = async () => {
    setLoading(true);
    try {
      const result = await updateReportVisibility(reportId, !isPublic);
      setIsPublic(!isPublic);
      setSlug(result.publicSlug);
      onUpdate(!isPublic, result.publicSlug);
    } catch (error) {
      console.error('Failed to update visibility:', error);
      alert('Failed to update sharing settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleShareTwitter = () => {
    if (!shareUrl) return;
    const text = `Check out this competitive intelligence report for ${companyName}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const handleShareLinkedIn = () => {
    if (!shareUrl) return;
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=600');
  };

  const handleShareEmail = () => {
    if (!shareUrl) return;
    const subject = `Competitive Intelligence Report - ${companyName}`;
    const body = `I thought you'd find this competitive intelligence report interesting:\n\n${shareUrl}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-header">
          <h2>Share Report</h2>
          <button className="share-modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="share-modal-content">
          {/* Public Toggle */}
          <div className="share-public-toggle">
            <div className="share-public-info">
              <Globe size={20} />
              <div>
                <h3>Make report public</h3>
                <p>Anyone with the link can view this report</p>
              </div>
            </div>
            <button
              className={`toggle-switch ${isPublic ? 'active' : ''}`}
              onClick={handleTogglePublic}
              disabled={loading}
            >
              <div className="toggle-slider" />
            </button>
          </div>

          {isPublic && shareUrl && (
            <>
              {/* Share URL */}
              <div className="share-url-section">
                <label>Public Link</label>
                <div className="share-url-input">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    className={`copy-button ${copied ? 'copied' : ''}`}
                    onClick={handleCopyLink}
                  >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Social Sharing */}
              <div className="share-social-section">
                <label>Share on</label>
                <div className="share-social-buttons">
                  <button className="social-button twitter" onClick={handleShareTwitter}>
                    <Twitter size={20} />
                    Twitter
                  </button>
                  <button className="social-button linkedin" onClick={handleShareLinkedIn}>
                    <Linkedin size={20} />
                    LinkedIn
                  </button>
                  <button className="social-button email" onClick={handleShareEmail}>
                    <Mail size={20} />
                    Email
                  </button>
                </div>
              </div>
            </>
          )}

          {!isPublic && (
            <div className="share-private-message">
              <p>Enable public sharing to get a shareable link and social sharing options.</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .share-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .share-modal {
          background: white;
          border-radius: 16px;
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .share-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          border-bottom: 1px solid #e5e5e5;
        }

        .share-modal-header h2 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          color: #1a1a1a;
        }

        .share-modal-close {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          color: #6a6a6a;
          transition: color 0.2s;
        }

        .share-modal-close:hover {
          color: #1a1a1a;
        }

        .share-modal-content {
          padding: 24px;
        }

        .share-public-toggle {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #f8f9fa;
          border-radius: 12px;
          margin-bottom: 24px;
        }

        .share-public-info {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .share-public-info h3 {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 600;
          color: #1a1a1a;
        }

        .share-public-info p {
          margin: 0;
          font-size: 14px;
          color: #6a6a6a;
        }

        .toggle-switch {
          width: 52px;
          height: 28px;
          background: #d1d5db;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          position: relative;
          transition: background 0.3s;
          flex-shrink: 0;
        }

        .toggle-switch.active {
          background: #0066ff;
        }

        .toggle-switch:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .toggle-slider {
          width: 24px;
          height: 24px;
          background: white;
          border-radius: 12px;
          position: absolute;
          top: 2px;
          left: 2px;
          transition: transform 0.3s;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .toggle-switch.active .toggle-slider {
          transform: translateX(24px);
        }

        .share-url-section {
          margin-bottom: 24px;
        }

        .share-url-section label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 8px;
        }

        .share-url-input {
          display: flex;
          gap: 8px;
        }

        .share-url-input input {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          font-family: monospace;
          color: #1a1a1a;
        }

        .copy-button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          background: #0066ff;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .copy-button:hover {
          background: #0052cc;
        }

        .copy-button.copied {
          background: #10b981;
        }

        .share-social-section label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 12px;
        }

        .share-social-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .social-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: white;
          color: #1a1a1a;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .social-button:hover {
          border-color: #0066ff;
          color: #0066ff;
          background: #f0f7ff;
        }

        .social-button.twitter:hover {
          border-color: #1da1f2;
          color: #1da1f2;
          background: #e8f5fe;
        }

        .social-button.linkedin:hover {
          border-color: #0077b5;
          color: #0077b5;
          background: #e7f3f8;
        }

        .social-button.email {
          grid-column: 1 / -1;
        }

        .share-private-message {
          padding: 16px;
          background: #f8f9fa;
          border-radius: 8px;
          text-align: center;
        }

        .share-private-message p {
          margin: 0;
          color: #6a6a6a;
          font-size: 14px;
        }

        @media (max-width: 640px) {
          .share-modal {
            margin: 0;
            border-radius: 16px 16px 0 0;
            max-height: 95vh;
          }

          .share-social-buttons {
            grid-template-columns: 1fr;
          }

          .social-button.email {
            grid-column: 1;
          }
        }
      `}</style>
    </div>
  );
}
