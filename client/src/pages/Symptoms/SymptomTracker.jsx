import { useEffect, useMemo, useState } from 'react';
import { Activity, CalendarDays, PencilLine, Plus, Search, Trash2 } from 'lucide-react';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { getApiErrorMessage } from '../../services/api';
import { deleteSymptom, getSymptoms, saveSymptom, updateSymptom } from '../../services/symptomService';

const symptomOptions = [
  'Cramps', 'Headache', 'Bloating', 'Breast tenderness', 'Acne', 'Back pain',
  'Fatigue', 'Nausea', 'Constipation', 'Diarrhea', 'Food cravings',
  'Other',
];
const moods = ['happy', 'calm', 'sad', 'irritated', 'anxious', 'stressed', 'energetic', 'low', 'emotional'];
const initialForm = () => ({
  date: localDateKey(new Date()),
  symptoms: [],
  mood: '',
  energyLevel: '',
  sleepQuality: '',
  flowIntensity: '',
  notes: '',
});

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatEntryDate(value) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
    .format(new Date(year, month - 1, day));
}

function SymptomTracker() {
  const [today] = useState(() => localDateKey(new Date()));
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState('');
  const [customName, setCustomName] = useState('');
  const [filters, setFilters] = useState({ from: '', to: '', symptom: '', search: '' });
  const [refresh, setRefresh] = useState(0);
  const [listResult, setListResult] = useState({ key: null, entries: [], error: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const requestKey = `${JSON.stringify(filters)}:${refresh}`;
  const loading = listResult.key !== requestKey;
  const entries = listResult.entries;
  const listError = listResult.key === requestKey ? listResult.error : '';

  useEffect(() => {
    let active = true;
    getSymptoms({ ...filters, limit: 50 })
      .then(({ entries: data }) => {
        if (active) setListResult({ key: requestKey, entries: data, error: '' });
      })
      .catch((requestError) => {
        if (active) {
          setListResult({
            key: requestKey,
            entries: [],
            error: getApiErrorMessage(requestError, 'Could not load symptom history.'),
          });
        }
      });
    return () => { active = false; };
  }, [filters, refresh, requestKey]);

  const knownSymptoms = useMemo(() => (
    [...new Set([...symptomOptions, ...entries.flatMap((entry) => entry.symptoms.map((item) => item.name))])]
  ), [entries]);
  const frequency = useMemo(() => {
    const counts = new Map();
    for (const entry of entries) {
      for (const symptom of entry.symptoms || []) {
        counts.set(symptom.name, (counts.get(symptom.name) || 0) + 1);
      }
    }
    return [...counts.entries()].sort((first, second) => second[1] - first[1]);
  }, [entries]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function toggleSymptom(name) {
    setForm((current) => {
      const exists = current.symptoms.some((item) => item.name.toLowerCase() === name.toLowerCase());
      return {
        ...current,
        symptoms: exists
          ? current.symptoms.filter((item) => item.name.toLowerCase() !== name.toLowerCase())
          : [...current.symptoms, { name, severity: 5, description: '' }],
      };
    });
  }

  function addCustomSymptom() {
    const name = customName.trim();
    if (!name || name.length > 60) return;
    setForm((current) => (
      current.symptoms.some((item) => item.name.toLowerCase() === name.toLowerCase())
        ? current
        : { ...current, symptoms: [...current.symptoms, { name, severity: 5, description: '' }] }
    ));
    setCustomName('');
  }

  function updateSymptomField(index, field, value) {
    setForm((current) => ({
      ...current,
      symptoms: current.symptoms.map((item, itemIndex) => (
        itemIndex === index
          ? { ...item, [field]: field === 'severity' ? Number(value) : value }
          : item
      )),
    }));
  }

  function editEntry(entry) {
    setEditingId(entry._id);
    setNotice('');
    setForm({
      date: entry.date.slice(0, 10),
      symptoms: entry.symptoms || [],
      mood: entry.mood || '',
      energyLevel: entry.energyLevel ?? '',
      sleepQuality: entry.sleepQuality ?? '',
      flowIntensity: entry.flowIntensity || '',
      notes: entry.notes || '',
    });
    document.getElementById('symptom-form-heading')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function resetForm() {
    setEditingId('');
    setForm(initialForm());
    setCustomName('');
  }

  async function submitEntry(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    const payload = {
      ...form,
      energyLevel: form.energyLevel === '' ? null : Number(form.energyLevel),
      sleepQuality: form.sleepQuality === '' ? null : Number(form.sleepQuality),
    };
    try {
      const result = editingId
        ? await updateSymptom(editingId, payload)
        : await saveSymptom(payload);
      setNotice(result.message);
      resetForm();
      setRefresh((value) => value + 1);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not save this daily entry.'));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    try {
      await deleteSymptom(deleteTarget._id);
      setDeleteTarget(null);
      setNotice('Daily entry deleted.');
      setRefresh((value) => value + 1);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not delete this entry.'));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="feature-page symptom-page">
      <header className="feature-heading">
        <div>
          <span className="section-eyebrow">YOUR DAILY CHECK-IN</span>
          <h2>Symptom Tracker</h2>
          <p>Notice and record how you feel, at your own pace.</p>
        </div>
        <div className="feature-date"><CalendarDays size={17} /> {formatEntryDate(today)}</div>
      </header>

      {(error || listError) && <div className="form-alert" role="alert">{error || listError}</div>}
      {notice && <div className="form-notice" role="status">{notice}</div>}

      <section className="feature-card symptom-form-card" aria-labelledby="symptom-form-heading">
        <div className="feature-card-heading">
          <div><span className="section-eyebrow">{editingId ? 'UPDATE YOUR LOG' : 'A MOMENT FOR YOU'}</span><h3 id="symptom-form-heading">{editingId ? 'Edit daily entry' : 'Log today or another day'}</h3></div>
          {editingId && <button className="button button-muted" type="button" onClick={resetForm}>Cancel edit</button>}
        </div>
        <form className="feature-form" onSubmit={submitEntry}>
          <label className="field-label" htmlFor="symptom-date">Entry date</label>
          <input className="plain-input" id="symptom-date" name="date" type="date" max={today} value={form.date} onChange={updateField} required />

          <fieldset className="symptom-picker">
            <legend>Symptoms <span>(optional)</span></legend>
            <div className="chip-list">
              {symptomOptions.map((name) => {
                const selected = form.symptoms.some((item) => item.name.toLowerCase() === name.toLowerCase());
                return <button className={`choice-chip${selected ? ' is-selected' : ''}`} type="button" key={name} aria-pressed={selected} onClick={() => toggleSymptom(name)}>{name}</button>;
              })}
            </div>
            <div className="inline-add-form">
              <input className="plain-input" aria-label="Custom symptom" placeholder="Add a custom symptom" maxLength={60} value={customName} onChange={(event) => setCustomName(event.target.value)} />
              <button className="button button-outline" type="button" disabled={!customName.trim()} onClick={addCustomSymptom}><Plus size={16} /> Add</button>
            </div>
          </fieldset>

          {form.symptoms.length > 0 && (
            <div className="selected-symptom-list">
              {form.symptoms.map((item, index) => (
                <div className="selected-symptom" key={item.name.toLowerCase()}>
                  <div className="selected-symptom-heading">
                    <strong>{item.name}</strong>
                    <button className="icon-button subtle-icon-button" type="button" aria-label={`Remove ${item.name}`} onClick={() => toggleSymptom(item.name)}><Trash2 size={16} /></button>
                  </div>
                  <label className="field-label" htmlFor={`severity-${index}`}>Severity: {item.severity} / 10</label>
                  <input id={`severity-${index}`} type="range" min="1" max="10" value={item.severity} onChange={(event) => updateSymptomField(index, 'severity', event.target.value)} />
                  <input className="plain-input" aria-label={`${item.name} description`} placeholder="Optional detail" maxLength={300} value={item.description} onChange={(event) => updateSymptomField(index, 'description', event.target.value)} />
                </div>
              ))}
            </div>
          )}

          <div className="feature-form-grid">
            <label className="field-label">Mood
              <select className="plain-input" name="mood" value={form.mood} onChange={updateField}>
                <option value="">Not recorded</option>
                {moods.map((mood) => <option value={mood} key={mood}>{mood[0].toUpperCase() + mood.slice(1)}</option>)}
              </select>
            </label>
            <label className="field-label">Flow intensity
              <select className="plain-input" name="flowIntensity" value={form.flowIntensity} onChange={updateField}>
                <option value="">Not recorded</option>
                <option value="light">Light</option><option value="medium">Medium</option><option value="heavy">Heavy</option>
              </select>
            </label>
            <label className="field-label">Energy level (1–10)
              <input className="plain-input" name="energyLevel" type="number" min="1" max="10" value={form.energyLevel} onChange={updateField} placeholder="Optional" />
            </label>
            <label className="field-label">Sleep quality (1–10)
              <input className="plain-input" name="sleepQuality" type="number" min="1" max="10" value={form.sleepQuality} onChange={updateField} placeholder="Optional" />
            </label>
          </div>
          <label className="field-label" htmlFor="symptom-notes">Personal notes <span>(optional)</span></label>
          <textarea className="plain-input feature-textarea" id="symptom-notes" name="notes" maxLength={2000} value={form.notes} onChange={updateField} placeholder="Anything you would like to remember…" />
          <div className="feature-form-actions">
            <button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Save daily entry'}</button>
            <span className="feature-helper"><Activity size={15} /> Only the details you choose to record are saved.</span>
          </div>
        </form>
      </section>

      <section className="feature-card history-card">
        <div className="feature-card-heading">
          <div><span className="section-eyebrow">YOUR RECORDS</span><h3>Symptom history</h3></div>
          <span className="entry-count">{entries.length} shown</span>
        </div>
        <div className="symptom-frequency-overview">
          <strong>Symptom frequency in the displayed records</strong>
          {frequency.length
            ? <div className="chip-list">{frequency.map(([name, count]) => <span className="history-badge" key={name}>{name} · {count}</span>)}</div>
            : <p>No symptoms in this date range yet.</p>}
        </div>
        <div className="history-filters">
          <label>From<input className="plain-input" type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} /></label>
          <label>To<input className="plain-input" type="date" max={today} value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} /></label>
          <label>Symptom<select className="plain-input" value={filters.symptom} onChange={(event) => setFilters((current) => ({ ...current, symptom: event.target.value }))}><option value="">All symptoms</option>{knownSymptoms.map((name) => <option value={name} key={name}>{name}</option>)}</select></label>
          <label className="search-field"><span>Search records</span><span className="search-input-wrap"><Search size={16} /><input className="plain-input" type="search" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search notes or mood" /></span></label>
        </div>
        {loading ? <div className="feature-loading" role="status">Loading your symptom history…</div> : null}
        {!loading && entries.length === 0 && <div className="feature-empty"><Activity size={22} /><h4>No entries found</h4><p>When you choose to log a daily check-in, it will appear here.</p></div>}
        {!loading && entries.length > 0 && (
          <div className="symptom-history-list">
            {entries.map((entry) => (
              <article className="symptom-history-item" key={entry._id}>
                <div className="history-item-top">
                  <div><span className="history-date">{formatEntryDate(entry.date)}</span><p>{entry.symptoms?.length ? entry.symptoms.map((item) => item.name).join(' · ') : 'Wellness check-in'}</p></div>
                  <div className="history-item-actions">
                    <button className="icon-button subtle-icon-button" type="button" aria-label="Edit entry" onClick={() => editEntry(entry)}><PencilLine size={17} /></button>
                    <button className="icon-button subtle-icon-button danger-icon-button" type="button" aria-label="Delete entry" onClick={() => setDeleteTarget(entry)}><Trash2 size={17} /></button>
                  </div>
                </div>
                <div className="history-badges">
                  {entry.mood && <span className="history-badge">Mood: {entry.mood}</span>}
                  {entry.energyLevel != null && <span className="history-badge">Energy: {entry.energyLevel}/10</span>}
                  {entry.sleepQuality != null && <span className="history-badge">Sleep: {entry.sleepQuality}/10</span>}
                  {entry.flowIntensity && <span className="history-badge">Flow: {entry.flowIntensity}</span>}
                </div>
                {entry.symptoms?.length > 0 && (
                  <details className="history-details">
                    <summary>View severity and notes</summary>
                    <ul>{entry.symptoms.map((item) => <li key={item.name}><strong>{item.name}:</strong> {item.severity}/10{item.description ? ` — ${item.description}` : ''}</li>)}</ul>
                    {entry.notes && <p>{entry.notes}</p>}
                  </details>
                )}
                {!entry.symptoms?.length && entry.notes && <p className="history-notes">{entry.notes}</p>}
              </article>
            ))}
          </div>
        )}
      </section>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this daily entry?"
        description="This removes the selected symptom and wellness record from your account."
        confirmLabel="Delete entry"
        busy={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

export default SymptomTracker;
