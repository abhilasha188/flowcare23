import { useCallback, useEffect, useState } from 'react';
import { ArrowDownUp, CalendarPlus, Pencil, RotateCw, Trash2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import CycleCalendar from '../../components/calendar/CycleCalendar';
import CyclePreferencesModal from '../../components/calendar/CyclePreferencesModal';
import CycleSummary from '../../components/calendar/CycleSummary';
import PeriodModal from '../../components/calendar/PeriodModal';
import { getCycles, getPredictions, createCycle, updateCycle, deleteCycle } from '../../services/cycleService';
import { getApiErrorMessage } from '../../services/api';
import { formatDate, getDateRange } from '../../utils/dateUtils';
import { useAuth } from '../../hooks/useAuth';
import SectionTabs from '../../components/common/SectionTabs';
import useSectionTab from '../../hooks/useSectionTab';

const cycleTabs = [
  { id: 'calendar', label: 'Calendar' },
  { id: 'history', label: 'Cycle history' },
  { id: 'predictions', label: 'Predictions' },
];

function CycleTracker() {
  const [activeTab, setActiveTab] = useSectionTab('view', 'calendar', cycleTabs);
  const [cycles, setCycles] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pageError, setPageError] = useState('');
  const [notice, setNotice] = useState('');
  const [modalCycle, setModalCycle] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferencesBusy, setPreferencesBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const location = useLocation();
  const navigate = useNavigate();
  const { user, updateCyclePreferences } = useAuth();

  const refresh = useCallback(async () => {
    setPageError('');
    const [nextCycles, nextPredictions] = await Promise.all([getCycles(), getPredictions()]);
    setCycles(nextCycles);
    setPredictions(nextPredictions);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([getCycles(), getPredictions()])
      .then(([nextCycles, nextPredictions]) => {
        if (active) {
          setCycles(nextCycles);
          setPredictions(nextPredictions);
          setPageError('');
        }
      })
      .catch((error) => {
        if (active) setPageError(getApiErrorMessage(error, 'Could not load your cycle records.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (location.hash === '#history') {
      setActiveTab('history');
      document.getElementById('history')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash, loading, setActiveTab]);

  const preferencesOpen = Boolean(location.state?.openPreferences) || showPreferences;

  async function handleSave(values) {
    setSaving(true);
    try {
      if (modalCycle) await updateCycle(modalCycle._id, values);
      else await createCycle(values);
      setModalOpen(false);
      setModalCycle(null);
      setNotice(modalCycle ? 'Your period record has been updated.' : 'Your period has been saved.');
      try {
        await refresh();
      } catch (error) {
        setPageError(getApiErrorMessage(error, 'Period saved, but updated cycle data could not be loaded.'));
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCycle(deleteTarget._id);
      setDeleteTarget(null);
      setNotice('Your period record was deleted and cycle estimates were refreshed.');
      try {
        await refresh();
      } catch (error) {
        setPageError(getApiErrorMessage(error, 'Period deleted, but refreshed cycle data could not be loaded.'));
      }
    } catch (error) {
      setPageError(getApiErrorMessage(error, 'Could not delete this period.'));
    } finally {
      setDeleting(false);
    }
  }

  async function handleSavePreferences(values) {
    setPreferencesBusy(true);
    try {
      await updateCyclePreferences(values);
      setShowPreferences(false);
      navigate(location.pathname, { replace: true, state: null });
      setNotice('Your cycle preferences were saved. Estimates have been refreshed.');
      try {
        await refresh();
      } catch (error) {
        setPageError(getApiErrorMessage(error, 'Preferences saved, but updated estimates could not be loaded.'));
      }
    } finally {
      setPreferencesBusy(false);
    }
  }

  function openCreate() {
    setModalCycle(null);
    setModalOpen(true);
  }

  function openEdit(cycle) {
    setModalCycle(cycle);
    setModalOpen(true);
  }

  if (loading) return <LoadingSpinner label="Loading your cycle tracker…" />;

  return (
    <div className="tracker-page">
      <div className="tracker-page-heading">
        <div><span className="section-eyebrow">UNDERSTAND YOUR RHYTHM</span><h2>Cycle tracker</h2><p>A private record of the dates you choose to track.</p></div>
        <button className="button button-primary" type="button" onClick={openCreate}><CalendarPlus size={17} /> Add period</button>
      </div>
      {pageError && (
        <div className="form-alert tracker-alert" role="alert">
          <span>{pageError}</span>
          <button className="text-button" type="button" onClick={() => refresh().catch((error) => setPageError(getApiErrorMessage(error)))}><RotateCw size={14} /> Retry</button>
        </div>
      )}
      {notice && <div className="form-notice tracker-notice" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dismiss message">×</button></div>}

      <CycleSummary predictions={predictions} />
      <SectionTabs label="Cycle tracker sections" tabs={cycleTabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'calendar' && <div className="tracker-layout tab-panel" role="tabpanel">
        <CycleCalendar
          cycles={cycles}
          predictions={predictions}
          activeStartDate={month}
          onMonthChange={setMonth}
        />
        <section className="dashboard-panel tracker-side-panel">
          <div className="panel-heading"><div><span className="section-eyebrow">AT A GLANCE</span><h2>Cycle details</h2></div></div>
          <div className="tracker-detail-list">
            <div><span>Average cycle</span><strong>{predictions.averageCycleLength ? `${predictions.averageCycleLength} days` : 'Not enough data'}</strong></div>
            <div><span>Average period</span><strong>{predictions.averagePeriodDuration ? `${predictions.averagePeriodDuration} days` : 'Not enough data'}</strong></div>
            <div><span>Last recorded start</span><strong>{formatDate(predictions.lastPeriodStartDate, { month: 'short', day: 'numeric' })}</strong></div>
            <div><span>Ovulation estimate</span><strong>{formatDate(predictions.ovulationDate, { month: 'short', day: 'numeric' })}</strong></div>
          </div>
          <p className="tracker-estimate-note">Predictions are estimates from your available records and may not reflect your individual cycle.</p>
          <button className="button button-outline tracker-full-button" type="button" onClick={openCreate}><CalendarPlus size={16} /> Log a period</button>
        </section>
      </div>}

      {activeTab === 'history' && <section className="dashboard-panel history-panel tab-panel" id="history" role="tabpanel">
        <div className="panel-heading">
          <div><span className="section-eyebrow">YOUR RECORDS</span><h2>Cycle history</h2></div>
          {cycles.length > 1 && <span className="history-count">{cycles.length} records <ArrowDownUp size={13} /></span>}
        </div>
        {!cycles.length ? (
          <EmptyState
            title="Your cycle history begins here"
            description="Log a period to see your personal records and cycle estimates."
            action={<button className="button button-primary" type="button" onClick={openCreate}><CalendarPlus size={16} /> Log your first period</button>}
          />
        ) : (
          <div className="history-table-wrap">
            <table className="history-table">
              <thead><tr><th>Period start</th><th>Period end</th><th>Duration</th><th>Flow</th><th>Cycle length</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
              <tbody>
                {cycles.map((cycle) => {
                  const duration = cycle.endDate ? getDateRange(cycle.startDate, cycle.endDate).length : null;
                  return (
                    <tr key={cycle._id}>
                      <td><strong>{formatDate(cycle.startDate)}</strong></td>
                      <td>{cycle.endDate ? formatDate(cycle.endDate) : <span className="ongoing-badge">Ongoing</span>}</td>
                      <td>{duration ? `${duration} days` : '—'}</td>
                      <td>{cycle.flowIntensity ? <span className={`flow-badge flow-${cycle.flowIntensity}`}>{cycle.flowIntensity}</span> : '—'}</td>
                      <td>{cycle.cycleLength ? `${cycle.cycleLength} days` : '—'}</td>
                      <td className="history-actions">
                        <button className="table-icon-button" type="button" onClick={() => openEdit(cycle)} aria-label={`Edit period starting ${formatDate(cycle.startDate)}`}><Pencil size={15} /></button>
                        <button className="table-icon-button delete-icon" type="button" onClick={() => setDeleteTarget(cycle)} aria-label={`Delete period starting ${formatDate(cycle.startDate)}`}><Trash2 size={15} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>}

      {activeTab === 'predictions' && <section className="dashboard-panel tracker-side-panel tab-panel" role="tabpanel">
        <div className="panel-heading"><div><span className="section-eyebrow">PERSONAL ESTIMATES</span><h2>Cycle predictions</h2></div></div>
        <div className="tracker-detail-list">
          <div><span>Estimated next period</span><strong>{formatDate(predictions.predictedNextPeriodDate)}</strong></div>
          <div><span>Average cycle</span><strong>{predictions.averageCycleLength ? `${predictions.averageCycleLength} days` : 'Not enough data'}</strong></div>
          <div><span>Average period</span><strong>{predictions.averagePeriodDuration ? `${predictions.averagePeriodDuration} days` : 'Not enough data'}</strong></div>
          <div><span>Estimated ovulation</span><strong>{formatDate(predictions.ovulationDate)}</strong></div>
          <div><span>Historical consistency</span><strong>{predictions.predictionConfidence?.label || 'Limited data'}</strong></div>
        </div>
        <p className="tracker-estimate-note">Predictions are estimates from your available records and may not reflect your individual cycle. Calendar estimates cannot confirm ovulation, fertility, or a medical condition.</p>
        <button className="button button-outline tracker-full-button" type="button" onClick={() => setShowPreferences(true)}>Update cycle preferences</button>
      </section>}

      {modalOpen && (
        <PeriodModal
          key={modalCycle?._id || 'new-period'}
          cycle={modalCycle}
          busy={saving}
          onClose={() => { setModalOpen(false); setModalCycle(null); }}
          onSave={handleSave}
        />
      )}
      {preferencesOpen && (
        <CyclePreferencesModal
          user={user}
          busy={preferencesBusy}
          onClose={() => {
            setShowPreferences(false);
            if (location.state?.openPreferences) navigate(location.pathname, { replace: true, state: null });
          }}
          onSave={handleSavePreferences}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this period?"
        description="This record will be permanently removed. Your cycle estimates may change after deletion."
        confirmLabel="Delete period"
        busy={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default CycleTracker;
