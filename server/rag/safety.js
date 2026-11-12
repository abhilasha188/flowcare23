const URGENT_SYMPTOMS = /\b(severe (?:abdominal|pelvic|period|stomach)? ?pain|very heavy bleeding|excessive bleeding|uncontrolled bleeding|bleeding heavily|faint(?:ing|ed)?|passed out|difficulty breathing|trouble breathing|shortness of breath|in immediate danger)\b/i;
const DIAGNOSIS_REQUEST = /\b(do i have|could i have|am i suffering from|diagnose me|is this (?:pcos|endometriosis|infertility))\b/i;
const TREATMENT_REQUEST = /\b(what dose|how much .* (?:take|medication)|should i (?:stop|start|change|skip|continue) (?:taking|my (?:medication|medicine|prescription|pills|treatment))|prescribe|which medicine should i take)\b/i;

const NOT_ENOUGH_INFORMATION = 'I could not find enough relevant information in FlowCare’s reviewed educational sources to answer that reliably. Please consult a qualified healthcare professional for advice about your situation.';

function getDeterministicSafetyResponse(message) {
  if (URGENT_SYMPTOMS.test(message)) {
    return 'Some symptoms can require urgent attention. If you have severe pain, very heavy bleeding, fainting, trouble breathing, or feel in immediate danger, contact your local emergency service or seek urgent medical care now. FlowCare cannot determine the cause of your symptoms.';
  }
  if (DIAGNOSIS_REQUEST.test(message)) {
    return 'I cannot diagnose or rule out a medical condition. Cycle tracking and chat responses cannot confirm conditions such as PCOS or endometriosis. A qualified healthcare professional can assess your symptoms and discuss appropriate next steps.';
  }
  if (TREATMENT_REQUEST.test(message)) {
    return 'I cannot prescribe medication or advise you to start, stop, or change prescribed treatment. Please ask your prescribing clinician or pharmacist for advice specific to you.';
  }
  return null;
}

module.exports = { NOT_ENOUGH_INFORMATION, getDeterministicSafetyResponse };
