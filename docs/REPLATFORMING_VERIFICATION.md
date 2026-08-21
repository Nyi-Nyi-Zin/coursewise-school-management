# Replatforming Verification

The standalone Next.js administrator dashboard was launched from `admin-dashboard/` and inspected at desktop size. The current offline-ready mode rendered the Coursewise sidebar, Overview, Students, Announcements, Lessons, Quizzes, Attendance, Settings navigation, the role-aware administrator identity card, the Firebase configuration indicator, and management overview cards.

The production validation command `NODE_ENV=production pnpm build && pnpm lint` completed successfully in `admin-dashboard/`. The root Vitest suite completed successfully with 13 tests, including the dedicated Next.js offline record tests that cover create, edit, delete, isolation by management module, and the exact `Excused` attendance status. The administrator application now includes a Firebase-ready role gate and persistence contracts; actual Firestore reads and writes remain unexecuted because no Firebase project credentials were supplied.

The local environment does not contain the Flutter or Dart SDK, so the Flutter source scaffold could not be compiled or run here. Its source structure, Firebase initialization fallback, Riverpod providers, GoRouter routes, and Firestore integration boundaries have been reviewed in source; platform generation and `flutter analyze` remain the final machine-specific checks.
