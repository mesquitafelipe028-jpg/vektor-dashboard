

## Plan: Replace horizontal-scroll tables with mobile-friendly card lists

Based on the reference images, the goal is to replace all `<Table>` horizontal-scroll layouts with a responsive design: **card-based list on mobile**, **table on desktop**.

### Design (from reference images)
Each transaction card shows:
- Left: status icon (checkmark circle)
- Middle: account name (top, small), description (bold), category badge
- Right: date + weekday (top), amount (bold)
- Far right: "..." menu (edit/delete)

Header redesign for Receitas/Despesas:
- Back arrow + title + total below title
- Month navigator (`< Março >`) replacing the month filter input
- Search, table-view toggle, and more icons in header
- FAB (floating action button) instead of header "Nova" button

### Pages to modify

1. **`src/pages/Revenues.tsx`** -- Replace table with responsive card list + month navigator + FAB
2. **`src/pages/Expenses.tsx`** -- Same treatment as Revenues
3. **`src/pages/Clients.tsx`** -- Replace table with card list on mobile, keep table on desktop
4. **`src/pages/CreditCards.tsx`** -- Replace `renderPurchaseTable` with responsive card/table layout
5. **`src/pages/ClientDetails.tsx`** -- Already has mobile cards, no changes needed

### Shared component

Create **`src/components/transaction/TransactionCard.tsx`** -- reusable card component for receitas/despesas with:
- Status icon, account label, description, category badge, date, amount, actions menu (DropdownMenu with edit/delete)

Create **`src/components/MonthNavigator.tsx`** -- `< Março >` month picker replacing the `<Input type="month">` filter

### Technical approach
- Use `useIsMobile()` hook to switch between card list (mobile) and table (desktop)
- Replace header "Nova" button with a FAB on mobile (fixed bottom-right, colored circle with `+`)
- Month navigator defaults to current month, filters data by selected month
- Keep existing filter/search functionality but adapt UI for mobile (collapsible or in a popover)
- All existing mutations (delete, updateStatus) remain unchanged
- Desktop keeps current table layout intact

### Files to create
- `src/components/transaction/TransactionCard.tsx`
- `src/components/MonthNavigator.tsx`

### Files to modify
- `src/pages/Revenues.tsx`
- `src/pages/Expenses.tsx`
- `src/pages/Clients.tsx`
- `src/pages/CreditCards.tsx`

