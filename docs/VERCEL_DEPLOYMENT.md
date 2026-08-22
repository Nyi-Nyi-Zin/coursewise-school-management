# Teza Tech Lab Vercel Deployment

Teza Tech Lab now has two active web applications. Create **two separate Vercel projects** from the same GitHub repository, selecting the indicated root directory for each project.

| Vercel project | Root directory | Production purpose | Recommended custom subdomain |
|---|---|---|---|
| Teza Tech Lab Student | `student-website` | Student registration, login, learning, private score, attendance, and password recovery | `student.<your-domain>` |
| Teza Tech Lab Admin | `admin-dashboard` | Courses, batches, enrollments, lessons, quizzes, attendance, results, and password recovery assistance | `admin.<your-domain>` |

Each directory contains its own `vercel.json`. Both Vercel install and build commands intentionally use `--ignore-workspace` so each project resolves and builds dependencies from its own root rather than inheriting the monorepo workspace. Vercel must use its native Next.js output detection; do not configure an `outputDirectory` override. The archived `student-app/` Flutter folder must not be selected as a Vercel project root.

## Firebase environment variables

Add the following values to **both** Vercel projects in **Settings → Environment Variables**. Set them for Production, Preview, and Development as appropriate.

| Variable | Required value |
|---|---|
| `NEXT_PUBLIC_ENABLE_FIREBASE` | `true` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase web app ID |

Enable **Email/Password** in Firebase Authentication before the Student Website goes live. Deploy the repository Firestore Rules and Firebase Functions before entering production data; the rules enforce `auth.uid`, course, and `batchId` isolation for student records.

The independent Vercel projects have already been deployed in demo-safe mode. Their live Firebase activation procedure, including callable Functions and authorized-domain requirements, is maintained in [FIREBASE_HANDOFF.md](./FIREBASE_HANDOFF.md).

## Custom-domain routing

After each Vercel project has a successful production deployment, add `student.<your-domain>` to the Student Vercel project and `admin.<your-domain>` to the Admin Vercel project. Vercel will display the precise DNS record required for each hostname. Add those records at the current DNS provider and wait until Vercel verifies them.

> Use distinct Vercel projects because the Student and Admin websites have different build roots and independently deployed static outputs.

## Final production validation

Confirm that a student account can register, log in, request a reset email, and see only its active course and batch. Confirm that an admin can create an unlimited number of courses and batches, enroll a student, filter attendance and quiz attempts by the selected course/batch, and create a reset link only as an administrator.

## References

[1]: https://vercel.com/docs/deployments/configure-a-build "Vercel build configuration"
[2]: https://vercel.com/docs/projects/project-configuration "Vercel project configuration"
[3]: https://firebase.google.com/docs/auth/web/password-auth "Firebase Email/Password Authentication"
