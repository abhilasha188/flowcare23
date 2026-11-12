const path = require('node:path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });
const { DEFAULT_KNOWLEDGE_DIR, ingestKnowledgeDirectory } = require('../rag/ingestion');

async function main() {
  const mongoUri = process.env.MONGO_URI?.trim();
  if (!mongoUri) throw new Error('MONGO_URI is not configured in the project-root .env file.');

  await mongoose.connect(mongoUri);
  try {
    const result = await ingestKnowledgeDirectory(DEFAULT_KNOWLEDGE_DIR);
    console.log(`Knowledge ingestion finished: ${result.documents} documents, ${result.chunks} chunks.`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(`Knowledge ingestion failed: ${error.message}`);
  process.exitCode = 1;
});
