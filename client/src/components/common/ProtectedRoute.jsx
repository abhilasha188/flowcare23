import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

function ProtectedRoute({ children }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <div className="route-loading" role="status">Checking your session…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export default ProtectedRoute;
