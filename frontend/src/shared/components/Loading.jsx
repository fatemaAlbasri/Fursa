import '../styles/Loading.css';

// Page loading
export default function Loading({ text = 'Loading…' }) {
  return (
    <div className="loading" role="status">
      <span className="loading__spinner" aria-hidden="true" />
      {text}
    </div>
  );
}

// Button loading 
export function ButtonSpinner() {
  return <span className="loading__spinner loading__spinner--small" aria-hidden="true" />;
}
