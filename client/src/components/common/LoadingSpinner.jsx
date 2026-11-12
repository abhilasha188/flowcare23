function LoadingSpinner({ label = 'Loading data…', compact = false }) {
  return (
    <div className={`loading-state${compact ? ' is-compact' : ''}`} role="status">
      <span className="loading-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export default LoadingSpinner;
