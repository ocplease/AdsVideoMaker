const {
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
    const upstream = await getAdVideoStatus(request.query.taskId, extractRequestToken(request.headers));
    response
      .status(responseStatusForClient(upstream))
      .json(parseUpstreamResponse(upstream.status, upstream.text, upstream.headers));
  } catch (error) {
    response.status(502).json({ error: error.message || "查询接口失败" });
  }
};
