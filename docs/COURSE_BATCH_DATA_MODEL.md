# Course and Batch Data Model

Every course is a top-level document in `courses/{courseId}`. Administrators may add an unlimited number of courses. Each course contains its own batches under `courses/{courseId}/batches/{batchId}`, and each batch has a student-specific enrollment document at `courses/{courseId}/batches/{batchId}/enrollments/{studentUid}`.

| Collection or path | Required ownership fields | Student access |
|---|---|---|
| `courses/{courseId}` | `title`, `code`, `isActive` | A student may read only a course in which they have an enrollment. |
| `courses/{courseId}/batches/{batchId}` | `name`, `courseId`, `isActive` | A student may read only their enrolled batch. |
| `courses/{courseId}/batches/{batchId}/enrollments/{studentUid}` | `studentId`, `courseId`, `batchId`, `status` | The matching student may read only their own enrollment. |
| `lessons`, `announcements`, `quizzes` | `courseId`, `batchId`, `isPublished` | A student may read published content only when their own enrollment matches both IDs. |
| `quizAttempts`, `attendance` | `studentId`, `courseId`, `batchId` | A student may read only records where `studentId == auth.uid` and the batch enrollment exists. |

> The `batchId` field is enforced alongside `auth.uid`; it is not merely a UI filter. A student from Batch A cannot query Batch B data, even when the course is the same.

Quiz question display documents must not include a correct answer. Store trusted answer keys under `quizzes/{quizId}/answerKeys/{questionId}`; only administrators and the server-side quiz function may access those documents.
