

## Plano: Ocultar dados MEI quando não houver CNPJ cadastrado

Excelente ideia. Faz total sentido esconder funcionalidades MEI para quem ainda não cadastrou empresa, deixando o dashboard mais limpo e relevante.

### O que muda

Usar a variável `empresa` (já carregada via query `empresas`) para criar um flag `hasCnpj = !!empresa?.cnpj`. Com base nesse flag:

1. **Seletor de visualização**: Quando `!hasCnpj`, ocultar as opções "MEI" e "Tudo" do `ToggleGroup`, forçando a view para `"pessoal"` automaticamente. Se tiver CNPJ, manter as 3 opções.

2. **KPI Cards**: Ocultar os cards "Faturamento MEI" e "Lucro MEI" quando `!hasCnpj`. Mostrar apenas "Taxa de Poupança Pessoal" (ou adicionar KPIs pessoais alternativos como receita pessoal e despesa pessoal).

3. **Alertas financeiros MEI**: Ocultar alertas de limite MEI e DAS pendente quando `!hasCnpj`.

4. **Seção "Dados da empresa"**: Ocultar o card de resumo da empresa. Opcionalmente, mostrar um banner sutil convidando a cadastrar o CNPJ: *"Você é MEI? Cadastre seu CNPJ nas Configurações para desbloquear o controle financeiro empresarial."*

### Detalhes técnicos

**Arquivo: `src/pages/Dashboard.tsx`**

- Derivar `const hasCnpj = !!empresa?.cnpj;`
- Adicionar `useEffect`: se `!hasCnpj && financialView !== "pessoal"`, setar view para `"pessoal"`
- Envolver o `ToggleGroup` MEI/Tudo com `{hasCnpj && ...}`
- Passar `hasCnpj` para `KpiCards` e condicionar renderização dos cards MEI
- Nos `financialAlerts`, adicionar `hasCnpj` como condição para alertas MEI (ids `mei-*`, `das-*`)
- Adicionar banner opcional quando `!hasCnpj`: card com ícone `Building2` + link para `/settings`

Nenhuma alteração em banco de dados ou outras páginas.

