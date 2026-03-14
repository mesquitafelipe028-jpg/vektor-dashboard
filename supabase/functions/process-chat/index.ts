import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `
SISTEMA: VEKTOR_OS_CORE_AI
IDENTIDADE: VOCÊ É O AGENTE FINANCEIRO INTELIGENTE DO VEKTOR.
VOCÊ É UM ASSISTENTE PESSOAL CONECTADO DIRETAMENTE AO BANCO DE DADOS DO USUÁRIO.

### CAPACIDADES:
- INTERPRETAR TEXTO E IMAGENS (RECIBOS/COMPROVANTES/FATURAS)
- EXECUTAR AÇÕES NO SISTEMA
- CONSULTAR SALDOS, GASTOS E CARTÕES EM TEMPO REAL
- ANALISAR PADRÕES DE CONSUMO E RESPONDER PERGUNTAS SOBRE OS DADOS

### REGRAS CRÍTICAS:
1. **DADOS REAIS**: Use APENAS os "DADOS DO BANCO" fornecidos. NUNCA diga que não tem acesso ou que não é em tempo real. VOCÊ É O SISTEMA.
2. **INTENÇÕES (INTENTS)**: Escolha a melhor intenção para o JSON de saída:
   - add_expense: Registrar uma despesa.
   - add_income: Registrar uma receita.
   - get_balance: Consultar saldo total ou por conta.
   - get_expenses: Consultar gastos passados (ex: "quanto gastei com Uber").
   - get_card_invoice: Consultar faturas ou limites de cartões.
   - financial_analysis: Análise de categorias ou comportamento (ex: "estou gastando muito?").
   - none: Conversa casual ou ajuda.

3. **MEMÓRIA**: O usuário está na visão '{current_view}'. Priorize transações para esse tipo de conta.
4. **CAMPOS**: Use nomes em português: { valor, descricao, data (YYYY-MM-DD), categoria, conta_id }.
5. **IMAGENS**: Se o usuário enviar uma imagem, analise-a (OCR), extraia os dados e use o intent 'add_expense' ou 'add_income' sugerindo a confirmação.

### FORMATO DE SAÍDA (OBRIGATÓRIO JSON):
{ 
  "message": "Texto direto e amigável", 
  "intent": "add_expense|add_income|get_balance|get_expenses|get_card_invoice|financial_analysis|none", 
  "data": {}, 
  "suggested_confirmation": "Texto do botão se for ação de registro" 
}
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { message, image, currentView = "tudo" } = body;

    if (!message && !image) {
      return new Response(JSON.stringify({ error: "Entrada vazia" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiKey) {
      return new Response(JSON.stringify({ error: "Configuração pendente (API Key)" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader?.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Sessão expirada" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Contexto Temporal
    const now = new Date();
    const yearStart = `${now.getFullYear()}-01-01`;
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // Busca de dados expandida (incluindo cartões)
    const [receitasRes, despesasRes, profilesRes, clientesRes, contasRes, empresaRes, cartoesRes, faturasRes] = await Promise.all([
      supabase.from('receitas').select('*, clientes(nome)').eq('user_id', user.id).gte('data', yearStart),
      supabase.from('despesas').select('*').eq('user_id', user.id).gte('data', yearStart),
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('clientes').select('*').eq('user_id', user.id),
      supabase.from('contas_financeiras').select('*').eq('user_id', user.id),
      supabase.from('empresas').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('cartoes_credito').select('*').eq('user_id', user.id),
      supabase.from('faturas_cartao').select('*').eq('user_id', user.id).eq('status', 'pendente')
    ]);

    const receitas = receitasRes.data || [];
    const despesas = despesasRes.data || [];
    const contas = contasRes.data || [];
    const cartoes = cartoesRes.data || [];

    const financialSummary = {
      saldo_total: contas.reduce((acc, c) => acc + (c.saldo || 0), 0),
      contas: contas.map(c => ({ id: c.id, nome: c.nome, saldo: c.saldo })),
      cartoes_credito: cartoes.map(c => ({ id: c.id, nome: c.nome, limite: c.limite_total })),
      faturas_pendentes: faturasRes.data || [],
      receitas_mes: receitas.filter(r => r.data >= monthStart).map(r => ({ valor: r.valor, descricao: r.descricao, categoria: r.categoria })),
      despesas_mes: despesas.filter(d => d.data >= monthStart).map(d => ({ valor: d.valor, descricao: d.descricao, categoria: d.categoria })),
      clientes: (clientesRes.data || []).map(c => ({ id: c.id, nome: c.nome })),
      info_mei: {
        faturamento_anual: receitas.filter(r => r.tipo_conta === 'mei' && r.status === 'recebido').reduce((acc, r) => acc + (r.valor || 0), 0),
        limite_anual: 81000
      }
    };

    const userContext = `Nome: ${profilesRes.data?.nome || 'Usuário'} | Empresa: ${empresaRes.data?.nome_fantasia || 'N/A'}`;

    const contextPrompt = SYSTEM_PROMPT
      .replace('{user_context}', userContext)
      .replace('{financial_data}', JSON.stringify(financialSummary, null, 2))
      .replace(/{current_view}/g, currentView);

    // Preparar mensagens para OpenAI (com suporte a imagem)
    const messages: any[] = [
      { role: "system", content: contextPrompt }
    ];

    const userContent: any[] = [
      { type: "text", text: `Hoje é ${now.toISOString().split('T')[0]}. Com base no banco de dados fornecido, responda: ${message || "Analise esta imagem."}` }
    ];

    if (image) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${image}` }
      });
    }

    messages.push({ role: "user", content: userContent });

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`OpenAI Error: ${await aiResponse.text()}`);
    }

    const aiData = await aiResponse.json();
    const result = JSON.parse(aiData.choices[0].message.content || "{}");

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
