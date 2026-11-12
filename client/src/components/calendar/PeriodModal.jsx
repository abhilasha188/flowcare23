import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { localDateToDateOnly } from '../../utils/dateUtils';

const today = new Date().toISOString().slice(0, 10);
const earliestDate = localDateToDateOnly(new Date(new Date().getFullYear() - 120, new Date().getMonth(), new Date().getDate()));

function validate(values) {
  const errors = {};
  if (!values.startDate) errors.startDate = 'Period start date is required.';
  else if (values.startDate > today) errors.startDate = 'Start date cannot be in the future.';

  if (values.endDate) {
    if (values.endDate > today) errors.endDate = 'End date cannot be in the future.';
    else if (values.startDate && values.endDate < values.startDate) errors.endDate = 'End date cannot be before start date.';
    else {
      const start = new Date(`${values.startDate}T00:00:00.000Z`);
      const end = new Date(`${values.endDate}T00:00:00.000Z`);
      if ((end - start) / 86400000 + 1 > 15) errors.endDate = 'A period record cannot be longer than 15 days.';
    }
  }

  if (values.notes.length > 500) errors.notes = 'Notes must be 500 characters or fewer.';
  return errors;
}

function PeriodModal({ cycle, busy, onClose, onSave }) {
  const [values, setValues] = useState({
    startDate: cycle?.startDate || '',
    endDate: cycle?.endDate || '',
    flowIntensity: cycle?.flowIntensity || '',
    notes: cycle?.notes || '',
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !busy) onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [busy, onClose]);

  function handleChange(event) {
    const { name, value } = event.target;
    const next = { ...values, [name]: value };
    setValues(next);
    setErrors(validate(next));
    setSubmitError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = validate(values);
    setErrors(validationErrors);
    setSubmitError('');
    if (Object.keys(validationErrors).length) return;

    try {
      await onSave({
        startDate: values.startDate,
        endDate: values.endDate || null,
        flowIntensity: values.flowIntensity || null,
        notes: values.notes.trim(),
      });
    } catch (error) {
      if (error?.response?.data?.errors?.length) {
        const apiErrors = Object.fromEntries(error.response.data.errors.map(({ field, message }) => [field, message]));
        setErrors((current) => ({ ...current, ...apiErrors }));
      }
      setSubmitError(error?.response?.data?.message || 'Could not save this period. Please try again.');
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose();
    }}>
      <section className="period-modal" role="dialog" aria-modal="true" aria-labelledby="period-modal-title">
        <div className="modal-heading">
          <div>
            <span className="section-eyebrow">{cycle ? 'UPDATE YOUR RECORD' : 'CYCLE TRACKER'}</span>
            <h2 id="period-modal-title">{cycle ? 'Edit period' : 'Log a period'}</h2>
          </div>
          <button className="modal-close" type="button" aria-label="Close dialog" onClick={onClose} disabled={busy}>
            <X size={19} />
          </button>
        </div>
        <p className="modal-intro">Only share what feels useful. Your health information remains private.</p>
        {submitError && <div className="form-alert" role="alert">{submitError}</div>}

        <form className="period-form" onSubmit={handleSubmit} noValidate>
          <div className="modal-field">
            <label htmlFor="period-start">Period start date <span>Required</span></label>
            <input id="period-start" name="startDate" type="date" min={earliestDate} max={today} value={values.startDate} onChange={handleChange} aria-invalid={Boolean(errors.startDate)} />
            {errors.startDate && <small className="field-error" role="alert">{errors.startDate}</small>}
          </div>
          <div className="modal-field">
            <label htmlFor="period-end">Period end date <span>Optional · leave blank if ongoing</span></label>
            <input id="period-end" name="endDate" type="date" min={earliestDate} max={today} value={values.endDate} onChange={handleChange} aria-invalid={Boolean(errors.endDate)} />
            {errors.endDate && <small className="field-error" role="alert">{errors.endDate}</small>}
          </div>
          <div className="modal-field">
            <label htmlFor="period-flow">Flow intensity <span>Optional</span></label>
            <select id="period-flow" name="flowIntensity" value={values.flowIntensity} onChange={handleChange}>
              <option value="">Not specified</option>
              <option value="light">Light</option>
              <option value="medium">Medium</option>
              <option value="heavy">Heavy</option>
            </select>
          </div>
          <div className="modal-field">
            <label htmlFor="period-notes">Notes <span>Optional</span></label>
            <textarea id="period-notes" name="notes" rows="3" maxLength="500" value={values.notes} onChange={handleChange} placeholder="Anything you would like to remember…" />
            <small className={errors.notes ? 'field-error' : 'field-hint'}>{errors.notes || `${values.notes.length}/500 characters`}</small>
          </div>
          <div className="dialog-actions">
            <button className="button button-muted" type="button" onClick={onClose} disabled={busy}>Cancel</button>
            <button className="button button-primary" type="submit" disabled={busy}>
              {busy ? 'Saving…' : cycle ? 'Save changes' : 'Save period'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default PeriodModal;
