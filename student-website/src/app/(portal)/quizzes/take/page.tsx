"use client";

import { Suspense } from "react";

import { AssessmentRunner } from "@/components/assessment-runner";
import { Card, CardContent } from "@/components/ui/card";

export default function TakeQuizPage() {
  return (
    <Suspense
      fallback={
        <Card className="mt-8">
          <CardContent className="p-6 text-slate-500" role="status">
            Loading quiz…
          </CardContent>
        </Card>
      }
    >
      <AssessmentRunner />
    </Suspense>
  );
}
