

## Fix: Date Timezone Offset Bug

**Problem:** `formatDate("2026-03-15")` creates `new Date("2026-03-15")` which is UTC midnight. In Brazil (UTC-3), this displays as "14/03/2026" -- one day behind. The edit form shows the correct date because `<Input type="date">` uses the raw string "2026-03-15".

**Solution:** One-line fix in `src/lib/mockData.ts` -- append `T12:00:00` to the date string before creating the Date object, preventing timezone rollback.

### File to modify
- `src/lib/mockData.ts` -- change `new Date(date)` to `new Date(date + "T12:00:00")` in `formatDate`

This matches the pattern already used in `TransactionCard.tsx`, `fiscal.ts`, and other files throughout the codebase.

