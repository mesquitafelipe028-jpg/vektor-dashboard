

## Plano: Redesign completo da tela de Configurações

Reorganizar a página Settings de uma lista longa de cards em seções navegáveis com componentes adequados (Switch, Select), busca, descrições e animações.

### Arquitetura

**Novo componente reutilizavel**: `src/components/settings/SettingsItem.tsx`
- Props: `icon`, `title`, `description`, `rightComponent` (Switch, arrow, value, custom)
- Layout consistente para todas as opções

**Novo componente**: `src/components/settings/SettingsSection.tsx`
- Card com titulo, icone e lista de SettingsItem
- Animacao fade+slide ao montar (CSS transition, sem Framer Motion)

**Refatorar**: `src/pages/Settings.tsx`
- Barra de busca no topo para filtrar seções/itens
- Seções organizadas por categoria:

```text
┌─────────────────────────────┐
│ 🔍 Buscar configuração...   │
├─────────────────────────────┤
│ 👤 Conta                    │
│  Nome completo    [input]   │
│  E-mail           valor     │
│  Alterar senha       >      │
│  Sair                >      │
├─────────────────────────────┤
│ 🎨 Aparência                │
│  Tema      [Sistema ▼]      │
│  (botões Claro/Escuro/Auto) │
├─────────────────────────────┤
│ 🏢 Empresa                  │
│  (CNPJ search + fields)     │
├─────────────────────────────┤
│ 🔔 Notificações             │
│  Alertas de vencimento [sw] │
│  Recebimentos         [sw]  │
│  Lembretes            [sw]  │
├─────────────────────────────┤
│ 📊 Financeiro               │
│  Moeda padrão    [BRL ▼]    │
│  Dia fechamento  [input]    │
├─────────────────────────────┤
│ ⚙️ Sistema                  │
│  Exportar dados      >      │
│  Começar do zero     >      │
│  Excluir conta       >      │
├─────────────────────────────┤
│ ℹ️ Sobre                    │
│  Versão          1.0.0      │
│  Termos de uso       >      │
│  Suporte             >      │
└─────────────────────────────┘
```

### Detalhes de implementação

| Arquivo | Mudança |
|---|---|
| `src/components/settings/SettingsItem.tsx` | Componente reutilizavel com icon, title, description, rightComponent |
| `src/components/settings/SettingsSection.tsx` | Card wrapper com titulo e animação CSS (opacity+translateY) |
| `src/pages/Settings.tsx` | Refatorar para usar as novas seções, adicionar busca, Switch para notificações, Select para moeda, seção Sobre |

### Componentes usados
- **Switch** (ja existe em `ui/switch.tsx`) para toggles de notificação
- **Select** (ja existe em `ui/select.tsx`) para moeda, dia de fechamento
- **Input** com icone Search para busca
- Cards existentes para agrupamento

### Notificações e Financeiro
- Como nao ha tabela de preferencias do usuario no Supabase, os toggles de notificacao e preferencias financeiras serao armazenados em `localStorage` inicialmente, com estado gerenciado por `useState` + `useEffect`
- A seção de senha sera colapsavel (Collapsible) dentro de "Conta" para reduzir ruido visual

### Animacoes
- Cada `SettingsSection` tera CSS transition com `animation: fadeSlideIn 0.3s ease` escalonado por indice
- Sem Framer Motion (seguindo a estrategia de performance do projeto)

### Busca
- Estado `searchQuery` no topo filtra seções por titulo e itens por titulo/descrição
- Seções sem itens visiveis ficam ocultas

