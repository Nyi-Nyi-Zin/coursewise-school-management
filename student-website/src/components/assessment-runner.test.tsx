// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";

import { AssessmentRunner } from "@/components/assessment-runner";

const mocks = vi.hoisted(() => ({
  recordViolation: vi.fn(),
  startAssessment: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("id=final-1") }));
vi.mock("next/link", () => ({ default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={String(href)} {...props}>{children}</a> }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn() } }));
vi.mock("@/lib/student-repository", () => ({
  checkChapterAnswer: vi.fn(),
  recordExamIntegrityViolation: mocks.recordViolation,
  startAssessment: mocks.startAssessment,
  submitQuizAttempt: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it("conceals final-exam questions and records PrintScreen attempts", async () => {
  mocks.startAssessment.mockResolvedValue({
    sessionId: "session-token-1",
    kind: "final_exam",
    title: "Final exam",
    chapter: "",
    passingPercent: 70,
    startedAtMillis: Date.now(),
    expiresAtMillis: Date.now() + 60_000,
    integrityViolations: 0,
    checkedQuestionIds: [],
    questions: [{ id: "question-1", prompt: "Protected question", options: ["A", "B"], marks: 1 }],
  });
  mocks.recordViolation.mockResolvedValue({ violationCount: 1, shouldSubmit: false });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

  render(<QueryClientProvider client={client}><AssessmentRunner /></QueryClientProvider>);
  const prompt = await screen.findByText("Protected question");
  const examScreen = prompt.closest("[data-secure-exam='true']");
  const printScreen = new KeyboardEvent("keydown", { key: "PrintScreen", bubbles: true, cancelable: true });

  document.dispatchEvent(printScreen);

  expect(printScreen.defaultPrevented).toBe(true);
  expect(examScreen?.getAttribute("data-exam-concealed")).toBe("true");
  await waitFor(() => expect(mocks.recordViolation).toHaveBeenCalledWith("final-1", "screenshot-shortcut", "session-token-1"));
  client.clear();
});
