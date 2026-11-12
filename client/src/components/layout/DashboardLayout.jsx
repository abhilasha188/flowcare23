import { useCallback, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getApiErrorMessage } from '../../services/api';
import useReminderNotifications from '../../hooks/useReminderNotifications';
import DashboardHeader from './DashboardHeader';
import Sidebar from './Sidebar';

function DashboardLayout() {
  const { user, logout } = useAuth();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [navigationCollapsed, setNavigationCollapsed] = useState(() => (
    window.localStorage.getItem('flowcare-sidebar-collapsed') === 'true'
  ));
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const navigate = useNavigate();

  useReminderNotifications(user);

  const closeNavigation = useCallback(() => setNavigationOpen(false), []);

  useEffect(() => {
    window.localStorage.setItem('flowcare-sidebar-collapsed', String(navigationCollapsed));
  }, [navigationCollapsed]);

  async function handleLogout() {
    setLogoutBusy(true);
    setLogoutError('');
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      setLogoutError(getApiErrorMessage(error, 'Could not sign out. Please try again.'));
    } finally {
      setLogoutBusy(false);
    }
  }

  return (
    <div className={`dashboard-app${navigationCollapsed ? ' sidebar-collapsed' : ''}`}>
      <Sidebar
        open={navigationOpen}
        onClose={closeNavigation}
        collapsed={navigationCollapsed}
        onToggleCollapse={() => setNavigationCollapsed((value) => !value)}
        user={user}
        onLogout={handleLogout}
        logoutBusy={logoutBusy}
        logoutError={logoutError}
      />
      <div className="dashboard-main">
        <DashboardHeader
          user={user}
          onMenuClick={() => setNavigationOpen(true)}
          onToggleCollapse={() => setNavigationCollapsed((value) => !value)}
          collapsed={navigationCollapsed}
        />
        <div className="dashboard-content"><Outlet /></div>
      </div>
    </div>
  );
}

export default DashboardLayout;
