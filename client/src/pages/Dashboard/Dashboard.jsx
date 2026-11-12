import { useCallback, useEffect, useState } from 'react';
import { Activity, Bell, CalendarDays, Clock3, RotateCw, SmilePlus, Timer } from 'lucide-react';
import { Link } from 'react-router-dom';
import CycleOverviewCard from '../../components/dashboard/CycleOverviewCard';
import DashboardSkeleton from '../../components/dashboard/DashboardSkeleton';
import QuickActions from '../../components/dashboard/QuickActions';
import RecentCycles from '../../components/dashboard/RecentCycles';
import StatisticsCard from '../../components/dashboard/StatisticsCard';
import { getDashboardOverview } from '../../services/dashboardService';
import { getApiErrorMessage } from '../../services/api';
import { formatDate } from '../../utils/dateUtils';

function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOverview = useCallback(async () => {
    try {
      setOverview(await getDashboardOverview());
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not load your cycle overview.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getDashboardOverview()
      .then((data) => { if (active) setOverview(data); })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError, 'Could not load your cycle overview.'));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (error) {
    return (
      <section className="dashboard-error">
        <div><Activity size={21} /><h2>We couldn't load your overview</h2><p>{error}</p></div>
        <button className="button button-primary" type="button" onClick={() => { setError(''); setLoading(true); loadOverview(); }}><RotateCw size={16} /> Try again</button>
      </section>
    );
  }

  const stats = [
    {
      icon: Timer,
      label: 'Average cycle',
      value: overview.averageCycleLength,
      suffix: overview.averageCycleLength != null ? ' days' : '',
      detail: overview.cycleLengthSource === 'history' ? 'Based on recent cycles' : overview.cycleLengthSource === 'profile' ? 'Your profile estimate' : 'Log periods to calculate',
      tone: 'pink',
    },
    {
      icon: Clock3,
      label: 'Average period',
      value: overview.averagePeriodDuration,
      suffix: overview.averagePeriodDuration != null ? ' days' : '',
      detail: overview.periodDurationSource === 'history' ? 'Based on completed periods' : overview.periodDurationSource === 'profile' ? 'Your profile estimate' : 'Log completed periods',
      tone: 'lavender',
    },
    {
      icon: CalendarDays,
      label: 'Cycles recorded',
      value: overview.totalCyclesRecorded,
      detail: overview.totalCyclesRecorded ? 'Your logged period starts' : 'Your history begins with you',
      tone: 'peach',
    },
    {
      icon: Activity,
      label: 'Last period',
      value: overview.lastPeriodStartDate ? formatDate(overview.lastPeriodStartDate, { month: 'short', day: 'numeric' }) : '—',
      detail: overview.lastPeriodStartDate ? 'Recorded start date' : 'Nothing recorded yet',
      tone: 'mint',
    },
    {
      icon: SmilePlus,
      label: 'Symptoms per logged day',
      value: overview.averageSymptomsPerRecordedDay ?? '—',
      detail: overview.totalSymptomDays ? `${overview.totalSymptomDays} recorded days` : 'Log a check-in to begin',
      tone: 'pink',
    },
    {
      icon: Activity,
      label: 'Most frequent symptom',
      value: overview.mostFrequentSymptom || '—',
      detail: 'From your own symptom history',
      tone: 'lavender',
    },
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-welcome-row">
        <div><span className="section-eyebrow">A GENTLER WAY TO CHECK IN</span><h2>Your wellness snapshot</h2><p>Thoughtful cycle information, based on the records you choose to share.</p></div>
        <Link className="button button-primary dashboard-add-button" to="/cycle-tracker"><CalendarDays size={17} /> Log period</Link>
      </div>

      <CycleOverviewCard overview={overview} />

      <section className="dashboard-section">
        <div className="section-heading">
          <div><span className="section-eyebrow">YOUR NUMBERS</span><h2>Cycle statistics</h2></div>
        </div>
        <div className="stats-grid">
          {stats.map((stat) => <StatisticsCard key={stat.label} {...stat} />)}
        </div>
      </section>

      <div className="dashboard-lower-grid">
        <RecentCycles cycles={overview.recentCycles || []} />
        <QuickActions />
      </div>
      <div className="dashboard-module-grid">
        <section className="feature-card dashboard-data-panel">
          <div className="feature-card-heading">
            <div><span className="section-eyebrow">RECENT CHECK-INS</span><h3>Symptoms and mood</h3></div>
            <Link className="text-link" to="/symptoms">Open tracker</Link>
          </div>
          {!overview.recentSymptoms?.length
            ? <p className="dashboard-empty-copy">Your recent symptom logs will appear here when you choose to add them.</p>
            : <ul className="dashboard-mini-list">{overview.recentSymptoms.map((entry) => (
              <li key={entry._id}>
                <strong>{formatDate(entry.date, { month: 'short', day: 'numeric' })}</strong>
                <span>{entry.symptoms?.map((symptom) => symptom.name).join(' · ') || 'Wellness check-in'}</span>
                {entry.mood && <small>Mood: {entry.mood}</small>}
              </li>
            ))}</ul>}
          <Link className="button button-outline" to="/symptoms"> <SmilePlus size={16} /> Log a symptom</Link>
        </section>
        <section className="feature-card dashboard-data-panel">
          <div className="feature-card-heading">
            <div><span className="section-eyebrow">UP NEXT</span><h3>Reminders</h3></div>
            <Link className="text-link" to="/reminders">Manage</Link>
          </div>
          {!overview.upcomingReminders?.length
            ? <p className="dashboard-empty-copy">No upcoming reminders. Add one whenever it would be helpful.</p>
            : <ul className="dashboard-mini-list">{overview.upcomingReminders.map((reminder) => (
              <li key={reminder._id}>
                <strong>{reminder.title}</strong>
                <span>{new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(reminder.scheduledAt))}</span>
              </li>
            ))}</ul>}
          <Link className="button button-outline" to="/reminders"><Bell size={16} /> View reminders</Link>
        </section>
        <section className="feature-card dashboard-data-panel">
          <div className="feature-card-heading"><div><span className="section-eyebrow">PERSONAL INSIGHT</span><h3>Your recent patterns</h3></div><Activity size={18} /></div>
          {overview.totalSymptomDays
            ? <p>You recorded an average of <strong>{overview.averageSymptomsPerRecordedDay ?? 0}</strong> symptoms per logged day. Your most frequent mood is <strong>{overview.mostFrequentMood || 'not yet established'}</strong>.</p>
            : <p className="dashboard-empty-copy">As you log check-ins, descriptive summaries from your own records will appear here.</p>}
          <Link className="button button-outline" to="/insights">Explore insights</Link>
          <small className="feature-note">Observations only; they do not imply cause or diagnosis.</small>
        </section>
      </div>
      <p className="dashboard-disclaimer">Cycle estimates can vary and are not a substitute for professional medical advice.</p>
    </div>
  );
}

export default Dashboard;
