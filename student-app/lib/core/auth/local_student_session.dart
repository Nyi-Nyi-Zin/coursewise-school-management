import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LocalStudentSession extends ChangeNotifier {
  LocalStudentSession._(this._preferences);

  final SharedPreferences _preferences;
  bool _isSignedIn = false;
  String _name = '';
  String _email = '';

  static Future<LocalStudentSession> restore() async {
    final session = LocalStudentSession._(await SharedPreferences.getInstance());
    session._isSignedIn = session._preferences.getBool('student_signed_in') ?? false;
    session._name = session._preferences.getString('student_name') ?? '';
    session._email = session._preferences.getString('student_email') ?? '';
    return session;
  }

  bool get isSignedIn => _isSignedIn;
  bool get hasRegisteredAccount => _preferences.containsKey('student_account_email');
  String get name => _name;
  String get email => _email;
  String get initials => _name.trim().isEmpty ? 'S' : _name.trim().substring(0, 1).toUpperCase();

  Future<void> register({required String name, required String email, required String password}) async {
    if (name.trim().length < 2) throw const FormatException('Enter your full name.');
    if (!email.contains('@')) throw const FormatException('Enter a valid email address.');
    if (password.length < 6) throw const FormatException('Password must contain at least 6 characters.');
    if (hasRegisteredAccount) throw const FormatException('This device already has a student account. Please sign in.');

    final normalizedEmail = email.trim().toLowerCase();
    final salt = List<int>.generate(16, (_) => Random.secure().nextInt(256));
    final hash = sha256.convert([...salt, ...utf8.encode(password)]).toString();
    await _preferences.setString('student_account_name', name.trim());
    await _preferences.setString('student_account_email', normalizedEmail);
    await _preferences.setString('student_account_salt', base64UrlEncode(salt));
    await _preferences.setString('student_account_hash', hash);
    await _completeSignIn(name: name.trim(), email: normalizedEmail);
  }

  Future<void> login({required String email, required String password}) async {
    if (!hasRegisteredAccount) throw const FormatException('No account is registered on this device. Please register first.');
    final normalizedEmail = email.trim().toLowerCase();
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
    _isSignedIn = false;
    await _preferences.remove('student_signed_in');
    notifyListeners();
  }
}
