import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

function PublicRoute({ children }) {
  const { user, status } = useAuth();

  if (status === 'loading') {
    return <div className="route-loading" role="status">Checking your session…</div>;
  }

  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default PublicRoute;
