import { Bell, ChevronRight, Menu } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getInitials } from '../../utils/dateUtils';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/cycle-tracker': 'Cycle calendar',
  '/symptoms': 'Symptoms & mood',
  '/insights': 'Insights',
  '/settings': 'Settings',
  '/reminders': 'Reminders',
  '/resources': 'Resources',
  '/ai-assistant': 'AI assistant',
};

function DashboardHeader({ user, onMenuClick, onToggleCollapse, collapsed }) {
  const firstName = user?.fullName?.trim().split(/\s+/)[0] || 'there';
  const location = useLocation();
  const pageTitle = pageTitles[location.pathname] || (location.pathname.startsWith('/resources/') ? 'Resource detail' : 'FlowCare');
  const [today] = useState(() => new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date()));

  return (
    <header className="dashboard-header">
      <button className="mobile-menu-button" type="button" onClick={onMenuClick} aria-label="Open navigation">
        <Menu size={21} />
      </button>
      <button
        className="desktop-sidebar-toggle"
        type="button"
        onClick={onToggleCollapse}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <Menu size={18} />
      </button>
      <div className="header-title-group">
        <p className="header-date">{today}</p>
        <nav className="header-breadcrumb" aria-label="Breadcrumb">
          <Link to="/dashboard">Home</Link><ChevronRight size={14} /><h1>{pageTitle}</h1>
          {location.pathname === '/dashboard' && <span className="header-greeting">Good to see you, {firstName}</span>}
        </nav>
      </div>
      <div className="header-tools">
        <Link className="icon-button notification-button" to="/reminders" aria-label="Open reminders">
          <Bell size={18} />
        </Link>
        <div className="user-avatar" aria-label={`Profile for ${user?.fullName || 'user'}`}>
          {getInitials(user?.fullName)}
        </div>
      </div>
    </header>
  );
}

export default DashboardHeader;
