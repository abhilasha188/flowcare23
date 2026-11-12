function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton" aria-label="Loading dashboard">
      <div className="skeleton-block skeleton-overview" />
      <div className="skeleton-stats">
        {[1, 2, 3, 4].map((item) => <div className="skeleton-block" key={item} />)}
      </div>
      <div className="skeleton-columns">
        <div className="skeleton-block" />
        <div className="skeleton-block" />
      </div>
    </div>
  );
}

export default DashboardSkeleton;
