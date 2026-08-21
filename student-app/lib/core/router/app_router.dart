import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../presentation/screens/student_screens.dart';

final appRouterProvider = Provider<GoRouter>((ref) => GoRouter(
      initialLocation: '/home',
      routes: [
        GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
        GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
        GoRoute(path: '/lessons', builder: (_, __) => const LessonsScreen()),
        GoRoute(path: '/quizzes', builder: (_, __) => const QuizzesScreen()),
        GoRoute(path: '/quizzes/:quizId', builder: (_, state) => QuizSessionScreen(quizId: state.pathParameters['quizId']!)),
        GoRoute(path: '/attendance', builder: (_, __) => const AttendanceScreen()),
        GoRoute(path: '/assignments', builder: (_, __) => const AssignmentsScreen()),
        GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
      ],
    ));
