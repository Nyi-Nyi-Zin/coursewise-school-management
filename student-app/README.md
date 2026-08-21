# Coursewise Student App

This is the dedicated Flutter student application for Coursewise. It uses **Flutter 3.47-compatible Dart**, Riverpod for state management, GoRouter for navigation, and Firebase Authentication plus Cloud Firestore for student data.

## Local setup

Install the Flutter SDK, run `flutter create .` once to generate Android/iOS platform folders, then run `flutterfire configure` to replace `lib/firebase_options.dart` with the Firebase settings for your project. Finally run `flutter pub get` and `flutter run`.

The app includes student home, announcements, lessons, quizzes, attendance, assignments, and profile routes. The required bottom navigation is exactly Home, Lessons, Quizzes, and Profile. Student home includes quick links to Lessons, Quizzes, Assignments, and Attendance.
