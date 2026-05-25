const { buildDefaultRequest } = require("../ad-video-controller");

module.exports = function handler(request, response) {
  if (request.method !== "GET") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }
  response.status(200).json(buildDefaultRequest());
};
