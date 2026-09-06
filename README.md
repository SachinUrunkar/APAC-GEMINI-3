# Cloud Run AI Production Studio

A secure, enterprise-grade AI web application engineered for the **Google Cloud Run AI Challenge** (`dev-tutorial=cloud-run-ai-challenge`). This application implements robust server-side Gemini AI generation with an automated 4-tier model fallback ladder, agentic threat modeling across the 5 threat zones, OWASP security reviews with concrete code remediation, and owner-bound Firestore security rules.

---

## 1. Architecture Overview

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, and Motion for responsive UX.
- **Backend API**: Express on Node.js running in Cloud Run, serving Vite SPA and secure proxy endpoints.
- **AI Core**: `@google/genai` TypeScript SDK executed server-side with strict key encapsulation.
- **Resilient Fallback Ladder**:
  1. Primary: `gemini-3.6-flash`
  2. High-Availability Fallback: `gemini-3.1-flash-lite`
  3. Dynamic Alias: `gemini-flash-latest`
  4. Deep Reasoning Fallback: `gemini-3.7-flash`
- **Data Persistence**: Durable audit log with zero-crash undefined stripping and guaranteed transaction verification.

---

## 2. Prerequisites & Environment Setup

1. **Install the Google Cloud SDK (`gcloud`)**:
   Ensure you have the Google Cloud CLI installed and authenticated:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Enable Required Google Cloud APIs**:
   ```bash
   gcloud services enable \
     run.googleapis.com \
     secretmanager.googleapis.com \
     firestore.googleapis.com \
     artifactregistry.googleapis.com \
     cloudbuild.googleapis.com
   ```

---

## 3. Secret Management Setup (Zero-Hardcoding Hygiene)

Never hardcode API keys. Store and inject secrets using Google Cloud Secret Manager.

```bash
# 1. Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. Grant the Cloud Run runtime service account permission to read the secret
# Retrieve your project number
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")

# Bind the secretAccessor IAM role to the default Compute Engine service account
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 4. Database Security Configuration (Firestore Rules)

Deploy secure, owner-bound security rules to Cloud Firestore to prevent unauthorized reads and writes:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

To deploy rules directly via Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 5. Google Cloud Run Deployment Flow

Deploy the application directly from source code to Google Cloud Run:

```bash
# Set deployment variables
export SERVICE_NAME="cloud-run-ai-studio"
export REGION="asia-southeast1" # Or us-central1 / europe-west1

# Deploy container directly from source with Secret Manager integration
gcloud run deploy ${SERVICE_NAME} \
  --source . \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --port 3000
```

---

## 6. Required Campaign Verification Binding

To register and verify this service for the **Google Cloud Run AI Challenge**, apply the mandatory campaign label:

```bash
gcloud run services update ${SERVICE_NAME} \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=${REGION}
```

Verify that the label has been applied successfully:
```bash
gcloud run services describe ${SERVICE_NAME} \
  --region=${REGION} \
  --format="value(metadata.labels)"
```

---

## 7. Agentic Threat Summary (The 5 Threat Zones)

| Threat Zone | Risk Scenario | OWASP Mapping | Countermeasure | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Input Surfaces** | Malicious / oversized payloads targeting endpoint deserialization | OWASP A03 / LLM02 | Express `limit: 10mb`, top-level body parser mounted prior to routes, defensive null-safe destructuring | **ENFORCED** |
| **Planning & Reasoning** | Prompt injection or system instruction hijack in model context | OWASP LLM01 | Strict delimiter isolation, explicit role framing, clean instruction encapsulation | **ENFORCED** |
| **Tool Execution** | Dynamic privilege escalation or SSRF via unvalidated parameters | OWASP LLM07 / A01 | Strict parameter whitelisting, isolated server-side proxies, no direct browser API key calls | **ENFORCED** |
| **Memory & State** | Cross-user data contamination or undefined value crash in database | OWASP A01 / LLM06 | Owner-bound Firestore path security, recursive `stripUndefined` payload cleaner | **ENFORCED** |
| **Inter-System Comm** | API key leak via browser DevTools or git repositories | OWASP A07 / LLM10 | Server-side `@google/genai` encapsulation, Google Cloud Secret Manager dynamic injection | **ENFORCED** |

---

## 8. Functional Walkthrough & Verification Test Cases

| Test Case ID | Feature / Flow | Step-by-Step Actions | Expected Result |
| :--- | :--- | :--- | :--- |
| **TC-01** | Backend Health & System Status | Access `/api/health` or click "System Health" in UI header. | Returns JSON with status `healthy`, active port 3000, fallback ladder order, and campaign label. |
| **TC-02** | Live Gemini Generation | Go to "Resilient AI Prompt", input text prompt, click "Execute Prompt". | Generates AI response, displays model used (`gemini-3.6-flash`), execution latency, and saves record to store. |
| **TC-03** | Model Fallback Failover Ladder | In "Resilient AI Prompt", toggle **Simulate 503 Failover**, click "Execute Prompt". | First attempt records simulated 503 error; execution automatically falls back to `gemini-3.1-flash-lite` seamlessly. |
| **TC-04** | Agentic Threat Modeling | Go to "Threat Modeling", enter an architecture description or click sample, click "Generate Threat Model". | Produces structured 5-zone Threat Summary Table with severity badges, OWASP references, and concrete countermeasures. |
| **TC-05** | OWASP Security Reviewer | Go to "Security Reviewer", submit a code snippet, click "Run Security Review". | Inspects data flow sinks, flags insecure defaults/secrets, outputs severity-ranked findings and actionable code diffs. |
| **TC-06** | Transaction Verification & Persistence | Trigger any generation or click "Retry Save" / "Delete" in Interaction History. | Payloads are recursively stripped of `undefined`, verified in store, and updated in the audit table in real time. |
| **TC-07** | Cloud Run Deployment Command Generator | Go to "Cloud Run Deploy", configure service name & region, copy commands. | Copies copy-pasteable `gcloud` deploy and label update commands with the mandatory campaign flag. |
