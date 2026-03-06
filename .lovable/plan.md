

## Plano: Remover Landing Page e iniciar pelo Login

Mudança simples de rotas:

### Alterações

1. **`src/App.tsx`** — Trocar a rota `/` de `<Landing />` para `<Login />`. Remover import da Landing.

2. **`src/pages/Login.tsx`** — Já tem redirect para `/dashboard` quando `user` existe. Nenhuma mudança necessária.

3. **`src/pages/Signup.tsx`** — Atualizar link "Voltar para o início" de `"/"` para `"/login"`.

4. **Opcional: deletar `src/pages/Landing.tsx`** — Não será mais usada.

### Resultado
- `/` → Tela de Login
- Usuário logado → Redirect automático para `/dashboard`
- `/cadastro` → Tela de cadastro (já funciona)

