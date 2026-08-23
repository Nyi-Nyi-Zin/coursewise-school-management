import 'package:go_router/go_router.dart';

import '../auth/local_student_session.dart';
import '../../presentation/screens/student_screens.dart';

GoRouter createAppRouter(LocalStudentSession session) => GoRouter(
      initialLocation: session.isSignedIn ? '/home' : (session.hasRegisteredAccount ? '/login' : '/register'),
      refreshListenable: session,
      redirect: (context, state) {
        final atAuth = state.uri.path == '/login' || state.uri.path == '/register';
        if (!session.isSignedIn && !atAuth) return session.hasRegisteredAccount ? '/login' : '/register';
        if (session.isSignedIn && atAuth) return '/home';
        return null;
      },
      routes: [
        GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
        GoRoute(path: '/register', builder: (context, state) => const RegisterScreen()),
        GoRoute(path: '/home', builder: (context, state) => const HomeScreen()),
        GoRoute(path: '/lessons', builder: (context, state) => const LessonsScreen()),
        GoRoute(path: '/quizzes', builder: (context, state) => const QuizzesScreen()),
        GoRoute(path: '/quizzes/:quizId', builder: (context, state) => QuizSessionScreen(quizId: state.pathParameters['quizId']!)),
        GoRoute(path: '/attendance', builder: (context, state) => const AttendanceScreen()),
        GoRoute(path: '/assignments', builder: (context, state) => const AssignmentsScreen()),
        GoRoute(path: '/profile', builder: (context, state) => const ProfileScreen()),
      ],
    );
