/**
 * PatientDisplayView.jsx — Screen 2: Patient Waiting-Room Display (/display).
 *
 * Designed for a large TV-style display in a waiting room.
 * Features:
 * - Current token being served (6–10rem, center-stage, pulse on change)
 * - Next 3 tokens in queue
 * - Estimated wait time for the next token
 * - Language toggle (English/Hindi)
 * - Pure socket push — no polling, no timers
 */

import { useState, useEffect, useRef } from 'react';
import { useQueueSocket } from '../hooks/useQueueSocket';
import ConnectionStatus from '../components/ConnectionStatus';
import { t } from '../lib/i18n';

export default function PatientDisplayView() {
  const { queueState, isConnected } = useQueueSocket();
  const [lang, setLang] = useState('en');
  const [isPulsing, setIsPulsing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const prevTokenRef = useRef(null);

  // Live Digital Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Pulse animation when current token changes
  useEffect(() => {
    const currentTokenNum = queueState?.currentToken?.tokenNumber;
    if (prevTokenRef.current !== null && currentTokenNum !== prevTokenRef.current && queueState?.currentToken) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 600);
      return () => clearTimeout(timer);
    }
    prevTokenRef.current = currentTokenNum ?? null;
  }, [queueState?.currentToken]);

  const toggleLang = () => {
    setLang((prev) => (prev === 'en' ? 'hi' : 'en'));
  };

  const currentToken = queueState?.currentToken;
  const waitingTokens = queueState?.waitingTokens ?? [];
  const next3 = waitingTokens.slice(0, 3);
  const estimatedWait = queueState?.estimatedWaitMinutes ?? 0;
  const isOnBreak = queueState?.isOnBreak ?? false;

  return (
    <div className="display">
      {/* Clay accent blob */}
      <div className="clay-canvas" aria-hidden="true" style={{zIndex: 0}}>
        <div className="clay-blob clay-blob--teal" style={{opacity: 0.15, filter: 'blur(90px)'}} />
      </div>
      {/* Ambient background glows */}
      <div className="display__ambient-glow display__ambient-glow--1" />
      <div className="display__ambient-glow display__ambient-glow--2" />

      {/* ── Header Bar ── */}
      <header className="display__header">
        <div className="display__header-left">
          <h1 className="display__title">
            <span className="display__logo">🏥</span>
            Queue Cure
          </h1>
        </div>
        <div className="display__header-right">
          <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginRight: '1rem', letterSpacing: '0.05em' }}>
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <ConnectionStatus isConnected={isConnected} />
          <button
            id="btn-lang-toggle"
            className="btn btn--lang"
            onClick={toggleLang}
          >
            {t(lang, 'langToggle')}
          </button>
        </div>
      </header>

      <main className="display__main">
        {/* ── Now Serving ── */}
        <section className="display__serving-section">
          <h2 className="display__label">{t(lang, 'nowServing')}</h2>
          {isOnBreak ? (
            <div className="display__break-overlay">
              <span className="display__break-icon">⏸️</span>
              <p className="display__break-message">{t(lang, 'breakMessage')}</p>
              <p className="display__break-subtext">{t(lang, 'breakSubtext')}</p>
            </div>
          ) : currentToken ? (
            <div className={`display__current-token ${isPulsing ? 'display__current-token--pulse' : ''}`}>
              <span className="display__token-number">#{currentToken.tokenNumber}</span>
              <span className="display__token-name">{currentToken.name}</span>
            </div>
          ) : (
            <div className="display__current-token display__current-token--empty">
              <span className="display__empty-text">{t(lang, 'noOneServing')}</span>
            </div>
          )}
        </section>

        {/* ── Bottom Info Row ── */}
        <div className="display__info-row">
          {/* Up Next */}
          <section className="display__next-section">
            <h2 className="display__label">{t(lang, 'upNext')}</h2>
            {next3.length > 0 ? (
              <div className="display__next-list">
                {next3.map((token, i) => (
                  <div className="display__next-card" key={token.id}>
                    <span className="display__next-number">#{token.tokenNumber}</span>
                    <span className="display__next-name">{token.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="display__empty-sub">{t(lang, 'queueEmpty')}</p>
            )}
          </section>

          {/* Wait Info */}
          {isOnBreak ? null : (
          <section className="display__wait-section">
            <h2 className="display__label">{t(lang, 'estimatedWait')}</h2>
            <div className="display__wait-value">
              <span className="display__wait-number">
                {waitingTokens.length > 0 ? Math.ceil(estimatedWait) : 0}
              </span>
              <span className="display__wait-unit">{t(lang, 'minutes')}</span>
            </div>
            <p className="display__wait-count">
              {waitingTokens.length} {t(lang, 'patientsWaiting')}
            </p>
          </section>
          )}
        </div>
      </main>

      {/* Connection Blur Overlay */}
      {!isConnected && (
         <div className="display__offline-overlay">
            <div className="display__offline-box">
               <span style={{ fontSize: '2rem' }}>📡</span>
               <h2>Connection Lost</h2>
               <p>Reconnecting to the clinic server...</p>
            </div>
         </div>
      )}
    </div>
  );
}
