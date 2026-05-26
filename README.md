# AdsVideoMaker

Chinese web interface for creating a `HarmonyOS 播客` ad video through the advertising video generation API. Users can edit creative fields, upload reference images to Vercel Blob, submit generation, and poll for the completed video.

## Deploy On Vercel

1. Import this GitHub repository into Vercel.
2. Create or connect a **Vercel Blob** store in the project Storage settings. Vercel supplies `BLOB_READ_WRITE_TOKEN` to the deployment.
3. Configure the video API base URL in Environment Variables:

```env
AD_VIDEO_BASE_URL=https://your-ad-video-api.example.com
AD_VIDEO_CLIENT_ID=huawei
```

Users enter their own `AD_VIDEO_TOKEN` in the webpage when creating a video; do not configure or commit video API tokens in Vercel.

The image upload feature accepts PNG, JPG, and WebP files up to 5 MB. Uploaded images receive public Blob URLs because the video generation API must be able to fetch them.

Vercel serves `index.html` and deploys these server-side endpoints:

```text
GET  /api/defaults
POST /api/upload
POST /api/create
GET  /api/status/:taskId
```

The page sends the entered API token to same-origin functions only while uploading, creating, and polling the current task. The application does not store it or return it in responses.

## Local Use

Install dependencies and run:

```powershell
npm install
$env:AD_VIDEO_BASE_URL = "https://your-ad-video-api.example.com"
$env:BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_replace_me"
npm start
```

Open `http://127.0.0.1:4173`, then enter `AD_VIDEO_TOKEN` in the page before submitting. The Vercel serverless `/api/upload` endpoint is available after deployment; local upload testing requires running through Vercel's local development environment.

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
```
