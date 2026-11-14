import '../styles/statusPill.css';

const STATUS_PILL = {
  New: 'status-pill--new',
  Applied: 'status-pill--new', // job seeker's word for the same status (employers see "New")
  Shortlisted: 'status-pill--shortlisted',
  Interview: 'status-pill--interview',
  Accepted: 'status-pill--accepted',
  Rejected: 'status-pill--rejected',
};

export default function StatusPill({ status }) {
  return <span className={`status-pill ${STATUS_PILL[status] ?? ''}`}>{status}</span>;
}
