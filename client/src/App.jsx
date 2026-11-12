import { lazy, Suspense } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/common/ProtectedRoute';
import PublicRoute from './components/common/PublicRoute';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import Dashboard from './pages/Dashboard/Dashboard';
import CycleTracker from './pages/CycleTracker/CycleTracker';
import SymptomTracker from './pages/Symptoms/SymptomTracker';
import Settings from './pages/Settings/Settings';
import Reminders from './pages/Reminders/Reminders';
import Resources from './pages/Resources/Resources';
import ResourceDetail from './pages/Resources/ResourceDetail';
import DashboardLayout from './components/layout/DashboardLayout';
import './App.css';
import './feature-pages.css';
import './motion.css';

const Insights = lazy(() => import('./pages/Insights/Insights'));
const AiAssistant = lazy(() => import('./pages/AiAssistant/AiAssistant'));

function NotFound() {
  return (
    <main className="not-found-page">
      <span className="form-eyebrow">FLOWCARE</span>
      <h1>We couldn't find that page.</h1>
      <p>The address may have changed or may not exist.</p>
      <Link className="primary-button" to="/login">Go to sign in</Link>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route
            path="/login"
            element={(
              <PublicRoute>
                <Login />
              </PublicRoute>
            )}
          />
          <Route
            path="/signup"
            element={(
              <PublicRoute>
                <Signup />
              </PublicRoute>
            )}
          />
          <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/cycle-tracker" element={<CycleTracker />} />
            <Route path="/symptoms" element={<SymptomTracker />} />
            <Route path="/insights" element={<Suspense fallback={<div className="feature-loading" role="status">Loading insights…</div>}><Insights /></Suspense>} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/reminders" element={<Reminders />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/resources/:slug" element={<ResourceDetail />} />
            <Route path="/ai-assistant" element={<Suspense fallback={<div className="feature-loading" role="status">Loading assistant…</div>}><AiAssistant /></Suspense>} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
