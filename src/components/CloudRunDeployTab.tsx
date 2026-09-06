import React, { useState } from 'react';
import { Rocket, Copy, Check, Terminal, Shield, Key, CheckCircle2, FileText } from 'lucide-react';

export const CloudRunDeployTab: React.FC = () => {
  const [projectId, setProjectId] = useState('YOUR_PROJECT_ID');
  const [serviceName, setServiceName] = useState('cloud-run-ai-studio');
  const [region, setRegion] = useState('asia-southeast1');
  const [secretName, setSecretName] = useState('GEMINI_API_KEY');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const secretCommands = `# 1. Create and populate Secret in Google Cloud Secret Manager
gcloud secrets create ${secretName} --replication-policy="automatic"
echo -n "YOUR_API_KEY" | gcloud secrets versions add ${secretName} --data-file=-

# 2. Retrieve Project Number & Grant Cloud Run Secret Accessor IAM Role
PROJECT_NUMBER=$(gcloud projects describe ${projectId} --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding ${secretName} \\
  --member="serviceAccount:\${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \\
  --role="roles/secretmanager.secretAccessor"`;

  const firestoreRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}`;

  const deployCommand = `gcloud run deploy ${serviceName} \\
  --source . \\
  --region ${region} \\
  --platform managed \\
  --allow-unauthenticated \\
  --set-secrets="${secretName}=${secretName}:latest" \\
  --port 3000`;

  const verificationCommand = `gcloud run services update ${serviceName} \\
  --update-labels=dev-tutorial=cloud-run-ai-challenge \\
  --region=${region}`;

  const fullScript = `#!/usr/bin/env bash
set -e

echo "==> 1. Enabling APIs"
gcloud services enable run.googleapis.com secretmanager.googleapis.com firestore.googleapis.com

echo "==> 2. Setting up Secret Manager"
${secretCommands}

echo "==> 3. Deploying to Cloud Run"
${deployCommand}

echo "==> 4. Binding Verification Label"
${verificationCommand}

echo "==> Deployment Complete! Challenge label registered."`;

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                DIRECTIVE 4 & 7 &bull; CLOUD RUN CHALLENGE COMPLIANCE
              </span>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Cloud Run Deployment & Verification Bindings
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Generates ready-to-run Google Cloud CLI scripts for Secret Manager bindings, Firestore owner-bound isolation, Cloud Run deployment, and the mandatory <code className="text-indigo-400 bg-slate-950 px-1 py-0.5 rounded border border-slate-800">dev-tutorial=cloud-run-ai-challenge</code> verification label.
            </p>
          </div>

          <button
            onClick={() => copyToClipboard(fullScript, 'full')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] self-start md:self-auto"
          >
            {copiedKey === 'full' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedKey === 'full' ? 'Copied Full Script' : 'Copy Full Deployment Script'}
          </button>
        </div>

        {/* Configuration Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800">
          <div>
            <label className="text-[11px] font-mono font-semibold text-slate-400 block mb-1">GCP Project ID</label>
            <input
              type="text"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-[11px] font-mono font-semibold text-slate-400 block mb-1">Cloud Run Service Name</label>
            <input
              type="text"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-[11px] font-mono font-semibold text-slate-400 block mb-1">Region</label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-[11px] font-mono font-semibold text-slate-400 block mb-1">Secret Name</label>
            <input
              type="text"
              value={secretName}
              onChange={(e) => setSecretName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Step 1: Secret Manager */}
      <div className="bg-[#161B22] border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-3.5 border-b border-slate-800 bg-[#1C2128] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-5 w-5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center text-[11px] font-mono font-bold">1</div>
            <h3 className="text-sm font-semibold text-slate-200 italic">Google Cloud Secret Manager Setup & IAM Accessor Role</h3>
          </div>
          <button
            onClick={() => copyToClipboard(secretCommands, 'secret')}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors font-mono"
          >
            {copiedKey === 'secret' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            {copiedKey === 'secret' ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className="p-4">
          <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre leading-relaxed">
            {secretCommands}
          </pre>
        </div>
      </div>

      {/* Step 2: Firestore Rules */}
      <div className="bg-[#161B22] border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-3.5 border-b border-slate-800 bg-[#1C2128] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-5 w-5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center text-[11px] font-mono font-bold">2</div>
            <h3 className="text-sm font-semibold text-slate-200 italic">Secure Firestore Owner-Bound Security Rules (firestore.rules)</h3>
          </div>
          <button
            onClick={() => copyToClipboard(firestoreRules, 'firestore')}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors font-mono"
          >
            {copiedKey === 'firestore' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            {copiedKey === 'firestore' ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className="p-4">
          <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-indigo-300 overflow-x-auto whitespace-pre leading-relaxed">
            {firestoreRules}
          </pre>
        </div>
      </div>

      {/* Step 3: Cloud Run Deployment */}
      <div className="bg-[#161B22] border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-3.5 border-b border-slate-800 bg-[#1C2128] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-5 w-5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center text-[11px] font-mono font-bold">3</div>
            <h3 className="text-sm font-semibold text-slate-200 italic">Source-to-Container Cloud Run Deployment</h3>
          </div>
          <button
            onClick={() => copyToClipboard(deployCommand, 'deploy')}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors font-mono"
          >
            {copiedKey === 'deploy' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            {copiedKey === 'deploy' ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className="p-4">
          <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-indigo-200 overflow-x-auto whitespace-pre leading-relaxed">
            {deployCommand}
          </pre>
        </div>
      </div>

      {/* Step 4: Verification Binding (CRITICAL DIRECTIVE) */}
      <div className="bg-[#161B22] border border-emerald-500/40 rounded-2xl overflow-hidden shadow-sm ring-1 ring-emerald-500/20">
        <div className="px-6 py-3.5 border-b border-emerald-900/40 bg-[#1C2128] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-5 w-5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-[11px] font-mono font-bold">4</div>
            <div>
              <h3 className="text-sm font-semibold text-white italic">Mandatory Campaign Challenge Verification Label</h3>
              <p className="text-[11px] text-slate-400">Registers service for automated grading in the Cloud Run AI Challenge</p>
            </div>
          </div>
          <button
            onClick={() => copyToClipboard(verificationCommand, 'verify')}
            className="flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-700/80 transition-colors font-mono font-semibold"
          >
            {copiedKey === 'verify' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            {copiedKey === 'verify' ? 'Copied' : 'Copy Command'}
          </button>
        </div>
        <div className="p-4">
          <pre className="bg-slate-950 border border-emerald-900/60 rounded-xl p-4 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre leading-relaxed">
            {verificationCommand}
          </pre>
        </div>
      </div>
    </div>
  );
};
