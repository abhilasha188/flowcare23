import {
  Activity,
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  ChartNoAxesCombined,
  CircleUserRound,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
} from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';

const availableLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/cycle-tracker', label: 'Cycle tracker', icon: CalendarDays },
  { to: '/symptoms', label: 'Symptoms', icon: Activity },
  { to: '/insights', label: 'Insights', icon: ChartNoAxesCombined },
  { to: '/reminders', label: 'Reminders', icon: Bell },
  { to: '/resources', label: 'Resources', icon: BookOpen },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const futureLinks = [
  { label: 'AI assistant', icon: Bot },
];

function Sidebar({ open, onClose, onLogout, logoutBusy, logoutError }) {
  return (
    <>
      {open && <button className="sidebar-scrim" type="button" aria-label="Close navigation" onClick={onClose} />}
      <aside className={`app-sidebar${open ? ' is-open' : ''}`} aria-label="Main navigation">
        <Link className="app-brand" to="/dashboard" onClick={onClose}>
          <span className="brand-mark"><Activity size={20} /></span>
          <span>flowcare</span>
        </Link>
        <p className="sidebar-label">YOUR SPACE</p>
        <nav className="sidebar-nav">
          {availableLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}
              onClick={onClose}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
          <span className="sidebar-label extra-label">COMING SOON</span>
          {futureLinks.map(({ label, icon: Icon }) => (
            <span className="sidebar-link is-disabled" key={label} aria-disabled="true" title={`${label} coming soon`}>
              <Icon size={18} />
              <span>{label}</span>
              <span className="soon-dot" aria-label="Coming soon">·</span>
            </span>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {logoutError && <p className="sidebar-error" role="alert">{logoutError}</p>}
          <button className="sidebar-link logout-link" type="button" onClick={onLogout} disabled={logoutBusy}>
            <LogOut size={18} />
            <span>{logoutBusy ? 'Signing out…' : 'Sign out'}</span>
          </button>
          <div className="sidebar-private"><CircleUserRound size={15} /> Private, just for you</div>
        </div>
        <div className="sidebar-sparkle" aria-hidden="true"><Sparkles size={16} /></div>
      </aside>
    </>
  );
}

export default Sidebar;
