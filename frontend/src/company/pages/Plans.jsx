import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../shared/api.js';
import { formatSalary } from '../../shared/utils/jobFormat.js';
import { planTagline, isPopular, planFeatures } from '../data/plans.js';
import Notice from '../../shared/components/Notice.jsx';

// =====================================================================
// Change plan (/company/plans).
// Wireframe "5 · Company payment plans". Uses the same plan cards as Sign up (.plans / .plan in index.css).
// Free → switched straight away · paid plan → Payment page.
// =====================================================================

export default function Plans() {
  const navigate = useNavigate();

  // ---------- Page state ----------
  const [plans, setPlans] = useState([]);
  const [currentId, setCurrentId] = useState(null); // the company's plan now
  const [picked, setPicked] = useState(null); // the card that is selected
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null); // { type: 'success' | 'error', text }

  // ---------- Load from the backend ----------
  useEffect(() => {
    api('/plans')
      .then((data) => setPlans(data.plans))
      .catch((err) => setNotice({ type: 'error', text: err.error || 'Could not load the plans.' }));
    api('/plans/mine')
      .then((data) => {
        setCurrentId(data.plan.id);
        setPicked(data.plan.id);
      })
      .catch(() => {}); // no plan yet → nothing is marked as current
  }, []);

  const selected = plans.find((p) => p.id === picked);

  // ---------- Button under the cards ----------
  const start = async () => {
    // paid plan → pay first
    if (selected.price_bhd > 0) return navigate(`/company/payment/${selected.id}`);

    setBusy(true);
    setNotice(null);
    try {
      await api('/plans/subscribe', { method: 'POST', body: { planId: selected.id } });
      setCurrentId(selected.id);
      setNotice({ type: 'success', text: `You are now on the ${selected.name} plan.` });
    } catch (err) {
      setNotice({ type: 'error', text: err.error || 'Could not change the plan. Try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="container container--wide">
      <div className="page-head center">
        <h1 className="title">Choose your plan</h1>
        <p className="muted">Start free. Upgrade when you want AI ranking. Change or cancel any time.</p>
      </div>

      <Notice notice={notice} onClose={() => setNotice(null)} />

      {/* ---------- Plan cards ---------- */}
      <div className="plans" role="radiogroup" aria-label="Plans">
        {plans.map((p) => {
          const active = p.id === picked;
          return (
            <div key={p.id} className={`plan ${active ? 'plan--active' : ''}`} onClick={() => setPicked(p.id)}>
              {isPopular(p) && <span className="plan__badge">Most popular</span>}
              <h3 className="plan__name">{p.name}</h3>
              <p className="plan__tagline">{planTagline(p)}</p>
              <p className="plan__price">
                {formatSalary(p.price_bhd)} <span>/ month</span>
              </p>
              <ul className="plan__list">
                {planFeatures(p).map(([text, included]) => (
                  <li key={text} className={included ? '' : 'plan__no'}>
                    <span className="plan__tick">{included ? '✓' : '–'}</span>
                    {text}
                  </li>
                ))}
              </ul>
              <button type="button" role="radio" aria-checked={active}
                className={`btn btn--block ${active ? 'btn--white' : 'btn--outline'}`} onClick={() => setPicked(p.id)}>
                {p.id === currentId ? 'Current plan' : active ? 'Selected' : `Choose ${p.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* ---------- Selected plan + Start ---------- */}
      {selected && (
        <div className="plan-bar">
          <p key={picked} className="swap">
            <b>Selected: {selected.name} · {formatSalary(selected.price_bhd)} / month</b>
          </p>
          <button type="button" className="btn btn--primary" onClick={start} disabled={busy || picked === currentId}>
            {picked === currentId ? 'This is your plan' : selected.price_bhd > 0 ? 'Pay & Start' : 'Start free'}
          </button>
        </div>
      )}
    </main>
  );
}
