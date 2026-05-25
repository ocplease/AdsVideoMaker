# AdsVideoMaker

Chinese web interface for creating a `HarmonyOS 播客` ad video through the advertising video generation API. The page lets a user edit the creative request, submit generation, and poll until the resulting video is ready.

## Deploy On Vercel

1. Import this GitHub repository into Vercel.
2. Add these Environment Variables in the Vercel project settings:

```env
AD_VIDEO_BASE_URL=https://your-ad-video-api.example.com
AD_VIDEO_TOKEN=replace-with-your-bearer-token
AD_VIDEO_CLIENT_ID=huawei
```

Use the service Base URL and Token from your private API credential document. Never commit the actual token.

3. Deploy the project. Vercel serves `index.html` and deploys the endpoints under `api/` as server-side functions:

```text
GET  /api/defaults
POST /api/create
GET  /api/status/:taskId
```

The Bearer token is read only by server-side API functions. It is not returned to the browser.

## Local Use

Install dependencies and run:

```powershell
npm install
$env:AD_VIDEO_BASE_URL = "https://your-ad-video-api.example.com"
$env:AD_VIDEO_TOKEN = "replace-with-your-bearer-token"
npm start
```

Open `http://127.0.0.1:4173`.

For local corporate-network testing only, proxy variables can be set in the terminal before `npm start`:

```powershell
$env:HTTPS_PROXY = "http://username:password@proxy.example.com:8080"
$env:HTTP_PROXY = $env:HTTPS_PROXY
```

Do not put proxy credentials in committed files or Vercel variables unless deployment specifically requires that proxy.

## Verification

```powershell
npm test
node --check ad-video-controller.js
```
