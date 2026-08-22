import 'package:flutter/widgets.dart';

import 'local_student_session.dart';

class StudentSessionScope extends InheritedNotifier<LocalStudentSession> {
  const StudentSessionScope({required LocalStudentSession session, required super.child, super.key}) : super(notifier: session);
  static LocalStudentSession of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<StudentSessionScope>();
    assert(scope != null, 'StudentSessionScope is missing from the widget tree.');
    return scope!.notifier!;
  }
}
