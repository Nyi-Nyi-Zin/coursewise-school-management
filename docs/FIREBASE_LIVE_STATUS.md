# Firebase Live Activation Status

## Confirmed Firebase state

The active Firebase project is `student-management-syste-e8dbb`. Email/Password Authentication is enabled, Cloud Firestore is in `asia-southeast1`, both Vercel production domains are authorized for Firebase Authentication, and the repository Firestore Rules and indexes have been deployed.

The live role boundary has been verified: the promoted administrator can enter the Admin Website, a student profile remains `role: "student"`, the student can enter the Student Portal, and that student is rejected by the Admin Website.

## Current backend migration state

Trusted workflows no longer wait for Firebase Cloud Functions or a Blaze billing prerequisite. They now run in the Vercel-hosted Next.js backends:

- Student registration: `POST /api/register-student`
- Student quiz catalog: `GET /api/quizzes`
- Trusted quiz scoring: `POST /api/quizzes/[quizId]/submit`
- Private result retrieval: `GET /api/quizzes/[quizId]/results`
- Admin student creation: `POST /api/students`
- Admin password-reset link: `POST /api/password-reset-link`

Before releasing this migration, add `FIREBASE_SERVICE_ACCOUNT_JSON` to both Vercel projects and `SIGNUP_RATE_LIMIT_SALT` to the Student Website, then redeploy both projects. Validate the acceptance checklist in `FIREBASE_HANDOFF.md`.

Firebase deployment is now limited to Firestore Rules and indexes. Images and files use Cloudinary, so the Spark-plan project does not require Cloud Storage for Firebase. The legacy Cloud Functions source is not part of the active deployment configuration.
