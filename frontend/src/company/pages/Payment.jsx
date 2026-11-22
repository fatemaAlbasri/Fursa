import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../shared/api.js'
import Notice from '../../shared/components/Notice.jsx'
import Loading from '../../shared/components/Loading.jsx'
import PaymentForm, { PaymentDone } from '../components/PaymentForm.jsx'

// Payment page for a plan (upgrading from the Plans page)
export default function Payment() {
  const { planId } = useParams()
  const navigate = useNavigate()

  const [plan, setPlan] = useState(null)
  const [company, setCompany] = useState('')
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)
  const [payment, setPayment] = useState(null)

  useEffect(() => {
    api('/plans')
      .then((data) => {
        const found = data.plans.find((p) => p.id === Number(planId))
        if (!found)
          return setNotice({ type: 'error', text: 'This plan does not exist.' })
        // free plan doesn't need payment
        if (!found.price_bhd)
          return navigate('/company/plans', { replace: true })
        setPlan(found)
      })
      .catch((err) =>
        setNotice({
          type: 'error',
          text: err.error || 'Could not load the plan.'
        })
      )
    api('/auth/me')
      .then(({ user }) => setCompany(user.company?.name || ''))
      .catch(() => {})
  }, [planId, navigate])

  const pay = async ({ emailReceipt }) => {
    setBusy(true)
    setNotice(null)
    try {
      const data = await api('/plans/subscribe', {
        method: 'POST',
        body: { planId: plan.id, method: 'card', emailReceipt }
      })
      setPayment(data.payment)
    } catch (err) {
      setNotice({
        type: 'error',
        text: err.error || 'Could not pay. Try again.'
      })
    } finally {
      setBusy(false)
    }
  }

  if (payment) {
    return (
      <main className="container pay">
        <PaymentDone plan={plan} payment={payment} />
      </main>
    )
  }

  return (
    <main className="container pay">
      <Notice notice={notice} onClose={() => setNotice(null)} />
      {!plan && !notice && <Loading text="Loading your order…" />}
      {plan && (
        <PaymentForm plan={plan} company={company} busy={busy} onPay={pay} />
      )}
    </main>
  )
}
