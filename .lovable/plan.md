

## Duplicações Encontradas

Após analisar o código, existem **duas páginas quase idênticas** fazendo o mesmo trabalho:

| Elemento duplicado | `Taxes.tsx` (551 linhas) | `PainelFiscal.tsx` (410 linhas) |
|---|---|---|
| Interface `Imposto` | Sim | Sim (idêntica) |
| Função `getEffectiveStatus` | Sim | Sim (idêntica) |
| Constante `LIMITE_MEI = 81000` | Sim | Sim |
| Query `receitas` | Sim | Sim (idêntica) |
| Query `impostos_mei` | Sim | Sim |
| `togglePagoMutation` | Sim | Sim (idêntica) |
| `statusConfig` (cores/labels) | Sim | Sim (quase idêntica) |
| Cálculo faturamento anual + barra de progresso | Sim | Sim |
| Histórico de pagamentos DAS | Sim | Sim |

Basicamente, a **PainelFiscal** é uma versão resumida da **Taxes**, com o adicional de mostrar dados do CNPJ. E a **Taxes** tem funcionalidades extras (CRUD de guias, gráfico, alertas inteligentes, seletor de atividade) que a PainelFiscal não tem.

São 2 rotas no sidebar (`/impostos` e `/painel-fiscal`) e 2 entradas no menu mobile, confundindo o usuário.

---

## Plano: Unificar em uma única Área Fiscal com abas

Consolidar tudo em **uma única página** `/area-fiscal` com **Tabs** (abas):

```text
┌─────────────────────────────────────────────┐
│  Área Fiscal MEI                            │
│  Gerencie impostos e situação fiscal        │
├──────────┬──────────────┬───────────────────┤
│ Visão Geral │ Guias DAS │ Faturamento     │
├──────────┴──────────────┴───────────────────┤
│                                             │
│  (conteúdo da aba selecionada)              │
│                                             │
└─────────────────────────────────────────────┘
```

### Aba 1 — Visao Geral (conteudo do PainelFiscal)
- Card situacao do CNPJ (dados da empresa)
- Card limite anual com barra de progresso
- Card DAS do mes (valor + vencimento + botao Gerar DAS)
- Historico resumido (ultimos 6)

### Aba 2 — Guias DAS (conteudo exclusivo do Taxes)
- Botao "Nova Guia" + Dialog CRUD
- Seletor tipo de atividade (comercio/servico/misto)
- Lista completa de guias com edicao/exclusao
- Alertas de vencimento

### Aba 3 — Faturamento (conteudo exclusivo do Taxes)
- Cards resumo (faturamento mes, DAS estimado, anual, % limite)
- Grafico acumulado vs limite MEI
- Alertas inteligentes e insights

### Arquivos a alterar

1. **Criar `src/lib/fiscal.ts`** — Extrair codigo compartilhado:
   - Interface `Imposto`
   - Funcao `getEffectiveStatus`
   - Constante `LIMITE_MEI`
   - `statusConfig` e `DAS_CONFIG`

2. **Reescrever `src/pages/Taxes.tsx`** — Pagina unica com Tabs, importando de `fiscal.ts`, combinando o conteudo das duas paginas em 3 abas

3. **Deletar `src/pages/PainelFiscal.tsx`** — Conteudo absorvido pela aba "Visao Geral"

4. **Editar `src/App.tsx`** — Remover rota `/painel-fiscal`, manter `/impostos` renomeado internamente para "Area Fiscal". Adicionar redirect de `/painel-fiscal` para `/impostos`

5. **Editar `src/components/layout/AppSidebar.tsx`** — Remover entrada "Painel Fiscal", renomear "Impostos" para "Area Fiscal"

6. **Editar `src/components/mobile/MobileBottomNav.tsx`** — Remover "Painel Fiscal" do menu "Mais", renomear "Impostos" para "Area Fiscal"

