import { useState } from 'react';
import { Bell, LogOut, LockKeyhole, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { getApiErrorMessage } from '../../services/api';
import { changePassword, deleteAccount, deleteHealthData } from '../../services/userService';
import { useAuth } from '../../hooks/useAuth';

function profileFromUser(user) {
  if (!user) return null;
  return {
    fullName: user.fullName || '',
    email: user.email || '',
    dateOfBirth: user.dateOfBirth?.slice(0, 10) || '',
    averageCycleLength: user.averageCycleLength ?? '',
    averagePeriodDuration: user.averagePeriodDuration ?? '',
    currentPassword: '',
    notificationPreferences: {
      enabled: false,
      periodReminders: false,
      symptomReminders: false,
      browserNotifications: false,
      reminderTime: '09:00',
      ...user.notificationPreferences,
    },
    predictionPreferences: {
      showPhaseEstimate: true,
      showFertileWindow: true,
      ...user.predictionPreferences,
    },
  };
}

function Settings() {
  const { user, updateProfile, logout, clearSession } = useAuth();
  const navigate = useNavigate();
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const [profileDraft, setProfileDraft] = useState(null);
  const profile = profileDraft || profileFromUser(user);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
  const [deleteForm, setDeleteForm] = useState({ password: '', confirmation: '' });
  const [loading, setLoading] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [accountBusy, setAccountBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [permission, setPermission] = useState('Notification' in window ? window.Notification.permission : 'unsupported');
  const [confirmHealthDelete, setConfirmHealthDelete] = useState(false);

  function updateProfileField(field, value) {
    setProfileDraft((current) => ({ ...(current || profileFromUser(user)), [field]: value }));
  }

  function updatePreference(group, field, value) {
    setProfileDraft((current) => {
      const base = current || profileFromUser(user);
      return {
        ...base,
        [group]: { ...base[group], [field]: value },
      };
    });
  }

  async function saveProfile(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const emailChanged = profile.email.trim().toLowerCase() !== user.email;
      const saved = await updateProfile({
        fullName: profile.fullName.trim(),
        email: profile.email.trim().toLowerCase(),
        ...(emailChanged && { currentPassword: profile.currentPassword }),
        dateOfBirth: profile.dateOfBirth || null,
        averageCycleLength: profile.averageCycleLength === '' ? null : Number(profile.averageCycleLength),
        averagePeriodDuration: profile.averagePeriodDuration === '' ? null : Number(profile.averagePeriodDuration),
        notificationPreferences: profile.notificationPreferences,
        predictionPreferences: profile.predictionPreferences,
      });
      setProfileDraft(profileFromUser(saved));
      setNotice('Your profile and preferences were saved.');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not save your profile.'));
    } finally {
      setLoading(false);
    }
  }

  async function requestNotificationPermission() {
    setError('');
    setNotice('');
    if (!('Notification' in window)) {
      setPermission('unsupported');
      setNotice('This browser does not support desktop notifications. In-app reminders remain available.');
      return;
    }
    try {
      const result = await window.Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        updatePreference('notificationPreferences', 'browserNotifications', true);
        updatePreference('notificationPreferences', 'enabled', true);
        await updateProfile({
          notificationPreferences: {
            ...profile.notificationPreferences,
            enabled: true,
            browserNotifications: true,
          },
        });
        setNotice('Browser notifications are enabled. Alerts are delivered only while FlowCare is open.');
      } else {
        updatePreference('notificationPreferences', 'browserNotifications', false);
        setNotice(result === 'denied'
          ? 'Notifications were blocked by the browser. You can still view reminders in FlowCare.'
          : 'Notification permission was not granted. You can still view reminders in FlowCare.');
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not update notification permission.'));
    }
  }

  async function saveNewPassword(event) {
    event.preventDefault();
    setPasswordBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await changePassword(passwordForm);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      setNotice(result.message);
      clearSession();
      navigate('/login', { replace: true });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not change your password.'));
    } finally {
      setPasswordBusy(false);
    }
  }

  async function confirmDeleteHealthData() {
    setDeleteBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await deleteHealthData();
      await updateProfile({ averageCycleLength: null, averagePeriodDuration: null });
      setNotice(`${result.message} Removed ${result.deleted.cycles} cycles, ${result.deleted.symptoms} symptom entries, and ${result.deleted.reminders} reminders.`);
      setConfirmHealthDelete(false);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not delete health data.'));
      setConfirmHealthDelete(false);
    } finally {
      setDeleteBusy(false);
    }
  }

  async function submitAccountDeletion(event) {
    event.preventDefault();
    setAccountBusy(true);
    setError('');
    try {
      await deleteAccount(deleteForm);
      clearSession();
      navigate('/login', { replace: true });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not delete your account.'));
    } finally {
      setAccountBusy(false);
    }
  }

  async function signOut() {
    setError('');
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not sign out.'));
    }
  }

  if (!profile) return <div className="feature-page"><div className="feature-loading" role="status">Loading your settings…</div></div>;

  return (
    <div className="feature-page settings-page">
      <header className="feature-heading">
        <div><span className="section-eyebrow">YOUR ACCOUNT, YOUR CHOICES</span><h2>Settings</h2><p>Manage your profile, reminders, privacy, and account security.</p></div>
        <span className="feature-heading-icon"><ShieldCheck size={20} /></span>
      </header>
      {error && <div className="form-alert" role="alert">{error}</div>}
      {notice && <div className="form-notice" role="status">{notice}</div>}

      <form className="feature-card settings-section" onSubmit={saveProfile}>
        <div className="feature-card-heading"><div><span className="section-eyebrow">PROFILE</span><h3><UserRound size={18} /> Personal details</h3></div></div>
        <div className="feature-form-grid">
          <label className="field-label">Full name<input className="plain-input" minLength={2} maxLength={50} required value={profile.fullName} onChange={(event) => updateProfileField('fullName', event.target.value)} /></label>
          <label className="field-label">Email address<input className="plain-input" type="email" maxLength={254} required value={profile.email} onChange={(event) => updateProfileField('email', event.target.value)} /></label>
          <label className="field-label">Date of birth <span>(optional)</span><input className="plain-input" type="date" max={today} value={profile.dateOfBirth} onChange={(event) => updateProfileField('dateOfBirth', event.target.value)} /></label>
          {profile.email.trim().toLowerCase() !== user.email && <label className="field-label">Current password to confirm email change<input className="plain-input" type="password" autoComplete="current-password" value={profile.currentPassword} onChange={(event) => updateProfileField('currentPassword', event.target.value)} required /></label>}
        </div>
        <div className="settings-subsection">
          <h4>Cycle preferences</h4>
          <p>These are estimates for personalization. Actual period records take precedence.</p>
          <div className="feature-form-grid">
            <label className="field-label">Average cycle length<input className="plain-input" type="number" min="15" max="60" step="1" value={profile.averageCycleLength} onChange={(event) => updateProfileField('averageCycleLength', event.target.value)} placeholder="Not set" /></label>
            <label className="field-label">Average period duration<input className="plain-input" type="number" min="1" max="15" step="1" value={profile.averagePeriodDuration} onChange={(event) => updateProfileField('averagePeriodDuration', event.target.value)} placeholder="Not set" /></label>
          </div>
          <label className="settings-checkbox"><input type="checkbox" checked={profile.predictionPreferences.showPhaseEstimate} onChange={(event) => updatePreference('predictionPreferences', 'showPhaseEstimate', event.target.checked)} /> Show estimated cycle phase</label>
          <label className="settings-checkbox"><input type="checkbox" checked={profile.predictionPreferences.showFertileWindow} onChange={(event) => updatePreference('predictionPreferences', 'showFertileWindow', event.target.checked)} /> Show estimated fertile window</label>
        </div>
        <div className="settings-subsection">
          <h4>Notification preferences</h4>
          <label className="settings-checkbox"><input type="checkbox" checked={profile.notificationPreferences.enabled} onChange={(event) => updatePreference('notificationPreferences', 'enabled', event.target.checked)} /> Enable reminder notifications</label>
          <label className="settings-checkbox"><input type="checkbox" checked={profile.notificationPreferences.periodReminders} onChange={(event) => updatePreference('notificationPreferences', 'periodReminders', event.target.checked)} /> Upcoming period reminders</label>
          <label className="settings-checkbox"><input type="checkbox" checked={profile.notificationPreferences.symptomReminders} onChange={(event) => updatePreference('notificationPreferences', 'symptomReminders', event.target.checked)} /> Daily symptom logging reminder</label>
          <div className="feature-form-grid">
            <label className="field-label">Daily reminder time<input className="plain-input" type="time" value={profile.notificationPreferences.reminderTime} onChange={(event) => updatePreference('notificationPreferences', 'reminderTime', event.target.value)} /></label>
            <div className="permission-control"><span>Browser permission: <strong>{permission}</strong></span><button className="button button-outline" type="button" onClick={requestNotificationPermission} disabled={permission === 'granted'}><Bell size={15} /> {permission === 'granted' ? 'Enabled' : 'Enable browser alerts'}</button></div>
          </div>
          <p className="feature-note">Permission is requested only when you choose the button above. Browser alerts work while FlowCare is open; in-app reminders remain available.</p>
        </div>
        <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save profile and preferences'}</button>
      </form>

      <section className="feature-card settings-section">
        <div className="feature-card-heading"><div><span className="section-eyebrow">PRIVACY</span><h3><ShieldCheck size={18} /> Your data</h3></div></div>
        <p>Cycle and symptom records are private to your account. You can remove health tracking records without deleting your account.</p>
        <label className="settings-checkbox disabled-setting"><input type="checkbox" disabled checked={false} readOnly /> AI personalization consent (unavailable until AI features are introduced)</label>
        <div className="settings-actions">
          <button className="button button-danger" type="button" onClick={() => setConfirmHealthDelete(true)}><Trash2 size={16} /> Delete health data</button>
          <button className="button button-muted" type="button" onClick={signOut}><LogOut size={16} /> Sign out</button>
        </div>
      </section>

      <section className="feature-card settings-section">
        <div className="feature-card-heading"><div><span className="section-eyebrow">ACCOUNT SECURITY</span><h3><LockKeyhole size={18} /> Change password</h3></div></div>
        <form className="feature-form" onSubmit={saveNewPassword}>
          <div className="feature-form-grid">
            <label className="field-label">Current password<input className="plain-input" type="password" autoComplete="current-password" maxLength={64} required value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} /></label>
            <label className="field-label">New password<input className="plain-input" type="password" autoComplete="new-password" minLength={8} maxLength={64} required value={passwordForm.newPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))} /></label>
            <label className="field-label">Confirm new password<input className="plain-input" type="password" autoComplete="new-password" maxLength={64} required value={passwordForm.confirmNewPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, confirmNewPassword: event.target.value }))} /></label>
          </div>
          <p className="feature-note">Use 8–64 characters with uppercase and lowercase letters, a number, and a special character. Other sessions are invalidated after a password change.</p>
          <button className="button button-primary" type="submit" disabled={passwordBusy}>{passwordBusy ? 'Updating…' : 'Change password'}</button>
        </form>
      </section>

      <section className="feature-card settings-section account-delete-section">
        <div className="feature-card-heading"><div><span className="section-eyebrow">PERMANENT ACTION</span><h3>Delete account</h3></div></div>
        <p>This permanently deletes your account and its cycle, symptom, and reminder records. Enter your password and type DELETE to confirm.</p>
        <form className="feature-form" onSubmit={submitAccountDeletion}>
          <div className="feature-form-grid">
            <label className="field-label">Password<input className="plain-input" type="password" autoComplete="current-password" required value={deleteForm.password} onChange={(event) => setDeleteForm((current) => ({ ...current, password: event.target.value }))} /></label>
            <label className="field-label">Type DELETE<input className="plain-input" value={deleteForm.confirmation} onChange={(event) => setDeleteForm((current) => ({ ...current, confirmation: event.target.value }))} required /></label>
          </div>
          <button className="button button-danger" type="submit" disabled={accountBusy || deleteForm.confirmation !== 'DELETE'}>{accountBusy ? 'Deleting account…' : 'Permanently delete account'}</button>
        </form>
      </section>

      <ConfirmDialog
        open={confirmHealthDelete}
        title="Delete your health tracking data?"
        description="This removes your cycle, symptom, and reminder records, plus optional cycle averages. Your account will remain active."
        confirmLabel="Delete health data"
        busy={deleteBusy}
        onCancel={() => setConfirmHealthDelete(false)}
        onConfirm={confirmDeleteHealthData}
      />
      <p className="settings-privacy-note">FlowCare provides educational tracking and estimates, not medical diagnosis or treatment.</p>
    </div>
  );
}

export default Settings;
