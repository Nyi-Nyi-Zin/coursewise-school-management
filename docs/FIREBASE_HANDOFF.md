# Teza Tech Lab Firebase Production Handoff

Teza Tech Lab’s active products are the **Student Website** in `student-website/` and the **Admin Website** in `admin-dashboard/`. Both are deployed independently on Vercel and must use the **same Firebase project**. The earlier Flutter source in `student-app/` is retained only as an archived reference and is not part of the live product or Firebase activation path.

> **Current state:** both Vercel websites are publicly deployed in **demo-safe mode**. They will not initialize Firebase until the complete public web configuration is supplied and `NEXT_PUBLIC_ENABLE_FIREBASE` is set to `true`.

## What the Firebase project provides

| Firebase service | Student Website responsibility | Admin Website responsibility | Production dependency |
|---|---|---|---|
| Authentication | Email/password registration, login, sign-out, and password-reset email | Administrator sign-in and reset-link assistance | Enable **Email/Password** provider |
| Cloud Firestore | Reads only published, active-batch learning data and the student’s own records | Creates and manages courses, batches, enrolments, content, attendance, and student records | Deploy rules and indexes |
| Cloud Functions | Calls trusted quiz submission | Creates protected password-reset links and receives trusted quiz submissions | Deploy `functions/` |

Firebase’s web SDK uses the configuration generated for a registered Web App. These `NEXT_PUBLIC_*` values are client configuration, not a service-account credential; authorization remains enforced by Firebase Authentication, Firestore Security Rules, and callable-function checks.[1] [2]

## Required Vercel environment variables

Add **exactly the same values** to both Vercel projects—`teza-tech-lab-student` and `teza-tech-lab-admin`—under **Settings → Environment Variables**. Apply them to **Production**, **Preview**, and **Development** where applicable, then redeploy both sites.

| Environment variable | Value source | Required |
|---|---|---|
| `NEXT_PUBLIC_ENABLE_FIREBASE` | Literal value `true` | Yes |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Console → Project settings → Your apps → Web App | Yes |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Web App configuration | Yes |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Web App configuration | Yes |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Web App configuration | Yes |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Web App configuration | Yes |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase Web App configuration | Yes |

Do **not** add a service-account JSON file, Firebase Admin SDK private key, or any privileged secret to either website. Browser code may only receive the public Firebase web configuration. The privileged work in this repository is intentionally performed by callable functions.

## Required Firebase Console configuration

Enable the **Email/Password** sign-in provider in **Authentication → Sign-in method**. Register or confirm one Firebase **Web App** and use its generated configuration values for both Vercel sites. Add the Vercel production hostnames to **Authentication → Settings → Authorized domains** before relying on login or password recovery.[3]

Use a temporary administrator Firebase Authentication account and ensure its matching Firestore user document has `role: "admin"`. Administrator access, batch management, and reset-link generation rely on that role check; a user without it must not receive administrator capabilities.

## Deploy rules, indexes, and trusted functions

From an authenticated Firebase CLI session at the repository root, deploy the production security components as a single operation:

```bash
firebase deploy --only firestore:rules,firestore:indexes,functions
```

The Firebase CLI reads `firebase.json`, which maps the Firestore policy to `firebase/firestore.rules`, the required query indexes to `firebase/firestore.indexes.json`, and callable Functions to `functions/`.[4]

| Component | Live protection or capability |
|---|---|
| `firebase/firestore.rules` | Requires authentication, checks roles, requires active course/batch enrolment, limits students to their own attendance and attempts, and hides answer keys from students. |
| `firebase/firestore.indexes.json` | Provides the Firestore indexes needed for the repository’s scoped queries. |
| `submitQuizAttempt` callable | Verifies enrolment, reads protected answer keys, calculates the score on the server, and writes the attempt. |
| `adminCreatePasswordResetLink` callable | Requires an administrator Firestore role before generating a password-reset link. |

> **Security boundary:** do not change the Firestore Rules to allow students to write scores or attendance records. These values are administrator- or server-controlled so one student cannot alter another student’s records or their own score.

## Production acceptance checklist

After Vercel redeployments and Firebase deployment, create a small real test group and validate the following in order.

| Validation | Expected result |
|---|---|
| Student registration and login | A student can create an Email/Password account and sign in. |
| Password recovery | A student receives the Firebase reset flow; an administrator can request a protected reset link. |
| Course and batch enrolment | An administrator can create a course and batch, then assign the student Firebase UID. |
| Batch isolation | A student only sees content, attendance, and attempts matching the active assigned course and batch. |
| Private records | A student cannot fetch another student’s attendance, quiz attempt, or protected answer keys. |
| Trusted quiz score | A submitted quiz attempt is scored by the callable Function, not by browser-provided marks. |

Custom-domain configuration is intentionally deferred. When a domain is ready, add `student.<your-domain>` and `admin.<your-domain>` to Vercel and add both verified hostnames to Firebase Authentication’s authorized domains.

## References

[1]: https://firebase.google.com/docs/web/learn-more "Firebase Web: Learn more about configuration"
[2]: https://firebase.google.com/docs/firestore/security/get-started "Firebase: Get started with Cloud Firestore Security Rules"
[3]: https://firebase.google.com/docs/auth/web/password-auth "Firebase: Authenticate with Firebase using Password-Based Accounts"
[4]: https://firebase.google.com/docs/cli "Firebase CLI documentation"
