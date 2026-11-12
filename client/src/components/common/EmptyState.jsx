function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-mark" aria-hidden="true">✦</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export default EmptyState;
