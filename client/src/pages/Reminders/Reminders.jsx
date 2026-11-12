import { useEffect, useState } from 'react';
import { Bell, CalendarClock, PencilLine, Plus, Trash2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { getApiErrorMessage } from '../../services/api';
import {
  createReminder,
  deleteReminder,
  getReminders,
  patchReminder,
  updateReminder,
} from '../../services/reminderService';
import SectionTabs from '../../components/common/SectionTabs';
import useSectionTab from '../../hooks/useSectionTab';

const reminderTabs = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
  { id: 'paused', label: 'Paused' },
];

const blankForm = { type: 'custom', title: '', message: '', scheduledAt: '' };
const reminderTypeLabels = {
  period: 'Expected period',
  'period-preparation': 'Period preparation',
  symptom: 'Symptom logging',
  wellness: 'General wellness',
  custom: 'Custom',
};

function localDateTimeValue(value) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function Reminders() {
  const [activeTab, setActiveTab] = useSectionTab('view', 'all', reminderTabs);
  const [refresh, setRefresh] = useState(0);
  const [listResult, setListResult] = useState({ key: null, reminders: [], error: '' });
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const listKey = String(refresh);
  const loading = listResult.key !== listKey;
  const reminders = listResult.reminders;
  const listError = listResult.key === listKey ? listResult.error : '';
  const isPastReminder = (reminder) => reminder.derivedStatus === 'past' || reminder.derivedStatus === 'dismissed';
  const reminderCounts = {
    all: reminders.length,
    upcoming: reminders.filter((reminder) => reminder.enabled && !isPastReminder(reminder)).length,
    past: reminders.filter((reminder) => reminder.enabled && isPastReminder(reminder)).length,
    paused: reminders.filter((reminder) => !reminder.enabled).length,
  };
  const tabsWithCounts = reminderTabs.map((tab) => ({ ...tab, count: loading ? undefined : reminderCounts[tab.id] }));
  const visibleReminders = reminders.filter((reminder) => {
    if (activeTab === 'paused') return !reminder.enabled;
    if (!reminder.enabled) return activeTab === 'all';
    if (activeTab === 'past') return isPastReminder(reminder);
    if (activeTab === 'upcoming') return !isPastReminder(reminder);
    return true;
  });

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
    setFormOpen(false);
  }

  function editReminder(reminder) {
    setEditingId(reminder._id);
    setForm({
      type: reminder.type,
      title: reminder.title,
      message: reminder.message || '',
      scheduledAt: localDateTimeValue(reminder.scheduledAt),
    });
    setFormOpen(true);
  }

  useEffect(() => {
    if (formOpen && editingId) {
      document.getElementById('reminder-form-heading')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [editingId, formOpen]);

  function openNewReminder() {
    setForm(blankForm);
    setEditingId('');
    setError('');
    setNotice('');
    setFormOpen(true);
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
      window.dispatchEvent(new Event('flowcare:reminders-changed'));
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
      window.dispatchEvent(new Event('flowcare:reminders-changed'));
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
      window.dispatchEvent(new Event('flowcare:reminders-changed'));
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
    <div className="feature-page reminder-page">
      <header className="feature-heading">
        <div><span className="section-eyebrow">YOUR ROUTINE</span><h2>Reminders</h2><p>A gentle nudge, whenever you need one.</p></div>
        <span className="feature-heading-icon"><Bell size={20} /></span>
      </header>
      {(error || listError) && <div className="form-alert" role="alert">{error || listError}</div>}
      {notice && <div className="form-notice" role="status">{notice}</div>}

      <div className="reminder-toolbar">
        <p>{loading ? 'Your schedule' : `${reminders.length} ${reminders.length === 1 ? 'reminder' : 'reminders'} in your schedule`}</p>
        <button
          className="button button-primary"
          type="button"
          onClick={formOpen ? resetForm : openNewReminder}
        >
          {formOpen ? <X size={16} /> : <Plus size={16} />}
          <span>{formOpen ? 'Close form' : 'New reminder'}</span>
        </button>
      </div>

      {formOpen && (
        <section className="feature-card reminder-form-card">
          <div className="feature-card-heading">
            <div><span className="section-eyebrow">{editingId ? 'UPDATE YOUR SCHEDULE' : 'MAKE SPACE FOR A REMINDER'}</span><h3 id="reminder-form-heading">{editingId ? 'Edit reminder' : 'New reminder'}</h3></div>
            <button className="icon-button subtle-icon-button" type="button" onClick={resetForm} aria-label="Close reminder form"><X size={16} /></button>
          </div>
          <form className="feature-form" onSubmit={submitReminder}>
            <div className="feature-form-grid reminder-form-grid">
              <label className="field-label">Type
                <select className="plain-input" value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}>
                  <option value="period">Upcoming period estimate</option>
                  <option value="period-preparation">Period preparation</option>
                  <option value="symptom">Symptom logging</option>
                  <option value="wellness">General wellness</option>
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
            </div>
            <div className="feature-form-actions">
              <button className="button button-muted" type="button" onClick={resetForm} disabled={saving}>Cancel</button>
              <button className="button button-primary" type="submit" disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Save changes' : <><Plus size={16} /> Save reminder</>}
              </button>
            </div>
          </form>
        </section>
      )}

        <section className="feature-card reminder-board">
          <div className="reminder-board-heading">
            <div><span className="section-eyebrow">YOUR SCHEDULE</span><h3>{reminderTabs.find((tab) => tab.id === activeTab)?.label} reminders</h3></div>
            <span className="entry-count">{visibleReminders.length}</span>
          </div>
          <SectionTabs label="Reminder status" tabs={tabsWithCounts} activeTab={activeTab} onChange={setActiveTab} />
          <p className="reminder-settings-link"><span>Browser alerts work while FlowCare is open.</span><Link to="/settings?section=notifications">Notification settings</Link></p>
          {loading && <div className="feature-loading" role="status">Loading reminders…</div>}
          {!loading && visibleReminders.length === 0 && <div className="reminder-empty"><span><CalendarClock size={22} /></span><h4>{reminders.length ? `No ${reminderTabs.find((tab) => tab.id === activeTab)?.label.toLowerCase()} reminders` : 'Your schedule is clear'}</h4><p>{reminders.length ? 'Try another tab or add a new reminder.' : 'Add a reminder whenever it would be helpful.'}</p></div>}
          {!loading && visibleReminders.length > 0 && (
            <div className="reminder-list">
              {visibleReminders.map((reminder) => (
                <article className={`reminder-item${reminder.enabled ? '' : ' is-disabled'}`} key={reminder._id}>
                  <span className="reminder-type-icon"><CalendarClock size={18} /></span>
                  <div className="reminder-item-main">
                    <div className="reminder-item-title"><h4>{reminder.title}</h4><span className={`reminder-status is-${reminder.derivedStatus}`}>{reminder.derivedStatus}</span></div>
                    <p>{reminder.message || reminderTypeLabels[reminder.type] || 'Custom reminder'}</p>
                    <div className="reminder-item-meta">
                      <span>{reminderTypeLabels[reminder.type] || 'Custom'}</span>
                      <time dateTime={reminder.scheduledAt}>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(reminder.scheduledAt))}</time>
                    </div>
                  </div>
                  <div className="reminder-item-actions">
                    <button className="button button-muted reminder-toggle" type="button" onClick={() => toggleReminder(reminder)}>{reminder.enabled ? 'Pause' : 'Enable'}</button>
                    <button className="icon-button subtle-icon-button" type="button" aria-label="Edit reminder" onClick={() => editReminder(reminder)}><PencilLine size={16} /></button>
                    <button className="icon-button subtle-icon-button danger-icon-button" type="button" aria-label="Delete reminder" onClick={() => setDeleteTarget(reminder)}><Trash2 size={16} /></button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
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
