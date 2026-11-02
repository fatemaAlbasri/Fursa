import '../styles/StatusPill.css';

const STATUS_PILL = {
  New: 'status-pill--new',
  Shortlisted: 'status-pill--shortlisted',
  Interview: 'status-pill--interview',
  Accepted: 'status-pill--accepted',
  Rejected: 'status-pill--rejected',
};

export default function StatusPill({ status }) {
  return <span className={`status-pill ${STATUS_PILL[status] ?? ''}`}>{status}</span>;
}
