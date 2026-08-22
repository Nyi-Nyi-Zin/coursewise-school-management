"use client";

import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useMemo } from "react";
import { useStudentAuth } from "@/components/student-auth-provider";
import { getStudentEnrollmentContext, type EnrollmentContext } from "@/lib/student-repository";

type StudentCourseState = { enrollment: EnrollmentContext | null; loading: boolean };
const StudentCourseContext = createContext<StudentCourseState>({ enrollment: null, loading: true });

export function StudentCourseProvider({ children }: { children: React.ReactNode }) {
  const { user, firebaseActive } = useStudentAuth();
  const query = useQuery({ queryKey: ["student", "enrollment", user?.uid], queryFn: () => getStudentEnrollmentContext(user!.uid), enabled: Boolean(user?.uid) || !firebaseActive, initialData: firebaseActive ? undefined : { courseId: "demo-web", batchId: "demo-batch", courseTitle: "Web Engineering", batchName: "Demo learning batch" } });
  const value = useMemo(() => ({ enrollment: query.data ?? null, loading: query.isLoading }), [query.data, query.isLoading]);
  return <StudentCourseContext.Provider value={value}>{children}</StudentCourseContext.Provider>;
}

export function useStudentCourse() { return useContext(StudentCourseContext); }
