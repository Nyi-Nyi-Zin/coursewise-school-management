# Coursewise Replatforming Architecture

The project now contains a dedicated **Next.js administrator dashboard** and a dedicated **Next.js student website**. The earlier generic web client remains in the repository as an implementation reference; the application folders below are the forward architecture.

| Path | Stack | Purpose |
|---|---|---|
| `admin-dashboard/` | Next.js 16.3.1, TypeScript, Tailwind, Firebase client boundary | Administration workspace with responsive student, announcement, lesson, quiz, attendance, and settings modules |
| `student-website/` | Next.js 16.3.1, TypeScript, Tailwind, Firebase client boundary | Mobile-first student portal for registration, login, lessons, quizzes, assignments, attendance, and profile |
| `firebase/` | Firebase CLI configuration | Firestore role-based security rules and required query indexes |

The Next.js dashboard is build-validated and supports creating, editing, and deleting records in offline-ready local state before Firebase settings are connected.

For the account-specific final step, follow `docs/FIREBASE_HANDOFF.md`. It contains the exact Firebase setup path, the security rules, and the cross-application data contract.
