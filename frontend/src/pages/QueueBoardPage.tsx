import { useEffect, useRef, useState } from 'react';
import { clientService } from '../services/api';
import type { QueueBoard } from '../types/client';
import '../styles/queue-board.css';

const REFRESH_MS = 10_000;

function formatTime(d: Date) {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export default function QueueBoardPage() {
  const [board, setBoard] = useState<QueueBoard | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const failuresRef = useRef(0);

  // Live clock — independent of data fetches.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Poll the board. First load populates; later loads swap silently so the screen
  // never blanks out on a TV. Transient failures keep the last-known board on screen.
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await clientService.queueBoard();
        if (!active) return;
        setBoard(data);
        setUpdatedAt(new Date());
        failuresRef.current = 0;
      } catch {
        failuresRef.current += 1;
      }
    }
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => { active = false; clearInterval(id); };
  }, []);

  if (!board) {
    return (
      <div className="pacu-board-loading">
        <div className="spinner-border" role="status" aria-label="Loading" />
      </div>
    );
  }

  const { waiting, in_progress } = board;

  return (
    <div className="pacu-board">
      <header className="pacu-board-header">
        <div className="pacu-board-brand">
          <img src="/dole-logo.png" alt="DOLE" />
          <div className="pacu-board-brand-text">
            <span className="pacu-board-brand-republic">Republic of the Philippines</span>
            <span className="pacu-board-brand-dept">Department of Labor and Employment</span>
            <span className="pacu-board-brand-unit">Public Assistance and Complaints Unit</span>
          </div>
        </div>
        <div className="pacu-board-clock">
          <div className="pacu-board-time">{formatTime(now)}</div>
          <div className="pacu-board-date">{formatDate(now)}</div>
        </div>
      </header>

      <div className="pacu-board-body">
        {/* Now Serving */}
        <section className="pacu-board-panel">
          <div className="pacu-board-panel-head">
            <span className="pacu-board-live-dot" aria-hidden="true" />
            <span className="pacu-board-panel-title">Now Serving</span>
            <span className="pacu-board-count">{in_progress.length}</span>
          </div>
          {in_progress.length === 0 ? (
            <div className="pacu-board-empty">
              <i className="bi bi-cup-hot" aria-hidden="true" />
              <span>No client is being served right now.</span>
            </div>
          ) : (
            <div className="pacu-board-serving">
              {in_progress.map((s, i) => (
                <div className="pacu-board-serving-card" key={`${s.queue_number}-${i}`}>
                  <span className="pacu-board-serving-num">{s.queue_number}</span>
                  <span className="pacu-board-serving-meta">
                    <span className="pacu-board-serving-label">Attending</span>
                    <span className="pacu-board-serving-lawyer">Atty. {s.lawyer_name}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Waiting */}
        <section className="pacu-board-panel">
          <div className="pacu-board-panel-head">
            <span className="pacu-board-panel-title">Waiting</span>
            <span className="pacu-board-count">{waiting.length}</span>
          </div>
          {waiting.length === 0 ? (
            <div className="pacu-board-empty">
              <i className="bi bi-check2-circle" aria-hidden="true" />
              <span>No one is waiting.</span>
            </div>
          ) : (
            <div className="pacu-board-waiting">
              {waiting.map((w, i) => (
                <div
                  key={`${w.queue_number}-${i}`}
                  className={
                    'pacu-board-tile'
                    + (w.is_priority ? ' pacu-board-tile--priority' : '')
                    + (i === 0 ? ' pacu-board-tile--next' : '')
                  }
                >
                  <span className="pacu-board-tile-label">{w.is_priority ? 'PRIORITY' : 'REGULAR'}</span>
                  <span className="pacu-board-tile-num">{w.queue_number}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <footer className="pacu-board-footer">
        <div className="pacu-board-legend">
          <span className="pacu-board-legend-item">
            <span className="pacu-board-legend-swatch pacu-board-legend-swatch--priority" />
            Priority (Senior / PWD / Pregnant)
          </span>
          <span className="pacu-board-legend-item">
            <span className="pacu-board-legend-swatch pacu-board-legend-swatch--regular" />
            Regular
          </span>
        </div>
        {updatedAt && (
          <span className="pacu-board-updated">Updated {formatTime(updatedAt)}</span>
        )}
      </footer>
    </div>
  );
}
