const fs = require('node:fs/promises');
const path = require('node:path');

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) throw new Error('Markdown knowledge documents must begin with YAML-style frontmatter.');
  const metadata = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z]+):\s*(.*?)\s*$/);
    if (field) metadata[field[1]] = field[2].replace(/^(['"])(.*)\1$/, '$2').trim();
  }
  return { metadata, text: markdown.slice(match[0].length).trim() };
}

function validateMetadata(metadata, filename) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new Error(`${filename} must contain a metadata object.`);
  }
  const required = ['title', 'sourceName', 'sourceUrl', 'category'];
  for (const field of required) {
    if (typeof metadata[field] !== 'string' || !metadata[field].trim()) {
      throw new Error(`${filename} is missing required metadata "${field}".`);
    }
  }
  let sourceUrl;
  try {
    sourceUrl = new URL(metadata.sourceUrl);
  } catch {
    throw new Error(`${filename} must include a valid HTTPS sourceUrl.`);
  }
  if (sourceUrl.protocol !== 'https:') throw new Error(`${filename} sourceUrl must use HTTPS.`);
  return {
    title: metadata.title.trim().slice(0, 200),
    sourceName: metadata.sourceName.trim().slice(0, 120),
    sourceUrl: sourceUrl.toString(),
    category: metadata.category.trim().slice(0, 80),
  };
}

async function readDocument(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  let metadata;
  let text;

  if (extension === '.md') {
    const markdown = await fs.readFile(filePath, 'utf8');
    const parsed = parseFrontmatter(markdown);
    metadata = parsed.metadata;
    text = parsed.text;
  } else if (extension === '.pdf') {
    const sidecar = `${filePath}.json`;
    let rawMetadata;
    try {
      rawMetadata = JSON.parse(await fs.readFile(sidecar, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') throw new Error(`${path.basename(filePath)} requires a metadata sidecar named "${path.basename(sidecar)}".`);
      throw new Error(`Could not read ${path.basename(sidecar)}: ${error.message}`);
    }
    metadata = rawMetadata;
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: await fs.readFile(filePath) });
    try {
      const result = await parser.getText();
      text = result.text;
    } finally {
      await parser.destroy();
    }
  } else {
    throw new Error(`Unsupported knowledge document type: ${extension || '(no extension)'}.`);
  }

  const cleanText = text.replace(/\u0000/g, '').replace(/\s+/g, ' ').trim();
  if (!cleanText) throw new Error(`${path.basename(filePath)} contains no extractable text.`);
  return { metadata: validateMetadata(metadata, path.basename(filePath)), text: cleanText };
}

module.exports = { parseFrontmatter, readDocument, validateMetadata };
