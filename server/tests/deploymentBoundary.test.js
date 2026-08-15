const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");

process.env.AI_NOVEL_DATABASE_MODE ??= "postgresql";
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@127.0.0.1:5432/ai_novel_deployment_test";

const { createApp } = require("../dist/app.js");
const { assertProductionAuthConfigured } = require("../dist/middleware/auth.js");

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function restoreEnv(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

test("production deployment requires access credentials", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalUsername = process.env.AI_NOVEL_AUTH_USERNAME;
  const originalPassword = process.env.AI_NOVEL_AUTH_PASSWORD;
  try {
    process.env.NODE_ENV = "production";
    delete process.env.AI_NOVEL_AUTH_USERNAME;
    delete process.env.AI_NOVEL_AUTH_PASSWORD;
    assert.throws(assertProductionAuthConfigured, /AI_NOVEL_AUTH_USERNAME/);
  } finally {
    restoreEnv("NODE_ENV", originalNodeEnv);
    restoreEnv("AI_NOVEL_AUTH_USERNAME", originalUsername);
    restoreEnv("AI_NOVEL_AUTH_PASSWORD", originalPassword);
  }
});

test("health stays public while the application and SPA require Basic auth", async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalUsername = process.env.AI_NOVEL_AUTH_USERNAME;
  const originalPassword = process.env.AI_NOVEL_AUTH_PASSWORD;
  const originalWebDist = process.env.AI_NOVEL_WEB_DIST_DIR;
  const webDist = fs.mkdtempSync(path.join(os.tmpdir(), "ai-novel-web-"));
  fs.writeFileSync(path.join(webDist, "index.html"), "<html>railway-ready</html>");

  process.env.NODE_ENV = "production";
  process.env.AI_NOVEL_AUTH_USERNAME = "writer";
  process.env.AI_NOVEL_AUTH_PASSWORD = "secret";
  process.env.AI_NOVEL_WEB_DIST_DIR = webDist;

  const server = http.createServer(createApp());
  const port = await listen(server);
  try {
    const health = await fetch(`http://127.0.0.1:${port}/api/health`);
    const unauthorized = await fetch(`http://127.0.0.1:${port}/`);
    const authorized = await fetch(`http://127.0.0.1:${port}/novels/demo`, {
      headers: { Authorization: `Basic ${Buffer.from("writer:secret").toString("base64")}` },
    });

    assert.equal(health.status, 200);
    assert.equal(unauthorized.status, 401);
    assert.match(unauthorized.headers.get("www-authenticate") ?? "", /Basic/);
    assert.equal(authorized.status, 200);
    assert.match(await authorized.text(), /railway-ready/);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    fs.rmSync(webDist, { recursive: true, force: true });
    restoreEnv("NODE_ENV", originalNodeEnv);
    restoreEnv("AI_NOVEL_AUTH_USERNAME", originalUsername);
    restoreEnv("AI_NOVEL_AUTH_PASSWORD", originalPassword);
    restoreEnv("AI_NOVEL_WEB_DIST_DIR", originalWebDist);
  }
});
