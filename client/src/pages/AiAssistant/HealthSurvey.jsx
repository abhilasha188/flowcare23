import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Download, FileHeart, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useAuth } from '../../hooks/useAuth';
import { createCycle } from '../../services/cycleService';
import { getApiErrorMessage } from '../../services/api';

const STORAGE_KEY = 'flowcare-health-survey-v1';

const questions = [
  { id: 'age', title: 'What is your age?', type: 'number', help: 'Ages 13–120 are accepted. If you are under 18, you can complete this with a parent or guardian.' },
  { id: 'lastPeriodDate', title: 'When did your last period begin?', type: 'date', uncertain: true },
  { id: 'averageCycleLength', title: 'How long is your menstrual cycle usually?', type: 'choice', options: ['21–24 days', '25–28 days', '29–32 days', '33–35 days', 'More than 35 days', 'It varies', "I don't know"] },
  { id: 'periodDuration', title: 'How many days does your period usually last?', type: 'choice', options: ['1–2 days', '3–4 days', '5–6 days', '7–8 days', 'More than 8 days', 'It varies', "I don't know"] },
  { id: 'cycleRegularity', title: 'How predictable are your periods?', type: 'choice', options: ['Very regular', 'Mostly regular', 'Sometimes irregular', 'Frequently irregular', 'Completely unpredictable', "I'm not sure"] },
  { id: 'menstrualFlow', title: 'How would you describe your usual menstrual flow?', type: 'choice', options: ['Very light', 'Light', 'Moderate', 'Heavy', 'Very heavy', 'It varies'] },
  { id: 'physicalSymptoms', title: 'Which physical symptoms do you commonly experience?', type: 'multi', options: ['Abdominal cramps', 'Bloating', 'Headaches', 'Back pain', 'Fatigue', 'Acne', 'Breast tenderness', 'Nausea', 'Food cravings', 'Dizziness', 'Constipation', 'Diarrhea', 'No noticeable symptoms', 'Other'], other: true },
  { id: 'moodSymptoms', title: 'How does your mood usually change around your period?', type: 'multi', options: ['Irritability', 'Anxiety', 'Mood swings', 'Sadness', 'Increased sensitivity', 'Low motivation', 'Difficulty concentrating', 'Feeling overwhelmed', 'No noticeable changes', 'Other'] },
  { id: 'lifestyle', title: 'How would you describe your everyday lifestyle?', type: 'lifestyle' },
  { id: 'nutrition', title: 'How would you describe your food and hydration habits?', type: 'nutrition' },
  { id: 'healthBackground', title: 'Is there anything about your health we should consider?', type: 'health' },
  { id: 'wellnessGoals', title: 'What would you most like to improve or understand?', type: 'multi', options: ['Understand my menstrual cycle', 'Manage period pain', 'Understand mood changes', 'Improve sleep', 'Improve nutrition', 'Manage stress', 'Understand symptoms', 'Track irregular periods', 'Improve overall menstrual wellness'] },
];

function createDemoAnswers() {
  const date = new Date();
  date.setDate(date.getDate() - 18);
  const local = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return {
    age: '23',
    lastPeriodDate: local,
    averageCycleLength: '29–32 days',
    periodDuration: '5–6 days',
    cycleRegularity: 'Mostly regular',
    menstrualFlow: 'Heavy',
    physicalSymptoms: ['Abdominal cramps', 'Bloating', 'Fatigue', 'Headaches'],
    physicalSymptomsOther: '',
    moodSymptoms: ['Irritability', 'Anxiety', 'Mood swings'],
    moodSymptomsOther: '',
    sleepDuration: '5–6 hours',
    activityLevel: '1–2 times a week',
    stressLevel: 'Moderate',
    dietType: 'Vegetarian',
    waterIntake: '1–2 litres',
    healthConditions: ['None of these'],
    medicationContext: '',
    wellnessGoals: ['Understand my menstrual cycle', 'Manage period pain', 'Improve sleep'],
  };
}

function readSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && typeof saved === 'object' ? saved : null;
  } catch {
    return null;
  }
}

function downloadPdf(profile, demo) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 64;
  const add = (text, size = 11, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(String(text), pageWidth - 96);
    if (y + lines.length * (size * 1.35) > 790) {
      doc.addPage();
      y = 64;
    }
    doc.text(lines, 48, y);
    y += lines.length * (size * 1.35) + 8;
  };
  doc.setFillColor(248, 240, 243);
  doc.rect(0, 0, pageWidth, 115, 'F');
  doc.setTextColor(95, 63, 82);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('MY MENSTRUAL HEALTH & WELLNESS BLUEPRINT', 48, 64);
  doc.setFontSize(10);
  doc.setTextColor(115, 103, 112);
  doc.text(demo ? 'SAMPLE DEMO REPORT · Illustrative information only' : 'Personal wellness guide', 48, 88);
  y = 145;
  doc.setTextColor(58, 50, 58);
  add(`Generated ${new Date().toLocaleDateString()}`, 10, true);
  add('Your menstrual health profile');
  add(`Age: ${profile.age || 'Not provided'} | Last period: ${profile.lastPeriodDate || 'Not sure'} | Cycle: ${profile.averageCycleLength || 'Not provided'} | Period duration: ${profile.periodDuration || 'Not provided'}`);
  add(`Regularity: ${profile.cycleRegularity || 'Not provided'} | Flow: ${profile.menstrualFlow || 'Not provided'}`);
  add('Reported symptoms', 14, true);
  add(profile.physicalSymptoms?.length ? profile.physicalSymptoms.join(', ') : 'No symptoms reported');
  add('Mood and emotional wellness', 14, true);
  add(profile.moodSymptoms?.length ? profile.moodSymptoms.join(', ') : 'No mood changes reported');
  add('Lifestyle', 14, true);
  add(`Sleep: ${profile.sleepDuration || 'Not provided'} | Activity: ${profile.activityLevel || 'Not provided'} | Stress: ${profile.stressLevel || 'Not provided'}`);
  add(`Diet: ${profile.dietType || 'Not provided'} | Water: ${profile.waterIntake || 'Not provided'}`);
  add('Personal wellness priorities', 14, true);
  add(profile.wellnessGoals?.length ? profile.wellnessGoals.join(', ') : 'No goals selected');
  add('Practical next steps', 14, true);
  add('Track symptom timing and severity, keep a consistent sleep routine, stay hydrated, and use gentle movement when comfortable.');
  add('30-day wellness plan', 14, true);
  add('Week 1: begin daily symptom and mood check-ins. Week 2: record sleep and hydration consistently. Week 3: try a regular, gentle movement routine. Week 4: review patterns and your wellness priorities.');
  add('Important health considerations', 14, true);
  add('This report is educational and is not a medical diagnosis. Seek medical care for severe or sudden pain, very heavy bleeding, fainting, pregnancy concerns, fever, or symptoms that concern you.');
  doc.save(demo ? 'FlowCare-Sample-Menstrual-Wellness-Blueprint.pdf' : 'FlowCare-Menstrual-Wellness-Blueprint.pdf');
}

function HealthSurvey() {
  const saved = useMemo(() => readSaved(), []);
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const [answers, setAnswers] = useState(saved?.answers || {});
  const [index, setIndex] = useState(saved?.index ?? -1);
  const [completed, setCompleted] = useState(saved?.completed || false);
  const [demo, setDemo] = useState(saved?.demo || false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const { updateProfile } = useAuth();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, index, completed, demo }));
  }, [answers, index, completed, demo]);

  const question = index >= 0 ? questions[index] : null;
  const progress = index >= 0 ? ((index + 1) / questions.length) * 100 : 0;

  function setValue(id, value) {
    setAnswers((current) => ({ ...current, [id]: value }));
  }

  function toggle(id, value) {
    setAnswers((current) => {
      const currentValues = Array.isArray(current[id]) ? current[id] : [];
      return { ...current, [id]: currentValues.includes(value) ? currentValues.filter((item) => item !== value) : [...currentValues, value] };
    });
  }

  function skip() {
    setAnswers((current) => ({ ...current, skippedQuestions: [...new Set([...(current.skippedQuestions || []), question.id])] }));
    next();
  }

  function next() {
    setError('');
    if (question.id === 'age') {
      const age = Number(value);
      if (value && (!Number.isInteger(age) || age < 13 || age > 120)) {
        setError('Enter a valid age from 13 to 120.');
        return;
      }
    }
    if (question.id === 'lastPeriodDate' && value && value > today) {
      setError('The period start date cannot be in the future.');
      return;
    }
    if (index < questions.length - 1) setIndex(index + 1);
    else complete(false);
  }

  async function complete(isDemo) {
    setProcessing(true);
    setError('');
    try {
      if (!isDemo) {
        const cycleMatch = String(answers.averageCycleLength || '').match(/\d+/g);
        const periodMatch = String(answers.periodDuration || '').match(/\d+/g);
        const cycle = cycleMatch ? Number(cycleMatch[cycleMatch.length - 1]) : null;
        const period = periodMatch ? Number(periodMatch[periodMatch.length - 1]) : null;
        await updateProfile({
          averageCycleLength: cycle,
          averagePeriodDuration: period,
        });
        if (answers.lastPeriodDate) {
          await createCycle({
            startDate: answers.lastPeriodDate,
            endDate: null,
            flowIntensity: answers.menstrualFlow === 'Heavy' || answers.menstrualFlow === 'Very heavy' ? 'heavy' : answers.menstrualFlow === 'Light' || answers.menstrualFlow === 'Very light' ? 'light' : answers.menstrualFlow ? 'medium' : null,
            notes: 'Initial period date from My Wellness Survey.',
          }).catch(() => undefined);
        }
      }
      setDemo(isDemo);
      setCompleted(true);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not process your survey. Your answers are saved so you can retry.'));
    } finally {
      setProcessing(false);
    }
  }

  function autoFillDemo() {
    setAnswers(createDemoAnswers());
    setIndex(questions.length - 1);
    setCompleted(false);
    setProcessing(true);
    window.setTimeout(() => complete(true), 350);
  }

  function exitDemo() {
    setDemo(false);
    setCompleted(false);
    setAnswers({});
    setIndex(-1);
  }

  function resetSurvey() {
    setAnswers({});
    setIndex(-1);
    setCompleted(false);
    setDemo(false);
    setError('');
  }

  if (completed) {
    return (
      <section className="survey-shell survey-complete">
        {demo && <div className="demo-banner">DEMO DATA · Illustrative sample profile — no real health records were changed</div>}
        <span className="survey-success-icon"><Check size={26} /></span>
        <span className="section-eyebrow">{demo ? 'SAMPLE DEMO REPORT' : 'PERSONAL WELLNESS BLUEPRINT'}</span>
        <h2>Your Personal Wellness Blueprint Is Ready.</h2>
        <p>We’ve used your responses to create a personalized overview of your menstrual health, lifestyle, and wellness priorities.</p>
        <div className="survey-summary">
          <div><span>Cycle profile</span><strong>{answers.averageCycleLength || 'Not provided'} · {answers.menstrualFlow || 'Flow not specified'}</strong></div>
          <div><span>Reported symptoms</span><strong>{answers.physicalSymptoms?.join(', ') || 'None reported'}</strong></div>
          <div><span>Wellness goals</span><strong>{answers.wellnessGoals?.join(', ') || 'No goals selected'}</strong></div>
        </div>
        {error && <div className="form-alert" role="alert">{error}</div>}
        <div className="survey-actions">
          <button className="button button-primary" type="button" onClick={() => downloadPdf(answers, demo)}><Download size={17} /> Download my PDF</button>
          <button className="button button-outline" type="button" onClick={() => window.location.assign('/insights')}>Explore my insights</button>
          <button className="button button-muted" type="button" onClick={() => window.location.assign('/cycle-tracker')}>Go to cycle tracker</button>
        </div>
        {demo ? <button className="text-button" type="button" onClick={exitDemo}><RotateCcw size={14} /> Exit demo mode</button> : <button className="text-button" type="button" onClick={resetSurvey}>Retake survey</button>}
      </section>
    );
  }

  if (index === -1) {
    return (
      <section className="survey-shell survey-intro">
        <span className="survey-hero-icon"><FileHeart size={28} /></span>
        <span className="section-eyebrow">PERSONALIZED MENSTRUAL WELLNESS</span>
        <h2>Let&apos;s Understand Your Cycle</h2>
        <p>Your body has its own rhythm. Answer a few questions so we can understand your cycle, identify your wellness priorities, and create a personalized menstrual health guide.</p>
        <div className="survey-meta"><span><b>12</b> questions</span><span><b>2–3 min</b> to complete</span><span>Skip any question</span></div>
        <div className="survey-privacy"><ShieldCheck size={17} /><span>Your answers stay private. This educational survey is not a medical diagnosis.</span></div>
        {error && <div className="form-alert" role="alert">{error}</div>}
        <div className="survey-actions">
          <button className="button button-primary" type="button" onClick={() => setIndex(0)}><Sparkles size={17} /> Start my survey</button>
          <button className="button button-outline" type="button" onClick={autoFillDemo} disabled={processing}><RotateCcw size={16} /> Auto-Fill Demo</button>
        </div>
      </section>
    );
  }

  const value = answers[question.id];
  return (
    <section className="survey-shell">
      <div className="survey-progress-head">
        <span>Question {index + 1} of {questions.length}</span><span>{Math.round(progress)}%</span>
      </div>
      <div className="survey-progress" aria-label={`Survey ${Math.round(progress)}% complete`}><span style={{ width: `${progress}%` }} /></div>
      {processing && <div className="demo-banner">Preparing your wellness blueprint…</div>}
      <div className="survey-question" key={question.id}>
        <span className="section-eyebrow">YOUR HEALTH PROFILE</span>
        <h2>{question.title}</h2>
        {question.help && <p className="survey-question-help">{question.help}</p>}

        {(question.type === 'number' || question.type === 'date') && (
          <label className="survey-answer-field">
            <span>{question.type === 'number' ? 'Age in years' : 'Period start date'}</span>
            <input
              type={question.type}
              min={question.type === 'number' ? 13 : undefined}
              max={question.type === 'number' ? 120 : today}
              value={value || ''}
              onChange={(event) => setValue(question.id, event.target.value)}
            />
          </label>
        )}
        {question.type === 'choice' && <div className="survey-options">{question.options.map((option) => <button key={option} type="button" className={value === option ? 'is-selected' : ''} onClick={() => setValue(question.id, option)}>{option}<span>{value === option && <Check size={15} />}</span></button>)}</div>}
        {question.type === 'multi' && (
          <div className="survey-options survey-options-grid">
            {question.options.map((option) => <button key={option} type="button" className={(value || []).includes(option) ? 'is-selected' : ''} onClick={() => toggle(question.id, option)}>{option}<span>{(value || []).includes(option) && <Check size={15} />}</span></button>)}
          </div>
        )}
        {(question.type === 'multi' && question.options.includes('Other') && (value || []).includes('Other')) && (
          <label className="survey-answer-field"><span>Tell us more (optional)</span><input value={answers[`${question.id}Other`] || ''} onChange={(event) => setValue(`${question.id}Other`, event.target.value)} /></label>
        )}
        {question.type === 'lifestyle' && (
          <div className="survey-lifestyle-grid">
            {[['sleepDuration', 'Sleep', ['Less than 5 hours', '5–6 hours', '7–8 hours', 'More than 8 hours']], ['activityLevel', 'Physical activity', ['Rarely exercise', '1–2 times a week', '3–4 times a week', 'Almost every day']], ['stressLevel', 'Daily stress', ['Low', 'Moderate', 'High', 'Very high']]].map(([id, label, options]) => (
              <fieldset key={id}><legend>{label}</legend>{options.map((option) => <button key={option} type="button" className={answers[id] === option ? 'is-selected' : ''} onClick={() => setValue(id, option)}>{option}</button>)}</fieldset>
            ))}
          </div>
        )}
        {question.type === 'nutrition' && (
          <div className="survey-lifestyle-grid">
            <fieldset><legend>Diet</legend>{['Vegetarian', 'Vegan', 'Eggetarian', 'Non-vegetarian', 'Other'].map((option) => <button key={option} type="button" className={answers.dietType === option ? 'is-selected' : ''} onClick={() => setValue('dietType', option)}>{option}</button>)}</fieldset>
            <fieldset><legend>Water intake</legend>{['Less than 1 litre', '1–2 litres', '2–3 litres', 'More than 3 litres', 'Not sure'].map((option) => <button key={option} type="button" className={answers.waterIntake === option ? 'is-selected' : ''} onClick={() => setValue('waterIntake', option)}>{option}</button>)}</fieldset>
          </div>
        )}
        {question.type === 'health' && (
          <>
            <div className="survey-options survey-options-grid">{['PCOS', 'Endometriosis', 'Thyroid condition', 'Fibroids', 'Other diagnosed condition', 'None of these', 'Prefer not to say'].map((option) => <button key={option} type="button" className={(value || []).includes(option) ? 'is-selected' : ''} onClick={() => toggle(question.id, option)}>{option}<span>{(value || []).includes(option) && <Check size={15} />}</span></button>)}</div>
            <label className="survey-answer-field"><span>Medication or contraception context (optional)</span><input value={answers.medicationContext || ''} onChange={(event) => setValue('medicationContext', event.target.value)} placeholder="For example, a type of birth control or medication" /></label>
          </>
        )}
      </div>
      {error && <div className="form-alert" role="alert">{error}</div>}
      <div className="survey-navigation">
        <button className="button button-muted" type="button" disabled={index === 0 || processing} onClick={() => setIndex(index - 1)}><ArrowLeft size={16} /> Back</button>
        <button className="text-button" type="button" disabled={processing} onClick={skip}>Skip question</button>
        <button className="button button-primary" type="button" disabled={processing} onClick={next}>{index === questions.length - 1 ? (processing ? 'Preparing…' : 'Complete survey') : 'Next'} <ArrowRight size={16} /></button>
      </div>
    </section>
  );
}

export default HealthSurvey;
