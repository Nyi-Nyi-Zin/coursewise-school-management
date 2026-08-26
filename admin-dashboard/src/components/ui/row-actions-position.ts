const MENU_GAP = 6;
const VIEWPORT_PADDING = 8;

export type MenuPosition = { top: number; left: number };

export function calculateMenuPosition({
  trigger,
  menuWidth,
  menuHeight,
  viewportWidth,
  viewportHeight,
}: {
  trigger: Pick<DOMRect, "top" | "right" | "bottom">;
  menuWidth: number;
  menuHeight: number;
  viewportWidth: number;
  viewportHeight: number;
}): MenuPosition {
  const spaceAbove = trigger.top - VIEWPORT_PADDING;
  const spaceBelow = viewportHeight - trigger.bottom - VIEWPORT_PADDING;
  const openUpward = spaceBelow < menuHeight + MENU_GAP && spaceAbove > spaceBelow;
  const preferredTop = openUpward
    ? trigger.top - menuHeight - MENU_GAP
    : trigger.bottom + MENU_GAP;
  return {
    top: Math.max(VIEWPORT_PADDING, Math.min(viewportHeight - menuHeight - VIEWPORT_PADDING, preferredTop)),
    left: Math.max(VIEWPORT_PADDING, Math.min(viewportWidth - menuWidth - VIEWPORT_PADDING, trigger.right - menuWidth)),
  };
}
