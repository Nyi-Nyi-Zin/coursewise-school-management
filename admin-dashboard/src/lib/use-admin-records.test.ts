import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { adminRecordQueryKey } from "./admin-records-query";
import { emptyOfflineRecords } from "./offline-records";
import { optimisticallyDeleteAdminRecord, optimisticallySaveAdminRecord, rollbackAdminRecords } from "./use-admin-records";

describe("useAdminRecords optimistic mutation operations", () => {
  it("updates student and lesson module data in the shared QueryClient cache", async () => {
    const client = new QueryClient();
    client.setQueryData(adminRecordQueryKey, emptyOfflineRecords);
    await optimisticallySaveAdminRecord(client, "students", { id: "s1", title: "Student One", description: "", status: "Active", createdAt: "Today" });
    await optimisticallySaveAdminRecord(client, "lessons", { id: "l1", title: "Intro", description: "", status: "Published", createdAt: "Today" });
    const records = client.getQueryData<typeof emptyOfflineRecords>(adminRecordQueryKey);
    expect(records?.students).toHaveLength(1);
    expect(records?.lessons).toHaveLength(1);
  });

  it("restores the previous cache snapshot if an optimistic delete fails", async () => {
    const client = new QueryClient();
    const original = { ...emptyOfflineRecords, students: [{ id: "s1", title: "Student One", description: "", status: "Active", createdAt: "Today" }] };
    client.setQueryData(adminRecordQueryKey, original);
    const previous = await optimisticallyDeleteAdminRecord(client, "students", "s1");
    expect(client.getQueryData<typeof original>(adminRecordQueryKey)?.students).toEqual([]);
    rollbackAdminRecords(client, previous);
    expect(client.getQueryData<typeof original>(adminRecordQueryKey)?.students).toEqual(original.students);
  });
});
