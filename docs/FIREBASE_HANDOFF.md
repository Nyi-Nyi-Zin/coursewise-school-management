# Firebase Handoff for Coursewise

Coursewise is now organized as two applications that share one Firebase project. The **Next.js 16.3.1** application in `admin-dashboard/` is the administrator workspace. The **Flutter student app** in `student-app/` uses Riverpod, GoRouter, and a clean separation between entities, repository interfaces, Firebase data access, and presentation screens. The current local source is intentionally credential-independent: the Next.js dashboard works in offline-ready mode, and Flutter opens a configuration screen until Firebase is configured.

| Application | Primary responsibility | Firebase integration point |
|---|---|---|
| `admin-dashboard/` | Students, announcements, lessons, quizzes, results, and attendance | `src/lib/firebase.ts` and `.env.example` |
| `student-app/` | Student learning, announcements, lessons, quizzes, attendance, and profile | `lib/data/repositories/student_repository.dart` and `lib/firebase_options.dart` |
| `firebase/` | Authorization policy and query indexes | `firestore.rules` and `firestore.indexes.json` |

## Data contract

The two applications use the same Firestore collection names. Student identity documents live in `users/{uid}` with the fields `role`, `name`, `email`, `studentId`, `photoUrl`, and `isActive`. Content collections are `announcements`, `lessons`, and `quizzes`; questions are stored at `quizzes/{quizId}/questions/{questionId}`. Student-specific records use the authenticated Firebase UID in `quizAttempts.studentId` and `attendance.studentId`.

| Collection | Student capability | Administrator capability |
|---|---|---|
| `users` | Read own profile; update limited self-service fields | Create and manage every student profile |
| `announcements` | Read only published records | Full create, update, publish, ordering, and delete access |
| `lessons` | Read only published lessons | Full create, update, publish, ordering, and delete access |
| `quizzes` and `questions` | Read only published quizzes and questions | Full quiz/question lifecycle management |
| `quizAttempts` | Read own attempts | Read all attempts; trusted server writes results |
| `attendance` | Read own records | Record and edit `Present`, `Absent`, `Late`, and `Excused` statuses |

> **Security boundary:** quiz score calculation and persistence must run through a trusted server-side callable function or Firebase Admin SDK. The supplied Firestore rules deliberately prevent student clients from creating or changing scored attempts.

## Final connection steps

First, create or select a Firebase project, enable Email/Password authentication, and create a Cloud Firestore database. Add the Firebase web configuration values to `admin-dashboard/.env.local` using the keys in `.env.example`. The Next.js client initializes only after all required public variables are present.

Next, install Flutter locally, run `flutter create .` inside `student-app/` to generate platform folders, then install the FlutterFire CLI and run `flutterfire configure`. This creates the platform-specific `lib/firebase_options.dart` file used by the app. The official FlutterFire workflow specifies that the generated file contains identifiers rather than secret values and should be refreshed when platforms or Firebase services change.[1]

Finally, deploy `firebase/firestore.rules` and `firebase/firestore.indexes.json` through the Firebase CLI or console. The rules use `request.auth` for authentication checks and document reads for role evaluation; Firebase documents that rule conditions can evaluate authentication and other document data, so both applications must query published content with the matching `isPublished` constraint.[2]

## Recommended trusted server work

The provided applications are ready for client authentication and Firestore reads after setup. The Next.js dashboard includes shared persistence adapters for records, quiz questions, and attempt summaries. The Flutter quiz flow loads published questions and calls the trusted `submitQuizAttempt` Firebase callable function implemented in `functions/src/index.ts`; it recalculates marks from protected answers before writing a result. Before production student provisioning, add a server-only Firebase Admin SDK layer or callable function that creates Firebase Authentication users and matching `users/{uid}` documents. Never expose the Firebase private key in either Next.js browser code or the Flutter app.

## References

[1]: https://firebase.google.com/docs/flutter/setup "Firebase: Get started with Firebase in your Flutter project"
[2]: https://firebase.google.com/docs/firestore/security/rules-conditions "Firebase: Writing conditions for Cloud Firestore Security Rules"
