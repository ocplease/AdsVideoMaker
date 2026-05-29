const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { URL } = require("node:url");
const { list, put } = require("@vercel/blob");
const { Agent, ProxyAgent, request: undiciRequest } = require("undici");

const ROOT_DIR = __dirname;
const CONFIG_PATH = path.join(ROOT_DIR, "api-key.txt");
const PAGE_PATH = path.join(ROOT_DIR, "index.html");
const HOST = "127.0.0.1";
const PORT = Number(process.env.AD_VIDEO_PORT || 4173);
const MAX_IMAGE_UPLOAD_BYTES = 20 * 1024 * 1024;
const VIDEO_BLOB_PREFIX = "generated-videos/";

function buildDefaultRequest() {
  return {
    brand: "HarmonyOS 播客",
    title: "HarmonyOS 播客 - 通勤途中，听见好内容",
    mainReferenceImage:
      "https://sns-webpic-qc.xhscdn.com/202605251613/aca5aa4e83849366a6b4249547e7a425/1040g2sg31jbvbd6n2ifg5phi0p60u49lg7r2dj0!nd_dft_wlteh_webp_3",
    ctaText: "立即体验",
    ctaBackgroundImage: "",
    sellingPoints: [
      "精选内容，随时开听",
      "让碎片时间，更有收获",
      "通勤路上，轻松开启高品质收听体验",
    ],
    mode: "pro",
    execMode: "quality",
    ratio: "9:16",
    resolution: "1080p",
    duration: 15,
  };
}

function parseApiConfig(content) {
  const baseUrlMatch = content.match(/https?:\/\/[^\s│]+/);
  const tokenMatch = content.match(/Token\s*│\s*(\S+)/i);
  const clientIdMatch = content.match(/client_id\s*│\s*(\S+)/i);
  if (!baseUrlMatch || !tokenMatch) {
    throw new Error("api-key.txt 中缺少 Base URL 或 Token");
  }
  return {
    baseUrl: baseUrlMatch[0].replace(/\/$/, ""),
    token: tokenMatch[1],
    clientId: clientIdMatch ? clientIdMatch[1] : "",
  };
}

function loadApiConfig(environment = process.env) {
  if (environment.AD_VIDEO_BASE_URL) {
    return {
      baseUrl: environment.AD_VIDEO_BASE_URL.replace(/\/$/, ""),
      clientId: environment.AD_VIDEO_CLIENT_ID || "",
    };
  }
  const localConfig = parseApiConfig(fs.readFileSync(CONFIG_PATH, "utf8"));
  return { baseUrl: localConfig.baseUrl, clientId: localConfig.clientId };
}

function extractRequestToken(headers = {}) {
  const token = headers["x-ad-video-token"] || headers["X-Ad-Video-Token"] || "";
  if (!token.trim()) {
    throw new Error("请先填写 API Token");
  }
  return token.trim();
}

function buildAuthHeaders(config) {
  return {
    Authorization: `Bearer ${config.token}`,
    "Content-Type": "application/json",
  };
}

function buildUploadHeaders(token, contentType, contentLength) {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": contentType,
  };
  if (contentLength) {
    headers["Content-Length"] = contentLength;
  }
  return headers;
}

function resolveProxyUrl(environment = process.env) {
  return environment.HTTPS_PROXY || environment.https_proxy || environment.HTTP_PROXY || environment.http_proxy || "";
}

function buildDispatcher() {
  const proxyUrl = resolveProxyUrl();
  return proxyUrl ? new ProxyAgent(proxyUrl) : new Agent();
}

async function requestExternal(url, options = {}) {
  const apiResponse = await undiciRequest(url, {
    ...options,
    dispatcher: buildDispatcher(),
  });
  return {
    status: apiResponse.statusCode,
    text: await apiResponse.body.text(),
    headers: apiResponse.headers,
  };
}

async function downloadExternalFile(url) {
  const apiResponse = await undiciRequest(url, {
    method: "GET",
    dispatcher: buildDispatcher(),
  });
  return {
    status: apiResponse.statusCode,
    body: Buffer.from(await apiResponse.body.arrayBuffer()),
    contentType: String(apiResponse.headers["content-type"] || "video/mp4").split(";")[0],
  };
}

function parseUpstreamResponse(status, text, headers = {}) {
  if (text) {
    try {
      return JSON.parse(text);
    } catch {
      return {
        error: `上游接口返回 HTTP ${status}，但响应不是 JSON。`,
        upstreamStatus: status,
      };
    }
  }
  const data = {
    error: `上游接口返回 HTTP ${status} 且没有 JSON 内容。请求可能被网络代理或网关重定向。`,
    upstreamStatus: status,
  };
  if (headers.location) {
    data.location = headers.location;
  }
  return data;
}

function responseStatusForClient(apiResponse) {
  return apiResponse.status >= 300 && apiResponse.status < 400 ? 502 : apiResponse.status;
}

function sanitizePathPart(value, fallback) {
  const cleaned = String(value || fallback).replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/-+/g, "-");
  return cleaned.replace(/^-|-$/g, "") || fallback;
}

function extensionFromUrl(videoUrl) {
  try {
    const extension = path.extname(new URL(videoUrl).pathname).toLowerCase();
    if ([".mp4", ".mov", ".webm", ".m4v"].includes(extension)) {
      return extension;
    }
  } catch {
    return ".mp4";
  }
  return ".mp4";
}

function buildStoredVideoPath(taskId, videoUrl, videoTitle = "") {
  const taskPart = sanitizePathPart(taskId, "video");
  const titlePart = sanitizePathPart(videoTitle, "");
  const fileTitle = titlePart ? `${titlePart}-${taskPart}` : taskPart;
  return `${VIDEO_BLOB_PREFIX}${fileTitle}${extensionFromUrl(videoUrl)}`;
}

function normalizeSavedVideo({ taskId, sourceUrl, blob }) {
  return {
    task_id: taskId,
    source_url: sourceUrl,
    saved_video_url: blob.url,
    blob_pathname: blob.pathname,
  };
}

function sendJson(response, status, data) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(data));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error("请求内容过大"));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(raw || "{}"));
      } catch {
        reject(new Error("请求 JSON 格式不正确"));
      }
    });
    request.on("error", reject);
  });
}

function readLimitedBody(request, maxBytes = MAX_IMAGE_UPLOAD_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        const error = new Error(`图片不能超过 ${Math.floor(maxBytes / 1024 / 1024)} MB`);
        error.statusCode = 413;
        reject(error);
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

async function createAdVideo(payload, token) {
  const config = loadApiConfig();
  return requestExternal(`${config.baseUrl}/ad-video/create`, {
    method: "POST",
    headers: buildAuthHeaders({ token }),
    body: JSON.stringify(payload),
  });
}

async function uploadImage(body, contentType, token, contentLength = "") {
  if (!String(contentType || "").startsWith("multipart/form-data;")) {
    const error = new Error("图片上传请求必须使用 multipart/form-data");
    error.statusCode = 400;
    throw error;
  }
  if (!body || !body.length) {
    const error = new Error("请选择需要上传的图片");
    error.statusCode = 400;
    throw error;
  }
  const config = loadApiConfig();
  return requestExternal(`${config.baseUrl}/images/upload`, {
    method: "POST",
    headers: buildUploadHeaders(token, contentType, contentLength),
    body,
  });
}

async function getAdVideoStatus(taskId, token) {
  const config = loadApiConfig();
  return requestExternal(
    `${config.baseUrl}/ad-video/status/${encodeURIComponent(taskId)}`,
    { headers: buildAuthHeaders({ token }) },
  );
}

async function saveGeneratedVideo(taskId, videoUrl, videoTitle = "") {
  const downloaded = await downloadExternalFile(videoUrl);
  if (downloaded.status < 200 || downloaded.status >= 300) {
    throw new Error(`下载生成视频失败，HTTP ${downloaded.status}`);
  }
  if (!downloaded.body.length) {
    throw new Error("下载生成视频失败，文件为空");
  }
  const blob = await put(buildStoredVideoPath(taskId, videoUrl, videoTitle), downloaded.body, {
    access: "public",
    allowOverwrite: true,
    contentType: downloaded.contentType || "video/mp4",
  });
  return normalizeSavedVideo({ taskId, sourceUrl: videoUrl, blob });
}

async function attachSavedVideo(taskId, data, videoTitle = "") {
  if (!data || data.status !== "succeeded" || !data.video_url) {
    return data;
  }
  try {
    const saved = await saveGeneratedVideo(taskId, data.video_url, videoTitle);
    return {
      ...data,
      original_video_url: data.video_url,
      video_url: saved.saved_video_url,
      saved_video_url: saved.saved_video_url,
      blob_pathname: saved.blob_pathname,
    };
  } catch (error) {
    return {
      ...data,
      save_error: error.message || "视频已生成，但保存到 Vercel Blob 失败",
    };
  }
}

async function listSavedVideos() {
  const result = await list({ prefix: VIDEO_BLOB_PREFIX });
  return result.blobs.map((blob) => ({
    url: blob.url,
    pathname: blob.pathname,
    uploaded_at: blob.uploadedAt,
    size: blob.size,
  }));
}

async function forwardCreate(request, response) {
  const payload = await readJsonBody(request);
  const apiResponse = await createAdVideo(payload, extractRequestToken(request.headers));
  sendJson(response, responseStatusForClient(apiResponse), parseUpstreamResponse(
    apiResponse.status,
    apiResponse.text,
    apiResponse.headers,
  ));
}

async function forwardUpload(request, response) {
  const body = await readLimitedBody(request);
  const apiResponse = await uploadImage(
    body,
    request.headers["content-type"] || "",
    extractRequestToken(request.headers),
    request.headers["content-length"] || "",
  );
  sendJson(response, responseStatusForClient(apiResponse), parseUpstreamResponse(
    apiResponse.status,
    apiResponse.text,
    apiResponse.headers,
  ));
}

async function forwardStatus(taskId, request, response) {
  const apiResponse = await getAdVideoStatus(taskId, extractRequestToken(request.headers));
  const parsed = parseUpstreamResponse(apiResponse.status, apiResponse.text, apiResponse.headers);
  const videoTitle = request.headers["x-ad-video-title"] || request.headers["X-Ad-Video-Title"] || "";
  const data = apiResponse.status >= 200 && apiResponse.status < 300
    ? await attachSavedVideo(taskId, parsed, videoTitle)
    : parsed;
  sendJson(response, responseStatusForClient(apiResponse), data);
}

async function forwardVideos(response) {
  sendJson(response, 200, { videos: await listSavedVideos() });
}

function servePage(response) {
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  response.end(fs.readFileSync(PAGE_PATH));
}

async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${HOST}:${PORT}`);
  try {
    if (request.method === "GET" && url.pathname === "/") {
      servePage(response);
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/defaults") {
      sendJson(response, 200, buildDefaultRequest());
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/create") {
      await forwardCreate(request, response);
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/upload") {
      await forwardUpload(request, response);
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/videos") {
      await forwardVideos(response);
      return;
    }
    const statusMatch = url.pathname.match(/^\/api\/status\/([^/]+)$/);
    if (request.method === "GET" && statusMatch) {
      await forwardStatus(decodeURIComponent(statusMatch[1]), request, response);
      return;
    }
    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    sendJson(response, error.statusCode || 502, { error: error.message || "请求接口失败" });
  }
}

function startServer() {
  const server = http.createServer(handleRequest);
  server.listen(PORT, HOST, () => {
    console.log(`视频制作页面已启动：http://${HOST}:${PORT}`);
  });
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  attachSavedVideo,
  buildAuthHeaders,
  buildStoredVideoPath,
  buildUploadHeaders,
  buildDefaultRequest,
  createAdVideo,
  extractRequestToken,
  forwardVideos,
  forwardUpload,
  getAdVideoStatus,
  handleRequest,
  listSavedVideos,
  loadApiConfig,
  normalizeSavedVideo,
  parseApiConfig,
  parseUpstreamResponse,
  readLimitedBody,
  resolveProxyUrl,
  responseStatusForClient,
  saveGeneratedVideo,
  startServer,
  uploadImage,
};
