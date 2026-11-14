import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { api } from '../../shared/api.js';
import { toNotice } from '../data/notifications.js';
import '../styles/Notifications.css';

// =====================================================================
// Notifications (/company/notifications).
// Newest first. Unread ones have a light background and a dot.
// Clicking one marks it as read and opens its page.
// =====================================================================

export default function Notifications() {
  const { setUnread } = useOutletContext(); // number on the bell (in CompanyLayout)

  // ---------- Page state ----------
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const unread = notices.filter((n) => n.unread).length;

  // ---------- Load from the backend ----------
  useEffect(() => {
    api('/notifications')
      .then((data) => {
        setNotices(data.notifications.map(toNotice));
        setUnread(data.unread);
      })
      .catch((err) => setError(err.error || 'Could not load your notifications.'))
      .finally(() => setLoading(false));
  }, []);

  // ---------- Buttons ----------
  const markAll = async () => {
    try {
      await api('/notifications/read-all', { method: 'PATCH' });
      setNotices(notices.map((n) => ({ ...n, unread: false })));
      setUnread(0);
    } catch (err) {
      setError(err.error || 'Could not mark them as read. Try again.');
    }
  };

  // Clicked one → mark it as read (the page it links to opens straight away)
  const markOne = (notice) => {
    if (!notice.unread) return;
    setNotices(notices.map((n) => (n.id === notice.id ? { ...n, unread: false } : n)));
    setUnread(unread - 1);
    api(`/notifications/${notice.id}/read`, { method: 'PATCH' }).catch(() => {});
  };

  return (
    <main className="container nt">
      {/* ---------- Title + Mark all as read ---------- */}
      <div className="nt-head">
        <div>
          <h1>Notifications</h1>
          <p className="nt-sub">{unread ? `${unread} unread` : 'You are all caught up'}</p>
        </div>
        <button type="button" className="nt-markall" onClick={markAll} disabled={unread === 0}>
          Mark all as read
        </button>
      </div>

      {error && <p className="field__error" role="alert">{error}</p>}

      {/* ---------- List ---------- */}
      <section className="nt-list">
        {notices.map((n) => {
          const content = (
            <>
              <span className="nt-icon" style={{ background: n.iconBg }}>
                <svg viewBox="0 0 24 24" fill="none" stroke={n.iconFg} strokeWidth="2" aria-hidden="true">
                  <path d={n.icon} />
                </svg>
              </span>
              <div className="nt-text">
                <b>{n.title}</b>
                <span>{n.body}</span>
                <small>{n.time}</small>
              </div>
              {n.unread && <span className="nt-dot" aria-label="Unread" />}
            </>
          );
          const className = n.unread ? 'nt-row nt-row--unread' : 'nt-row';
          // a notification with nothing to open (e.g. plan) is a button that only marks it as read
          return n.link ? (
            <Link key={n.id} to={n.link} className={className} onClick={() => markOne(n)}>{content}</Link>
          ) : (
            <button key={n.id} type="button" className={className} onClick={() => markOne(n)}>{content}</button>
          );
        })}
        {!loading && notices.length === 0 && <p className="nt-empty">No notifications yet.</p>}
      </section>
    </main>
  );
}
