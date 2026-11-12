import { useState } from 'react';
import { ArrowRight, Mail } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout';
import FormField from '../../components/common/FormField';
import PasswordInput from '../../components/common/PasswordInput';
import { useAuth } from '../../hooks/useAuth';
import { getApiErrorMessage } from '../../services/api';
import { normalizeEmail, validateEmail, validateLoginForm } from '../../utils/validation';

function Login() {
  const [values, setValues] = useState({ email: '', password: '', rememberMe: false });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, sessionError } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  function handleChange(event) {
    const { name, value, checked, type } = event.target;
    const nextValue = type === 'checkbox' ? checked : value;
    setValues((current) => ({ ...current, [name]: nextValue }));
    if (touched[name] && name === 'email') {
      setErrors((current) => ({ ...current, email: validateEmail(value) }));
    }
    if (name === 'password' && value) setErrors((current) => ({ ...current, password: '' }));
  }

  function handleBlur(event) {
    const { name, value } = event.target;
    setTouched((current) => ({ ...current, [name]: true }));
    if (name === 'email') setErrors((current) => ({ ...current, email: validateEmail(value) }));
    if (name === 'password' && !value) {
      setErrors((current) => ({ ...current, password: 'Password is required.' }));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError('');
    setTouched({ email: true, password: true });
    const validationErrors = validateLoginForm(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;

    setSubmitting(true);
    try {
      await login({
        email: normalizeEmail(values.email),
        password: values.password,
        rememberMe: values.rememberMe,
      });
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, 'Unable to sign in. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <span className="form-eyebrow">WELCOME BACK</span>
      <h2>Sign in to FlowCare</h2>
      <p className="form-intro">A calm space for your wellbeing is just a sign-in away.</p>

      {(sessionError || submitError || notice) && (
        <div className={notice ? 'form-notice' : 'form-alert'} role={notice ? 'status' : 'alert'}>
          {notice || submitError || sessionError}
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <FormField id="email" label="Email address" error={errors.email}>
          {(messageId) => (
            <div className="input-wrap">
              <Mail className="input-icon" aria-hidden="true" size={18} />
              <input
                id="email"
                name="email"
                type="email"
                value={values.email}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="email"
                maxLength={254}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={messageId}
              />
            </div>
          )}
        </FormField>
        <PasswordInput
          id="password"
          label="Password"
          value={values.password}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.password}
          autoComplete="current-password"
        />

        <div className="login-options">
          <label className="check-label">
            <input
              type="checkbox"
              name="rememberMe"
              checked={values.rememberMe}
              onChange={handleChange}
            />
            <span>Remember me</span>
          </label>
          <button
            className="text-button"
            type="button"
            onClick={() => setNotice('Password reset is not available yet. Please contact your FlowCare administrator.')}
          >
            Forgot password?
          </button>
        </div>

        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? <span className="button-spinner" aria-hidden="true" /> : <ArrowRight size={18} />}
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="auth-switch">
        New to FlowCare? <Link to="/signup">Create an account</Link>
      </p>
    </AuthLayout>
  );
}

export default Login;
