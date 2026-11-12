const test = require('node:test');
const assert = require('node:assert/strict');
const { chunkText } = require('./chunking');

test('chunks normalized text within the configured maximum and preserves overlap', () => {
  const text = `${'a'.repeat(75)} ${'b'.repeat(75)} ${'c'.repeat(75)}`;
  const chunks = chunkText(text, 80, 15);

  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.length <= 80));
  assert.ok(chunks[0].endsWith(chunks[1].slice(0, 15)) || chunks[1].startsWith(chunks[0].slice(-15)));
});

test('rejects invalid overlap and returns no chunks for blank input', () => {
  assert.deepEqual(chunkText('  \n  ', 20, 2), []);
  assert.throws(() => chunkText('text', 10, 10), /overlap/);
});
