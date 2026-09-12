// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OfflineItem, OfflineRecords } from "./offline-records";

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("./firebase", () => ({ hasFirebaseConfiguration: true }));
vi.mock("./firebase-admin-records", () => ({
  loadFirebaseAdminRecords: mocks.load,
  saveFirebaseAdminRecord: mocks.save,
  deleteFirebaseAdminRecord: mocks.remove,
}));

import { adminRecordQueryKey } from "./admin-records-query";
import { emptyOfflineRecords } from "./offline-records";
import { useAdminRecords } from "./use-admin-records";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const student: OfflineItem = { id: "student-1", title: "Student One", description: "", status: "Active", createdAt: "Today" };
const lesson: OfflineItem = { id: "lesson-1", title: "Modern Web", description: "", status: "Published", createdAt: "Today" };

function createHarness() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  return { client, wrapper };
}

describe("useAdminRecords", () => {
  let backend: OfflineRecords;
  beforeEach(() => {
    backend = structuredClone(emptyOfflineRecords);
    mocks.load.mockReset(); mocks.save.mockReset(); mocks.remove.mockReset();
    mocks.load.mockImplementation(async (section: keyof OfflineRecords) => backend[section]);
    mocks.save.mockImplementation(async (section: keyof OfflineRecords, item: OfflineItem) => {
      backend[section] = backend[section].some((entry) => entry.id === item.id) ? backend[section].map((entry) => entry.id === item.id ? item : entry) : [item, ...backend[section]];
    });
    mocks.remove.mockImplementation(async (section: keyof OfflineRecords, id: string) => { backend[section] = backend[section].filter((entry) => entry.id !== id); });
  });

  it("optimistically saves a student and persists it through the shared mutation", async () => {
    const { client, wrapper } = createHarness(); const { result } = renderHook(() => useAdminRecords(), { wrapper });
    await waitFor(() => expect(result.current.recordsQuery.isSuccess).toBe(true));
    await act(async () => { await result.current.saveMutation.mutateAsync({ section: "students", item: student }); });
    expect(mocks.save).toHaveBeenCalledWith("students", student);
    expect(client.getQueryData<OfflineRecords>(adminRecordQueryKey)?.students).toEqual([student]);
  });

  it("rolls back a failed student save to the prior shared cache snapshot", async () => {
    mocks.save.mockRejectedValueOnce(new Error("write denied"));
    const { client, wrapper } = createHarness(); const { result } = renderHook(() => useAdminRecords(), { wrapper });
    await waitFor(() => expect(result.current.recordsQuery.isSuccess).toBe(true));
    let failure: unknown;
    await act(async () => {
      try { await result.current.saveMutation.mutateAsync({ section: "students", item: student }); }
      catch (error) { failure = error; }
    });
    expect(failure).toEqual(expect.objectContaining({ message: "write denied" }));
    expect(client.getQueryData<OfflineRecords>(adminRecordQueryKey)?.students).toEqual([]);
  });

  it("removes a lesson through the shared mutation and invalidated record cache", async () => {
    backend.lessons = [lesson];
    const { client, wrapper } = createHarness(); const { result } = renderHook(() => useAdminRecords(), { wrapper });
    await waitFor(() => expect(result.current.recordsQuery.data?.lessons).toEqual([lesson]));
    await act(async () => { await result.current.deleteMutation.mutateAsync({ section: "lessons", id: lesson.id }); });
    expect(mocks.remove).toHaveBeenCalledWith("lessons", lesson.id);
    expect(client.getQueryData<OfflineRecords>(adminRecordQueryKey)?.lessons).toEqual([]);
  });

  it("restores a lesson when the delete mutation fails", async () => {
    backend.lessons = [lesson]; mocks.remove.mockRejectedValueOnce(new Error("delete denied"));
    const { client, wrapper } = createHarness(); const { result } = renderHook(() => useAdminRecords(), { wrapper });
    await waitFor(() => expect(result.current.recordsQuery.data?.lessons).toEqual([lesson]));
    let failure: unknown;
    await act(async () => {
      try { await result.current.deleteMutation.mutateAsync({ section: "lessons", id: lesson.id }); }
      catch (error) { failure = error; }
    });
    expect(failure).toEqual(expect.objectContaining({ message: "delete denied" }));
    expect(client.getQueryData<OfflineRecords>(adminRecordQueryKey)?.lessons).toEqual([lesson]);
  });
});
