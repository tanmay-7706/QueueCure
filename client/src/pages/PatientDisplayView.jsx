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
  const prevTokenRef = useRef(null);

  // Pulse animation when current token changes
  useEffect(() => {
    const currentTokenNum = queueState?.currentToken?.tokenNumber;
    if (prevTokenRef.current !== null && currentTokenNum !== prevTokenRef.current) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 600);
      return () => clearTimeout(timer);
    }
    prevTokenRef.current = currentTokenNum ?? null;
  }, [queueState?.currentToken?.tokenNumber]);

  const toggleLang = () => {
    setLang((prev) => (prev === 'en' ? 'hi' : 'en'));
  };

  const currentToken = queueState?.currentToken;
  const waitingTokens = queueState?.waitingTokens ?? [];
  const next3 = waitingTokens.slice(0, 3);
  const estimatedWait = queueState?.estimatedWaitMinutes ?? 0;

  return (
    <div className="display">
      {/* ── Header Bar ── */}
      <header className="display__header">
        <div className="display__header-left">
          <h1 className="display__title">
            <span className="display__logo">🏥</span>
            Queue Cure
          </h1>
        </div>
        <div className="display__header-right">
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
          {currentToken ? (
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
        </div>
      </main>
    </div>
  );
}
