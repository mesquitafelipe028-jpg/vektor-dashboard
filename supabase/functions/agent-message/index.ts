import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

const SYSTEM_PROMPT = `
SISTEMA: VEKTOR_AGENT_CORE
VOCÊ É O AGENTE FINANCEIRO INTELIGENTE DO VEKTOR.
SEU OBJETIVO É AJUDAR O USUÁRIO A GERIR SUAS FINANÇAS COM PRECISÃO E VELOCIDADE.

### DIRETRIZES DE COMPORTAMENTO:
1. **Identificação**: Você já sabe quem o usuário é (contexto fornecido). Nunca peça ID ou nome.
2. **Extração de Dados**: Ao identificar um registro (despesa ou receita), extraia:
   - 'valor': NUMERIC (ex: 50.00). Remova currency symbols.
   - 'descricao': Texto conciso.
   - 'categoria': Uma das categorias comuns (Alimentação, Transporte, Saúde, Lazer, Assinaturas, Outros).
   - 'data': YYYY-MM-DD (use a data atual se não mencionada).
3. **Imagens**: Se houver imagem, priorize os dados nela contidos (OCR).
4. **Respostas**: Seja amigável, mas direto ao ponto. Use emojis moderadamente.

### CAPACIDADES (VIA VEKTOR-API):
- Consultar saldos (get_balance)
- Consultar gastos/despesas (get_expenses)
- Consultar cartões e faturas (get_cards)
- Registrar transações (add_transaction) -> Requer confirmação por padrão.

### FORMATO DE SAÍDA (Obrigatório JSON):
{
  "message": "Sua resposta textual ou confirmação sugerida",
  "intent": "get_balance | get_expenses | get_cards | add_transaction | none",
  "api_params": {
    "type": "income | expense",
    "valor": 0.00,
    "descricao": "...",
    "categoria": "...",
    "data": "YYYY-MM-DD"
  },
  "suggested_confirmation": "Quero registrar esta [despesa/receita] de R$ [valor]?"
}
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { message, image } = await req.json();
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
        return new Response(JSON.stringify({ error: "No authorization header" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 401,
        });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiKey) {
        return new Response(JSON.stringify({ error: "OPENAI_API_KEY is not configured in Supabase Secrets" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
        return new Response(JSON.stringify({ 
            error: "Não autorizado", 
            details: authError?.message || authError,
            hint: "Verifique se o token é válido ou se você está logado no projeto correto."
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 401,
        });
    }

    // 1. Interpretar intenção com OpenAI
    const userContext = `USUÁRIO_AUTENTICADO: Nome: ${user.user_metadata?.full_name || 'Usuário'}, ID: ${user.id}`;
    const messages: any[] = [
      { role: "system", content: SYSTEM_PROMPT.replace('VOCÊ É O AGENTE', `${userContext}\nVOCÊ É O AGENTE`) }
    ];
    const userContent: any[] = [{ type: "text", text: message || "Analise esta imagem." }];
    
    if (image) {
      userContent.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } });
    }
    messages.push({ role: "user", content: userContent });

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
        response_format: { type: "json_object" }
      })
    });

    const aiData = await aiRes.json();
    const interpretation = JSON.parse(aiData.choices[0].message.content);

    // 2. Orquestrar chamadas para Vektor-API conforme a intenção
    let apiData = null;
    if (interpretation.intent !== 'none' && interpretation.intent !== 'add_transaction') {
        const apiPath = interpretation.intent.replace('get_', '');
        const apiRes = await fetch(`${supabaseUrl}/functions/v1/vektor-api/${apiPath}`, {
            method: 'GET',
            headers: { 'Authorization': authHeader!, 'Content-Type': 'application/json' }
        });
        apiData = await apiRes.json();
    }

    // 3. Gerar resposta final se houver dados da API
    let finalMessage = interpretation.message;
    if (apiData) {
        // Segunda chamada para formatar os dados reais na resposta
        const secondAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${openaiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "Formate os dados financeiros recebidos em uma resposta amigável em português." },
                    { role: "user", content: `Pergunta: ${message}\nDados: ${JSON.stringify(apiData)}` }
                ]
            })
        });
        const secondAiData = await secondAiRes.json();
        finalMessage = secondAiData.choices[0].message.content;
    }

    // 4. Persistir no histórico
    const { data: savedMsg, error: saveError } = await supabase.from('assistant_messages').insert([
        { user_id: user.id, role: 'user', content: message || "Imagem enviada", image_url: image ? 'base64_hidden' : null },
        { user_id: user.id, role: 'assistant', content: finalMessage, metadata: { ...interpretation, api_data: apiData } }
    ]);

    return new Response(JSON.stringify({
        message: finalMessage,
        intent: interpretation.intent,
        data: interpretation.api_params || apiData,
        suggested_confirmation: interpretation.suggested_confirmation
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
