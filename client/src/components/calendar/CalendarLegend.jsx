const items = [
  { className: 'legend-logged', label: 'Logged period' },
  { className: 'legend-predicted', label: 'Predicted period' },
  { className: 'legend-ovulation', label: 'Estimated ovulation' },
  { className: 'legend-fertile', label: 'Estimated fertile window' },
];

function CalendarLegend() {
  return (
    <div className="calendar-legend" aria-label="Calendar legend">
      {items.map(({ className, label }) => (
        <span key={label}><i className={className} aria-hidden="true" />{label}</span>
      ))}
    </div>
  );
}

export default CalendarLegend;
