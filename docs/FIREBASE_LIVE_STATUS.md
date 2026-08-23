# Firebase Live Activation Status

## Confirmed account-side configuration

The active Firebase project is **`student-management-syste-e8dbb`**. Firebase Email/Password Authentication is enabled. A default Cloud Firestore database was created in **`asia-southeast1` (Singapore)** in production mode, so client access is private until the repository's Firestore Rules are deployed.

Both Vercel projects—`teza-tech-lab-student` and `teza-tech-lab-admin`—now have the approved public Firebase Web App configuration and `NEXT_PUBLIC_ENABLE_FIREBASE=true` configured for Production and Preview. Both projects were redeployed after the variables were added.

Firebase Authentication initially contained only its default localhost and Firebase Hosting authorized domains. The Vercel production domains `teza-tech-lab-student.vercel.app` and `teza-tech-lab-admin.vercel.app` were added to its authorized-domain allowlist, enabling browser authentication on both active production sites.

The Firebase CLI is authorized with the project owner account. The repository's `firebase/firestore.rules` and `firebase/firestore.indexes.json` were successfully deployed to the `(default)` database in `student-management-syste-e8dbb`.

The Admin Website release containing the Firebase email/password `/login` route, non-admin sign-out protection, and the first-admin bootstrap guidance was pushed to GitHub and deployed successfully through Vercel.

## Current blocking step

Trusted callable Functions remain a separate action because this project uses Cloud Functions for Firebase v2 and Firebase may require a Blaze billing plan before they can be deployed. The project owner approved the Cloud Functions API enablement, and a live inventory check now confirms the API is enabled with no functions deployed. Billing and function deployment remain intentionally deferred. Until a billing prerequisite is explicitly approved and the functions are deployed, trusted server-side quiz scoring and the admin-generated password-reset-link helper remain unavailable. Student password-reset email and Firestore-protected website data remain independently available.

## Security deployment order

1. Validate the deployed rules enforce the current `auth.uid`, `courseId`, and `batchId` isolation model.
2. Determine whether the project owner wants to meet any Firebase billing prerequisite before deploying trusted callable Functions.
3. If approved, deploy and validate `submitQuizAttempt` and `adminCreatePasswordResetLink`.
