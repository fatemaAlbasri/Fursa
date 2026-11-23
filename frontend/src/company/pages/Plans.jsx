import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../shared/api.js'
import { formatSalary } from '../../shared/utils/jobFormat.js'
import { planTagline, isPopular, planFeatures } from '../data/plans.js'
import Notice from '../../shared/components/Notice.jsx'

// Change plan page
// free plan switches straight away, paid plans go to the payment page

const priceText = (plan) =>
  plan.price_bhd ? formatSalary(plan.price_bhd) : 'Free'

export default function Plans() {
  const navigate = useNavigate()

  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentId, setCurrentId] = useState(null)
  const [picked, setPicked] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    api('/plans')
      .then((data) => setPlans(data.plans))
      .catch((err) =>
        setNotice({
          type: 'error',
          text: err.error || 'Could not load the plans.'
        })
      )
      .finally(() => setLoading(false))
    api('/plans/mine')
      .then((data) => {
        setCurrentId(data.plan.id)
        setPicked(data.plan.id)
      })
      .catch(() => {}) // no plan yet
  }, [])

  const selected = plans.find((p) => p.id === picked)

  const start = async () => {
    if (selected.price_bhd > 0)
      return navigate(`/company/payment/${selected.id}`)

    setBusy(true)
    setNotice(null)
    try {
      await api('/plans/subscribe', {
        method: 'POST',
        body: { planId: selected.id }
      })
      setCurrentId(selected.id)
      setNotice({
        type: 'success',
        text: `You are now on the ${selected.name} plan.`
      })
    } catch (err) {
      setNotice({
        type: 'error',
        text: err.error || 'Could not change the plan. Try again.'
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="container container--wide">
      <div className="page-head center">
        <h1 className="title">Choose your plan</h1>
        <p className="muted">
          Start free. Upgrade when you want AI ranking. Change or cancel any
          time.
        </p>
      </div>

      <Notice notice={notice} onClose={() => setNotice(null)} />
      {loading && (
        <div className="plans plans--loading" role="status" aria-label="Loading plans">
          {[0, 1, 2].map((i) => (
            <div key={i} className="plan" aria-hidden="true">
              <span className="sk sk--line" style={{ width: '40%' }} />
              <span className="sk sk--line sk--thin" style={{ width: '70%' }} />
              <span className="sk plan-sk-price" />
              {[80, 65, 75, 55].map((w) => (
                <span key={w} className="sk sk--line sk--thin" style={{ width: `${w}%` }} />
              ))}
              <span className="sk plan-sk-btn" />
            </div>
          ))}
        </div>
      )}

      <div className="plans" role="radiogroup" aria-label="Plans">
        {plans.map((p) => {
          const active = p.id === picked
          return (
            <div
              key={p.id}
              className={`plan ${active ? 'plan--active' : ''}`}
              onClick={() => setPicked(p.id)}
            >
              {isPopular(p) && (
                <span className="plan__badge">Most popular</span>
              )}
              <h3 className="plan__name">{p.name}</h3>
              <p className="plan__tagline">{planTagline(p)}</p>
              <p className="plan__price">
                {priceText(p)} {p.price_bhd > 0 && <span>/ month</span>}
              </p>
              <ul className="plan__list">
                {planFeatures(p).map(([text, included]) => (
                  <li key={text} className={included ? '' : 'plan__no'}>
                    <span className="plan__tick">{included ? '✓' : '–'}</span>
                    {text}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                role="radio"
                aria-checked={active}
                className={`btn btn--block ${active ? 'btn--white' : 'btn--outline'}`}
                onClick={() => setPicked(p.id)}
              >
                {p.id === currentId
                  ? 'Current plan'
                  : active
                    ? 'Selected'
                    : `Choose ${p.name}`}
              </button>
            </div>
          )
        })}
      </div>

      {/* selected plan + start button */}
      {selected && (
        <div className="plan-bar">
          <p key={picked} className="swap">
            <b>
              Selected: {selected.name} · {priceText(selected)}
              {selected.price_bhd > 0 && ' / month'}
            </b>
          </p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={start}
            disabled={busy || picked === currentId}
          >
            {picked === currentId
              ? 'This is your plan'
              : selected.price_bhd > 0
                ? 'Pay & Start'
                : 'Start free'}
          </button>
        </div>
      )}
    </main>
  )
}
