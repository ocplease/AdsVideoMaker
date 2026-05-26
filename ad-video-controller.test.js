const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildDefaultRequest,
  parseApiConfig,
  buildAuthHeaders,
  resolveProxyUrl,
  loadApiConfig,
  parseUpstreamResponse,
} = require("./ad-video-controller");

test("buildDefaultRequest presets the approved HarmonyOS Podcast ad request", () => {
  const request = buildDefaultRequest();

  assert.equal(request.brand, "HarmonyOS 播客");
  assert.equal(request.mainReferenceImage, "https://sns-webpic-qc.xhscdn.com/202605251613/aca5aa4e83849366a6b4249547e7a425/1040g2sg31jbvbd6n2ifg5phi0p60u49lg7r2dj0!nd_dft_wlteh_webp_3");
  assert.equal(request.ctaText, "立即体验");
  assert.deepEqual(request.sellingPoints, [
    "精选内容，随时开听",
    "让碎片时间，更有收获",
    "通勤路上，轻松开启高品质收听体验",
  ]);
  assert.equal(request.mode, "pro");
  assert.equal(request.execMode, "quality");
  assert.equal(request.ratio, "9:16");
  assert.equal(request.resolution, "1080p");
  assert.equal(request.duration, 15);
});

test("parseApiConfig reads URL and token only on the server side", () => {
  const config = parseApiConfig([
    "鉴权信息：",
    "Base URL          │ https://example.invalid",
    "   Token             │ secret-token",
    "   client_id         │ huawei",
  ].join("\n"));

  assert.deepEqual(config, {
    baseUrl: "https://example.invalid",
    token: "secret-token",
    clientId: "huawei",
  });
  assert.deepEqual(buildAuthHeaders(config), {
    Authorization: "Bearer secret-token",
    "Content-Type": "application/json",
  });
});

test("resolveProxyUrl prioritizes HTTPS proxy configuration for API requests", () => {
  assert.equal(
    resolveProxyUrl({
      HTTP_PROXY: "http://fallback.proxy:8080",
      HTTPS_PROXY: "http://secure.proxy:8080",
    }),
    "http://secure.proxy:8080",
  );
  assert.equal(resolveProxyUrl({ HTTP_PROXY: "http://fallback.proxy:8080" }), "http://fallback.proxy:8080");
});

test("loadApiConfig uses the Vercel base URL without storing an API token", () => {
  assert.deepEqual(
    loadApiConfig({
      AD_VIDEO_BASE_URL: "https://api.example.invalid/",
      AD_VIDEO_CLIENT_ID: "huawei",
    }),
    {
      baseUrl: "https://api.example.invalid",
      clientId: "huawei",
    },
  );
});

test("parseUpstreamResponse turns an empty redirect into a readable error object", () => {
  assert.deepEqual(parseUpstreamResponse(302, "", { location: "http://proxy-warning.invalid/" }), {
    error: "上游接口返回 HTTP 302 且没有 JSON 内容。请求可能被网络代理或网关重定向。",
    upstreamStatus: 302,
    location: "http://proxy-warning.invalid/",
  });
});
