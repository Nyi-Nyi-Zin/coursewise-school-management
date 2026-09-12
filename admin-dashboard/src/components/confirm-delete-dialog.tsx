"use client";

import { Trash2 } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
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

export function ConfirmDeleteDialog({ title, description, onConfirm, children, open, onOpenChange }: { title: string; description: string; onConfirm: () => void | Promise<void>; children?: ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const controlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const setOpen = (nextOpen: boolean) => {
    if (pendingRef.current) return;
    if (controlled) onOpenChange?.(nextOpen);
    else setInternalOpen(nextOpen);
  };
  const confirm = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    try {
      await onConfirm();
      if (controlled) onOpenChange?.(false);
      else setInternalOpen(false);
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };
  return <AlertDialog open={controlled ? open : internalOpen} onOpenChange={setOpen}>
    {!controlled ? <AlertDialogTrigger asChild>{children ?? <button type="button" aria-label="Delete" title="Delete" className="inline-flex size-8 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>}</AlertDialogTrigger> : null}
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
        <AlertDialogAction disabled={pending} onClick={event => void confirm(event)}>{pending ? "Deleting..." : "Delete"}</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
