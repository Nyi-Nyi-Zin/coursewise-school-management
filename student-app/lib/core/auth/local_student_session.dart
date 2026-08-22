import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LocalStudentSession extends ChangeNotifier {
  LocalStudentSession._(this._preferences);

  final SharedPreferences _preferences;
  FirebaseAuth? _firebaseAuth;
  bool _isSignedIn = false;
  String _name = '';
  String _email = '';

  static Future<LocalStudentSession> restore({FirebaseAuth? firebaseAuth}) async {
    final session = LocalStudentSession._(await SharedPreferences.getInstance());
    session._firebaseAuth = firebaseAuth;
    final firebaseUser = firebaseAuth?.currentUser;
    if (firebaseUser != null) {
      session._isSignedIn = true;
      session._name = firebaseUser.displayName?.trim().isNotEmpty == true ? firebaseUser.displayName! : 'Student';
      session._email = firebaseUser.email ?? '';
    } else {
      session._isSignedIn = session._preferences.getBool('student_signed_in') ?? false;
      session._name = session._preferences.getString('student_name') ?? '';
      session._email = session._preferences.getString('student_email') ?? '';
    }
    return session;
  }

  bool get isSignedIn => _isSignedIn;
  bool get usingFirebase => _firebaseAuth != null;
  bool get hasRegisteredAccount => usingFirebase ? false : _preferences.containsKey('student_account_email');
  String get name => _name;
  String get email => _email;
  String get initials => _name.trim().isEmpty ? 'S' : _name.trim().substring(0, 1).toUpperCase();

  Future<void> register({required String name, required String email, required String password}) async {
    if (name.trim().length < 2) throw const FormatException('Enter your full name.');
    if (!email.contains('@')) throw const FormatException('Enter a valid email address.');
    if (password.length < 6) throw const FormatException('Password must contain at least 6 characters.');
    final normalizedEmail = email.trim().toLowerCase();
    if (usingFirebase) {
      try {
        final credential = await _firebaseAuth!.createUserWithEmailAndPassword(email: normalizedEmail, password: password);
        await credential.user?.updateDisplayName(name.trim());
        await _completeSignIn(name: name.trim(), email: normalizedEmail);
        return;
      } on FirebaseAuthException catch (error) {
        throw FormatException(_firebaseMessage(error));
      }
    }
    if (hasRegisteredAccount) throw const FormatException('This device already has a student account. Please sign in.');

    final salt = List<int>.generate(16, (_) => Random.secure().nextInt(256));
    final hash = sha256.convert([...salt, ...utf8.encode(password)]).toString();
    await _preferences.setString('student_account_name', name.trim());
    await _preferences.setString('student_account_email', normalizedEmail);
    await _preferences.setString('student_account_salt', base64UrlEncode(salt));
    await _preferences.setString('student_account_hash', hash);
    await _completeSignIn(name: name.trim(), email: normalizedEmail);
  }

  Future<void> login({required String email, required String password}) async {
    final normalizedEmail = email.trim().toLowerCase();
    if (usingFirebase) {
      try {
        final credential = await _firebaseAuth!.signInWithEmailAndPassword(email: normalizedEmail, password: password);
        final user = credential.user;
        await _completeSignIn(name: user?.displayName?.trim().isNotEmpty == true ? user!.displayName! : 'Student', email: user?.email ?? normalizedEmail);
        return;
      } on FirebaseAuthException catch (error) {
        throw FormatException(_firebaseMessage(error));
      }
    }
    if (!hasRegisteredAccount) throw const FormatException('No account is registered on this device. Please register first.');
    final storedEmail = _preferences.getString('student_account_email');
    final encodedSalt = _preferences.getString('student_account_salt');
    final storedHash = _preferences.getString('student_account_hash');
    if (storedEmail != normalizedEmail || encodedSalt == null || storedHash == null) {
      throw const FormatException('Email or password is incorrect.');
    }
    final suppliedHash = sha256.convert([...base64Url.decode(encodedSalt), ...utf8.encode(password)]).toString();
    if (suppliedHash != storedHash) throw const FormatException('Email or password is incorrect.');
    await _completeSignIn(name: _preferences.getString('student_account_name') ?? 'Student', email: normalizedEmail);
  }

  Future<void> _completeSignIn({required String name, required String email}) async {
    _name = name;
    _email = email;
    _isSignedIn = true;
    await _preferences.setBool('student_signed_in', true);
    await _preferences.setString('student_name', _name);
    await _preferences.setString('student_email', _email);
    notifyListeners();
  }

  Future<void> signOut() async {
    if (usingFirebase) await _firebaseAuth!.signOut();
    _isSignedIn = false;
    await _preferences.remove('student_signed_in');
    notifyListeners();
  }

  Future<void> requestPasswordReset(String email) async {
    final normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.contains('@')) throw const FormatException('Enter a valid email address.');
    if (!usingFirebase) throw const FormatException('Password reset becomes available after Firebase Android configuration is connected.');
    try {
      await _firebaseAuth!.sendPasswordResetEmail(email: normalizedEmail);
    } on FirebaseAuthException catch (error) {
      throw FormatException(_firebaseMessage(error));
    }
  }

  static String _firebaseMessage(FirebaseAuthException error) {
    switch (error.code) {
      case 'email-already-in-use':
        return 'An account with this email already exists. Please sign in.';
      case 'invalid-email':
        return 'Enter a valid email address.';
      case 'weak-password':
        return 'Use a stronger password with at least 6 characters.';
      case 'user-not-found':
      case 'wrong-password':
      case 'invalid-credential':
        return 'Email or password is incorrect.';
      case 'network-request-failed':
        return 'A network connection is required to use Firebase Authentication.';
      default:
        return error.message ?? 'Unable to complete authentication. Please try again.';
    }
  }
}
