/**
 * ConnectionStatus.jsx — Shows socket connection state.
 *
 * Small indicator badge showing Connected / Disconnected / Reconnecting.
 */

export default function ConnectionStatus({ isConnected }) {
  return (
    <div className={`connection-status ${isConnected ? 'connection-status--online' : 'connection-status--offline'}`}>
      <svg className="connection-status__ecg" viewBox="0 0 24 10" preserveAspectRatio="none">
        <polyline
          points="0,5 6,5 8,1 12,9 14,5 24,5"
          fill="none"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="connection-status__label">
        {isConnected ? 'Live' : 'Reconnecting…'}
      </span>
    </div>
  );
}
