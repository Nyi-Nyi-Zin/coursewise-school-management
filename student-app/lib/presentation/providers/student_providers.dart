import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/repositories/student_repository.dart';
import '../../domain/entities/student_entities.dart';

final studentRepositoryProvider = Provider<StudentRepository>((ref) => FirebaseStudentRepository(FirebaseAuth.instance, FirebaseFirestore.instance));
final authStateProvider = StreamProvider<User?>((ref) => ref.watch(studentRepositoryProvider).authState());
final profileProvider = FutureProvider<StudentProfile?>((ref) async { final user = ref.watch(authStateProvider).asData?.value; return user == null ? null : ref.watch(studentRepositoryProvider).getProfile(user.uid); });
final announcementsProvider = StreamProvider<List<Announcement>>((ref) => ref.watch(studentRepositoryProvider).watchAnnouncements());
final lessonsProvider = StreamProvider<List<Lesson>>((ref) => ref.watch(studentRepositoryProvider).watchLessons());
final quizzesProvider = StreamProvider<List<Quiz>>((ref) => ref.watch(studentRepositoryProvider).watchQuizzes());
final quizQuestionsProvider = FutureProvider.family<List<QuizQuestion>, String>((ref, quizId) => ref.watch(studentRepositoryProvider).getQuizQuestions(quizId));
final attendanceProvider = StreamProvider<List<AttendanceRecord>>((ref) { final user = ref.watch(authStateProvider).asData?.value; return user == null ? Stream<List<AttendanceRecord>>.empty() : ref.watch(studentRepositoryProvider).watchAttendance(user.uid); });
