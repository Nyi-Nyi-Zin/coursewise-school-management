class StudentProfile {
  const StudentProfile({required this.id, required this.name, required this.email, this.studentId, this.photoUrl, required this.isActive});
  final String id;
  final String name;
  final String email;
  final String? studentId;
  final String? photoUrl;
  final bool isActive;

  factory StudentProfile.fromMap(String id, Map<String, dynamic> data) => StudentProfile(
        id: id,
        name: data['name'] as String? ?? 'Student',
        email: data['email'] as String? ?? '',
        studentId: data['studentId'] as String?,
        photoUrl: data['photoUrl'] as String?,
        isActive: data['isActive'] as bool? ?? true,
      );
}

class Announcement {
  const Announcement({required this.id, required this.title, this.description, this.imageUrl, this.linkUrl});
  final String id;
  final String title;
  final String? description;
  final String? imageUrl;
  final String? linkUrl;
  factory Announcement.fromMap(String id, Map<String, dynamic> data) => Announcement(id: id, title: data['title'] as String? ?? 'Announcement', description: data['description'] as String?, imageUrl: data['imageUrl'] as String?, linkUrl: data['linkUrl'] as String?);
}

class Lesson {
  const Lesson({required this.id, required this.title, this.description, this.thumbnailUrl, this.telegramUrl, this.videoUrl, this.pdfUrl});
  final String id;
  final String title;
  final String? description;
  final String? thumbnailUrl;
  final String? telegramUrl;
  final String? videoUrl;
  final String? pdfUrl;
  factory Lesson.fromMap(String id, Map<String, dynamic> data) => Lesson(id: id, title: data['title'] as String? ?? 'Lesson', description: data['description'] as String?, thumbnailUrl: data['thumbnailUrl'] as String?, telegramUrl: data['telegramUrl'] as String?, videoUrl: data['videoUrl'] as String?, pdfUrl: data['pdfUrl'] as String?);
}

class Quiz {
  const Quiz({required this.id, required this.title, this.description, required this.totalMarks, this.durationMinutes});
  final String id;
  final String title;
  final String? description;
  final int totalMarks;
  final int? durationMinutes;
  factory Quiz.fromMap(String id, Map<String, dynamic> data) => Quiz(id: id, title: data['title'] as String? ?? 'Quiz', description: data['description'] as String?, totalMarks: data['totalMarks'] as int? ?? 0, durationMinutes: data['durationMinutes'] as int?);
}

class AttendanceRecord {
  const AttendanceRecord({required this.id, required this.date, required this.status, this.note});
  final String id;
  final String date;
  final String status;
  final String? note;
  factory AttendanceRecord.fromMap(String id, Map<String, dynamic> data) => AttendanceRecord(id: id, date: data['date'] as String? ?? '', status: data['status'] as String? ?? 'Present', note: data['note'] as String?);
}
