# Teza Tech Lab Learning Platform

Teza Tech Lab is delivered as two independent Next.js applications that share one Firebase data contract, role model, and Firestore security boundary. Privileged workflows run in authenticated Next.js backend Route Handlers, so production does not depend on Firebase Cloud Functions.

| Application | Directory | Command | Responsibility |
|---|---|---|---|
| Administrator website | `admin-dashboard/` | `pnpm admin:dev` | Next.js 16.3.1 administration of courses, batches, students, enrollments, announcements, lessons, quizzes, results, and attendance |
| Student website | `student-website/` | `pnpm student:web:dev` | Mobile-first Next.js student portal for registration, login, courses, lessons, quizzes, assignments, attendance, profile, and password recovery |

The repository-level Vite application and legacy root server have been retired. The Flutter `student-app/` folder has been removed from the repository.

## Current validation

Run `pnpm test`, `pnpm admin:build`, and `pnpm student:web:build` from the repository root. The full suite covers shared data contracts, batch isolation, password recovery UI, Admin Dashboard query behavior, and Firestore Rules emulator behavior.

## Backend and Firebase activation

Follow `docs/FIREBASE_HANDOFF.md`, `docs/FIREBASE_WEB_CONFIG_TEMPLATE.md`, and `docs/NEXT_SUBDOMAIN_DEPLOYMENT.md` to connect one Firebase project and map the existing domain to `student.<domain>` and `admin.<domain>`. Both Vercel projects require the same server-only `FIREBASE_SERVICE_ACCOUNT_JSON`. Firestore rules and indexes live in `firebase/` and are referenced by `firebase.json`.
