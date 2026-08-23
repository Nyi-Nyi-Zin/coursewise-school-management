# Firebase Live Activation Status

## Confirmed account-side configuration

The active Firebase project is **`student-management-syste-e8dbb`**. Firebase Email/Password Authentication is enabled. A default Cloud Firestore database was created in **`asia-southeast1` (Singapore)** in production mode, so client access is private until the repository's Firestore Rules are deployed.

Both Vercel projects—`teza-tech-lab-student` and `teza-tech-lab-admin`—now have the approved public Firebase Web App configuration and `NEXT_PUBLIC_ENABLE_FIREBASE=true` configured for Production and Preview. Both projects were redeployed after the variables were added.

Firebase Authentication initially contained only its default localhost and Firebase Hosting authorized domains. The Vercel production domains `teza-tech-lab-student.vercel.app` and `teza-tech-lab-admin.vercel.app` were added to its authorized-domain allowlist, enabling browser authentication on both active production sites.

The Firebase CLI is authorized with the project owner account. The repository's `firebase/firestore.rules` and `firebase/firestore.indexes.json` were successfully deployed to the `(default)` database in `student-management-syste-e8dbb`.

The Admin Website release containing the Firebase email/password `/login` route, non-admin sign-out protection, and the first-admin bootstrap guidance was pushed to GitHub and deployed successfully through Vercel.

The project owner has completed registration of the first administrator account. Its Firebase Authentication user and matching self-created student profile were located in the live project, and the project owner has approved its controlled role promotion from `student` to `admin`.

The existing `role` field was updated directly in that trusted Firestore Console profile editor; no client-side role-promotion capability was added. The live profile now has `role: "admin"` and can access the Admin Website after the account signs in.

The active Student Website login route loads with Firebase enabled and no client-side Firebase initialization errors. The project owner has successfully signed in through the Admin Website with the promoted account, completing the live authentication-boundary verification.

A separate live Firebase Authentication account exists for the student verification flow and remains distinct from the promoted administrator profile.

The student account's Firestore profile has been verified with `role: "student"`; it remains separate from the live `admin` profile.

The project owner confirmed the student account successfully registered through the Student Portal and was blocked from entering the Admin Website. Together with the promoted administrator's successful Admin Website sign-in, this confirms the intended live role boundary.

The project owner additionally confirmed the real student account reached the authenticated Student Portal Home after registration. The production verification outcome is therefore complete: the student account can access the Student Portal, the same student account is blocked from the Admin Website, and the promoted administrator account can access the Admin Website.

## Current blocking step

Trusted callable Functions remain a separate action because this project uses Cloud Functions for Firebase v2 and Firebase may require a Blaze billing plan before they can be deployed. The project owner approved the Cloud Functions API enablement, and a live inventory check now confirms the API is enabled with no functions deployed. Billing and function deployment remain intentionally deferred. Until a billing prerequisite is explicitly approved and the functions are deployed, trusted server-side quiz scoring and the admin-generated password-reset-link helper remain unavailable. Student password-reset email and Firestore-protected website data remain independently available.

## Security deployment order

1. Validate the deployed rules enforce the current `auth.uid`, `courseId`, and `batchId` isolation model.
2. Determine whether the project owner wants to meet any Firebase billing prerequisite before deploying trusted callable Functions.
3. If approved, deploy and validate `submitQuizAttempt` and `adminCreatePasswordResetLink`.
