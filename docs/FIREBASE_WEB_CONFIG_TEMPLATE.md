# Firebase Web Configuration Template

Create `admin-dashboard/.env.local` on the deployment or developer machine and copy the Firebase Web App values from **Project settings → Your apps → SDK setup and configuration**. Do not commit the resulting `.env.local` file.

| Variable | Used by | Source in Firebase console |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Browser Firebase initialization | Web App configuration |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Authentication client | Web App configuration |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firestore client | Web App configuration |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Future upload storage integration | Web App configuration |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase client configuration | Web App configuration |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app identification | Web App configuration |

The values above are consumed by `admin-dashboard/src/lib/firebase.ts`. The `NEXT_PUBLIC_` prefix is intentionally required by Next.js for browser-side configuration. Do **not** add an Admin SDK private key, service account JSON, or any other privileged credential to a public variable. Privileged work such as user provisioning and trusted quiz scoring belongs in a server-only Firebase Admin SDK or callable-function layer.
