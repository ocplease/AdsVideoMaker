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
});

test("project includes a Vercel Blob upload route and dependency", () => {
  const routePath = path.join(__dirname, "api", "upload.js");
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "package.json"), "utf8"));

  assert.equal(fs.existsSync(routePath), true);
  assert.equal(typeof packageJson.dependencies["@vercel/blob"], "string");
});

test("deployment documentation identifies the Vercel Blob store requirement", () => {
  const readme = fs.readFileSync(path.join(__dirname, "README.md"), "utf8");
  const envExample = fs.readFileSync(path.join(__dirname, ".env.example"), "utf8");

  assert.match(readme, /Vercel Blob/);
  assert.match(envExample, /BLOB_READ_WRITE_TOKEN/);
});
