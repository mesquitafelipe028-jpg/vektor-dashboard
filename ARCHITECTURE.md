# Arquitetura do Ecossistema Vektor

Este projeto faz parte de um ecossistema composto por dois repositórios front-end que compartilham o mesmo backend no Supabase.

## 🏗️ Estrutura
- **Vektor Dashboard (`vektorFinancas`)**: Sistema principal de gestão financeira, DRE, fluxo de caixa e controle de MEI.
- **Vektor Agente (`vektor-agent`)**: Interface de chat com IA para entrada rápida de dados e consultas via linguagem natural.
- **Backend Compartilhado (Supabase)**: Banco de dados relacional, Autenticação e Edge Functions.

## ⚠️ Regras Cruciais para Manutenção

### 1. Banco de Dados (Supabase)
Como o banco é compartilhado, qualquer alteração na estrutura pode quebrar o outro sistema.
- **Migrações Aditivas**: Sempre adicione colunas com valores padrão (`DEFAULT`). Nunca remova ou renomeie colunas sem garantir que o outro repositório não as utiliza mais.
- **RLS (Row Level Security)**: As políticas de segurança devem ser mantidas de forma a permitir que ambos os sistemas acessem os dados necessários com o `auth.uid()` do usuário.
- **Tipagem**: Ao alterar o banco, atualize os tipos do Supabase em ambos os repositórios (rodar `supabase gen types` em ambos).

### 2. Sincronização de Deploy
- **Vercel**: Variáveis de ambiente que envolvem chaves de API ou URLs de funções devem ser atualizadas nos dois projetos no painel da Vercel simultaneamente.
- **Edge Functions**: Funções de IA ou integrações bancárias no Supabase atendem a ambos os sistemas. Teste as rotas de ambos após qualquer alteração nessas funções.

## 🤖 Comunicação com Assistentes de IA
Ao solicitar alterações para um assistente de IA, sempre mencione:
1. Em qual repositório (`Dashboard` ou `Agente`) você está focado.
2. Que existe um banco compartilhado que **não pode ser quebrado**.
3. Se a mudança afetar o esquema do banco, peça para verificar o impacto no repositório "irmão".

---
*Este documento serve como guia de proteção para a integridade do ecossistema Vektor.*
