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

import { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'react-qr-code';
import { useQueueSocket } from '../hooks/useQueueSocket';
import ConnectionStatus from '../components/ConnectionStatus';
import { t } from '../lib/i18n';

export default function PatientDisplayView() {
  const { queueState, isConnected } = useQueueSocket();
  const [lang, setLang] = useState('en');
  const [isPulsing, setIsPulsing] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const prevTokenRef = useRef(null);

  // Simple synthesized chime
  const playChime = useCallback(() => {
    if (!audioEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.type = 'sine';
      // Ding
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      // Dong
      osc.frequency.setValueAtTime(523.25, ctx.currentTime + 0.2); // C5
      gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1);
    } catch (e) {
      console.warn("AudioContext failed:", e);
    }
  }, [audioEnabled]);

  const announceToken = useCallback((token) => {
    if (!audioEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Cancel any ongoing speech
    
    let text = "";
    if (lang === 'en') {
      text = `Token number ${token.tokenNumber}, ${token.name}, please proceed.`;
    } else {
      // Very basic phonetic Hindi phrase for English TTS engines
      text = `Token number ${token.tokenNumber}, ${token.name}, kripaya aage badhein.`;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    // Add a slight delay to let the chime finish
    setTimeout(() => {
        window.speechSynthesis.speak(utterance);
    }, 1000);
  }, [audioEnabled, lang]);

  // Pulse animation & Audio announcement when current token changes
  useEffect(() => {
    const currentTokenNum = queueState?.currentToken?.tokenNumber;
    if (prevTokenRef.current !== null && currentTokenNum !== prevTokenRef.current && queueState?.currentToken) {
      setIsPulsing(true);
      playChime();
      announceToken(queueState.currentToken);
      const timer = setTimeout(() => setIsPulsing(false), 600);
      return () => clearTimeout(timer);
    }
    prevTokenRef.current = currentTokenNum ?? null;
  }, [queueState?.currentToken, playChime, announceToken]);

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
          {!audioEnabled && (
            <button 
              className="btn btn--secondary" 
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', marginRight: '0.5rem' }}
              onClick={() => setAudioEnabled(true)}
            >
              🔊 Enable Audio
            </button>
          )}
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

          {/* QR Code */}
          <section className="display__qr-section" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
             <h2 className="display__label">Track on Mobile</h2>
             <div style={{ background: 'white', padding: '10px', borderRadius: '12px' }}>
                <QRCode value={window.location.href} size={100} />
             </div>
          </section>
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
