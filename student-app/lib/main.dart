import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/router/app_router.dart';
import 'core/theme/coursewise_theme.dart';
import 'firebase_options.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  var firebaseReady = false;
  try {
    await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
    firebaseReady = true;
  } catch (_) {
    // The handoff source intentionally remains runnable before a Firebase
    // project is selected with flutterfire configure.
  }
  runApp(ProviderScope(child: CoursewiseStudentApp(firebaseReady: firebaseReady)));
}

class CoursewiseStudentApp extends ConsumerWidget {
  const CoursewiseStudentApp({required this.firebaseReady, super.key});
  final bool firebaseReady;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!firebaseReady) {
      return MaterialApp(
        title: 'Coursewise',
        theme: coursewiseTheme,
        home: const FirebaseSetupScreen(),
      );
    }
    return MaterialApp.router(
      title: 'Coursewise',
      debugShowCheckedModeBanner: false,
      theme: coursewiseTheme,
      routerConfig: ref.watch(appRouterProvider),
    );
  }
}

class FirebaseSetupScreen extends StatelessWidget {
  const FirebaseSetupScreen({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.cloud_outlined, size: 52),
                const SizedBox(height: 18),
                Text('Firebase setup is the final connection step', style: Theme.of(context).textTheme.headlineMedium, textAlign: TextAlign.center),
                const SizedBox(height: 12),
                const Text('Run flutterfire configure with the school Firebase project, then start the app again.'),
              ],
            ),
          ),
        ),
      );
}
