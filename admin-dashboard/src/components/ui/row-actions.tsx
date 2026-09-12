"use client";

import { EllipsisVertical, Trash2, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { calculateMenuPosition, type MenuPosition } from "./row-actions-position";

export type RowAction = {
  label: string;
  icon: LucideIcon;
  onSelect: () => void | Promise<void>;
  tone?: "default" | "warning" | "danger";
};

const MENU_WIDTH = 224;

const toneClasses = {
  default: "text-stone-700 hover:bg-stone-100",
  warning: "text-amber-600 hover:bg-amber-50",
  danger: "text-red-600 hover:bg-red-50",
} as const;

export function RowActions({ actions, confirmDelete, menuLabel = "More actions" }: { actions: RowAction[]; confirmDelete?: { title: string; description: string; onConfirm: () => void | Promise<void> }; menuLabel?: string }) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const hasConfirmDelete = Boolean(confirmDelete);

  const reposition = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    const menu = menuRef.current;
    if (!rect || !menu) return;
    const menuWidth = menu.offsetWidth || MENU_WIDTH;
    const menuHeight = menu.offsetHeight;
    setPosition(calculateMenuPosition({
      trigger: rect,
      menuWidth,
      menuHeight,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    }));
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
  }, [open, reposition, actions.length, hasConfirmDelete]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: globalThis.MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, reposition]);

  const toggleMenu = () => {
    if (pendingRef.current) return;
    if (open) {
      setOpen(false);
      return;
    }
    setPosition(null);
    setOpen(true);
  };

  const runAction = async (action: RowAction) => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setOpen(false);
    try {
      await action.onSelect();
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  return (
    <div className="relative inline-block" ref={buttonRef}>
      <button
        type="button"
        aria-label={menuLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={pending}
        onClick={toggleMenu}
        className="inline-flex size-9 items-center justify-center rounded-xl border border-stone-200 text-stone-500 transition hover:bg-stone-100 hover:text-stone-700"
      >
        <EllipsisVertical size={16} />
      </button>
      {open ? createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={menuLabel}
          style={{
            top: position?.top ?? 0,
            left: position?.left ?? 0,
            width: MENU_WIDTH,
            visibility: position ? "visible" : "hidden",
          }}
          className="fixed z-50 overflow-hidden rounded-2xl border border-stone-200 bg-white py-1.5 shadow-xl"
        >
          {actions.map(action => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              disabled={pending}
              onClick={() => void runAction(action)}
              className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium transition ${toneClasses[action.tone ?? "default"]}`}
            >
              <action.icon size={15} />
              {action.label}
            </button>
          ))}
          {confirmDelete ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setConfirmOpen(true);
              }}
              className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium transition ${toneClasses.danger}`}
            >
              <Trash2 size={15} />
              Delete
            </button>
          ) : null}
        </div>,
        document.body,
      ) : null}
      {confirmDelete ? (
        <ConfirmDeleteDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={confirmDelete.title}
          description={confirmDelete.description}
          onConfirm={confirmDelete.onConfirm}
        />
      ) : null}
    </div>
  );
}
