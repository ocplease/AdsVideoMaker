const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { extractRequestToken, loadApiConfig } = require("./ad-video-controller");

test("deployment config can provide only the API base URL", () => {
  assert.deepEqual(loadApiConfig({ AD_VIDEO_BASE_URL: "https://api.example.invalid/" }), {
    baseUrl: "https://api.example.invalid",
    clientId: "",
  });
});

test("token is extracted from the per-request browser header", () => {
  assert.equal(extractRequestToken({ "x-ad-video-token": "user-token" }), "user-token");
  assert.throws(() => extractRequestToken({}), /请先填写 API Token/);
});

test("web form requests the token from the user and sends it only as a request header", () => {
  const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

  assert.match(html, /id="apiToken" type="password"/);
  assert.match(html, /"X-Ad-Video-Token": apiToken/);
  assert.doesNotMatch(html, /values\.AD_VIDEO_TOKEN|values\.apiToken/);
});

test("web form visibly indicates when a saved local token has been loaded", () => {
  const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

  assert.match(html, /id="tokenState"/);
  assert.match(html, /本地 Token 已填入/);
  assert.match(html, /updateTokenState/);
});

test("web form shows global typed status messages near the top of the dashboard", () => {
  const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

  assert.match(html, /id="statusBanner"/);
  assert.match(html, /class="status-banner info"/);
  assert.match(html, /function setStatus\(message, type = "info"\)/);
  assert.match(html, /statusBanner\.className = `status-banner \$\{type\}`/);
  assert.match(html, /setStatus\([^)]*, "success"\)/);
  assert.match(html, /setStatus\([^)]*, "warning"\)/);
  assert.match(html, /setStatus\([^)]*, "error"\)/);
});

test("task table uses balanced column widths with a wider video column", () => {
  const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

  assert.match(html, /<col class="task-col-video">/);
  assert.match(html, /\.task-col-video \{ width:34%; \}/);
  assert.match(html, /\.task-col-status \{ width:11%; \}/);
  assert.match(html, /\.task-col-action \{ width:8%; \}/);
});

test("create requests include debug request ids and browser diagnostics", () => {
  const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  const routeSource = fs.readFileSync(path.join(__dirname, "api", "create.js"), "utf8");
  const controller = fs.readFileSync(path.join(__dirname, "ad-video-controller.js"), "utf8");

  assert.match(html, /const requestId = buildRequestId\("create"\)/);
  assert.match(html, /"X-Ad-Debug-Request-Id": requestId/);
  assert.match(html, /console\.error\("\[ad-video\] create request failed"/);
  assert.match(routeSource, /console\.error\("\[ad-video\] create failed"/);
  assert.match(controller, /console\.error\("\[ad-video\] create failed"/);
  assert.doesNotMatch(html, /console\.log\(apiToken|console\.error\(apiToken/);
});

test("status polling transport errors keep tasks pending for retry", () => {
  const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

  assert.match(html, /catch \(error\) \{\s*updateStoredTask\(taskId, \{ status: "pending"/);
  assert.doesNotMatch(html, /catch \(error\) \{\s*updateStoredTask\(taskId, \{ status: "failed"/);
});

test("mobile layout stacks controls and renders task rows as cards", () => {
  const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

  assert.match(html, /@media \(max-width:560px\)/);
  assert.match(html, /\.columns \{ grid-template-columns:1fr; \}/);
  assert.match(html, /\.upload-row, \.actions \{ flex-direction:column; align-items:stretch; \}/);
  assert.match(html, /table, thead, tbody, th, td, tr \{ display:block; \}/);
  assert.match(html, /td::before \{ content:attr\(data-label\);/);
  assert.match(html, /<td data-label="视频">/);
});
