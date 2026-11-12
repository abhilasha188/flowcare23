function chunkText(text, chunkSize = 800, overlap = 100) {
  if (typeof text !== 'string' || !text.trim()) return [];
  if (!Number.isInteger(chunkSize) || chunkSize < 1) throw new Error('Chunk size must be a positive whole number.');
  if (!Number.isInteger(overlap) || overlap < 0 || overlap >= chunkSize) {
    throw new Error('Chunk overlap must be a non-negative number smaller than the chunk size.');
  }

  const normalized = text.replace(/\s+/g, ' ').trim();
  const chunks = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(start + chunkSize, normalized.length);
    if (end < normalized.length) {
      const boundary = normalized.lastIndexOf(' ', end);
      if (boundary > start + Math.floor(chunkSize * 0.6)) end = boundary;
    }

    const chunk = normalized.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end === normalized.length) break;
    start = Math.max(start + 1, end - overlap);
  }
  return chunks;
}

module.exports = { chunkText };
