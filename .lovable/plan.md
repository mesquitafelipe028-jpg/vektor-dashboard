

## Problema

No mobile, a barra inferior mostra apenas 5 itens (Dashboard, Receitas, Adicionar, Despesas, Clientes). Páginas como Impostos, Relatórios, Metas, Análise Financeira, Painel Fiscal e Configurações ficam inacessíveis.

## Solução: Botão "Mais" com menu drawer

Substituir o item "Clientes" por um botão **"Mais"** (ícone `MoreHorizontal`) que abre um **drawer inferior** (bottom sheet) listando todas as páginas restantes + Sair.

### Navegação inferior final:
| Dashboard | Receitas | + (FAB) | Despesas | Mais |

### O drawer "Mais" mostrará:
- Clientes
- Fluxo de Caixa
- Impostos
- Relatórios
- Relatório Mensal
- Metas
- Análise Financeira
- Painel Fiscal
- Configurações
- Sair

Cada item com ícone e label, estilo lista simples. Ao tocar em um item, navega e fecha o drawer.

### Arquivos a editar:
1. **`src/components/mobile/MobileBottomNav.tsx`** — Trocar "Clientes" por "Mais", adicionar estado para abrir/fechar o drawer, renderizar o drawer com a lista completa de páginas usando o componente `Drawer` (vaul) já instalado.

2. **`src/components/layout/AppLayout.tsx`** — Nenhuma alteração necessária.

### Detalhes técnicos:
- Usar o componente `Drawer` de `vaul` (já disponível em `src/components/ui/drawer.tsx`) para o bottom sheet
- Reutilizar os ícones e rotas já definidos em `AppSidebar.tsx`
- Destacar a rota ativa no drawer
- Incluir botão de logout no final da lista

