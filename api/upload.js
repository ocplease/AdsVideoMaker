const {
  extractRequestToken,
  parseUpstreamResponse,
  readLimitedBody,
  responseStatusForClient,
  uploadImage,
} = require("../ad-video-controller");

async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const body = await readLimitedBody(request);
    const upstream = await uploadImage(
      body,
      request.headers["content-type"] || "",
      extractRequestToken(request.headers),
      request.headers["content-length"] || "",
    );
    response
      .status(responseStatusForClient(upstream))
      .json(parseUpstreamResponse(upstream.status, upstream.text, upstream.headers));
  } catch (error) {
    response.status(error.statusCode || 502).json({ error: error.message || "图片上传失败" });
  }
}

handler.config = {
  api: {
    bodyParser: false,
  },
};

module.exports = handler;
