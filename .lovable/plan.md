

## Plano: Menu "Mais" em tela cheia com grid de icones

### O que muda

**1. Novo componente `src/pages/More.tsx`** — Tela dedicada de menu
- Grid 3x3 com icones grandes e labels para todas as opcoes secundarias
- Cards com icone + texto organizados por categoria
- Itens: Clientes, Fluxo de Caixa, Area Fiscal, Relatorios, Relatorio Mensal, Metas, Analise Financeira, Configuracoes
- Botao "Sair" no final da tela
- Visual limpo, sem header especial

**2. Atualizar `src/components/mobile/MobileBottomNav.tsx`**
- Remover o Drawer do "Mais" completamente
- O botao "Mais" agora navega para `/mais` em vez de abrir drawer
- Manter FAB central com quick actions (Registro Rapido, Adicionar Receita/Despesa/Cliente)
- Bottom nav: Dashboard | Receitas | (+) | Despesas | Mais

**3. Atualizar `src/App.tsx`**
- Adicionar rota `/mais` dentro do layout protegido apontando para `More.tsx`

**4. Atualizar `src/components/layout/AppSidebar.tsx`**
- Sem mudanca (sidebar desktop permanece igual)

### Layout da tela "Mais"

```text
┌──────────────────────┐
│  Mais                │
├──────────────────────┤
│ ┌────┐ ┌────┐ ┌────┐│
│ │ 👥 │ │ ↔️ │ │ 🧾 ││
│ │Cli.│ │Flux│ │Fisc││
│ └────┘ └────┘ └────┘│
│ ┌────┐ ┌────┐ ┌────┐│
│ │ 📊 │ │ 📄 │ │ 🎯 ││
│ │Rel.│ │Mens│ │Meta││
│ └────┘ └────┘ └────┘│
│ ┌────┐ ┌────┐       │
│ │ 📈 │ │ ⚙️ │       │
│ │Anal│ │Conf│       │
│ └────┘ └────┘       │
│                      │
│  [🚪 Sair]          │
└──────────────────────┘
```

### Arquivos a editar
1. **`src/pages/More.tsx`** — Criar (tela grid com icones)
2. **`src/components/mobile/MobileBottomNav.tsx`** — Remover drawer, navegar para /mais
3. **`src/App.tsx`** — Adicionar rota /mais

