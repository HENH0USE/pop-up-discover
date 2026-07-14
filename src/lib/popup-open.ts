// Determine if a pop-up is currently open based on its open_time / close_time
// (local HH:MM[:SS]) plus its is_open_now flag.
export function isPopupOpenNow(popup: {
  is_open_now?: boolean | null;
  open_time?: string | null;
  close_time?: string | null;
}): boolean {
  if (!popup.is_open_now) return false;
  const { open_time, close_time } = popup;
  if (!open_time || !close_time) return true; // no window defined, trust flag
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map((n) => parseInt(n, 10));
    return (h || 0) * 60 + (m || 0);
  };
  const start = toMin(open_time);
  const end = toMin(close_time);
  if (end <= start) {
    // overnight window
    return nowMin >= start || nowMin < end;
  }
  return nowMin >= start && nowMin < end;
}