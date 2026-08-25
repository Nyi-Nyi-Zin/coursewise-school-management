# Teza Tech Lab Admin Website

This Next.js application contains the administrator UI and its authenticated backend Route Handlers. Student account creation and password-reset link generation use Firebase Admin SDK on the server and do not require Firebase Cloud Functions.

## Environment

Configure the shared `NEXT_PUBLIC_FIREBASE_*` Web App values, set `NEXT_PUBLIC_ENABLE_FIREBASE=true`, and add the complete service-account JSON as server-only `FIREBASE_SERVICE_ACCOUNT_JSON`. Never expose that JSON through a `NEXT_PUBLIC_*` variable.

## Commands

```bash
pnpm dev
pnpm lint
pnpm build
```

The app must be deployed as a normal Next.js application. Static export is intentionally disabled because `/api/students` and `/api/password-reset-link` run on the server.
