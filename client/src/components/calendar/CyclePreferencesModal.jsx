import { useState } from 'react';
import { X } from 'lucide-react';

function CyclePreferencesModal({ user, busy, onClose, onSave }) {
  const [values, setValues] = useState({
    averageCycleLength: user?.averageCycleLength ?? '',
    averagePeriodDuration: user?.averagePeriodDuration ?? '',
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({
      ...current,
      [name]: value && !/^\d+$/.test(value)
        ? 'Enter a whole number.'
        : name === 'averageCycleLength' && value && (Number(value) < 15 || Number(value) > 60)
          ? 'Choose a value from 15 to 60 days.'
          : name === 'averagePeriodDuration' && value && (Number(value) < 1 || Number(value) > 15)
            ? 'Choose a value from 1 to 15 days.'
            : '',
    }));
    setSubmitError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (values.averageCycleLength && !/^\d+$/.test(values.averageCycleLength)) {
      nextErrors.averageCycleLength = 'Enter a whole number.';
    } else if (values.averageCycleLength && (Number(values.averageCycleLength) < 15 || Number(values.averageCycleLength) > 60)) {
      nextErrors.averageCycleLength = 'Choose a value from 15 to 60 days.';
    }
    if (values.averagePeriodDuration && !/^\d+$/.test(values.averagePeriodDuration)) {
      nextErrors.averagePeriodDuration = 'Enter a whole number.';
    } else if (values.averagePeriodDuration && (Number(values.averagePeriodDuration) < 1 || Number(values.averagePeriodDuration) > 15)) {
      nextErrors.averagePeriodDuration = 'Choose a value from 1 to 15 days.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      await onSave({
        averageCycleLength: values.averageCycleLength || null,
        averagePeriodDuration: values.averagePeriodDuration || null,
      });
    } catch (error) {
      setSubmitError(error?.response?.data?.message || 'Could not save your preferences.');
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose();
    }}>
      <section className="period-modal preference-modal" role="dialog" aria-modal="true" aria-labelledby="preferences-title">
        <div className="modal-heading">
          <div><span className="section-eyebrow">PERSONALIZE YOUR ESTIMATES</span><h2 id="preferences-title">Cycle preferences</h2></div>
          <button className="modal-close" type="button" aria-label="Close dialog" onClick={onClose} disabled={busy}><X size={19} /></button>
        </div>
        <p className="modal-intro">Optional averages can help when your cycle history is limited. Your logged cycles take priority.</p>
        {submitError && <div className="form-alert" role="alert">{submitError}</div>}
        <form className="period-form" onSubmit={handleSubmit} noValidate>
          <div className="modal-field">
            <label htmlFor="preference-cycle">Average cycle length <span>15–60 days</span></label>
            <input id="preference-cycle" name="averageCycleLength" type="number" min="15" max="60" step="1" value={values.averageCycleLength} onChange={handleChange} aria-invalid={Boolean(errors.averageCycleLength)} />
            {errors.averageCycleLength && <small className="field-error" role="alert">{errors.averageCycleLength}</small>}
          </div>
          <div className="modal-field">
            <label htmlFor="preference-period">Average period duration <span>1–15 days</span></label>
            <input id="preference-period" name="averagePeriodDuration" type="number" min="1" max="15" step="1" value={values.averagePeriodDuration} onChange={handleChange} aria-invalid={Boolean(errors.averagePeriodDuration)} />
            {errors.averagePeriodDuration && <small className="field-error" role="alert">{errors.averagePeriodDuration}</small>}
          </div>
          <div className="dialog-actions">
            <button className="button button-muted" type="button" onClick={onClose} disabled={busy}>Cancel</button>
            <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save preferences'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default CyclePreferencesModal;
