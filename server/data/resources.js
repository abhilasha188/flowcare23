const lastReviewed = '2026-11-12';

const resources = [
  {
    slug: 'cycle-basics',
    title: 'Understanding period tracking',
    category: 'Menstrual cycle basics',
    description: 'An NHS guide to periods and questions to discuss with a healthcare professional.',
    content: [
      'Use this NHS patient guide as the primary source for information about periods. FlowCare can help you record dates and personal observations, but it does not assess whether a cycle is medically typical.',
      'If a change in your periods worries you, take your records to a qualified healthcare professional rather than relying on an app estimate.',
    ],
    sourceOrganization: 'NHS',
    sourceUrl: 'https://www.nhs.uk/conditions/periods/',
    lastReviewed,
  },
  {
    slug: 'menstrual-phases',
    title: 'Periods and cycle changes',
    category: 'Menstrual phases',
    description: 'Read the NHS overview of periods and changes that may occur across a cycle.',
    content: [
      'The NHS overview is the primary reading source for this topic. FlowCare estimates dates from entries you provide; it cannot confirm ovulation or identify a biological cycle phase.',
      'Use the tracker as a personal log, and ask a clinician about concerns that are important to you.',
    ],
    sourceOrganization: 'NHS',
    sourceUrl: 'https://www.nhs.uk/conditions/periods/',
    lastReviewed,
  },
  {
    slug: 'hormonal-changes',
    title: 'Cycle-related changes',
    category: 'Hormonal changes',
    description: 'A starting point for learning about periods and discussing cycle-related changes.',
    content: [
      'This reading link points to the NHS patient guide to periods. FlowCare does not measure hormone levels, and a logged mood or symptom cannot establish a hormonal cause.',
      'For personal questions about symptoms or treatment, seek advice from a qualified healthcare professional.',
    ],
    sourceOrganization: 'NHS',
    sourceUrl: 'https://www.nhs.uk/conditions/periods/',
    lastReviewed,
  },
  {
    slug: 'menstrual-hygiene',
    title: 'Periods: information and support',
    category: 'Menstrual hygiene',
    description: 'Use the NHS period guide for patient information and links to further support.',
    content: [
      'This page directs you to NHS information about periods. Product choice and comfort are personal; follow product instructions and consult a healthcare professional if you have a concern.',
      'FlowCare is a private tracking tool and does not provide hygiene or treatment recommendations.',
    ],
    sourceOrganization: 'NHS',
    sourceUrl: 'https://www.nhs.uk/conditions/periods/',
    lastReviewed,
  },
  {
    slug: 'premenstrual-syndrome',
    title: 'Premenstrual syndrome (PMS)',
    category: 'PMS',
    description: 'The NHS patient guide explains PMS and when to seek help.',
    content: [
      'Read the NHS guide for clinically reviewed information about PMS. A symptom logged in FlowCare is only a personal observation and does not diagnose PMS.',
      'If symptoms are difficult to manage or affect daily life, discuss them with a healthcare professional.',
    ],
    sourceOrganization: 'NHS',
    sourceUrl: 'https://www.nhs.uk/conditions/pre-menstrual-syndrome/',
    lastReviewed,
  },
  {
    slug: 'period-pain',
    title: 'Period pain',
    category: 'Period cramps',
    description: 'The NHS guide covers period pain and options for seeking support.',
    content: [
      'Use the NHS page as the primary source for information about period pain. This resource does not recommend a treatment or determine the cause of an individual’s pain.',
      'Seek professional advice if pain is severe, changing, or concerning to you.',
    ],
    sourceOrganization: 'NHS',
    sourceUrl: 'https://www.nhs.uk/conditions/period-pain/',
    lastReviewed,
  },
  {
    slug: 'pcos-awareness',
    title: 'Polycystic ovary syndrome (PCOS)',
    category: 'PCOS awareness',
    description: 'The NHS patient guide provides information about PCOS and assessment.',
    content: [
      'This resource links to the NHS overview of PCOS. Cycle tracking alone cannot identify or rule out PCOS; diagnosis and care decisions belong with a qualified healthcare professional.',
      'Use the source page for current patient information and discuss personal symptoms with a clinician.',
    ],
    sourceOrganization: 'NHS',
    sourceUrl: 'https://www.nhs.uk/conditions/polycystic-ovary-syndrome-pcos/',
    lastReviewed,
  },
  {
    slug: 'endometriosis-awareness',
    title: 'Endometriosis',
    category: 'Endometriosis awareness',
    description: 'The NHS patient guide offers information about endometriosis and getting help.',
    content: [
      'This resource links to the NHS overview of endometriosis. FlowCare does not screen for, diagnose, or rule out endometriosis.',
      'If you have symptoms or concerns, use the NHS page as a starting point and speak with a qualified healthcare professional.',
    ],
    sourceOrganization: 'NHS',
    sourceUrl: 'https://www.nhs.uk/conditions/endometriosis/',
    lastReviewed,
  },
  {
    slug: 'nutrition-and-wellness',
    title: 'Healthy eating',
    category: 'Nutrition and wellness',
    description: 'The NHS Eatwell guide is a general source for balanced eating information.',
    content: [
      'For general nutrition information, consult the NHS Eatwell guide. This resource does not prescribe a diet for menstrual symptoms or replace advice tailored to your health needs.',
      'Speak with a registered healthcare professional about individual nutrition questions.',
    ],
    sourceOrganization: 'NHS',
    sourceUrl: 'https://www.nhs.uk/live-well/eat-well/',
    lastReviewed,
  },
];

module.exports = resources;
