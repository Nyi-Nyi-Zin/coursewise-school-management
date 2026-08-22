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
  String get name => _name;
  String get email => _email;
  String get initials => _name.trim().isEmpty ? 'S' : _name.trim().substring(0, 1).toUpperCase();

  Future<void> signIn({required String name, required String email, required String password}) async {
    if (name.trim().length < 2) throw const FormatException('Enter your full name.');
    if (!email.contains('@')) throw const FormatException('Enter a valid email address.');
    if (password.length < 6) throw const FormatException('Password must contain at least 6 characters.');
    _name = name.trim();
    _email = email.trim().toLowerCase();
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
