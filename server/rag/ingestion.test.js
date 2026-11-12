const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { ingestKnowledgeDirectory } = require('./ingestion');

test('does not treat README.md as a knowledge document', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'flowcare-knowledge-'));
  const readmePath = path.join(directory, 'README.md');

  try {
    await fs.writeFile(readmePath, '# Knowledge base documentation');
    await assert.rejects(
      ingestKnowledgeDirectory(directory, () => {}),
      /No \.md or \.pdf knowledge documents found/,
    );
  } finally {
    await fs.unlink(readmePath);
    await fs.rmdir(directory);
  }
});
