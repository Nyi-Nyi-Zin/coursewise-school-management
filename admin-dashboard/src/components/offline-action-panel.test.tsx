// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { OfflineActionPanel } from "./offline-action-panel";

const save = vi.fn();
vi.mock("@/lib/firebase", () => ({ hasFirebaseConfiguration: true }));
vi.mock("@/lib/course-batch-service", () => ({
  loadCourses: async () => [{ id: "course-python", title: "Python", isActive: true, enrolledStudentIds: [] }],
  loadAllBatches: async () => [
    { id: "batch-linked", courseId: "course-python", name: "Batch 2", isActive: true, enrolledStudentIds: [] },
    { id: "batch-unlinked", courseId: "", name: "Unlinked", isActive: true, enrolledStudentIds: [] },
  ],
  loadBatches: vi.fn(),
}));

beforeEach(() => save.mockClear());
afterEach(() => cleanup());

it("creates a quiz from one linked course-batch selection", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><OfflineActionPanel section="quizzes" initial={null} onClose={() => undefined} onSave={save} /></QueryClientProvider>);
  fireEvent.change(screen.getByPlaceholderText("Enter details"), { target: { value: "Python basics" } });
  const pair = await screen.findByRole("combobox", { name: "Course and batch" });
  expect(await screen.findByRole("option", { name: "Python — Batch 2" })).toBeTruthy();
  expect(screen.queryByRole("option", { name: /Unlinked/ })).toBeNull();
  fireEvent.change(pair, { target: { value: "batch-linked" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Quiz" }));
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({
    title: "Python basics",
    fields: expect.objectContaining({ courseId: "course-python", batchId: "batch-linked" }),
  })));
  client.clear();
});

it("creates a lesson from one linked course-batch selection", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><OfflineActionPanel section="lessons" initial={null} onClose={() => undefined} onSave={save} /></QueryClientProvider>);
  fireEvent.change(screen.getByPlaceholderText("Enter details"), { target: { value: "Getting started" } });
  const pair = await screen.findByRole("combobox", { name: "Course and batch" });
  expect(screen.queryByText("Select course")).toBeNull();
  expect(screen.queryByText("Select batch")).toBeNull();
  await screen.findByRole("option", { name: /Python.*Batch 2/ });
  fireEvent.change(pair, { target: { value: "batch-linked" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Lesson" }));
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({
    title: "Getting started",
    fields: expect.objectContaining({ courseId: "course-python", batchId: "batch-linked" }),
  })));
  client.clear();
});
