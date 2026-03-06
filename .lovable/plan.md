

## Plano: Adicionar "Limpar Dados / Começar do Zero" nas Configurações

### O que será feito
Adicionar na seção "Zona de Perigo" da página de Configurações um botão "Começar do Zero" que apaga todos os dados financeiros do usuário, mantendo apenas o perfil e a conta.

### Implementação

**Arquivo: `src/pages/Settings.tsx`**

1. Adicionar um `AlertDialog` de confirmação com dupla etapa (digitar "CONFIRMAR" para liberar o botão) para evitar cliques acidentais.

2. Criar uma mutation que deleta todos os registros do usuário nas tabelas:
   - `receitas`
   - `despesas`
   - `clientes`
   - `categorias`
   - `impostos_mei`
   - `empresas`
   - `metas_financeiras`

3. Após a limpeza, invalidar todas as queries do React Query para atualizar a UI.

4. Na seção "Zona de Perigo", adicionar o botão "Começar do Zero" (com ícone `Trash2`) acima do botão de excluir conta, com texto explicativo separando as duas ações.

### UX
- Botão `variant="outline"` com borda vermelha para "Começar do Zero"
- AlertDialog pedindo que o usuário digite "CONFIRMAR" para habilitar a ação
- Toast de sucesso após limpeza
- Botão de excluir conta permanece separado abaixo

