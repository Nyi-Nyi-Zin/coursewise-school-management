import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/auth/local_student_session.dart';
import 'core/auth/student_session_scope.dart';
import 'core/router/app_router.dart';
import 'core/theme/coursewise_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final session = await LocalStudentSession.restore();
  runApp(ProviderScope(child: CoursewiseStudentApp(session: session)));
}

class CoursewiseStudentApp extends StatelessWidget {
  const CoursewiseStudentApp({required this.session, super.key});
  final LocalStudentSession session;

  @override
  Widget build(BuildContext context) {
    return StudentSessionScope(
      session: session,
      child: MaterialApp.router(
      title: 'Coursewise',
      debugShowCheckedModeBanner: false,
      theme: coursewiseTheme,
      routerConfig: createAppRouter(session),
      ),
    );
  }
}
