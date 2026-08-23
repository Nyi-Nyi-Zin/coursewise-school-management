"use client";

import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteFirebaseAdminRecord, loadFirebaseAdminRecords, saveFirebaseAdminRecord } from "./firebase-admin-records";
import { hasFirebaseConfiguration } from "./firebase";
import { emptyOfflineRecords, type ManagementSection, type OfflineItem, type OfflineRecords } from "./offline-records";
import { adminRecordQueryKey, adminSections, mergeAdminRecordDelete, mergeAdminRecordSave } from "./admin-records-query";

async function loadAllAdminRecords(): Promise<OfflineRecords> {
  const results = await Promise.allSettled(
    adminSections.map(async section => [section, await loadFirebaseAdminRecords(section)] as const),
  );
  // A failing unrelated source must not block announcement saves or make the
  // whole dashboard appear unavailable.
  return results.reduce<OfflineRecords>((records, result, index) => {
    const section = adminSections[index];
    if (result.status === "fulfilled") records[section] = result.value[1];
    return records;
  }, structuredClone(emptyOfflineRecords));
}

export async function optimisticallySaveAdminRecord(queryClient: QueryClient, section: ManagementSection, item: OfflineItem) {
  await queryClient.cancelQueries({ queryKey: adminRecordQueryKey });
  const previous = queryClient.getQueryData<OfflineRecords>(adminRecordQueryKey);
  queryClient.setQueryData<OfflineRecords>(adminRecordQueryKey, current => mergeAdminRecordSave(current, section, item));
  return previous;
}

export async function optimisticallyDeleteAdminRecord(queryClient: QueryClient, section: ManagementSection, id: string) {
  await queryClient.cancelQueries({ queryKey: adminRecordQueryKey });
  const previous = queryClient.getQueryData<OfflineRecords>(adminRecordQueryKey);
  queryClient.setQueryData<OfflineRecords>(adminRecordQueryKey, current => mergeAdminRecordDelete(current, section, id));
  return previous;
}

export function rollbackAdminRecords(queryClient: QueryClient, previous: OfflineRecords | undefined) {
  queryClient.setQueryData(adminRecordQueryKey, previous ?? emptyOfflineRecords);
}

export function useAdminRecords() {
  const queryClient = useQueryClient();
  const recordsQuery = useQuery({ queryKey: adminRecordQueryKey, queryFn: loadAllAdminRecords, enabled: hasFirebaseConfiguration });
  const saveMutation = useMutation({
    mutationFn: async ({ section, item }: { section: ManagementSection; item: OfflineItem }) => {
      if (hasFirebaseConfiguration) await saveFirebaseAdminRecord(section, item);
      return { section, item };
    },
    onMutate: async ({ section, item }) => ({ previous: await optimisticallySaveAdminRecord(queryClient, section, item) }),
    onError: (_error, _variables, context) => rollbackAdminRecords(queryClient, context?.previous),
    onSettled: async () => { if (hasFirebaseConfiguration) await queryClient.invalidateQueries({ queryKey: adminRecordQueryKey }); },
  });
  const deleteMutation = useMutation({
    mutationFn: async ({ section, id }: { section: ManagementSection; id: string }) => {
      if (hasFirebaseConfiguration) await deleteFirebaseAdminRecord(section, id);
      return { section, id };
    },
    onMutate: async ({ section, id }) => ({ previous: await optimisticallyDeleteAdminRecord(queryClient, section, id) }),
    onError: (_error, _variables, context) => rollbackAdminRecords(queryClient, context?.previous),
    onSettled: async () => { if (hasFirebaseConfiguration) await queryClient.invalidateQueries({ queryKey: adminRecordQueryKey }); },
  });
  return { recordsQuery, saveMutation, deleteMutation };
}
