/**
 * QueueList.jsx — Ordered list of waiting patients with token numbers.
 *
 * Used in the Receptionist Console to show the current queue.
 * Clean card-based layout, not a dense data table.
 */

export default function QueueList({ tokens, emptyMessage }) {
  if (!tokens || tokens.length === 0) {
    return (
      <div className="queue-list queue-list--empty">
        <div className="queue-list__empty-state">
          <span className="queue-list__empty-icon">📋</span>
          <p>{emptyMessage || 'No patients waiting'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="queue-list">
      {tokens.map((token, index) => (
        <div className="queue-list__item" key={token.id}>
          <div className="queue-list__position">{index + 1}</div>
          <div className="queue-list__token-badge">#{token.tokenNumber}</div>
          <div className="queue-list__name">{token.name}</div>
        </div>
      ))}
    </div>
  );
}
