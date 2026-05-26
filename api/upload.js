const { put } = require("@vercel/blob");
const { extractRequestToken } = require("../ad-video-controller");

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function readUploadBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_IMAGE_BYTES) {
        reject(new Error("图片不能超过 5 MB"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function safeFilename(filename) {
  const cleaned = String(filename || "image").replace(/[^a-zA-Z0-9._-]/g, "-");
  return cleaned || "image";
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    extractRequestToken(request.headers);
    const contentType = String(request.headers["content-type"] || "").split(";")[0];
    if (!ALLOWED_TYPES.has(contentType)) {
      response.status(400).json({ error: "仅支持 PNG、JPG 或 WebP 图片" });
      return;
    }
    const body = await readUploadBody(request);
    if (!body.length) {
      response.status(400).json({ error: "请选择需要上传的图片" });
      return;
    }
    const filename = safeFilename(request.query.filename);
    const blob = await put(`ad-inputs/${Date.now()}-${filename}`, body, {
      access: "public",
      addRandomSuffix: true,
      contentType,
    });
    response.status(200).json({ url: blob.url, pathname: blob.pathname });
  } catch (error) {
    response.status(400).json({ error: error.message || "图片上传失败" });
  }
};
