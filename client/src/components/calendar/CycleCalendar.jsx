import { useMemo } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import CalendarLegend from './CalendarLegend';
import { getDateRange, localDateToDateOnly } from '../../utils/dateUtils';

function CycleCalendar({ cycles, predictions, activeStartDate, onMonthChange }) {
  const loggedDates = useMemo(() => new Set(
    cycles.flatMap((cycle) => getDateRange(
      cycle.startDate,
      cycle.endDate || predictions.todayDate || cycle.startDate,
    )),
  ), [cycles, predictions.todayDate]);

  const predictedDates = useMemo(() => {
    if (!predictions.predictedNextPeriodDate) return new Set();
    const start = predictions.predictedNextPeriodDate;
    const endDate = new Date(`${start}T00:00:00.000Z`);
    endDate.setUTCDate(endDate.getUTCDate() + (predictions.averagePeriodDuration || 1) - 1);
    const end = endDate.toISOString().slice(0, 10);
    return new Set(getDateRange(start, end).filter((day) => !loggedDates.has(day)));
  }, [predictions.predictedNextPeriodDate, predictions.averagePeriodDuration, loggedDates]);

  const fertileDates = useMemo(() => new Set(
    getDateRange(predictions.fertileWindow?.startDate, predictions.fertileWindow?.endDate)
      .filter((day) => !loggedDates.has(day) && !predictedDates.has(day)),
  ), [predictions.fertileWindow, loggedDates, predictedDates]);
  const ovulationDate = predictions.ovulationDate;

  function getTileClassName({ date, view }) {
    if (view !== 'month') return null;
    const day = localDateToDateOnly(date);
    if (loggedDates.has(day)) return 'cycle-day-logged';
    if (predictedDates.has(day)) return 'cycle-day-predicted';
    if (day === ovulationDate) return 'cycle-day-ovulation';
    if (fertileDates.has(day)) return 'cycle-day-fertile';
    return null;
  }

  return (
    <section className="dashboard-panel calendar-panel">
      <div className="panel-heading calendar-panel-heading">
        <div><span className="section-eyebrow">YOUR MONTH</span><h2>Cycle calendar</h2></div>
      </div>
      <Calendar
        activeStartDate={activeStartDate}
        onActiveStartDateChange={({ activeStartDate: nextDate }) => onMonthChange(nextDate)}
        tileClassName={getTileClassName}
        minDetail="month"
        maxDetail="month"
        next2Label={null}
        prev2Label={null}
        showNeighboringMonth
        aria-label="Cycle calendar"
      />
      <CalendarLegend />
      <p className="calendar-disclaimer">Predicted and fertile dates are estimates, not confirmed events.</p>
    </section>
  );
}

export default CycleCalendar;
