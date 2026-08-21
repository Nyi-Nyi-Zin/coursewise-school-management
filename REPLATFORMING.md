# Coursewise Replatforming Architecture

The project now contains a dedicated **Next.js administrator dashboard** and a dedicated **Flutter student application**. The earlier generic web client remains in the repository as an implementation reference; the two application folders below are the forward architecture.

| Path | Stack | Purpose |
|---|---|---|
| `admin-dashboard/` | Next.js 16.3.1, TypeScript, Tailwind, Firebase client boundary | Administration workspace with responsive student, announcement, lesson, quiz, attendance, and settings modules |
| `student-app/` | Flutter 3.47-compatible Dart, Riverpod, GoRouter, Firebase | Student mobile experience with Home, Lessons, Quizzes, Profile, Attendance, and Assignments routes |
| `firebase/` | Firebase CLI configuration | Firestore role-based security rules and required query indexes |

The Next.js dashboard is build-validated and supports creating, editing, and deleting records in offline-ready local state before Firebase settings are connected. The Flutter source is structured with entities, repository abstraction, Firebase repository implementation, providers, routing, themes, and mobile screens. The local environment does not include the Flutter or Dart SDK, so platform generation and Flutter analysis cannot be executed here.

For the account-specific final step, follow `docs/FIREBASE_HANDOFF.md`. It contains the exact Firebase setup path, the security rules, the cross-application data contract, and references to the relevant official FlutterFire and Firestore documentation.
