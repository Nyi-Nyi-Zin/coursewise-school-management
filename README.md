# Coursewise

Coursewise is now organized around two applications that share the Firebase data contract and security model.

| Application | Directory | Command | Responsibility |
|---|---|---|---|
| Administrator dashboard | `admin-dashboard/` | `pnpm admin:dev` | Next.js 16.3.1 administration of students, announcements, lessons, quizzes, results, and attendance |
| Student application | `student-app/` | `flutter run` | Flutter mobile learning experience for announcements, lessons, quizzes, attendance, assignments, and profile |

The repository-level Vite application has been retired from normal project commands and is available only through the explicit `legacy:*` scripts. New development, build, and start commands now target the Next.js dashboard; the student mobile client lives in `student-app/`.

## Current validation

Run `pnpm test`, `pnpm check`, `pnpm admin:build`, and `pnpm admin:lint` from the repository root. The Flutter/Dart SDK is not installed in the current sandbox, so run `flutter create .`, `flutterfire configure`, `flutter pub get`, `flutter analyze`, and `flutter run` from `student-app/` on a Flutter-enabled machine.

## Firebase activation

Follow `docs/FIREBASE_HANDOFF.md` and `docs/FIREBASE_WEB_CONFIG_TEMPLATE.md` to connect an actual Firebase project. The Firestore rules and indexes live in `firebase/` and are referenced by `firebase.json`.
