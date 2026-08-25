/**
 * Portal viewport policy shared by the student and administrator applications.
 *
 * Set this to true when the mobile-responsive experience should be restored.
 * Both portal root layouts consume this value, so one change affects both apps.
 */
export const mobileResponsiveEnabled = false;

// A desktop-width CSS viewport keeps Tailwind's responsive breakpoints in their
// desktop state on phones while allowing the browser to scale the full portal.
export const desktopViewportWidth = 1280;

/**
 * Student portal feature switches. Flip either value to true to bring the
 * feature back everywhere (navigation, mobile bar, pages) with this one change.
 */
export const attendancePageEnabled = false;
export const notificationsIconEnabled = false;
