import { CalendarDays, Sparkles } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';

function CycleSummary({ predictions }) {
  return (
    <section className="tracker-summary">
      <div className="tracker-summary-icon"><CalendarDays size={21} /></div>
      <div className="tracker-summary-main">
        <span className="section-eyebrow">CURRENT CYCLE</span>
        <h2>{predictions.currentCycleDay ? `Day ${predictions.currentCycleDay}` : 'Start with a period record'}</h2>
        <p>{predictions.currentPhase === 'unknown' ? 'Cycle phase unavailable with current information.' : `Estimated phase: ${predictions.currentPhase.replaceAll('_', ' ')}`}</p>
      </div>
      <div className="tracker-summary-prediction">
        <span><Sparkles size={14} /> Next period · Estimated</span>
        <strong>{formatDate(predictions.predictedNextPeriodDate)}</strong>
        {predictions.predictionSource === 'profile_estimate' && <small>Based on your profile preference</small>}
        {predictions.predictionSource === 'historical_cycles' && <small>Based on your recent history</small>}
      </div>
    </section>
  );
}

export default CycleSummary;
