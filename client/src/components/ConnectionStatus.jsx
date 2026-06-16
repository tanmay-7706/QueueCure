/**
 * ConnectionStatus.jsx — Shows socket connection state.
 *
 * Small indicator badge showing Connected / Disconnected / Reconnecting.
 */

export default function ConnectionStatus({ isConnected }) {
  return (
    <div className={`connection-status ${isConnected ? 'connection-status--online' : 'connection-status--offline'}`}>
      <span className="connection-status__dot" />
      <span className="connection-status__label">
        {isConnected ? 'Live' : 'Reconnecting…'}
      </span>
    </div>
  );
}
