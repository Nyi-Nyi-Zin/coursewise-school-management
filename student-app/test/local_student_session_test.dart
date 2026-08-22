import 'package:coursewise_student/core/auth/local_student_session.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  test('persists a valid local student sign-in', () async {
    final session = await LocalStudentSession.restore();
    await session.signIn(name: 'Aye Aye', email: 'aye@example.com', password: 'secret1');

    final restored = await LocalStudentSession.restore();
    expect(restored.isSignedIn, isTrue);
    expect(restored.name, 'Aye Aye');
    expect(restored.email, 'aye@example.com');
  });

  test('rejects an invalid local student sign-in', () async {
    final session = await LocalStudentSession.restore();
    expect(() => session.signIn(name: 'A', email: 'invalid', password: '123'), throwsFormatException);
  });
}
