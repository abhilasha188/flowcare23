import { Activity, Bell, ChevronDown, ChevronRight, CircleUserRound, Menu, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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

function DashboardHeader({
  user,
  notifications = [],
  unreadNotificationCount = 0,
  notificationSyncError = '',
  onReadNotifications,
  onMenuClick,
  onToggleCollapse,
  collapsed,
}) {
  const firstName = user?.fullName?.trim().split(/\s+/)[0] || 'there';
  const location = useLocation();
  const notificationPanelRef = useRef(null);
  const profileMenuRef = useRef(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const pageTitle = pageTitles[location.pathname] || (location.pathname.startsWith('/resources/') ? 'Resource detail' : 'FlowCare');
  const [today] = useState(() => new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date()));

  useEffect(() => {
    if (!notificationsOpen && !profileMenuOpen) return undefined;
    function closeOnOutsideClick(event) {
      if (!notificationPanelRef.current?.contains(event.target)) setNotificationsOpen(false);
      if (!profileMenuRef.current?.contains(event.target)) setProfileMenuOpen(false);
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        setNotificationsOpen(false);
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [notificationsOpen, profileMenuOpen]);

  function toggleNotifications() {
    const opening = !notificationsOpen;
    setNotificationsOpen(opening);
    if (opening) onReadNotifications?.();
  }

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
        <div className="notification-control" ref={notificationPanelRef}>
          <button
            className={`icon-button notification-button${unreadNotificationCount ? ' has-notifications' : ''}${notificationSyncError ? ' has-notification-error' : ''}`}
            type="button"
            aria-label={notificationSyncError
              ? `Notification issue: ${notificationSyncError}`
              : unreadNotificationCount
                ? `${unreadNotificationCount} unread notifications`
                : 'Open notifications'}
            aria-expanded={notificationsOpen}
            aria-haspopup="dialog"
            onClick={toggleNotifications}
          >
            <Bell size={18} />
            {unreadNotificationCount > 0 && (
              <span className="notification-badge" aria-hidden="true">
                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
              </span>
            )}
            {notificationSyncError && unreadNotificationCount === 0 && (
              <span className="notification-error-badge" aria-hidden="true">!</span>
            )}
          </button>
          {notificationsOpen && (
            <section className="notification-panel" role="dialog" aria-label="Notifications">
              <div className="notification-panel-heading">
                <div><strong>Notifications</strong><span>{notifications.length} recent</span></div>
                <button className="notification-panel-close" type="button" onClick={() => setNotificationsOpen(false)} aria-label="Close notifications">×</button>
              </div>
              {notificationSyncError && <p className="notification-panel-error" role="alert">{notificationSyncError}</p>}
              {notifications.length === 0 ? (
                <p className="notification-panel-empty">No notifications yet. Your due reminders will appear here while FlowCare is open.</p>
              ) : (
                <ul className="notification-list">
                  {[...notifications].reverse().slice(0, 10).map((notification) => (
                    <li className={`notification-item${notification.read ? '' : ' is-unread'}`} key={notification.id}>
                      <span className="notification-item-dot" aria-hidden="true" />
                      <div>
                        <strong>{notification.title}</strong>
                        <p>{notification.body}</p>
                        <time dateTime={notification.createdAt}>
                          {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(notification.createdAt))}
                        </time>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <Link className="notification-panel-link" to="/reminders" onClick={() => setNotificationsOpen(false)}>Manage reminders</Link>
            </section>
          )}
        </div>
        <div className="profile-menu-control" ref={profileMenuRef}>
          <button
            className="profile-menu-trigger"
            type="button"
            aria-label={`Open profile and settings for ${user?.fullName || 'your account'}`}
            aria-expanded={profileMenuOpen}
            aria-controls="profile-settings-menu"
            onClick={() => setProfileMenuOpen((open) => !open)}
          >
            <span className="user-avatar">{getInitials(user?.fullName)}</span>
            <ChevronDown size={15} aria-hidden="true" />
          </button>
          {profileMenuOpen && (
            <nav className="profile-menu" id="profile-settings-menu" aria-label="Profile and settings">
              <div className="profile-menu-heading">
                <span className="user-avatar">{getInitials(user?.fullName)}</span>
                <div><strong>{user?.fullName || 'Your account'}</strong><small>{user?.email}</small></div>
              </div>
              <Link to="/settings?section=profile" onClick={() => setProfileMenuOpen(false)}>
                <CircleUserRound size={17} /> Profile
              </Link>
              <Link to="/settings?section=cycle" onClick={() => setProfileMenuOpen(false)}>
                <Activity size={17} /> Cycle preferences
              </Link>
              <Link to="/settings?section=notifications" onClick={() => setProfileMenuOpen(false)}>
                <Bell size={17} /> Notifications
              </Link>
              <Link to="/settings?section=privacy" onClick={() => setProfileMenuOpen(false)}>
                <ShieldCheck size={17} /> Privacy & security
              </Link>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}

export default DashboardHeader;
