

## Plano: Remover página de Investimentos e manter apenas a Calculadora

### Alterações

1. **`src/App.tsx`**
   - Remover import e rota `/investimentos` (página `Investments`)
   - Manter rota `/calculadora-investimentos` (página `InvestmentCalculator`)

2. **`src/components/layout/AppSidebar.tsx`**
   - Trocar o grupo "Investimentos" para apontar para a Calculadora:
     - `{ title: "Simulador", url: "/calculadora-investimentos", icon: Calculator }`

3. **`src/components/mobile/MobileBottomNav.tsx`**
   - Alterar item "Investir" de `/investimentos` para `/calculadora-investimentos`

4. **`src/components/layout/AppLayout.tsx`**
   - Remover import e renderização do `<MarketTicker />` (dependia da Edge Function de cotações)

5. **Arquivos mantidos mas não utilizados** (podem ser removidos depois):
   - `src/pages/Investments.tsx`
   - `src/hooks/useInvestments.ts`
   - `src/hooks/useStockQuotes.ts`
   - `src/components/layout/MarketTicker.tsx`
   - `src/components/investment/CreateGoalModal.tsx`

