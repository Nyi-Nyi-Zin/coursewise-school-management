# Teza Tech Lab Learning Platform

Teza Tech Lab is now delivered as two independent Next.js websites that share one Firebase data contract, role model, and Firestore security boundary.

| Application | Directory | Command | Responsibility |
|---|---|---|---|
| Administrator website | `admin-dashboard/` | `pnpm admin:dev` | Next.js 16.3.1 administration of courses, batches, students, enrollments, announcements, lessons, quizzes, results, and attendance |
| Student website | `student-website/` | `pnpm student:web:dev` | Mobile-first Next.js student portal for registration, login, courses, lessons, quizzes, assignments, attendance, profile, and password recovery |

The repository-level Vite application has been retired from normal project commands and is available only through the explicit `legacy:*` scripts. The `student-app/` Flutter folder is retained as an archived reference and is not part of the active delivery path.

## Current validation

Run `pnpm test`, `pnpm admin:build`, and `pnpm student:web:build` from the repository root. The full suite covers shared data contracts, batch isolation, password recovery UI, Admin Dashboard query behavior, and Firestore Rules emulator behavior.

## Firebase activation

Follow `docs/FIREBASE_HANDOFF.md`, `docs/FIREBASE_WEB_CONFIG_TEMPLATE.md`, and `docs/NEXT_SUBDOMAIN_DEPLOYMENT.md` to connect one Firebase project and map the existing domain to `student.<domain>` and `admin.<domain>`. The Firestore rules and indexes live in `firebase/` and are referenced by `firebase.json`.
