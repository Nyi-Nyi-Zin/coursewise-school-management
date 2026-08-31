"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useStudentAuth } from "@/components/student-auth-provider";
import { useStudentCourse } from "@/components/student-course-provider";
import { getDemoLessonProgress, studentQueryKeys, type Lesson } from "@/lib/student-data";
import { isFirebaseConfigured } from "@/lib/firebase";
import { getLessonProgress, updateLessonProgress } from "@/lib/student-repository";

export function useLessonProgress() {
  const { user } = useStudentAuth();
  const { enrollment } = useStudentCourse();
  const queryClient = useQueryClient();

  const progressQuery = useQuery({
    queryKey: [...studentQueryKeys.lessonProgress, enrollment?.courseId],
    queryFn: () => getLessonProgress(user?.uid, enrollment?.courseId),
    initialData: isFirebaseConfigured ? undefined : () => getDemoLessonProgress(),
    enabled: !isFirebaseConfigured || Boolean(user?.uid && enrollment),
  });

  const updateStatus = useMutation({
    mutationFn: ({ lessonId, status }: { lessonId: string; status: Lesson["status"] }) =>
      updateLessonProgress(user?.uid, lessonId, enrollment?.courseId ?? "", status),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: studentQueryKeys.lessonProgress });
      toast.success(status === "complete" ? "Lesson marked as completed." : status === "continue" ? "Lesson marked as in progress." : "Lesson reset to new.");
    },
    onError: error => toast.error(error instanceof Error ? error.message : "Could not update lesson progress."),
  });

  return { statuses: progressQuery.data, updateStatus };
}