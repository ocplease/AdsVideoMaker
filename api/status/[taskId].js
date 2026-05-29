const {
  attachSavedVideo,
  getAdVideoStatus,
  extractRequestToken,
  parseUpstreamResponse,
  responseStatusForClient,
} = require("../../ad-video-controller");

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const token = extractRequestToken(request.headers);
    const upstream = await getAdVideoStatus(request.query.taskId, token);
    const parsed = parseUpstreamResponse(upstream.status, upstream.text, upstream.headers);
    const encodedVideoTitle = request.headers["x-ad-video-title"] || request.headers["X-Ad-Video-Title"] || "";
    const videoTitle = encodedVideoTitle ? decodeURIComponent(encodedVideoTitle) : "";
    const data = upstream.status >= 200 && upstream.status < 300
      ? await attachSavedVideo(request.query.taskId, parsed, videoTitle, token)
      : parsed;
    response
      .status(responseStatusForClient(upstream))
      .json(data);
  } catch (error) {
    response.status(502).json({ error: error.message || "查询接口失败" });
  }
};
