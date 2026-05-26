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
  try {
    const payload = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
    const upstream = await createAdVideo(payload || {}, extractRequestToken(request.headers));
    response
      .status(responseStatusForClient(upstream))
      .json(parseUpstreamResponse(upstream.status, upstream.text, upstream.headers));
  } catch (error) {
    response.status(502).json({ error: error.message || "请求接口失败" });
  }
};
