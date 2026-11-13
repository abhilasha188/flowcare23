import { useState } from 'react';
import { ArrowRight, CalendarDays, Mail, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout';
import FormField from '../../components/common/FormField';
import PasswordInput from '../../components/common/PasswordInput';
import { useAuth } from '../../hooks/useAuth';
import { getApiErrorMessage } from '../../services/api';
import {
  normalizeEmail,
  validateSignupField,
  validateSignupForm,
} from '../../utils/validation';

const initialValues = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  dateOfBirth: '',
  averageCycleLength: '',
  averagePeriodDuration: '',
  acceptedTerms: false,
};

const allFields = Object.keys(initialValues);
const maxBirthDate = new Date().toISOString().slice(0, 10);

function Signup() {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signup, sessionError } = useAuth();
  const navigate = useNavigate();

  function handleChange(event) {
    const { name, value, checked, type } = event.target;
    const nextValues = { ...values, [name]: type === 'checkbox' ? checked : value };
    setValues(nextValues);

    if (touched[name]) {
      setErrors((current) => ({
        ...current,
        [name]: name === 'acceptedTerms'
          ? (checked ? '' : 'You must accept the Terms and Privacy Policy.')
          : validateSignupField(name, nextValues[name], nextValues),
      }));
    }

    if (name === 'password' && touched.confirmPassword) {
      setErrors((current) => ({
        ...current,
        confirmPassword: validateSignupField('confirmPassword', values.confirmPassword, nextValues),
      }));
    }
  }

  function handleBlur(event) {
    const { name, value, checked } = event.target;
    setTouched((current) => ({ ...current, [name]: true }));
    setErrors((current) => ({
      ...current,
      [name]: name === 'acceptedTerms'
        ? (checked ? '' : 'You must accept the Terms and Privacy Policy.')
        : validateSignupField(name, value, values),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError('');
    setTouched(Object.fromEntries(allFields.map((field) => [field, true])));
    const validationErrors = validateSignupForm(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;

    setSubmitting(true);
    try {
      const { fullName, email, password, dateOfBirth, averageCycleLength, averagePeriodDuration } = values;
      await signup({
        fullName: fullName.trim(),
        email: normalizeEmail(email),
        password,
        dateOfBirth: dateOfBirth || undefined,
        averageCycleLength: averageCycleLength || undefined,
        averagePeriodDuration: averagePeriodDuration || undefined,
        acceptedTerms: true,
      });
      navigate('/dashboard', {
        replace: true,
        state: { notice: 'Your FlowCare account is ready. Welcome!' },
      });
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, 'We could not create your account. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <span className="form-eyebrow">YOUR WELLNESS SPACE</span>
      <h2>Create your account</h2>
      <p className="form-intro">Start with the essentials. You can add optional details whenever you like.</p>

      {(sessionError || submitError) && (
        <div className="form-alert" role="alert">{submitError || sessionError}</div>
      )}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <FormField id="fullName" label="Full name" error={errors.fullName}>
          {(messageId) => (
            <div className="input-wrap">
              <UserRound className="input-icon" aria-hidden="true" size={18} />
              <input
                id="fullName"
                name="fullName"
                type="text"
                value={values.fullName}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="name"
                maxLength={50}
                aria-invalid={Boolean(errors.fullName)}
                aria-describedby={messageId}
              />
            </div>
          )}
        </FormField>

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
          hint="Use any combination of characters, 6 to 12 characters long."
          autoComplete="new-password"
          minLength={6}
          maxLength={12}
        />
        <PasswordInput
          id="confirmPassword"
          label="Confirm password"
          value={values.confirmPassword}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.confirmPassword}
          autoComplete="new-password"
          minLength={6}
          maxLength={12}
        />

        <div className="optional-heading">
          <span>Personalize your experience</span>
          <span>Optional</span>
        </div>
        <p className="optional-copy">These details help tailor future wellness features. They are never required to sign up.</p>

        <FormField id="dateOfBirth" label="Date of birth" error={errors.dateOfBirth}>
          {(messageId) => (
            <div className="input-wrap">
              <CalendarDays className="input-icon" aria-hidden="true" size={18} />
              <input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                value={values.dateOfBirth}
                onChange={handleChange}
                onBlur={handleBlur}
                max={maxBirthDate}
                aria-invalid={Boolean(errors.dateOfBirth)}
                aria-describedby={messageId}
              />
            </div>
          )}
        </FormField>

        <div className="form-grid">
          <FormField id="averageCycleLength" label="Average cycle (days)" error={errors.averageCycleLength}>
            {(messageId) => (
              <input
                className="plain-input"
                id="averageCycleLength"
                name="averageCycleLength"
                type="number"
                inputMode="numeric"
                min="15"
                max="60"
                step="1"
                value={values.averageCycleLength}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-invalid={Boolean(errors.averageCycleLength)}
                aria-describedby={messageId}
              />
            )}
          </FormField>
          <FormField id="averagePeriodDuration" label="Average period (days)" error={errors.averagePeriodDuration}>
            {(messageId) => (
              <input
                className="plain-input"
                id="averagePeriodDuration"
                name="averagePeriodDuration"
                type="number"
                inputMode="numeric"
                min="1"
                max="15"
                step="1"
                value={values.averagePeriodDuration}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-invalid={Boolean(errors.averagePeriodDuration)}
                aria-describedby={messageId}
              />
            )}
          </FormField>
        </div>

        <div className="terms-field">
          <label className="check-label">
            <input
              type="checkbox"
              name="acceptedTerms"
              checked={values.acceptedTerms}
              onChange={handleChange}
              onBlur={handleBlur}
              aria-invalid={Boolean(errors.acceptedTerms)}
              aria-describedby={errors.acceptedTerms ? 'acceptedTerms-error' : undefined}
            />
            <span>I agree to the Terms of Service and Privacy Policy.</span>
          </label>
          {errors.acceptedTerms && <p className="field-error" id="acceptedTerms-error" role="alert">{errors.acceptedTerms}</p>}
        </div>

        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? <span className="button-spinner" aria-hidden="true" /> : <ArrowRight size={18} />}
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  );
}

export default Signup;
