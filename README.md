# AdsVideoMaker

Chinese web interface for creating a `HarmonyOS 播客` ad video through the advertising video generation API. Users can edit creative fields, upload reference images through the API's TOS-backed image upload endpoint, submit generation, poll for the completed video, and save completed videos to Vercel Blob.

## Deploy On Vercel

1. Import this GitHub repository into Vercel.
2. Create or connect a **Vercel Blob** store in the project Storage settings. Vercel supplies `BLOB_READ_WRITE_TOKEN` to the deployment.
3. Configure the video API base URL in Environment Variables:

```env
AD_VIDEO_BASE_URL=https://your-ad-video-api.example.com
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_replace_me
AD_VIDEO_CLIENT_ID=huawei
```

Users enter their own `AD_VIDEO_TOKEN` in the webpage when creating a video; do not configure or commit video API tokens in Vercel.

The image upload feature accepts PNG and JPG files up to 20 MB. The same-origin `/api/upload` endpoint forwards multipart uploads to `POST /images/upload` with the user's Bearer token and returns the 24h presigned TOS URL from the API.

When a task status returns `succeeded`, the server downloads `video_url`, stores it under `generated-videos/` in Vercel Blob, and returns the Blob URL to the page. The page also keeps pending task IDs in browser `localStorage`; after a refresh, entering the token resumes polling and can save the completed video.

Vercel serves `index.html` and deploys these server-side endpoints:

```text
GET  /api/defaults
POST /api/upload
POST /api/create
GET  /api/status/:taskId
GET  /api/videos
```

The page sends the entered API token to same-origin functions only while uploading, creating, and polling the current task. The application does not store the token or return it in responses.

## Local Use

Install dependencies and run:

```powershell
npm install
$env:AD_VIDEO_BASE_URL = "https://your-ad-video-api.example.com"
$env:BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_replace_me"
npm start
```

Open `http://127.0.0.1:4173`, then enter `AD_VIDEO_TOKEN` in the page before submitting.

For local corporate-network testing only, proxy variables can be set before `npm start`:

```powershell
$env:HTTPS_PROXY = "http://username:password@proxy.example.com:8080"
$env:HTTP_PROXY = $env:HTTPS_PROXY
```

Do not put proxy credentials in committed files.

## Verification

```powershell
npm test
node --check ad-video-controller.js
node --check api/upload.js
node --check api/videos.js
```
