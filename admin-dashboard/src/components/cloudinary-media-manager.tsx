"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, FileImage, FileText, Film, HardDrive, LoaderCircle, RefreshCw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteCloudinaryMedia, getCloudinaryMedia, type CloudinaryMediaAsset } from "@/lib/cloudinary-media-service";
import { getUserFacingErrorMessage } from "../../../shared/user-facing-errors";

const mediaQueryKey = ["cloudinary-media"] as const;

function formatBytes(bytes: number | null) {
  if (bytes === null) return "Unavailable";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index < 2 ? 0 : 1)} ${units[index]}`;
}

function formatCredits(credits: number | null) {
  return credits === null ? "Unavailable" : `${credits.toFixed(2)} credits`;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "Unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function assetName(asset: CloudinaryMediaAsset) {
  return asset.originalFilename || asset.publicId.split("/").at(-1) || asset.publicId;
}

export function CloudinaryMediaManager() {
  const queryClient = useQueryClient();
  const [cursor, setCursor] = useState<string | undefined>();
  const mediaQuery = useQuery({ queryKey: [...mediaQueryKey, cursor ?? "first"], queryFn: () => getCloudinaryMedia(cursor), staleTime: 15_000 });
  const deleteMutation = useMutation({
    mutationFn: deleteCloudinaryMedia,
    onSuccess: async () => {
      toast.success("The file was permanently deleted from Cloudinary.");
      await queryClient.invalidateQueries({ queryKey: mediaQueryKey });
    },
  });
  const media = mediaQuery.data;
  const storagePercent = useMemo(() => {
    const usage = media?.usage;
    if (usage?.usedBytes !== null && usage?.usedBytes !== undefined && usage.limitBytes) return Math.min(100, usage.usedBytes / usage.limitBytes * 100);
    return usage?.usedCredits !== null && usage?.usedCredits !== undefined && usage.creditLimit ? Math.min(100, usage.usedCredits / usage.creditLimit * 100) : null;
  }, [media?.usage]);

  const deleteAsset = async (asset: CloudinaryMediaAsset) => {
    try {
      await deleteMutation.mutateAsync(asset);
    } catch (error) {
      toast.error(getUserFacingErrorMessage(error, "Cloudinary could not delete this file."));
      throw error;
    }
  };

  return <div className="space-y-6">
    <div className="grid gap-4 xl:grid-cols-[1fr_1.45fr]">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2"><HardDrive className="text-emerald-700" size={20} /> Cloudinary storage</CardTitle>
              <CardDescription>Live usage reported by your Cloudinary account.</CardDescription>
            </div>
            {media?.usage.plan && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">{media.usage.plan}</span>}
          </div>
        </CardHeader>
        <CardContent>
          {mediaQuery.isPending ? <div className="h-20 animate-pulse rounded-2xl bg-stone-100" /> : media ? <>
            <div className="flex items-end justify-between gap-3"><div><p className="text-2xl font-bold text-emerald-950">{formatBytes(media.usage.remainingBytes ?? media.usage.storageEquivalentRemainingBytes)}</p><p className="text-xs text-stone-500">{media.usage.remainingBytes !== null ? "remaining storage" : "storage-equivalent remaining"}</p></div><p className="text-right text-xs text-stone-500">{formatBytes(media.usage.usedBytes)} in storage<br />{media.usage.limitBytes !== null ? `of ${formatBytes(media.usage.limitBytes)}` : `${formatCredits(media.usage.remainingCredits)} of ${formatCredits(media.usage.creditLimit)} remain`}</p></div>
            {storagePercent !== null && <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-emerald-700" style={{ width: `${storagePercent}%` }} /></div>}
            {media.usage.limitBytes === null && media.usage.creditLimit !== null && <p className="mt-3 text-xs leading-5 text-stone-500">Your plan uses one shared credit allowance for storage, bandwidth, and transformations. The storage-equivalent figure is based on the credits still available.</p>}
            {media.usage.lastUpdated && <p className="mt-3 text-xs text-stone-400">Last updated: {formatDate(media.usage.lastUpdated)}</p>}
          </> : <p className="text-sm text-red-700">Storage usage is unavailable.</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4"><div><CardTitle>Media library</CardTitle><CardDescription>Images, videos, and uploaded files across this Cloudinary account. Check the asset information before deleting.</CardDescription></div><Button variant="outline" size="sm" onClick={() => void mediaQuery.refetch()} disabled={mediaQuery.isFetching}><RefreshCw size={15} className={mediaQuery.isFetching ? "animate-spin" : ""} /> Refresh</Button></div>
        </CardHeader>
        <CardContent className="text-sm text-stone-600"><span className="font-bold text-stone-900">{media?.totalCount ?? "—"}</span> assets found. Deleting is permanent and also invalidates Cloudinary&apos;s cached delivery URL.</CardContent>
      </Card>
    </div>

    <Card>
      <CardContent className="p-0">
        {mediaQuery.isPending ? <div className="grid min-h-72 place-items-center text-sm text-stone-500"><LoaderCircle className="mr-2 animate-spin" size={18} /> Loading Cloudinary media…</div> : mediaQuery.isError ? <div className="p-6 text-sm text-red-700">{getUserFacingErrorMessage(mediaQuery.error, "Cloudinary media could not be loaded.")}</div> : media?.assets.length === 0 ? <div className="grid min-h-64 place-items-center p-6 text-center text-sm text-stone-500">No Cloudinary assets were found on this page.</div> : <div className="divide-y divide-stone-100">{media?.assets.map(asset => <AssetRow key={`${asset.resourceType}:${asset.deliveryType}:${asset.publicId}`} asset={asset} deleting={deleteMutation.isPending} onDelete={() => deleteAsset(asset)} />)}</div>}
      </CardContent>
      {media && <div className="flex items-center justify-between gap-3 border-t border-stone-100 p-4"><Button variant="outline" size="sm" disabled={!cursor || mediaQuery.isFetching} onClick={() => setCursor(undefined)}>First page</Button><p className="text-xs text-stone-500">30 assets per page</p><Button size="sm" disabled={!media.nextCursor || mediaQuery.isFetching} onClick={() => setCursor(media.nextCursor ?? undefined)}>Load more</Button></div>}
    </Card>
  </div>;
}

function AssetRow({ asset, deleting, onDelete }: { asset: CloudinaryMediaAsset; deleting: boolean; onDelete: () => Promise<void> }) {
  const isPublicImage = asset.resourceType === "image" && asset.deliveryType === "upload" && Boolean(asset.secureUrl);
  const AssetIcon = asset.resourceType === "image" ? FileImage : asset.resourceType === "video" ? Film : FileText;
  return <div className="flex gap-4 p-4 sm:p-5">
    <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-stone-100 text-stone-400">{isPublicImage ? <>
      {/* Cloudinary delivery URLs are dynamic and may use a customer-specific domain. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={asset.secureUrl} alt="" className="size-full object-cover" />
    </> : <AssetIcon size={24} />}</div>
    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-bold text-stone-900" title={assetName(asset)}>{assetName(asset)}</p><p className="mt-1 break-all font-mono text-[11px] text-stone-500">{asset.publicId}</p></div><div className="flex shrink-0 gap-2">{asset.deliveryType === "upload" && asset.secureUrl && <a href={asset.secureUrl} target="_blank" rel="noreferrer" aria-label={`Open ${assetName(asset)}`} className="inline-flex size-9 items-center justify-center rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50"><ExternalLink size={15} /></a>}<ConfirmDeleteDialog title={`Permanently delete “${assetName(asset)}”?`} description={`This removes the ${asset.resourceType} from Cloudinary and invalidates its cached URL. Public ID: ${asset.publicId}. This cannot be undone.`} onConfirm={onDelete}><button type="button" disabled={deleting} aria-label={`Delete ${assetName(asset)}`} className="inline-flex size-9 items-center justify-center rounded-xl border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"><Trash2 size={16} /></button></ConfirmDeleteDialog></div></div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-stone-500 sm:grid-cols-4"><Detail label="Type" value={`${asset.resourceType} · ${asset.deliveryType}`} /><Detail label="Size" value={formatBytes(asset.bytes)} /><Detail label="Format" value={asset.format || "—"} /><Detail label="Uploaded" value={formatDate(asset.createdAt)} />{asset.folder && <Detail label="Folder" value={asset.folder} />}{asset.width && asset.height && <Detail label="Dimensions" value={`${asset.width} × ${asset.height}`} />}{asset.duration !== null && <Detail label="Duration" value={`${asset.duration.toFixed(1)} sec`} />}{asset.pages !== null && <Detail label="Pages" value={String(asset.pages)} />}</dl>
    </div>
  </div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="font-semibold uppercase tracking-wide text-stone-400">{label}</dt><dd className="mt-0.5 truncate text-stone-600" title={value}>{value}</dd></div>;
}
