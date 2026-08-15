const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const modulePath = path.join(__dirname, "../dist/config/rag.js");
const numericEnvKeys = [
  "EMBEDDING_BATCH_SIZE",
  "RAG_EMBEDDING_TIMEOUT_MS",
  "RAG_EMBEDDING_MAX_RETRIES",
  "RAG_EMBEDDING_RETRY_BASE_MS",
  "QDRANT_TIMEOUT_MS",
  "QDRANT_UPSERT_MAX_BYTES",
  "RAG_CHUNK_SIZE",
  "RAG_CHUNK_OVERLAP",
  "RAG_VECTOR_CANDIDATES",
  "RAG_KEYWORD_CANDIDATES",
  "RAG_FINAL_TOP_K",
  "RAG_WORKER_POLL_MS",
  "RAG_WORKER_MAX_ATTEMPTS",
  "RAG_WORKER_RETRY_BASE_MS",
  "RAG_HTTP_TIMEOUT_MS",
  "RAG_RETRIEVAL_TRACE_SAMPLE_RATE",
  "RAG_RETRIEVAL_TRACE_RETENTION_DAYS",
];

function loadWithNumericEnv(value) {
  const previous = new Map(numericEnvKeys.map((key) => [key, process.env[key]]));
  for (const key of numericEnvKeys) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  delete require.cache[modulePath];
  try {
    return require(modulePath).ragConfig;
  } finally {
    for (const [key, original] of previous) {
      if (original === undefined) delete process.env[key];
      else process.env[key] = original;
    }
    delete require.cache[modulePath];
  }
}

for (const [label, value] of [["unset", undefined], ["blank", "  "]]) {
  test(`RAG numeric defaults are preserved when environment values are ${label}`, { concurrency: false }, () => {
    const config = loadWithNumericEnv(value);
    assert.equal(config.embeddingBatchSize, 64);
    assert.equal(config.embeddingTimeoutMs, 30_000);
    assert.equal(config.qdrantTimeoutMs, 30_000);
    assert.equal(config.qdrantUpsertMaxBytes, 24 * 1024 * 1024);
    assert.equal(config.chunkSize, 800);
    assert.equal(config.chunkOverlap, 120);
    assert.equal(config.vectorCandidates, 40);
    assert.equal(config.keywordCandidates, 40);
    assert.equal(config.finalTopK, 8);
    assert.equal(config.workerMaxAttempts, 5);
    assert.equal(config.retrievalTraceSampleRate, 1);
    assert.equal(config.retrievalTraceRetentionDays, 14);
  });
}
