import { ArrowUpRight, Bot, CalendarPlus, Clock3, PencilLine, SmilePlus } from 'lucide-react';
import { Link } from 'react-router-dom';

const actions = [
  { title: 'Log a period', text: 'Add a cycle record', icon: CalendarPlus, to: '/cycle-tracker', style: 'action-pink' },
  { title: 'View calendar', text: 'See your cycle dates', icon: Clock3, to: '/cycle-tracker', style: 'action-lavender' },
  { title: 'Cycle history', text: 'Review past records', icon: ArrowUpRight, to: '/cycle-tracker#history', style: 'action-peach' },
  { title: 'Update cycle information', text: 'Adjust your averages', icon: PencilLine, to: '/cycle-tracker', state: { openPreferences: true }, style: 'action-mist' },
  { title: 'Log symptoms', text: 'Add a daily check-in', icon: SmilePlus, to: '/symptoms', style: 'action-peach' },
  { title: 'Ask the health assistant', text: 'Explore reviewed health information', icon: Bot, to: '/ai-assistant', style: 'action-mist' },
];

function QuickActions() {
  return (
    <section className="dashboard-section">
      <div className="section-heading">
        <div><span className="section-eyebrow">MAKE IT YOURS</span><h2>Quick actions</h2></div>
      </div>
      <div className="quick-actions-grid">
        {actions.map(({ title, text, icon: Icon, to, state, style }) => (
          <Link className={`quick-action-card ${style}`} key={title} to={to} state={state}>
            <span className="quick-action-icon"><Icon size={19} /></span>
            <span className="quick-action-copy"><strong>{title}</strong><small>{text}</small></span>
            <ArrowUpRight className="quick-action-arrow" size={16} />
          </Link>
        ))}
      </div>
    </section>
  );
}

export default QuickActions;
