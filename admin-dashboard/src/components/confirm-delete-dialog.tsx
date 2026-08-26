"use client";

import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ConfirmDeleteDialog({ title, description, onConfirm, children, open, onOpenChange }: { title: string; description: string; onConfirm: () => void; children?: ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const controlled = open !== undefined;
  return <AlertDialog open={open} onOpenChange={onOpenChange}>
    {!controlled ? <AlertDialogTrigger asChild>{children ?? <button type="button" aria-label="Delete" title="Delete" className="inline-flex size-8 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>}</AlertDialogTrigger> : null}
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm}>Delete</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
