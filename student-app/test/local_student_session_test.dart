import 'package:coursewise_student/core/auth/local_student_session.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  test('registers, persists, and logs in a local student account', () async {
    final session = await LocalStudentSession.restore();
    await session.register(name: 'Aye Aye', email: 'aye@example.com', password: 'secret1');

    await session.signOut();
    await session.login(email: 'aye@example.com', password: 'secret1');

    final restored = await LocalStudentSession.restore();
    expect(restored.isSignedIn, isTrue);
    expect(restored.name, 'Aye Aye');
    expect(restored.email, 'aye@example.com');
  });

  test('rejects an invalid local student login', () async {
    final session = await LocalStudentSession.restore();
    await session.register(name: 'Aye Aye', email: 'aye@example.com', password: 'secret1');
    await session.signOut();
    expect(() => session.login(email: 'aye@example.com', password: 'incorrect'), throwsFormatException);
  });
}
