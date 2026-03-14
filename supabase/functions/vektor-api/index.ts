import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
        return new Response(JSON.stringify({ error: "No authorization header" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 401,
        });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Sessão expirada ou inválida", details: authError }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // GET /balance
    if (path === 'balance' && req.method === 'GET') {
      const { data: contas, error } = await supabase
        .from('contas_financeiras')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const totalBalance = contas.reduce((acc, c) => acc + (c.saldo || 0), 0);
      return new Response(JSON.stringify({
        total: totalBalance,
        accounts: contas.map(c => ({ id: c.id, nome: c.nome, saldo: c.saldo }))
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // GET /expenses
    if (path === 'expenses' && req.method === 'GET') {
      const limit = url.searchParams.get('limit') || '50';
      const { data: expenses, error } = await supabase
        .from('despesas')
        .select('*')
        .eq('user_id', user.id)
        .order('data', { ascending: false })
        .limit(parseInt(limit));

      if (error) throw error;
      return new Response(JSON.stringify(expenses), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // GET /cards
    if (path === 'cards' && req.method === 'GET') {
      const { data: cards, error: cardsError } = await supabase
        .from('cartoes_credito')
        .select('*')
        .eq('user_id', user.id);
      
      if (cardsError) throw cardsError;

      const { data: invoices, error: invError } = await supabase
        .from('faturas_cartao')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pendente');

      if (invError) throw invError;

      return new Response(JSON.stringify({
        cards: cards,
        pending_invoices: invoices
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // POST /transactions
    if (path === 'transactions' && req.method === 'POST') {
      const body = await req.json();
      const { type, data, descricao, categoria, valor, conta_id, status, tipo_conta } = body;

      const table = type === 'income' ? 'receitas' : 'despesas';
      const insertData = {
        user_id: user.id,
        data: data || new Date().toISOString().split('T')[0],
        descricao,
        categoria,
        valor: parseFloat(valor),
        conta_id,
        status: status || (type === 'income' ? 'recebido' : 'pago'),
        tipo_conta: tipo_conta || 'mei'
      };

      const { data: result, error } = await supabase
        .from(table)
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Endpoint não encontrado" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 404,
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
