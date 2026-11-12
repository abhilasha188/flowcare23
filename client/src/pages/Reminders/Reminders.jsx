import { useEffect, useState } from 'react';
import { Bell, CalendarClock, PencilLine, Plus, Trash2 } from 'lucide-react';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { getApiErrorMessage } from '../../services/api';
import {
  createReminder,
  deleteReminder,
  getReminders,
  patchReminder,
  updateReminder,
} from '../../services/reminderService';
import { useAuth } from '../../hooks/useAuth';
import useReminderNotifications from '../../hooks/useReminderNotifications';

const blankForm = { type: 'custom', title: '', message: '', scheduledAt: '' };

function localDateTimeValue(value) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function Reminders() {
  const { user } = useAuth();
  const [refresh, setRefresh] = useState(0);
  const [listResult, setListResult] = useState({ key: null, reminders: [], error: '' });
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const listKey = String(refresh);
  const loading = listResult.key !== listKey;
  const reminders = listResult.reminders;
  const listError = listResult.key === listKey ? listResult.error : '';

  useReminderNotifications(user, reminders);

  useEffect(() => {
    let active = true;
    getReminders()
      .then((items) => {
        if (active) setListResult({ key: listKey, reminders: items, error: '' });
      })
      .catch((requestError) => {
        if (active) {
          setListResult({
            key: listKey,
            reminders: [],
            error: getApiErrorMessage(requestError, 'Could not load reminders.'),
          });
        }
      });
    return () => { active = false; };
  }, [listKey]);

  function resetForm() {
    setForm(blankForm);
    setEditingId('');
  }

  function editReminder(reminder) {
    setEditingId(reminder._id);
    setForm({
      type: reminder.type,
      title: reminder.title,
      message: reminder.message || '',
      scheduledAt: localDateTimeValue(reminder.scheduledAt),
    });
    document.getElementById('reminder-form-heading')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function submitReminder(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = { ...form, scheduledAt: new Date(form.scheduledAt).toISOString() };
      if (editingId) await updateReminder(editingId, payload);
      else await createReminder(payload);
      setNotice(editingId ? 'Reminder updated.' : 'Reminder saved.');
      resetForm();
      setRefresh((value) => value + 1);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not save this reminder.'));
    } finally {
      setSaving(false);
    }
  }

  async function toggleReminder(reminder) {
    setError('');
    try {
      await patchReminder(reminder._id, { enabled: !reminder.enabled });
      setNotice(reminder.enabled ? 'Reminder paused.' : 'Reminder enabled.');
      setRefresh((value) => value + 1);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not update this reminder.'));
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    try {
      await deleteReminder(deleteTarget._id);
      setDeleteTarget(null);
      setNotice('Reminder deleted.');
      setRefresh((value) => value + 1);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not delete this reminder.'));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="feature-page">
      <header className="feature-heading">
        <div><span className="section-eyebrow">GENTLE NUDGES, ON YOUR TERMS</span><h2>Reminders</h2><p>Plan personal reminders and see their status in one place.</p></div>
        <span className="feature-heading-icon"><Bell size={20} /></span>
      </header>
      {(error || listError) && <div className="form-alert" role="alert">{error || listError}</div>}
      {notice && <div className="form-notice" role="status">{notice}</div>}

      <div className="reminder-layout">
        <section className="feature-card">
          <div className="feature-card-heading">
            <div><span className="section-eyebrow">CREATE A REMINDER</span><h3 id="reminder-form-heading">{editingId ? 'Edit reminder' : 'Add a reminder'}</h3></div>
            {editingId && <button className="button button-muted" type="button" onClick={resetForm}>Cancel</button>}
          </div>
          <form className="feature-form" onSubmit={submitReminder}>
            <label className="field-label">Reminder type
              <select className="plain-input" value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}>
                <option value="period">Upcoming period estimate</option>
                <option value="symptom">Symptom logging</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <label className="field-label">Title
              <input className="plain-input" value={form.title} maxLength={80} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
            </label>
            <label className="field-label">Date and time
              <input className="plain-input" type="datetime-local" value={form.scheduledAt} onChange={(event) => setForm((current) => ({ ...current, scheduledAt: event.target.value }))} required />
            </label>
            <label className="field-label">Note <span>(optional)</span>
              <textarea className="plain-input feature-textarea" value={form.message} maxLength={500} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} />
            </label>
            <button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : <><Plus size={16} /> Save reminder</>}</button>
          </form>
        </section>

        <section className="feature-card">
          <div className="feature-card-heading"><div><span className="section-eyebrow">YOUR SCHEDULE</span><h3>Reminder history</h3></div><span className="entry-count">{reminders.length}</span></div>
          <p className="feature-note">Browser alerts only appear while FlowCare is open and permission is granted. In-app status remains available here.</p>
          {loading && <div className="feature-loading" role="status">Loading reminders…</div>}
          {!loading && reminders.length === 0 && <div className="feature-empty"><CalendarClock size={23} /><h4>No reminders yet</h4><p>Add a period estimate, symptom check-in, or custom reminder.</p></div>}
          {!loading && reminders.length > 0 && (
            <div className="reminder-list">
              {reminders.map((reminder) => (
                <article className={`reminder-item${reminder.enabled ? '' : ' is-disabled'}`} key={reminder._id}>
                  <div className="reminder-item-main">
                    <span className="reminder-status">{reminder.derivedStatus}</span>
                    <h4>{reminder.title}</h4>
                    <p>{reminder.message || `${reminder.type[0].toUpperCase()}${reminder.type.slice(1)} reminder`}</p>
                    <time dateTime={reminder.scheduledAt}>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(reminder.scheduledAt))}</time>
                  </div>
                  <div className="reminder-item-actions">
                    <button className="button button-outline" type="button" onClick={() => toggleReminder(reminder)}>{reminder.enabled ? 'Pause' : 'Enable'}</button>
                    <button className="icon-button subtle-icon-button" type="button" aria-label="Edit reminder" onClick={() => editReminder(reminder)}><PencilLine size={16} /></button>
                    <button className="icon-button subtle-icon-button danger-icon-button" type="button" aria-label="Delete reminder" onClick={() => setDeleteTarget(reminder)}><Trash2 size={16} /></button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this reminder?"
        description="The reminder will be permanently removed from your account."
        confirmLabel="Delete reminder"
        busy={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

export default Reminders;
