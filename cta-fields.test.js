const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { buildDefaultRequest } = require("./ad-video-controller");

test("default request includes an optional empty CTA background image field", () => {
  assert.equal(buildDefaultRequest().ctaBackgroundImage, "");
});

test("web form exposes explicit CTA text and CTA background image reference fields", () => {
  const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

  assert.match(html, /for="ctaText">CTA 行动文案/);
  assert.match(html, /id="ctaBackgroundImage"/);
  assert.match(html, /ctaBackgroundImage/);
});
