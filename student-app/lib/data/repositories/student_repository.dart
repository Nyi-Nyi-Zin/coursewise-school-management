import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../../domain/entities/student_entities.dart';

abstract class StudentRepository {
  Stream<User?> authState();
  Future<StudentProfile?> getProfile(String uid);
  Stream<List<Announcement>> watchAnnouncements();
  Stream<List<Lesson>> watchLessons();
  Stream<List<Quiz>> watchQuizzes();
  Future<List<QuizQuestion>> getQuizQuestions(String quizId);
  Future<void> submitQuizAttempt({required String quizId, required List<QuizAnswer> answers});
  Stream<List<AttendanceRecord>> watchAttendance(String uid);
  Future<void> signOut();
}

class FirebaseStudentRepository implements StudentRepository {
  FirebaseStudentRepository(this._auth, this._firestore);
  final FirebaseAuth _auth;
  final FirebaseFirestore _firestore;

  @override
  Stream<User?> authState() => _auth.authStateChanges();

  @override
  Future<StudentProfile?> getProfile(String uid) async {
    final snapshot = await _firestore.collection('users').doc(uid).get();
    if (!snapshot.exists || snapshot.data() == null) return null;
    return StudentProfile.fromMap(snapshot.id, snapshot.data()!);
  }

  @override
  Stream<List<Announcement>> watchAnnouncements() => _firestore.collection('announcements').where('isPublished', isEqualTo: true).orderBy('sortOrder').snapshots().map((snapshot) => snapshot.docs.map((doc) => Announcement.fromMap(doc.id, doc.data())).toList());

  @override
  Stream<List<Lesson>> watchLessons() => _firestore.collection('lessons').where('isPublished', isEqualTo: true).orderBy('sortOrder').snapshots().map((snapshot) => snapshot.docs.map((doc) => Lesson.fromMap(doc.id, doc.data())).toList());

  @override
  Stream<List<Quiz>> watchQuizzes() => _firestore.collection('quizzes').where('isPublished', isEqualTo: true).snapshots().map((snapshot) => snapshot.docs.map((doc) => Quiz.fromMap(doc.id, doc.data())).toList());

  @override
  Future<List<QuizQuestion>> getQuizQuestions(String quizId) async {
    final snapshot = await _firestore.collection('quizzes').doc(quizId).collection('questions').orderBy('sortOrder').get();
    return snapshot.docs.map((doc) => QuizQuestion.fromMap(doc.id, doc.data())).toList();
  }

  @override
  Future<void> submitQuizAttempt({required String quizId, required List<QuizAnswer> answers}) async {
    await FirebaseFunctions.instance.httpsCallable('submitQuizAttempt').call({
      'quizId': quizId,
      'answers': answers.map((answer) => answer.toMap()).toList(),
    });
  }

  @override
  Stream<List<AttendanceRecord>> watchAttendance(String uid) => _firestore.collection('attendance').where('studentId', isEqualTo: uid).orderBy('date', descending: true).snapshots().map((snapshot) => snapshot.docs.map((doc) => AttendanceRecord.fromMap(doc.id, doc.data())).toList());

  @override
  Future<void> signOut() => _auth.signOut();
}
