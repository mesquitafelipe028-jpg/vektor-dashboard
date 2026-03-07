

## Plano: Atualizar categorias padrão para MEI

Substituir as categorias atuais (receitas e despesas) pelas novas categorias focadas em MEI, com ícones Lucide correspondentes.

### Mudanças

**`src/lib/categories.ts`** — Substituir os arrays `revenueCategories` e `expenseCategories`:

**Receitas (8 categorias):**
| Categoria | Ícone Lucide | Cor |
|---|---|---|
| Salário/Fixo | Banknote | green |
| Freelance/Prestação de Serviços | Briefcase | emerald |
| Vendas/Comércio | ShoppingBag | blue |
| Pix/Transferências | ArrowRightLeft | violet |
| Dinheiro/Cartão | Coins | amber |
| Investimentos/Outros | TrendingUp | sky |
| Comissões/Parcerias | Users | purple |
| Reembolso/Estorno | RotateCcw | cyan |

**Despesas (12 categorias):**
| Categoria | Ícone Lucide | Cor |
|---|---|---|
| Moradia/Aluguel | Home | violet |
| Alimentação/Supermercado | Utensils | orange |
| Transporte/Combustível | Car | blue |
| Saúde/Academia | Heart | rose |
| Educação/Cursos | GraduationCap | sky |
| Lazer/Entretenimento | Gamepad2 | pink |
| Insumos/Materiais | Package | amber |
| Telefonia/Internet | Wifi | cyan |
| Marketing/Ads | Megaphone | fuchsia |
| Contabilidade/Impostos | Receipt | red |
| Manutenção/Equipamentos | Wrench | slate |
| Compras Variadas | ShoppingCart | gray |

### Arquivos a editar
- `src/lib/categories.ts` — substituir arrays + adicionar imports (`TrendingUp`, `RotateCcw`, `Wrench`, `ShoppingCart`)
- `src/lib/categoryColors.ts` — já tem todas as cores necessárias, sem mudança

Após editar, o seed ("Restaurar Padrão") na página de categorias usará automaticamente as novas categorias.

