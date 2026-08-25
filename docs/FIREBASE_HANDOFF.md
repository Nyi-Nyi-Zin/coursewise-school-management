# Teza Tech Lab Firebase and Backend Production Handoff

The Student Website in `student-website/` and Admin Website in `admin-dashboard/` are independent Next.js deployments on Vercel. They use the same Firebase project. Browser code uses the Firebase Web SDK; privileged work runs in authenticated Next.js Route Handlers with the Firebase Admin SDK. Firebase Cloud Functions are not a production dependency.

## Runtime responsibilities

| Boundary | Student Website | Admin Website |
|---|---|---|
| Browser | Login, password-reset email, Firestore reads allowed by Rules | Admin login and Firestore management allowed by Rules |
| Next.js backend | Registration, batch-authorized quiz catalog, trusted scoring, private quiz results | Student account creation and protected password-reset links |
| Firebase | Authentication, Firestore, Storage, Rules and indexes | Same shared project |

Every authenticated backend request contains a Firebase ID token in the `Authorization: Bearer <token>` header. The server verifies the token before using the Admin SDK. Quiz routes additionally check active enrollment; administrator routes load the caller's Firestore profile and require `role: "admin"`.

## Required Vercel variables

Add the same public Firebase Web App values to both Vercel projects:

- `NEXT_PUBLIC_ENABLE_FIREBASE=true`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Add the complete Firebase service-account JSON to both projects as `FIREBASE_SERVICE_ACCOUNT_JSON`. This variable is server-only. Never prefix it with `NEXT_PUBLIC_`, expose it to browser code, or commit a service-account file.

The Student Website also requires `SIGNUP_RATE_LIMIT_SALT`, a long random server-only value used to hash registration rate-limit keys. Keep the existing Cloudinary public variables where uploads are enabled.

## Firebase Console and deployment

Enable Email/Password Authentication, add both production hostnames to Authentication authorized domains, and keep the administrator's matching `users/{uid}` document set to `role: "admin"`.

Deploy only Firebase security configuration from the repository root:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

The legacy `functions/` directory is retained only as migration history. It is not referenced by `firebase.json`, and clients do not import or call Firebase Functions.

## Production acceptance checklist

| Validation | Expected result |
|---|---|
| Student registration/login | Backend creates the Auth user and numbered Firestore profile; the student can sign in |
| Registration abuse control | More than five attempts from one hashed IP within an hour return HTTP 429 |
| Batch isolation | A student sees only the active enrolled course/batch quiz catalog |
| Trusted scoring | Browser submits answers only; the backend reads protected answer keys and writes scores transactionally |
| Retake rules | Final-exam windows, pass state, limits and elapsed time are enforced on the server |
| Admin account creation | Only a verified `role: admin` caller can create a student and receive its reset link |
| Private records | Students cannot read another student's attempts, summaries, attendance, or answer keys |

Do not relax Firestore Rules to let students write quiz scores, counters, summaries, answer keys, or attendance records.
