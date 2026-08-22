import 'package:coursewise_student/core/auth/local_student_session.dart';
import 'package:coursewise_student/core/auth/student_session_scope.dart';
import 'package:coursewise_student/core/router/app_router.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  testWidgets('separates registration, login, home, and sign-out routes', (tester) async {
    final session = await LocalStudentSession.restore();
    await tester.pumpWidget(
      StudentSessionScope(
        session: session,
        child: MaterialApp.router(routerConfig: createAppRouter(session)),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Create your account'), findsOneWidget);
    expect(find.text('Welcome back'), findsNothing);

    final registrationFields = find.byType(TextFormField);
    await tester.enterText(registrationFields.at(0), 'Aye Aye');
    await tester.enterText(registrationFields.at(1), 'aye@example.com');
    await tester.enterText(registrationFields.at(2), 'secret1');
    await tester.enterText(registrationFields.at(3), 'secret1');
    await tester.tap(find.text('Create account'));
    await tester.pumpAndSettle();

    expect(find.textContaining('Welcome back, Aye Aye.'), findsOneWidget);
    await tester.tap(find.text('Profile').last);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Sign out'));
    await tester.pumpAndSettle();

    expect(find.text('Welcome back'), findsOneWidget);
    final loginFields = find.byType(TextFormField);
    await tester.enterText(loginFields.at(0), 'aye@example.com');
    await tester.enterText(loginFields.at(1), 'secret1');
    await tester.tap(find.text('Sign in'));
    await tester.pumpAndSettle();

    expect(find.textContaining('Welcome back, Aye Aye.'), findsOneWidget);
  });
}
