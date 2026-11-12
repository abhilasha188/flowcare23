import { ArrowRight, CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import EmptyState from '../common/EmptyState';
import { formatDate, getDateRange } from '../../utils/dateUtils';

function RecentCycles({ cycles = [] }) {
  return (
    <section className="dashboard-panel recent-cycles-panel">
      <div className="panel-heading">
        <div><span className="section-eyebrow">YOUR HISTORY</span><h2>Recent periods</h2></div>
        <Link className="panel-link" to="/cycle-tracker#history">View all <ArrowRight size={15} /></Link>
      </div>
      {!cycles.length ? (
        <EmptyState
          title="Your history starts here"
          description="Once you log a period, your recent records will appear here."
          action={<Link className="text-link" to="/cycle-tracker">Add your first period</Link>}
        />
      ) : (
        <div className="recent-cycle-list">
          {cycles.map((cycle) => {
            const duration = cycle.endDate ? getDateRange(cycle.startDate, cycle.endDate).length : null;
            return (
              <article className="recent-cycle-row" key={cycle._id}>
                <span className="recent-cycle-icon"><CalendarDays size={17} /></span>
                <div className="recent-cycle-dates">
                  <strong>{formatDate(cycle.startDate)}</strong>
                  <span>{cycle.endDate ? `Ended ${formatDate(cycle.endDate, { month: 'short', day: 'numeric' })}` : 'Ongoing period'}</span>
                </div>
                <div className="recent-cycle-meta">
                  <span>{duration ? `${duration} days` : 'In progress'}</span>
                  {cycle.cycleLength && <small>{cycle.cycleLength}-day cycle</small>}
                  <small>{cycle.flowIntensity ? `${cycle.flowIntensity} flow` : 'Flow not noted'}</small>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default RecentCycles;
