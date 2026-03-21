import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

const SYSTEM_PROMPT = `
SISTEMA: VEKTOR_MULTIMODAL_INTEL (v6.0)
AGENTE: Vektor Assistant
NATUREZA: Analista Financeiro Multimidia

### REGRAS DE ÁUDIO E FOTO:
1. **ÁUDIO E TEXTO**: O usuário pode falar de forma muito casual. Exemplos:
   - "Paguei 50 reais no posto hoje" -> valor: 50, descricao: "Posto", type: "expense"
   - "Acabei de receber um pix de 100 do joão" -> valor: 100, descricao: "PIX João", type: "income"
   - "Cinquenta reais de mercado" -> valor: 50, descricao: "Mercado", type: "expense"
   - "Vendi um produto por 200" -> valor: 200, descricao: "Venda de Produto", type: "income"
   Se houver um valor e uma descrição mínima, trate como 'add_transaction'. **Não exija que o valor venha primeiro.**
2. **FOTO**: Se receber uma imagem, extraia os dados (OCR). Se for um recibo/cupom, preencha valor, descrição, data e sugira categoria.

### CONTEXTO DO USUÁRIO (FONTE ÚNICA):
HISTÓRICO REAL DO BANCO DE DADOS:
{{HISTORY_CONTEXT}}

### REGRAS DE TRANSAÇÃO (IMPORTANTÍSSIMO):
Se a intenção for 'add_transaction':
- **valor**: OBRIGATÓRIO (Number). Extraia do texto independente da posição.
- **descricao**: Nome do estabelecimento ou o que foi comprado/recebido.
- **data**: Data da transação (YYYY-MM-DD). Use a data atual se não mencionada: {{CURRENT_DATE}}.
- **type**: 'expense' ou 'income'. Identifique pelo contexto (paguei/gastei = expense, recebi/vendi = income).
- **categoria**: Sugira uma categoria condizente.
- **tipo_conta**: 'pessoal' ou 'mei'. Padronize para 'pessoal' se não especificado.

### REGRAS DE CRM E COBRANÇA:
1. **INTENÇÕES**:
   - 'get_customers': Quando perguntado sobre melhores clientes, quem paga mais, ranking de vendas por cliente.
   - 'get_billings': Quando perguntado sobre quem deve, cobranças pendentes, faturas atrasadas.
2. **GRÁFICOS**:
   - Use 'bar' para rankings de clientes (label: nome do cliente, value: total faturado).
   - Use 'pie' para status de cobranças se houver distribuição.
3. **PROATIVIDADE**: Se houver cobranças atrasadas no histórico, mencione-as e sugira um lembrete.

### REGRAS DE INTEGRIDADE:
- NÃO invente clientes ou valores. Use apenas o que a API retornar ou o que estiver no histórico.
- Se não houver clientes cadastrados, sugira cadastrar um para começar a gestão.

### FORMATO DE RESPOSTA (JSON):
Sempre responda em JSON válido:
{
  "message": "Mensagem amigável confirmando a leitura.",
  "intent": "add_transaction | get_customers | get_billings | get_insights | none",
  "visual_data": {
    "type": "pie | bar",
    "title": "...",
    "data": [{ "label": "...", "value": 0.0 }]
  },
  "api_params": {
    "valor": 0.0,
    "descricao": "...",
    "data": "YYYY-MM-DD",
    "categoria": "...",
    "type": "expense | income",
    "tipo_conta": "pessoal | mei"
  }
}
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

  try {
    const { message: rawMessage, image, audio } = await req.json();
    let message = rawMessage;

    // Se houver áudio, transcrever primeiro usando Whisper
    if (audio) {
      console.log("[agent-message] Transcrevendo áudio com Whisper...");
      try {
        const audioBytes = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
        const formData = new FormData();
        const audioBlob = new Blob([audioBytes], { type: 'audio/webm' });
        formData.append('file', audioBlob, 'audio.webm');
        formData.append('model', 'whisper-1');
        formData.append('language', 'pt');

        const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${openaiKey}` },
          body: formData
        });

        if (whisperRes.ok) {
          const whisperData = await whisperRes.json();
          message = whisperData.text;
          console.log(`[agent-message] Áudio transcrito: "${message}"`);
        } else {
          console.error("[agent-message] Erro Whisper:", await whisperRes.text());
        }
      } catch (whisperErr) {
        console.error("[agent-message] Falha na transcrição:", whisperErr);
      }
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
        return new Response(JSON.stringify({ error: "No authorization header" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 401,
        });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log("[agent-message] Autenticando usuário...");
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
        console.error("[agent-message] Erro de autenticação:", authError);
        return new Response(JSON.stringify({ 
            error: "Não autorizado", 
            details: authError?.message || authError,
            hint: "Verifique se o token é válido."
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 401,
        });
    }

    // 1. Interpretar intenção com OpenAI
    const currentDate = new Date().toISOString().split('T')[0];
    const userContext = `USUÁRIO_AUTENTICADO: Nome: ${user.user_metadata?.full_name || 'Usuário'}, ID: ${user.id}`;
    
    // Injeção de Contexto Financeiro Real (Histórico Recente)
    console.log("[agent-message] Buscando contexto histórico (Receitas + Despesas)...");
    let historyContext = "SEM_HISTORICO_RECENTE";
    
    try {
      const [recRes, desRes] = await Promise.all([
        supabase.from('receitas').select('valor, descricao, data').eq('user_id', user.id).order('data', { ascending: false }).limit(30),
        supabase.from('despesas').select('valor, descricao, categoria, data').eq('user_id', user.id).order('data', { ascending: false }).limit(30)
      ]);
      
      const combined = [
        ...(recRes.data || []).map(r => ({ ...r, type: 'RECEITA', categoria: 'Recebimento' })),
        ...(desRes.data || []).map(d => ({ ...d, type: 'DESPESA' }))
      ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
       .slice(0, 50);

      if (combined.length > 0) {
        historyContext = combined.map(t => `${t.data} | ${t.type} | R$ ${t.valor} | ${t.descricao} (${t.categoria})`).join('\n');
      }
    } catch (historyErr) {
      console.error("[agent-message] Erro crítico ao buscar histórico:", historyErr);
    }

    const fullSystemPrompt = SYSTEM_PROMPT
      .replace(/{{CURRENT_DATE}}/g, currentDate)
      .replace('{{HISTORY_CONTEXT}}', historyContext);
    
    const messages: any[] = [
      { role: "system", content: fullSystemPrompt.replace('VOCÊ É O AGENTE', `${userContext}\nVOCÊ É O AGENTE`) }
    ];
    const userContent: any[] = [{ type: "text", text: message || "Analise esta imagem." }];
    
    if (image) {
      userContent.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } });
    }
    messages.push({ role: "user", content: userContent });

    console.log("[agent-message] Chamando OpenAI gpt-4o...");
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
    if (aiData.error) throw new Error(`OpenAI Error: ${aiData.error.message}`);
    
    const interpretation = JSON.parse(aiData.choices[0].message.content);
    console.log("[agent-message] Intenção detectada:", interpretation.intent);

    // 2. Orquestrar chamadas para Vektor-API conforme a intenção
    let apiData = null;
    if (interpretation.intent !== 'none' && interpretation.intent !== 'add_transaction' && interpretation.intent !== 'get_insights') {
        const apiPath = interpretation.intent.replace('get_', '');
        
        // Construir URL com query params se houver api_params
        let url = `${supabaseUrl}/functions/v1/vektor-api/${apiPath}`;
        if (interpretation.api_params && Object.keys(interpretation.api_params).length > 0) {
          const params = new URLSearchParams(interpretation.api_params);
          url += `?${params.toString()}`;
        }

        console.log(`[agent-message] Chamando Vektor-API: ${url}`);
        const apiRes = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': authHeader!, 'Content-Type': 'application/json' }
        });
        if (apiRes.ok) apiData = await apiRes.json();
    }

    // 3. Gerar resposta final se houver dados da API
    let finalMessage = interpretation.message;
    let finalVisualData = interpretation.visual_data;

    if (apiData) {
        console.log("[agent-message] Formatando dados da API com IA...");
        const secondAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${openaiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: `Você é um refinador de dados financeiros.
                      Sua tarefa é pegar os dados da API e a intenção do usuário e criar uma resposta amigável e opcionalmente um gráfico.
                      Responda no formato JSON: { "message": "...", "visual_data": { "type": "pie|bar", "title": "...", "data": [...] } }
                      Use Markdown nas mensagens.` },
                    { role: "user", content: `Pergunta: ${message}\nIntenção: ${interpretation.intent}\nDados da API: ${JSON.stringify(apiData)}` }
                ],
                response_format: { type: "json_object" }
            })
        });
        const secondAiData = await secondAiRes.json();
        const refinedResult = JSON.parse(secondAiData.choices[0].message.content);
        finalMessage = refinedResult.message;
        if (refinedResult.visual_data) {
            finalVisualData = refinedResult.visual_data;
        }
    }

    // 4. Persistir no histórico
    console.log("[agent-message] Persistindo no histórico...");
    const finalMetadata = { 
        ...interpretation, 
        visual_data: finalVisualData,
        api_data: apiData 
    };

    await supabase.from('assistant_messages').insert([
        { user_id: user.id, role: 'user', content: message || "Imagem enviada", image_url: image ? 'base64_hidden' : null },
        { user_id: user.id, role: 'assistant', content: finalMessage, metadata: finalMetadata }
    ]);

    return new Response(JSON.stringify({
        message: finalMessage,
        intent: interpretation.intent,
        visual_data: finalVisualData,
        data: finalMetadata,
        suggested_confirmation: interpretation.suggested_confirmation
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("[agent-message] CRITICAL ERROR:", err);
    return new Response(JSON.stringify({ 
      error: err.message,
      stack: err.stack,
      message: "Ocorreu um erro interno na IA Vektor. Por favor, tente novamente." 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Retornamos 200 para que o frontend possa ler a mensagem de erro
    });
  }
});
