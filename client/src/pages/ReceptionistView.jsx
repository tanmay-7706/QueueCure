/**
 * ReceptionistView.jsx — Screen 1: Receptionist Console (/).
 *
 * Features:
 * - Add patient form (name + "Add to Queue")
 * - "Call Next" button with double-click guard
 * - "Undo Last Call" button
 * - Set average consultation time (cold-start fallback)
 * - Live waiting list
 * - Toast feedback after every action
 * - Connection status indicator
 */

import { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useQueueSocket } from '../hooks/useQueueSocket';
import Toast from '../components/Toast';
import QueueList from '../components/QueueList';
import ConnectionStatus from '../components/ConnectionStatus';

export default function ReceptionistView() {
  const {
    queueState,
    isCallingNext,
    isConnected,
    lastAction,
    addPatient,
    callNext,
    undoLastCall,
    setAvgConsultTime,
    setDoctorStatus,
    resetSession,
    clearLastAction,
  } = useQueueSocket();

  const [patientName, setPatientName] = useState('');
  const [consultMinutes, setConsultMinutes] = useState('');
  const [flowTokens, setFlowTokens] = useState([]);
  const nameInputRef = useRef(null);

  // Sync flowTokens with exit animation
  useEffect(() => {
    const incoming = queueState?.waitingTokens || [];
    setFlowTokens(prev => {
      // Find tokens that are leaving
      const leavingIds = prev.filter(p => !incoming.find(i => i.id === p.id) && !p.exiting).map(p => p.id);
      
      let nextFlow = prev.map(p => {
        if (leavingIds.includes(p.id)) return { ...p, exiting: true };
        return p;
      });
      
      // Add new tokens
      incoming.forEach(i => {
        if (!nextFlow.find(n => n.id === i.id)) {
          nextFlow.push(i);
        }
      });
      
      if (leavingIds.length > 0) {
        setTimeout(() => {
          setFlowTokens(current => current.filter(c => !c.exiting));
        }, 400);
      }
      
      return nextFlow;
    });
  }, [queueState?.waitingTokens]);

  const handleAddPatient = (e) => {
    e.preventDefault();
    const name = patientName.trim();
    if (!name) return;
    addPatient(name);
    setPatientName('');
    nameInputRef.current?.focus();
  };

  const handleCallNext = () => {
    const hasNextPatient = (queueState?.waitingTokens?.length ?? 0) > 0;
    if (queueState?.currentToken && hasNextPatient) {
      setServedCount((s) => s + 1);
    }
    callNext();
  };

  const handleUndo = () => {
    if (queueState?.canUndo) {
      setServedCount((s) => Math.max(0, s - 1));
    }
    undoLastCall();
  };

  const handleSetTime = (e) => {
    e.preventDefault();
    const mins = Number(consultMinutes);
    if (mins >= 1) {
      setAvgConsultTime(mins);
      setConsultMinutes('');
    }
  };

  const waitingCount = queueState?.waitingTokens?.length ?? 0;
  const currentToken = queueState?.currentToken;
  const canUndo = queueState?.canUndo ?? false;
  const isOnBreak = queueState?.isOnBreak ?? false;

  // Consultation timer — counts up from when the last patient was called
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!queueState?.currentToken || !queueState?.lastCallTimestamp) {
      setElapsedSeconds(0);
      return;
    }
    const start = new Date(queueState.lastCallTimestamp).getTime();
    const tick = () => setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
    tick(); // immediate first tick
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [queueState?.currentToken?.id, queueState?.lastCallTimestamp]);

  const formatElapsed = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${String(s).padStart(2, '0')}s`;
  };
  
  const [servedCount, setServedCount] = useState(0);
  
  const prevWaitingCountRef = useRef(0);

  useEffect(() => {
    // If the queue was not empty, and now it is, trigger confetti!
    if (prevWaitingCountRef.current > 0 && waitingCount === 0) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
    prevWaitingCountRef.current = waitingCount;
  }, [waitingCount]);

  // ── Keyboard Shortcuts ──
  useEffect(() => {
    function handleKeyDown(e) {
      const tag = e.target.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA';

      // Escape always blurs
      if (e.key === 'Escape') {
        document.activeElement?.blur();
        return;
      }

      // If inside an input, ignore all other shortcuts
      if (isInput) return;

      // If target is a button, ignore Space (let native click work)
      if (tag === 'BUTTON' && e.key === ' ') return;

      // Space → Call Next
      if (e.key === ' ' && !isCallingNext) {
        e.preventDefault();
        handleCallNext();
        return;
      }

      // Ctrl+Z / Cmd+Z → Undo
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        if (queueState?.canUndo) {
          handleUndo();
        }
        return;
      }

      // / → Focus patient name input
      if (e.key === '/') {
        e.preventDefault();
        nameInputRef.current?.focus();
        return;
      }

      // B → Toggle doctor break
      if (e.key === 'b' || e.key === 'B') {
        setDoctorStatus(!isOnBreak);
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCallingNext, queueState?.canUndo, isOnBreak]);

  return (
    <div className="receptionist">
      {/* Clay background blobs */}
      <div className="clay-canvas" aria-hidden="true">
        <div className="clay-blob clay-blob--teal" />
        <div className="clay-blob clay-blob--violet" />
        <div className="clay-blob clay-blob--amber" />
      </div>

      {/* ── Header ── */}
      <header className="receptionist__header">
        <div className="receptionist__header-left">
          <h1 className="receptionist__title" style={{ fontFamily: 'var(--font-heading)' }}>
            <span className="receptionist__logo">🏥</span>
            Queue Cure
          </h1>
          <p className="receptionist__subtitle">Receptionist Console</p>
        </div>
        <ConnectionStatus isConnected={isConnected} />
      </header>

      <Toast action={lastAction} onDismiss={clearLastAction} />

      <div className="receptionist__layout">
        {/* ── Left Column: Actions ── */}
        <div className="receptionist__actions-col">
          {/* Currently Serving Card */}
          <div className="card card--serving">
            <h2 className="card__heading">Currently Serving</h2>
            {currentToken ? (
              <div className="serving-display">
                <span className="serving-display__token">#{currentToken.tokenNumber}</span>
                <span className="serving-display__name">{currentToken.name}</span>
                <span className="consultation-timer">
                  ⏱ {formatElapsed(elapsedSeconds)}
                </span>
              </div>
            ) : (
              <div className="serving-display serving-display--empty">
                <span className="serving-display__empty-text">No patient being served</span>
              </div>
            )}
            
            {/* Today's Flow Strip */}
            <div className="flow-strip">
              <div className="flow-strip__label">Today's Flow</div>
              <div className="flow-strip__track">
                {Array.from({ length: Math.min(servedCount, 20) }).map((_, i) => (
                   <div key={`served-${i}`} className="flow-strip__dot flow-strip__dot--served" />
                ))}
                {servedCount > 20 && <span className="flow-strip__plus">+</span>}
                
                {Array.from({ length: Math.min(waitingCount, 20) }).map((_, i) => (
                   <div key={`waiting-${i}`} className="flow-strip__dot flow-strip__dot--waiting" />
                ))}
                {waitingCount > 20 && <span className="flow-strip__plus">+</span>}
              </div>
              <div className="flow-strip__counts">
                <span>{servedCount} Served</span>
                <span>{waitingCount} Waiting</span>
              </div>
            </div>
          </div>

          {/* Call Next + Undo */}
          <div className="card card--call-actions">
            <button
              id="btn-call-next"
              className={`btn btn--call-next ${isCallingNext ? 'btn--loading' : ''} ${isOnBreak ? 'btn--paused' : ''}`}
              onClick={handleCallNext}
              disabled={isCallingNext || !isConnected || isOnBreak}
            >
              {isCallingNext ? (
                <>
                  <span className="btn__spinner" />
                  Calling…
                </>
              ) : isOnBreak ? (
                <>
                  <span className="btn__icon">⏸️</span>
                  Queue Paused
                </>
              ) : (
                <>
                  <span className="btn__icon">📢</span>
                  Call Next
                  <kbd>Space</kbd>
                </>
              )}
            </button>
            <button
              id="btn-undo"
              className="btn btn--undo"
              onClick={handleUndo}
              disabled={!canUndo || !isConnected}
            >
              ↩ Undo Last Call <kbd>⌘Z</kbd>
            </button>
            <button
              className={`btn btn--break-toggle ${isOnBreak ? 'btn--break-toggle--active' : ''}`}
              onClick={() => setDoctorStatus(!isOnBreak)}
              title={isOnBreak ? 'Click to end break and resume queue' : 'Click to pause queue for a short break'}
            >
              <span className="btn__icon">{isOnBreak ? '▶️' : '⏸️'}</span>
              {isOnBreak ? 'End Break' : 'Start Break'}
              <kbd>B</kbd>
            </button>
          </div>

          {/* Add Patient Form */}
          <div className="card">
            <h2 className="card__heading">Add Patient</h2>
            <form className="add-patient-form" onSubmit={handleAddPatient}>
              <input
                ref={nameInputRef}
                id="input-patient-name"
                className="input"
                type="text"
                placeholder="Patient name"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                autoComplete="off"
                required
              />
              <button
                id="btn-add-patient"
                className="btn btn--primary"
                type="submit"
                disabled={!patientName.trim() || !isConnected}
              >
                + Add to Queue
              </button>
            </form>
          </div>

          {/* Set Avg Consult Time */}
          <div className="card card--settings">
            <h2 className="card__heading">Settings</h2>
            <form className="settings-form" onSubmit={handleSetTime}>
              <label className="settings-form__label" htmlFor="input-avg-time">
                Avg. Consultation Time (fallback)
              </label>
              <div className="settings-form__row">
                <input
                  id="input-avg-time"
                  className="input input--small"
                  type="number"
                  min="1"
                  max="120"
                  placeholder={queueState?.avgConsultMinutes ?? 10}
                  value={consultMinutes}
                  onChange={(e) => setConsultMinutes(e.target.value)}
                />
                <span className="settings-form__unit">min</span>
                <button
                  id="btn-set-time"
                  className="btn btn--secondary"
                  type="submit"
                  disabled={!consultMinutes || Number(consultMinutes) < 1}
                >
                  Set
                </button>
              </div>
            </form>
            <div className="settings-form__info">
              Current avg: <strong>{queueState?.avgConsultMinutes ?? '—'} min</strong>
              {queueState?.estimatedWaitMinutes !== undefined && (
                <> · Est. total wait: <strong>{queueState.estimatedWaitMinutes} min</strong></>
              )}
            </div>
            <div className="settings-form__info" style={{ marginTop: '0.35rem', fontSize: '0.78rem' }}>
              {(() => {
                const n = queueState?.realDataPoints ?? 0;
                if (n === 0) return <span style={{ color: 'var(--color-text-muted)' }}>📋 Using manual fallback (no real data yet)</span>;
                if (n === 1) return <span style={{ color: 'var(--color-amber)' }}>📊 Based on 1 real consultation</span>;
                if (n < 5) return <span style={{ color: 'var(--color-amber)' }}>📊 Based on {n} real consultations</span>;
                return <span style={{ color: 'var(--color-success)' }}>✅ Full data — rolling avg of last 5 consultations</span>;
              })()}
            </div>
            
            <div className="settings__reset-section">
              <p className="settings__reset-label">End of day</p>
              <button
                className="btn--reset"
                onClick={() => resetSession()}
                title="Clear all patients and history for a fresh start"
              >
                🔄 Reset Session
              </button>
            </div>
          </div>
        </div>

        {/* ── Right Column: Queue List ── */}
        <div className="receptionist__queue-col">
          {/* Queue Flow Lane */}
          <div className="card card--flow">
            <h2 className="card__heading" style={{ marginBottom: '0.5rem', fontFamily: 'var(--font-heading)' }}>Queue Flow</h2>
            <div className="flow-lane">
              {flowTokens.length > 0 ? flowTokens.map(token => (
                <div 
                  key={token.id} 
                  className={`flow-chip ${token.exiting ? 'flow-chip--exit' : 'flow-chip--enter'}`}
                >
                  #{token.tokenNumber}
                </div>
              )) : (
                <span className="flow-lane__empty">Empty</span>
              )}
            </div>
          </div>

          <div className="card card--queue">
            <h2 className="card__heading" style={{ fontFamily: 'var(--font-heading)' }}>
              Waiting List
              <span className="card__badge">{waitingCount}</span>
            </h2>
            <QueueList
              tokens={queueState?.waitingTokens}
              emptyMessage="No patients waiting"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
