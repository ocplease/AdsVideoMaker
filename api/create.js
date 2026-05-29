const {
  createAdVideo,
  extractRequestToken,
  parseUpstreamResponse,
  responseStatusForClient,
} = require("../ad-video-controller");

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }
  const requestId = request.headers["x-ad-debug-request-id"] || `create-${Date.now().toString(36)}`;
  try {
    const payload = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
    console.info("[ad-video] create started", {
      requestId,
      title: payload && payload.title,
      imageProvided: Boolean(payload && payload.mainReferenceImage),
      sellingPointCount: Array.isArray(payload && payload.sellingPoints) ? payload.sellingPoints.length : 0,
      mode: payload && payload.mode,
      execMode: payload && payload.execMode,
    });
    const upstream = await createAdVideo(payload || {}, extractRequestToken(request.headers));
    const parsed = parseUpstreamResponse(upstream.status, upstream.text, upstream.headers);
    if (upstream.status < 200 || upstream.status >= 300) {
      console.error("[ad-video] create failed", {
        requestId,
        upstreamStatus: upstream.status,
        error: parsed.error,
        location: parsed.location,
      });
    } else {
      console.info("[ad-video] create succeeded", {
        requestId,
        upstreamStatus: upstream.status,
        taskId: parsed.ad_task_id,
      });
    }
    response
      .status(responseStatusForClient(upstream))
      .json({ ...parsed, requestId });
  } catch (error) {
    console.error("[ad-video] create failed", {
      requestId,
      error: error.message || "请求接口失败",
      name: error.name,
    });
    response.status(502).json({ error: error.message || "请求接口失败", requestId });
  }
};
