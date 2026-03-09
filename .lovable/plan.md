

## Plan: 3 High-Impact Features

### 1. Central de Cobranças (`/contas-a-receber`)

New page showing receivables grouped by urgency: **Hoje**, **Esta Semana**, **Atrasados**, **Futuras**.

**Data source:** Existing `receitas` table -- filter by `status = 'pendente'` or `status = 'atrasado'`, joined with `clientes` for names.

**Layout:**
- Header with KPIs: Total Hoje, Total Semana, Total Atrasado
- Sections with cards: each shows client name, description, amount, due date
- Each card has action buttons: WhatsApp, Copiar Mensagem, Marcar Recebido
- Responsive: cards on mobile, compact list on desktop

**Files:**
- Create `src/pages/Receivables.tsx`
- Add route `/contas-a-receber` in `App.tsx`
- Add to sidebar (Finanças group), More.tsx menu, and mobile bottom nav

### 2. Lembrete Automático de Cobrança (integrated in Receivables + ClientDetails)

**Billing reminder component** with pre-formatted messages and send options.

**Component:** `src/components/billing/BillingReminderSheet.tsx`
- Bottom sheet/dialog with message preview
- Auto-generates message: "Olá {nome}! Sua mensalidade de R${valor} referente a {descricao} vence em {data}. Obrigado!"
- 3 action buttons:
  - **WhatsApp** -- opens `https://wa.me/{phone}?text={encoded_message}`
  - **Copiar mensagem** -- copies to clipboard
  - **E-mail** -- opens `mailto:{email}?subject=...&body=...`
- Editable message text before sending

**Integration:** Used in both Receivables page and ClientDetails page, replacing the current simple "Enviar Lembrete" button.

### 3. Timeline Financeira (`/timeline`)

Unified chronological feed of all financial events.

**Data sources:** `receitas`, `despesas`, `compras_cartao` -- all merged and sorted by date descending.

**Layout:**
- Vertical timeline with date separators (e.g., "10 Mar", "09 Mar")
- Each entry: icon (colored by type), description, category/client, amount (green for income, red for expense)
- Filter tabs: Tudo | Receitas | Despesas | Cartão
- Infinite scroll or "load more" pagination
- Responsive cards

**Files:**
- Create `src/pages/Timeline.tsx`
- Add route `/timeline` in `App.tsx`
- Add to sidebar (Visão Geral group) and More.tsx menu

---

### Navigation updates summary

| Location | Changes |
|----------|---------|
| `App.tsx` | Add routes `/contas-a-receber`, `/timeline` |
| `AppSidebar.tsx` | Add "Cobranças" to Finanças, "Timeline" to Visão Geral |
| `More.tsx` | Add both items to mobile menu |
| `MobileBottomNav.tsx` | No change (accessed via "Mais") |

### Files to create (4)
- `src/pages/Receivables.tsx`
- `src/pages/Timeline.tsx`
- `src/components/billing/BillingReminderSheet.tsx`

### Files to modify (4)
- `src/App.tsx` -- add 2 lazy routes
- `src/components/layout/AppSidebar.tsx` -- add 2 menu items
- `src/pages/More.tsx` -- add 2 menu items
- `src/pages/ClientDetails.tsx` -- integrate BillingReminderSheet

No database changes needed -- all data comes from existing tables (`receitas`, `despesas`, `compras_cartao`, `clientes`).

