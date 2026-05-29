const {
  extractRequestToken,
  listSavedVideos,
} = require("../ad-video-controller");

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    response.status(200).json({ videos: await listSavedVideos(extractRequestToken(request.headers)) });
  } catch (error) {
    response.status(502).json({ error: error.message || "读取已保存视频失败" });
  }
};
