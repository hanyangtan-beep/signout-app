# Han Sign-out — Vertex AI Cloud Run Proxy (`us-central1`)

Thin HTTPS proxy connecting **`https://hanyangtan-beep.github.io/signout-app/`** to Google Cloud Vertex AI on project `han-signout-app`.

## Security & Routing
- **CORS:** Allows only `https://hanyangtan-beep.github.io` (plus `localhost` when `ALLOW_LOCALHOST=true`).
- **Auth:** Verifies the browser's Google OAuth token from `src/gauth.js` and checks its salted SHA-256 email digest against the 7 `BUILT_IN_ALLOWED` digests from `src/gate.js`.
- **PHI guard:** Rejects HKIDs, patient honorifics, phone numbers, DOB mentions, and accession numbers with HTTP 400 before calling Vertex AI.
- **Automatic fallback:** Escalates cancer resections/biomarkers to `gemini-4-neon` (`MEDIUM`, `maxOutputTokens: 8192`) and falls back automatically to `gemini-3.8-flash` (`MEDIUM`) and `gemini-4-hydrogen` (`MEDIUM`) on transient `403`/`429` errors.
- **No static keys:** Cloud Run authenticates to Vertex AI using the attached `signout-ai-proxy` service account via ADC.

## Deploy via Google Cloud Shell (No local `gcloud` or Python 3.10+ required)

1. Open Google Cloud Console (`han-signout-app`) and click the **Cloud Shell** icon (`>_`) in the top-right bar.
2. Upload or clone the `cloud-run-proxy/` folder into Cloud Shell, then run:

```bash
gcloud config set project han-signout-app
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com aiplatform.googleapis.com

cd cloud-run-proxy
gcloud run deploy signout-vertex-proxy \
  --source . \
  --region us-central1 \
  --service-account signout-ai-proxy@han-signout-app.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_CLOUD_PROJECT=han-signout-app,VERTEX_LOCATION=global,ALLOWED_ORIGIN=https://hanyangtan-beep.github.io \
  --max-instances 3 \
  --memory 512Mi
```

3. Once deployed, delete your temporary local service-account key file and revoke it under **IAM & Admin → Service Accounts → `signout-ai-proxy` → Keys**.
