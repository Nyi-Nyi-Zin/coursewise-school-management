# Build Coursewise Student App for Android

This archive contains the complete Flutter source, state management, navigation, Firebase client boundaries, and trusted quiz-submission integration. The current build environment does not include the Flutter or Android SDK, so it cannot generate an APK here.

## One-time local setup

Install the current Flutter stable SDK and Android Studio. From this folder, run:

```bash
flutter create .
flutter pub get
dart pub global activate flutterfire_cli
flutterfire configure
```

Choose the same Firebase project used by the Next.js administrator dashboard, and enable Android. This generates the platform folders plus Firebase configuration files. Keep generated service configuration files private.

## Verify and create an APK

```bash
flutter analyze
flutter test
flutter build apk --release
```

The Android package will be at `build/app/outputs/flutter-apk/app-release.apk`.

## Firebase prerequisites

Enable Firebase Authentication, Firestore, and Cloud Functions. Deploy the repository `firebase/` rules and `functions/` callable source before releasing quizzes: `submitQuizAttempt` is intentionally server-scored to protect correct answers.
