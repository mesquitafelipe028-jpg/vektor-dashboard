

## Plano: Tema escuro automático via `prefers-color-scheme`

### Situação atual
O projeto já tem `next-themes` instalado e variáveis CSS para `.dark` definidas no `index.css`, mas **não há `ThemeProvider`** envolvendo a app. O `useTheme` no `sonner.tsx` retorna o default sem funcionar de fato.

### Mudanças

| Arquivo | Mudança |
|---|---|
| `src/App.tsx` | Envolver a app com `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>` do `next-themes` |
| `src/pages/Settings.tsx` | Adicionar seletor de tema (Sistema / Claro / Escuro) usando `useTheme()` para que o usuário possa sobrescrever a preferência do sistema |

### Como funciona
- `next-themes` com `defaultTheme="system"` detecta automaticamente `prefers-color-scheme: dark` do SO
- Adiciona a classe `dark` no `<html>`, que ativa as variáveis CSS já definidas em `.dark { ... }` no `index.css`
- O Sonner (toasts) já usa `useTheme` — passará a funcionar corretamente
- Na página de Configurações, o usuário pode forçar claro/escuro ou voltar ao automático (sistema)

### Detalhes técnicos
- `ThemeProvider` deve ficar **fora** do `BrowserRouter` mas **dentro** do `QueryClientProvider`
- `attribute="class"` garante compatibilidade com Tailwind `darkMode: ["class"]` já configurado no `tailwind.config.ts`
- Sem necessidade de instalar pacotes novos — `next-themes` já está nas dependências

