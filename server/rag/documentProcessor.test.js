const test = require('node:test');
const assert = require('node:assert/strict');
const { parseFrontmatter, validateMetadata } = require('./documentProcessor');

test('parses Markdown metadata and leaves body text intact', () => {
  const parsed = parseFrontmatter('---\ntitle: Periods\nsourceName: NHS\nsourceUrl: https://www.nhs.uk/periods\ncategory: Basics\n---\n\nReviewed text.');
  assert.equal(parsed.metadata.title, 'Periods');
  assert.equal(parsed.text, 'Reviewed text.');
});

test('rejects incomplete or insecure source metadata', () => {
  assert.throws(() => validateMetadata({ title: 'Guide' }, 'guide.md'), /sourceName/);
  assert.throws(() => validateMetadata({
    title: 'Guide',
    sourceName: 'NHS',
    sourceUrl: 'http://www.nhs.uk/periods',
    category: 'Basics',
  }, 'guide.md'), /HTTPS/);
});
