function StatisticsCard({ icon: Icon, label, value, suffix = '', detail, tone = 'pink' }) {
  return (
    <article className={`stat-card tone-${tone}`}>
      <div className="stat-top">
        <span className="stat-icon"><Icon size={18} /></span>
        <span className="stat-label">{label}</span>
      </div>
      <p className="stat-value">
        {value ?? '—'}
        {value != null && suffix && <span>{suffix}</span>}
      </p>
      {detail && <p className="stat-detail">{detail}</p>}
    </article>
  );
}

export default StatisticsCard;
