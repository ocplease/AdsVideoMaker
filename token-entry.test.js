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
