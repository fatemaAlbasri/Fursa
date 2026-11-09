import ConfirmDialog from '../../../shared/components/ConfirmDialog.jsx'
import { formatBhd } from '../../utils/cvFormat.js'

// Confirms the simulated payment for the Advanced report. price = review.reportPrice from the backend.
export default function UnlockDialog({ open, price, busy, onConfirm, onCancel }) {
  if (!price) return null
  return (
    <ConfirmDialog
      open={open}
      title="Unlock the Advanced report"
      confirmLabel={`Pay BHD ${formatBhd(price.totalBhd)}`}
      busy={busy}
      onConfirm={onConfirm}
      onCancel={onCancel}
      message={
        <span className="cvo-price">
          <span className="cvo-price__intro">
            See every rewrite, accept the ones you want and download the full PDF report.
          </span>
          <span className="cvo-price__row">
            <span>Subtotal</span>
            <span>BHD {formatBhd(price.subtotalBhd)}</span>
          </span>
          <span className="cvo-price__row">
            <span>VAT</span>
            <span>BHD {formatBhd(price.vatBhd)}</span>
          </span>
          <span className="cvo-price__row cvo-price__row--total">
            <span>Total</span>
            <span>BHD {formatBhd(price.totalBhd)}</span>
          </span>
          <span className="cvo-price__note">
            This is a simulated payment: no card details are needed and you won't be charged.
          </span>
        </span>
      }
    />
  )
}
