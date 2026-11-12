import { useEffect, useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Activity, CalendarDays, Clock3, RotateCw, Sparkles, Timer } from 'lucide-react';
import StatisticsCard from '../../components/dashboard/StatisticsCard';
import { getApiErrorMessage } from '../../services/api';
import { getAnalyticsData } from '../../services/analyticsService';
import SectionTabs from '../../components/common/SectionTabs';
import useSectionTab from '../../hooks/useSectionTab';

const insightTabs = [
  { id: 'cycle', label: 'Cycle analytics' },
  { id: 'symptoms', label: 'Symptoms' },
  { id: 'mood', label: 'Mood & energy' },
  { id: 'patterns', label: 'Patterns' },
];

const palette = ['#d77d9b', '#8f78bc', '#efad87', '#69a58c', '#d2a84c', '#708fc1'];

function ChartPanel({ title, description, children, empty, group, activeTab }) {
  if (group !== activeTab) return null;
  return (
    <section className="chart-card" role="tabpanel">
      <div className="chart-card-heading"><h3>{title}</h3><p>{description}</p></div>
      {empty ? <div className="chart-empty">More logged data is needed to show this chart.</div> : <div className="chart-area">{children}</div>}
    </section>
  );
}

function Insights() {
  const [activeTab, setActiveTab] = useSectionTab('view', 'cycle', insightTabs);
  const [range, setRange] = useState('90d');
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState({ key: null, data: null, error: '' });
  const requestKey = `${range}:${retry}`;
  const loading = result.key !== requestKey;
  const data = result.key === requestKey ? result.data : null;
  const error = result.key === requestKey ? result.error : '';

  useEffect(() => {
    let active = true;
    getAnalyticsData(range)
      .then((data) => {
        if (active) setResult({ key: requestKey, data, error: '' });
      })
      .catch((requestError) => {
        if (active) {
          setResult({
            key: requestKey,
            data: null,
            error: getApiErrorMessage(requestError, 'Could not load your insights.'),
          });
        }
      });
    return () => { active = false; };
  }, [range, retry, requestKey]);

  const severityByDate = useMemo(() => {
    const points = new Map();
    for (const item of data?.symptoms?.severityTrends || []) {
      if (!points.has(item.date)) points.set(item.date, { date: item.date });
      points.get(item.date)[item.name] = item.averageSeverity;
    }
    return [...points.values()];
  }, [data]);
  const severityNames = useMemo(() => (
    (data?.symptoms?.symptomFrequency || []).slice(0, 4).map((item) => item._id)
  ), [data]);

  if (loading) return <div className="feature-page"><div className="feature-loading" role="status">Preparing your personal insights…</div></div>;
  if (error || !data) {
    return (
      <div className="feature-page">
        <div className="form-alert" role="alert">{error || 'Insights are not available right now.'}</div>
        <button className="button button-outline" type="button" onClick={() => setRetry((value) => value + 1)}><RotateCw size={16} /> Retry</button>
      </div>
    );
  }

  const overview = data.overview;
  const cyclePoints = data.cycles.cycleLengths;
  const periodPoints = data.cycles.periodDurations;
  const symptomPoints = data.symptoms.symptomFrequency;
  const moodPoints = data.moods.distribution;
  const stats = [
    { icon: Timer, label: 'Average cycle length', value: overview.averageCycleLength, suffix: overview.averageCycleLength != null ? ' days' : '', detail: overview.cycleLengthSource === 'history' ? 'From recent cycle history' : overview.cycleLengthSource === 'profile' ? 'Your profile estimate' : 'More cycle records needed', tone: 'pink' },
    { icon: Clock3, label: 'Average period duration', value: overview.averagePeriodDuration, suffix: overview.averagePeriodDuration != null ? ' days' : '', detail: overview.periodDurationSource === 'history' ? 'From completed periods' : overview.periodDurationSource === 'profile' ? 'Your profile estimate' : 'More completed periods needed', tone: 'lavender' },
    { icon: CalendarDays, label: 'Cycles recorded', value: overview.totalCyclesRecorded, detail: 'Your logged period starts', tone: 'peach' },
    { icon: Activity, label: 'Symptoms per logged day', value: overview.averageSymptomsPerRecordedDay ?? '—', detail: overview.totalSymptomDays ? `${overview.totalSymptomDays} recorded days` : 'Log a daily check-in to begin', tone: 'mint' },
    { icon: Sparkles, label: 'Most frequent symptom', value: overview.mostFrequentSymptom || '—', detail: 'Based on your saved entries', tone: 'pink' },
    { icon: Activity, label: 'Most frequent mood', value: overview.mostFrequentMood || '—', detail: 'Based on your saved entries', tone: 'lavender' },
  ];

  return (
    <div className="feature-page insights-page">
      <header className="feature-heading">
        <div><span className="section-eyebrow">YOUR RECORDS, MADE CLEARER</span><h2>Insights</h2><p>Observations from the information you choose to log—not a diagnosis.</p></div>
        <label className="range-select">Date range
          <select className="plain-input" value={range} onChange={(event) => setRange(event.target.value)}>
            <option value="30d">Last 30 days</option><option value="90d">Last 90 days</option><option value="6m">Last 6 months</option><option value="12m">Last 12 months</option><option value="all">All time</option>
          </select>
        </label>
      </header>

      <section className="dashboard-section">
        <div className="section-heading"><div><span className="section-eyebrow">AT A GLANCE</span><h2>Overview</h2></div></div>
        <div className="stats-grid insights-stats">
          {stats.map((stat) => <StatisticsCard key={stat.label} {...stat} />)}
        </div>
      </section>

      <SectionTabs label="Insight categories" tabs={insightTabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="insights-grid">
        <ChartPanel group="cycle" activeTab={activeTab} title="Cycle length over time" description="Intervals between recorded period starts." empty={cyclePoints.length === 0}>
          <ResponsiveContainer width="100%" height="100%"><LineChart data={cyclePoints}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" /><YAxis unit=" d" /><Tooltip /><Line type="monotone" dataKey="value" name="Cycle length" stroke={palette[0]} strokeWidth={3} dot={{ r: 3 }} /></LineChart></ResponsiveContainer>
        </ChartPanel>
        <ChartPanel group="cycle" activeTab={activeTab} title="Period duration" description="Inclusive days between each recorded start and end." empty={periodPoints.length === 0}>
          <ResponsiveContainer width="100%" height="100%"><BarChart data={periodPoints}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" /><YAxis unit=" d" /><Tooltip /><Bar dataKey="value" name="Days" fill={palette[1]} radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
        </ChartPanel>
        <ChartPanel group="cycle" activeTab={activeTab} title="Cycle length variation" description="Difference from the previous displayed cycle." empty={data.cycles.variation.filter((point) => point.differenceFromPrevious != null).length === 0}>
          <ResponsiveContainer width="100%" height="100%"><LineChart data={data.cycles.variation}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" /><YAxis unit=" d" /><Tooltip /><Line type="monotone" dataKey="differenceFromPrevious" name="Difference" stroke={palette[2]} strokeWidth={3} /></LineChart></ResponsiveContainer>
        </ChartPanel>
        <ChartPanel group="symptoms" activeTab={activeTab} title="Symptom frequency" description="Number of times each symptom was recorded." empty={symptomPoints.length === 0}>
          <ResponsiveContainer width="100%" height="100%"><BarChart data={symptomPoints} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="_id" width={105} /><Tooltip /><Bar dataKey="count" name="Entries" fill={palette[0]} radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer>
        </ChartPanel>
        <ChartPanel group="symptoms" activeTab={activeTab} title="Symptom severity trends" description="Daily average severity for your most frequently logged symptoms." empty={severityByDate.length === 0}>
          <ResponsiveContainer width="100%" height="100%"><LineChart data={severityByDate}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" /><YAxis domain={[0, 10]} /><Tooltip /><Legend />{severityNames.map((name, index) => <Line key={name} type="monotone" dataKey={name} connectNulls stroke={palette[index % palette.length]} />)}</LineChart></ResponsiveContainer>
        </ChartPanel>
        <ChartPanel group="symptoms" activeTab={activeTab} title="Monthly symptom distribution" description="Recorded symptom entries by month." empty={data.symptoms.monthlyDistribution.length === 0}>
          <ResponsiveContainer width="100%" height="100%"><BarChart data={data.symptoms.monthlyDistribution}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" name="Entries" fill={palette[2]} radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
        </ChartPanel>
        <ChartPanel group="mood" activeTab={activeTab} title="Mood distribution" description="Moods you selected in daily entries." empty={moodPoints.length === 0}>
          <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={moodPoints} dataKey="count" nameKey="_id" innerRadius={55} outerRadius={90} paddingAngle={3}>{moodPoints.map((item, index) => <Cell key={item._id} fill={palette[index % palette.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>
        </ChartPanel>
        <ChartPanel group="mood" activeTab={activeTab} title="Energy and sleep" description="Daily self-ratings on a 1–10 scale." empty={!data.symptoms.wellnessTrends.some((point) => point.energyLevel != null || point.sleepQuality != null)}>
          <ResponsiveContainer width="100%" height="100%"><LineChart data={data.symptoms.wellnessTrends}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" /><YAxis domain={[0, 10]} /><Tooltip /><Legend /><Line type="monotone" dataKey="energyLevel" name="Energy" connectNulls stroke={palette[3]} /><Line type="monotone" dataKey="sleepQuality" name="Sleep quality" connectNulls stroke={palette[4]} /></LineChart></ResponsiveContainer>
        </ChartPanel>
      </div>

      {activeTab === 'patterns' && <section className="feature-card patterns-card tab-panel" role="tabpanel">
        <div className="feature-card-heading"><div><span className="section-eyebrow">PERSONAL OBSERVATIONS</span><h3>Cycle-phase patterns</h3></div></div>
        <p>{data.patterns.message}</p>
        {data.patterns.observations.length > 0 && <div className="pattern-list">{data.patterns.observations.map((observation) => <article className="pattern-item" key={observation.phase}><h4>{observation.phase.replaceAll('_', ' ')}</h4><p>Based on {observation.recordedDays} logged days.</p><span>Symptoms: {observation.commonSymptoms.map((item) => `${item.name} (${item.count})`).join(', ') || 'No symptoms logged'}</span><span>Moods: {observation.commonMoods.map((item) => `${item.name} (${item.count})`).join(', ') || 'No moods logged'}</span></article>)}</div>}
        <small>These patterns are descriptive only; they do not imply that a cycle phase caused a symptom or mood.</small>
      </section>}
      <p className="dashboard-disclaimer">Cycle dates and phases are estimates, not clinical findings or medical advice.</p>
    </div>
  );
}

export default Insights;
