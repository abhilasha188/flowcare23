import { Bell, Menu } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getInitials } from '../../utils/dateUtils';

function DashboardHeader({ user, onMenuClick }) {
  const firstName = user?.fullName?.trim().split(/\s+/)[0] || 'there';
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
      <div>
        <p className="header-date">{today}</p>
        <h1>Good to see you, {firstName}</h1>
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
