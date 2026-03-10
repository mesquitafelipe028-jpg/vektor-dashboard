

## Fix: RangeError in formatDate

**Root cause:** The recent timezone fix changed `formatDate` to append `T12:00:00` to the input string. This works for `YYYY-MM-DD` date strings but breaks when passed a full ISO timestamp (e.g. `created_at` = `"2026-03-10T01:51:01.123Z"`), producing an invalid date like `"2026-03-10T01:51:01.123ZT12:00:00"`.

**Affected line:** `src/pages/ClientDetails.tsx` line 306 — `formatDate(cliente.created_at)` — and any other place passing timestamps to `formatDate`.

**Fix in `src/lib/mockData.ts`:** Make `formatDate` detect whether the input already contains a time component (has `T` in it). If so, use it directly; otherwise append `T12:00:00`.

```ts
export const formatDate = (date: string) => {
  const d = date.includes("T") ? new Date(date) : new Date(date + "T12:00:00");
  return new Intl.DateTimeFormat("pt-BR").format(d);
};
```

One-line change, fixes both date-only strings and full timestamps.

