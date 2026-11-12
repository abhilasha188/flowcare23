import {
  Activity,
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  ChevronLeft,
  ChartNoAxesCombined,
  CircleUserRound,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { getInitials } from '../../utils/dateUtils';

const navigationSections = [
  { label: 'OVERVIEW', links: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  { label: 'TRACK', links: [
    { to: '/cycle-tracker', label: 'Cycle calendar', icon: CalendarDays },
    { to: '/symptoms', label: 'Symptoms & mood', icon: Activity },
    { to: '/insights', label: 'Insights', icon: ChartNoAxesCombined },
  ] },
  { label: 'WELLNESS', links: [
    { to: '/ai-assistant', label: 'AI assistant', icon: Bot },
    { to: '/reminders', label: 'Reminders', icon: Bell },
    { to: '/resources', label: 'Resources', icon: BookOpen },
  ] },
  { label: 'ACCOUNT', links: [{ to: '/settings', label: 'Profile & settings', icon: CircleUserRound }] },
];

function Sidebar({ open, onClose, collapsed, onToggleCollapse, user, onLogout, logoutBusy, logoutError }) {
  const firstName = user?.fullName?.trim().split(/\s+/)[0] || 'Your account';
  return (
    <>
      {open && <button className="sidebar-scrim" type="button" aria-label="Close navigation" onClick={onClose} />}
      <aside className={`app-sidebar${open ? ' is-open' : ''}${collapsed ? ' is-collapsed' : ''}`} aria-label="Main navigation">
        <div className="sidebar-brand-row">
          <Link className="app-brand" to="/dashboard" onClick={onClose} title="FlowCare home">
          <span className="brand-mark"><Activity size={20} /></span>
          <span>flowcare</span>
          </Link>
          <button
            className="sidebar-collapse-button"
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>
        <nav className="sidebar-navigation" aria-label="Primary">
          {navigationSections.map(({ label: section, links }) => (
            <section className="sidebar-section" key={section}>
              <p className="sidebar-label">{section}</p>
              <div className="sidebar-nav">
                {links.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}
                    onClick={onClose}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>
            </section>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {logoutError && <p className="sidebar-error" role="alert">{logoutError}</p>}
          <button className="sidebar-link logout-link" type="button" onClick={onLogout} disabled={logoutBusy} title={collapsed ? 'Sign out' : undefined}>
            <LogOut size={18} />
            <span>{logoutBusy ? 'Signing out…' : 'Sign out'}</span>
          </button>
          <Link className="sidebar-profile" to="/settings" onClick={onClose} title={collapsed ? firstName : undefined}>
            <span className="user-avatar sidebar-avatar">{getInitials(user?.fullName)}</span>
            <span className="sidebar-profile-copy"><strong>{firstName}</strong><small>Account settings</small></span>
            <ChevronLeft className="sidebar-profile-chevron" size={15} />
          </Link>
          <div className="sidebar-private"><CircleUserRound size={15} /><span>Private, just for you</span></div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
