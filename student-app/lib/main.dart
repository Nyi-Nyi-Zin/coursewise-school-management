import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/auth/local_student_session.dart';
import 'core/auth/student_session_scope.dart';
import 'core/router/app_router.dart';
import 'core/theme/coursewise_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  FirebaseAuth? firebaseAuth;
  try {
    await Firebase.initializeApp();
    firebaseAuth = FirebaseAuth.instance;
  } catch (_) {
    // Firebase becomes active after google-services.json is supplied for the Android app.
  }
  final session = await LocalStudentSession.restore(firebaseAuth: firebaseAuth);
  runApp(ProviderScope(child: TezaTechLabStudentApp(session: session)));
}

class TezaTechLabStudentApp extends StatelessWidget {
  const TezaTechLabStudentApp({required this.session, super.key});
  final LocalStudentSession session;

  @override
  Widget build(BuildContext context) {
    return StudentSessionScope(
      session: session,
      child: MaterialApp.router(
      title: 'Teza Tech Lab',
      debugShowCheckedModeBanner: false,
      theme: coursewiseTheme,
      routerConfig: createAppRouter(session),
      ),
    );
  }
}
