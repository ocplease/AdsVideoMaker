const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("page includes upload controls for both API image reference fields", () => {
  const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

  assert.match(html, /id="mainImageFile"/);
  assert.match(html, /id="ctaImageFile"/);
  assert.match(html, /\/api\/upload/);
  assert.match(html, /uploadImage/);
  assert.match(html, /new FormData\(\)/);
  assert.match(html, /formData\.append\("file", file\)/);
  assert.match(html, /formData\.append\("name", file\.name\)/);
});

test("project forwards image uploads to the configured image upload API", () => {
  const routePath = path.join(__dirname, "api", "upload.js");
  const routeSource = fs.readFileSync(routePath, "utf8");

  assert.equal(fs.existsSync(routePath), true);
  assert.doesNotMatch(routeSource, /@vercel\/blob/);
  assert.match(routeSource, /uploadImage/);
});

test("deployment documentation identifies the configured image upload API", () => {
  const readme = fs.readFileSync(path.join(__dirname, "README.md"), "utf8");
  const envExample = fs.readFileSync(path.join(__dirname, ".env.example"), "utf8");

  assert.match(readme, /\/images\/upload/);
  assert.match(readme, /20 MB/);
  assert.match(envExample, /AD_VIDEO_BASE_URL/);
});
