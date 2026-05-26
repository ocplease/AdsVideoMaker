const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { URL } = require("node:url");
const { Agent, ProxyAgent, request: undiciRequest } = require("undici");

const ROOT_DIR = __dirname;
const CONFIG_PATH = path.join(ROOT_DIR, "api-key.txt");
const PAGE_PATH = path.join(ROOT_DIR, "index.html");
const HOST = "127.0.0.1";
const PORT = Number(process.env.AD_VIDEO_PORT || 4173);

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
  if (environment.AD_VIDEO_BASE_URL && environment.AD_VIDEO_TOKEN) {
    return {
      baseUrl: environment.AD_VIDEO_BASE_URL.replace(/\/$/, ""),
      token: environment.AD_VIDEO_TOKEN,
      clientId: environment.AD_VIDEO_CLIENT_ID || "",
    };
  }
  return parseApiConfig(fs.readFileSync(CONFIG_PATH, "utf8"));
}

function buildAuthHeaders(config) {
  return {
    Authorization: `Bearer ${config.token}`,
    "Content-Type": "application/json",
  };
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

async function createAdVideo(payload) {
  const config = loadApiConfig();
  return requestExternal(`${config.baseUrl}/ad-video/create`, {
    method: "POST",
    headers: buildAuthHeaders(config),
    body: JSON.stringify(payload),
  });
}

async function getAdVideoStatus(taskId) {
  const config = loadApiConfig();
  return requestExternal(
    `${config.baseUrl}/ad-video/status/${encodeURIComponent(taskId)}`,
    { headers: buildAuthHeaders(config) },
  );
}

async function forwardCreate(request, response) {
  const payload = await readJsonBody(request);
  const apiResponse = await createAdVideo(payload);
  sendJson(response, responseStatusForClient(apiResponse), parseUpstreamResponse(
    apiResponse.status,
    apiResponse.text,
    apiResponse.headers,
  ));
}

async function forwardStatus(taskId, response) {
  const apiResponse = await getAdVideoStatus(taskId);
  sendJson(response, responseStatusForClient(apiResponse), parseUpstreamResponse(
    apiResponse.status,
    apiResponse.text,
    apiResponse.headers,
  ));
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
    const statusMatch = url.pathname.match(/^\/api\/status\/([^/]+)$/);
    if (request.method === "GET" && statusMatch) {
      await forwardStatus(decodeURIComponent(statusMatch[1]), response);
      return;
    }
    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    sendJson(response, 502, { error: error.message || "请求接口失败" });
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
  buildAuthHeaders,
  buildDefaultRequest,
  createAdVideo,
  getAdVideoStatus,
  handleRequest,
  loadApiConfig,
  parseApiConfig,
  parseUpstreamResponse,
  resolveProxyUrl,
  responseStatusForClient,
  startServer,
};

