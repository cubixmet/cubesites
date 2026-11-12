// Integer-paise money helpers. Avoids floating point drift in totals.

export const toPaise = (rupees: string | number): number | null => {
  const s = String(rupees).trim().replace(/,/g, "");
  if (s === "") return null;
  if (!/^\d*(\.\d{0,2})?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  return Number(whole || "0") * 100 + Number((frac + "00").slice(0, 2));
};

export const paiseToInput = (paise: number | undefined | null): string =>
  paise == null ? "" : (paise / 100).toFixed(2);

export const parseQty = (q: string): number | null => {
  const s = q.trim();
  if (s === "") return null;
  if (!/^\d*(\.\d{0,3})?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

/** total = qty × unit, rounded to the nearest paisa. */
export const totalFrom = (qty: number, unitPaise: number): number =>
  Math.round((Math.round(qty * 1000) * unitPaise) / 1000);

/** unit = total ÷ qty; returns null when qty is zero. */
export const unitFrom = (qty: number, totalPaise: number): number | null => {
  const milli = Math.round(qty * 1000);
  if (milli <= 0) return null;
  return Math.round((totalPaise * 1000) / milli);
};

export const sumPaise = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
