import { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronRight, Bug, Clock, Zap, Search, FileText, Brain } from 'lucide-react';
import { getAgentTraceFull, type AgentTraceFull } from '../lib/api';

interface AgentDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AgentDebugPanel({ isOpen, onClose }: AgentDebugPanelProps) {
  const [trace, setTrace] = useState<AgentTraceFull | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (isOpen) {
      fetchTrace();
    }
  }, [isOpen]);

  const fetchTrace = async () => {
    setLoading(true);
    const data = await getAgentTraceFull();
    setTrace(data);
    setLoading(false);
  };

  const toggleStep = (index: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSteps(newExpanded);
  };

  const getStepIcon = (stepName: string) => {
    if (stepName.includes('search')) return <Search size={14} />;
    if (stepName.includes('research')) return <Brain size={14} />;
    if (stepName.includes('query')) return <Zap size={14} />;
    if (stepName.includes('summariz') || stepName.includes('extraction')) return <FileText size={14} />;
    return <Clock size={14} />;
  };

  const getStepColor = (stepName: string) => {
    if (stepName.includes('error')) return '#ef4444';
    if (stepName.includes('complete') || stepName.includes('done')) return '#22c55e';
    if (stepName.includes('search')) return '#3b82f6';
    if (stepName.includes('research')) return '#a855f7';
    if (stepName.includes('query')) return '#f59e0b';
    return '#6b7280';
  };

  const filteredSteps = trace?.trace.steps.filter(step => {
    if (filter === 'all') return true;
    if (filter === 'research') return step.step.includes('research');
    if (filter === 'search') return step.step.includes('search');
    if (filter === 'decisions') return step.step.includes('decision') || step.step.includes('complete');
    return true;
  }) || [];

  if (!isOpen) return null;

  return (
    <div className="agent-debug-overlay" onClick={onClose}>
      <div className="agent-debug-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="debug-header">
          <div className="debug-title">
            <Bug size={20} />
            <span>Agent Trace Inspector</span>
          </div>
          <button className="debug-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="debug-content">
          {loading ? (
            <div className="debug-loading">Loading trace...</div>
          ) : !trace ? (
            <div className="debug-empty">
              <p>No trace available.</p>
              <p className="debug-hint">Generate a report to see the agent's reasoning.</p>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="debug-stats">
                <div className="stat-item">
                  <span className="stat-label">Duration</span>
                  <span className="stat-value">
                    {trace.stats.totalDuration
                      ? `${(trace.stats.totalDuration / 1000).toFixed(1)}s`
                      : 'N/A'}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Steps</span>
                  <span className="stat-value">{trace.stats.stepCount}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Company</span>
                  <span className="stat-value">{trace.trace.input?.companyName || 'N/A'}</span>
                </div>
              </div>

              {/* Filter */}
              <div className="debug-filter">
                <button
                  className={filter === 'all' ? 'active' : ''}
                  onClick={() => setFilter('all')}
                >
                  All ({trace.trace.steps.length})
                </button>
                <button
                  className={filter === 'research' ? 'active' : ''}
                  onClick={() => setFilter('research')}
                >
                  Research
                </button>
                <button
                  className={filter === 'search' ? 'active' : ''}
                  onClick={() => setFilter('search')}
                >
                  Searches
                </button>
                <button
                  className={filter === 'decisions' ? 'active' : ''}
                  onClick={() => setFilter('decisions')}
                >
                  Decisions
                </button>
              </div>

              {/* Steps */}
              <div className="debug-steps">
                {filteredSteps.map((step, index) => {
                  const relativeTime = ((step.timestamp - trace.trace.startTime) / 1000).toFixed(1);
                  const isExpanded = expandedSteps.has(index);
                  const hasDetails = step.prompt || step.response || step.data;

                  return (
                    <div
                      key={index}
                      className={`debug-step ${isExpanded ? 'expanded' : ''}`}
                      style={{ borderLeftColor: getStepColor(step.step) }}
                    >
                      <div
                        className="step-header"
                        onClick={() => hasDetails && toggleStep(index)}
                        style={{ cursor: hasDetails ? 'pointer' : 'default' }}
                      >
                        <div className="step-icon" style={{ color: getStepColor(step.step) }}>
                          {getStepIcon(step.step)}
                        </div>
                        <div className="step-info">
                          <span className="step-name">{step.step.replace(/_/g, ' ')}</span>
                          <span className="step-time">+{relativeTime}s</span>
                        </div>
                        {hasDetails && (
                          <div className="step-expand">
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </div>
                        )}
                      </div>

                      {isExpanded && hasDetails && (
                        <div className="step-details">
                          {step.data && (
                            <div className="detail-section">
                              <div className="detail-label">Data</div>
                              <pre className="detail-content">
                                {JSON.stringify(step.data, null, 2)}
                              </pre>
                            </div>
                          )}
                          {step.prompt && (
                            <div className="detail-section">
                              <div className="detail-label">Prompt</div>
                              <pre className="detail-content prompt">{step.prompt}</pre>
                            </div>
                          )}
                          {step.response && (
                            <div className="detail-section">
                              <div className="detail-label">Response</div>
                              <pre className="detail-content response">{step.response}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="debug-footer">
          <button onClick={fetchTrace} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      <style>{`
        .agent-debug-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 9999;
          display: flex;
          justify-content: flex-end;
        }

        .agent-debug-panel {
          width: 600px;
          max-width: 100vw;
          height: 100vh;
          background: #1a1a1a;
          display: flex;
          flex-direction: column;
          box-shadow: -4px 0 20px rgba(0, 0, 0, 0.5);
        }

        .debug-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: #252525;
          border-bottom: 1px solid #333;
        }

        .debug-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
          color: #fff;
        }

        .debug-close {
          background: none;
          border: none;
          color: #888;
          cursor: pointer;
          padding: 4px;
        }

        .debug-close:hover {
          color: #fff;
        }

        .debug-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .debug-loading, .debug-empty {
          text-align: center;
          padding: 40px 20px;
          color: #888;
        }

        .debug-hint {
          font-size: 12px;
          margin-top: 8px;
          color: #666;
        }

        .debug-stats {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
          padding: 12px;
          background: #252525;
          border-radius: 8px;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-label {
          font-size: 11px;
          color: #888;
          text-transform: uppercase;
        }

        .stat-value {
          font-size: 14px;
          font-weight: 600;
          color: #fff;
        }

        .debug-filter {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }

        .debug-filter button {
          padding: 6px 12px;
          background: #252525;
          border: 1px solid #333;
          border-radius: 4px;
          color: #888;
          font-size: 12px;
          cursor: pointer;
        }

        .debug-filter button:hover {
          background: #333;
          color: #fff;
        }

        .debug-filter button.active {
          background: #3b82f6;
          border-color: #3b82f6;
          color: #fff;
        }

        .debug-steps {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .debug-step {
          background: #252525;
          border-radius: 6px;
          border-left: 3px solid #666;
          overflow: hidden;
        }

        .step-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
        }

        .step-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
        }

        .step-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .step-name {
          font-size: 13px;
          color: #fff;
          text-transform: capitalize;
        }

        .step-time {
          font-size: 11px;
          color: #666;
          font-family: monospace;
        }

        .step-expand {
          color: #666;
        }

        .step-details {
          border-top: 1px solid #333;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .detail-section {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .detail-label {
          font-size: 11px;
          color: #888;
          text-transform: uppercase;
          font-weight: 600;
        }

        .detail-content {
          font-size: 11px;
          font-family: 'SF Mono', Monaco, monospace;
          background: #1a1a1a;
          padding: 10px;
          border-radius: 4px;
          overflow-x: auto;
          white-space: pre-wrap;
          word-break: break-word;
          color: #ccc;
          max-height: 300px;
          overflow-y: auto;
        }

        .detail-content.prompt {
          color: #f59e0b;
        }

        .detail-content.response {
          color: #22c55e;
        }

        .debug-footer {
          padding: 12px 20px;
          background: #252525;
          border-top: 1px solid #333;
          display: flex;
          justify-content: flex-end;
        }

        .debug-footer button {
          padding: 8px 16px;
          background: #3b82f6;
          border: none;
          border-radius: 4px;
          color: #fff;
          font-size: 13px;
          cursor: pointer;
        }

        .debug-footer button:hover:not(:disabled) {
          background: #2563eb;
        }

        .debug-footer button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
