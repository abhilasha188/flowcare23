const test = require('node:test');
const assert = require('node:assert/strict');
const { getDeterministicSafetyResponse } = require('./safety');

test('routes urgent symptom descriptions to urgent care guidance', () => {
  const answer = getDeterministicSafetyResponse('I have severe pelvic pain and feel faint');
  assert.match(answer, /urgent medical care/i);
});

test('refuses diagnosis and medication instructions deterministically', () => {
  assert.match(getDeterministicSafetyResponse('Do I have PCOS?'), /cannot diagnose/i);
  assert.match(getDeterministicSafetyResponse('What dose should I take?'), /cannot prescribe medication/i);
  assert.match(getDeterministicSafetyResponse('Should I stop my treatment?'), /cannot prescribe medication/i);
});

test('allows general education questions through to retrieval', () => {
  assert.equal(getDeterministicSafetyResponse('What is a period diary?'), null);
});
