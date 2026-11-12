import { ArrowRight, CalendarHeart, CircleHelp, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate } from '../../utils/dateUtils';

const phaseLabels = {
  menstrual: 'Menstrual phase',
  follicular: 'Follicular phase',
  ovulation: 'Ovulation estimate',
  ovulation_window: 'Fertile window estimate',
  luteal: 'Luteal phase',
  unknown: 'Cycle phase unavailable',
};

function CycleOverviewCard({ overview }) {
  const hasCycles = overview.totalCyclesRecorded > 0;
  if (!hasCycles) {
    return (
      <section className="cycle-overview-card overview-empty">
        <div className="overview-empty-icon"><CalendarHeart size={23} /></div>
        <div>
          <span className="section-eyebrow">YOUR CYCLE OVERVIEW</span>
          <h2>Get to know your rhythm</h2>
          <p>Start tracking your cycle to receive personalized cycle insights.</p>
        </div>
        <Link className="button button-primary" to="/cycle-tracker">
          Log your period <ArrowRight size={16} />
        </Link>
      </section>
    );
  }

  const nextDate = overview.predictedNextPeriodDate;
  const nextDays = overview.daysUntilNextPeriod;
  const dayText = nextDays == null
    ? 'No estimate yet'
    : nextDays < 0
      ? `${Math.abs(nextDays)} days past estimate`
      : nextDays === 0
        ? 'Estimated for today'
        : `About ${nextDays} days away`;

  return (
    <section className="cycle-overview-card">
      <div className="overview-card-top">
        <div>
          <span className="section-eyebrow">YOUR CYCLE OVERVIEW</span>
          <h2>Your cycle, at a glance</h2>
        </div>
        <span className="phase-pill"><Sparkles size={14} /> {phaseLabels[overview.currentPhase] || phaseLabels.unknown}</span>
      </div>
      <div className="cycle-overview-grid">
        <div className="cycle-day-block">
          <span className="cycle-day-number">{overview.currentCycleDay ?? '—'}</span>
          <span className="cycle-day-label">cycle day</span>
        </div>
        <div className="overview-dates">
          <div>
            <span>Last recorded period</span>
            <strong>{formatDate(overview.lastPeriodStartDate)}</strong>
          </div>
          <div>
            <span>Next period <small>Estimated</small></span>
            <strong>{formatDate(nextDate)}</strong>
            {nextDate && <em>{dayText}</em>}
          </div>
        </div>
      </div>
      <div className="overview-estimate-grid">
        <div>
          <span>Ovulation <small>Estimate</small></span>
          <strong>{overview.ovulationDate
            ? formatDate(overview.ovulationDate)
            : overview.predictionPreferences?.showFertileWindow === false ? 'Hidden in settings' : 'Not enough data'}</strong>
        </div>
        <div>
          <span>Fertile window <small>Estimate</small></span>
          <strong>{overview.fertileWindow
            ? `${formatDate(overview.fertileWindow.startDate)} – ${formatDate(overview.fertileWindow.endDate)}`
            : overview.predictionPreferences?.showFertileWindow === false ? 'Hidden in settings' : 'Not enough data'}</strong>
        </div>
        <div>
          <span>Historical consistency</span>
          <strong>{overview.predictionConfidence?.label || 'Limited data'}</strong>
        </div>
      </div>
      <div className="prediction-disclaimer">
        <CircleHelp size={15} />
        <span>Cycle phases, ovulation, and dates are estimates based on available records; they are not confirmed biological events or medical advice.</span>
      </div>
      <Link className="overview-link" to="/cycle-tracker">View cycle tracker <ArrowRight size={15} /></Link>
    </section>
  );
}

export default CycleOverviewCard;
