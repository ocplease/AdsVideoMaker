const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  buildStoredVideoPath,
  normalizeSavedVideo,
} = require("./ad-video-controller");

test("completed videos are stored under stable Vercel Blob paths", () => {
  assert.equal(buildStoredVideoPath("task/123", "https://cdn.example.com/out.mp4?x=1"), "generated-videos/task-123.mp4");
  assert.equal(buildStoredVideoPath("", "https://cdn.example.com/out.mov"), "generated-videos/video.mov");
});

test("saved video metadata uses blob URL when available", () => {
  assert.deepEqual(normalizeSavedVideo({
    taskId: "task-1",
    sourceUrl: "https://source.example/video.mp4",
    blob: {
      url: "https://blob.example/generated-videos/task-1.mp4",
      pathname: "generated-videos/task-1.mp4",
    },
  }), {
    task_id: "task-1",
    source_url: "https://source.example/video.mp4",
    saved_video_url: "https://blob.example/generated-videos/task-1.mp4",
    blob_pathname: "generated-videos/task-1.mp4",
  });
});

test("project declares Vercel Blob and exposes saved video endpoints", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "package.json"), "utf8"));
  const controller = fs.readFileSync(path.join(__dirname, "ad-video-controller.js"), "utf8");
  const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

  assert.equal(typeof packageJson.dependencies["@vercel/blob"], "string");
  assert.match(controller, /\/api\/videos/);
  assert.match(html, /loadSavedVideos/);
  assert.match(html, /localStorage/);
});
