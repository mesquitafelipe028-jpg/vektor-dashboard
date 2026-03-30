/**
 * Vektor — Script de Seed da Conta Demonstrativa (v2 — distribuição correta)
 *
 * Uso (PowerShell):
 *   $env:SUPABASE_SERVICE_ROLE_KEY="eyJ..."
 *   node scripts/seed-demo-account.mjs
 *
 * Distribuição de saldo alvo:
 *   Conta Corrente Nubank : R$10.000
 *   Carteira Física       : R$ 2.000
 *   Poupança BB           : R$ 3.000
 *   TOTAL                 : R$15.000
 */

import { createClient } from "@supabase/supabase-js";

// ─── Config ─────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://rpgczlwqquxvxsvfflyh.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("❌ Defina SUPABASE_SERVICE_ROLE_KEY antes de rodar o script.");
  console.error("   PowerShell: $env:SUPABASE_SERVICE_ROLE_KEY=\"eyJ...\"");
  process.exit(1);
}

const DEMO_EMAIL = "demo@vektor.app";
const DEMO_PASSWORD = "Demo@123";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
const uuid = () => crypto.randomUUID();
const round2 = (n) => Math.round(n * 100) / 100;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffled = (arr) => [...arr].sort(() => Math.random() - 0.5);

function randomDay(ym, min = 1, max = 28) {
  const day = Math.floor(Math.random() * (max - min + 1)) + min;
  return `${ym}-${String(day).padStart(2, "0")}`;
}

// ─── Plano de Gastos ─────────────────────────────────────────────────────────
//
// Estratégia de saldo:
//  - TODA receita entra na Conta Corrente
//  - TODA despesa sai da Conta Corrente
//  - Transferências para Carteira e Poupança: saída da Corrente + entrada nas contas
//
//  delta_corrente = receitas_confirmed - despesas_confirmed = 15000
//  transferências_para_carteira (confirmed) = 2000
//  transferências_para_poupança (confirmed) = 3000
//
//  saldo_corrente = 15000 - 2000 - 3000 = 10000 ✓
//  saldo_carteira = 2000 ✓
//  saldo_poupança = 3000 ✓
//  total = 15000 ✓

const MONTH_PLAN = [
  { ym: "2025-09", rec: 3000, desp: 1000,  label: "Set/25" },
  { ym: "2025-10", rec: 3000, desp: 3800,  label: "Out/25" },
  { ym: "2025-11", rec: 4000, desp: 1700,  label: "Nov/25" },
  { ym: "2025-12", rec: 4500, desp: 2000,  label: "Dez/25" },
  { ym: "2026-01", rec: 5000, desp: 2000,  label: "Jan/26" },
  { ym: "2026-02", rec: 5500, desp: 2500,  label: "Fev/26" },
  { ym: "2026-03", rec: 5500, desp: 2500,  label: "Mar/26" },
];

// Transferências para Carteira (confirmed) — total deve ser R$2.000
const TRANSFERS_CARTEIRA = [250, 150, 300, 300, 350, 350, 300]; // soma = 2000

// Transferências para Poupança (confirmed) — total deve ser R$3.000
const TRANSFERS_POUPANCA = [300, 0, 400, 500, 600, 700, 500]; // soma = 3000

const EXPENSE_BY_CAT = {
  Alimentação: ["Supermercado Extra","iFood","Feira Livre","McDonald's","Restaurante Sabor & Arte","Padaria do Bairro"],
  Transporte:  ["Uber","Gasolina Posto BR","Manutenção Carro","Passagem Metrô","Estacionamento Shopping"],
  Lazer:       ["Cinema Kinoplex","Show Alok","Viagem Gramado","Livraria Cultura","Bar com amigos"],
  Saúde:       ["Farmácia Popular","Plano de Saúde Amil","Consulta Médica","Academia Smart Fit"],
  Vestuário:   ["Renner","Zara BR","Nike Store","Calçados Shoestock"],
  Tecnologia:  ["Amazon","iFood Marketplace","Shopee"],
};

const INCOME_EXTRAS = ["Freelance Design","Consultoria Web","Projeto Extra","Serviço Prestado","Venda Online"];
const TODAY = "2026-03";

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🚀 Vektor Demo Seed v2\n");

  // ── 1. Localizar usuário existente ou criar ──────────────────────────────
  console.log("📧 Gerenciando usuário demo@vektor.app...");
  let demoUserId;

  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existing = users?.find(u => u.email === DEMO_EMAIL);

  if (existing) {
    demoUserId = existing.id;
    console.log(`   ✅ Usuário encontrado: ${demoUserId}`);
  } else {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { nome: "Felipe Demo" },
    });
    if (error) { console.error("❌", error.message); process.exit(1); }
    demoUserId = created.user.id;
    console.log(`   ✅ Usuário criado: ${demoUserId}`);
    await new Promise(r => setTimeout(r, 1500));
  }

  // Limpar dados antigos
  console.log("   🗑️  Limpando dados anteriores...");
  await supabase.from("transactions").delete().eq("user_id", demoUserId);
  await supabase.from("contas_financeiras").delete().eq("user_id", demoUserId);
  await supabase.from("assinaturas").delete().eq("user_id", demoUserId);
  console.log("   ✅ Limpeza concluída");

  // ── 2. Profile is_demo ──────────────────────────────────────────────────
  console.log("\n👤 Configurando profile...");
  const { error: pe } = await supabase
    .from("profiles")
    .upsert({ id: demoUserId, nome: "Felipe Demo", email: DEMO_EMAIL, is_demo: true });
  if (pe) console.warn("   ⚠️", pe.message);
  else console.log("   ✅ is_demo = true");

  // ── 3. Assinatura PAID ──────────────────────────────────────────────────
  console.log("\n💎 Configurando assinatura PAID...");
  const { error: se } = await supabase.from("assinaturas").insert({
    user_id: demoUserId,
    plano: "vitalicio",
    status: "ativo",
    plan_type: "PAID",
    plan_name: "Demo — Acesso Completo",
    billing_type: "lifetime",
    transaction_limit: 99999,
    features_enabled: { ia: true, billing: true, advanced_cashflow: true },
    is_demo: true,
  });
  if (se) console.warn("   ⚠️", se.message);
  else console.log("   ✅ PAID configurado");

  // ── 4. Contas financeiras ───────────────────────────────────────────────
  console.log("\n🏦 Criando contas financeiras...");
  const contaId    = uuid();
  const carteiraId = uuid();
  const poupancaId = uuid();

  const { error: ce } = await supabase.from("contas_financeiras").insert([
    {
      id: contaId, user_id: demoUserId,
      nome: "Conta Corrente Nubank", tipo: "digital", classificacao: "pessoal",
      cor: "#8B5CF6", icone: "wallet", created_at: "2025-09-01T08:00:00Z",
    },
    {
      id: carteiraId, user_id: demoUserId,
      nome: "Carteira Física", tipo: "carteira", classificacao: "pessoal",
      cor: "#10B981", icone: "banknotes", created_at: "2025-09-01T08:00:00Z",
    },
    {
      id: poupancaId, user_id: demoUserId,
      nome: "Poupança BB", tipo: "banco", classificacao: "pessoal",
      cor: "#F59E0B", icone: "piggy-bank", created_at: "2025-09-01T08:00:00Z",
    },
  ]);
  if (ce) { console.error("❌ Contas:", ce.message); process.exit(1); }
  console.log("   ✅ Corrente | Carteira | Poupança");

  // ── 5. Transações ───────────────────────────────────────────────────────
  console.log("\n📊 Gerando transações...");
  const txns = [];

  // IDs dos pais de parcelamentos
  const parc1ParentId = uuid(); // Notebook 6x
  const parc2ParentId = uuid(); // Móveis 12x

  // Soma acumulada de confirmados para verificação
  let confirmedIncome = 0;
  let confirmedExpense = 0;

  for (let mi = 0; mi < MONTH_PLAN.length; mi++) {
    const { ym, rec, desp } = MONTH_PLAN[mi];
    const isPast    = ym < TODAY;
    const isCurrent = ym === TODAY;

    const C = "confirmed";
    const P = "pending";

    // ── Receitas ───────────────────────────────────────────────────────
    // Salário (dia 5) — maior parte da receita
    const salaryPct  = ym === "2025-09" ? 1.0 : ym === "2025-10" ? 1.0 : 0.78;
    const salaryAmt  = round2(rec * salaryPct);
    const salaryStatus = C; // Salário sempre confirmed quando no passado ou corrente

    txns.push(mkTxn({
      userId: demoUserId, accountId: contaId,
      type: "income", amount: salaryAmt,
      status: salaryStatus,
      date: `${ym}-05`,
      description: "Salário",
      category: "Salário e Renda",
    }));
    if (salaryStatus === C) confirmedIncome += salaryAmt;

    // Extra (freelance, etc.) quando há dois recebimentos
    const extraAmt = round2(rec - salaryAmt);
    if (extraAmt > 0) {
      const extraStatus = isPast ? C : (isCurrent ? (Math.random() > 0.4 ? C : P) : P);
      txns.push(mkTxn({
        userId: demoUserId, accountId: contaId,
        type: "income", amount: extraAmt,
        status: extraStatus,
        date: randomDay(ym, 10, 22),
        description: pick(INCOME_EXTRAS),
        category: "Freelance",
      }));
      if (extraStatus === C) confirmedIncome += extraAmt;
    }

    // ── Despesas fixas (todas da Conta Corrente) ────────────────────────
    const fixedExpenses = [
      { amount: 900,   date: `${ym}-10`, description: "Aluguel",        category: "Moradia"      },
      { amount: 150,   date: `${ym}-12`, description: "Energia Elétrica", category: "Moradia"    },
      { amount: 99.90, date: `${ym}-15`, description: "Internet Claro",  category: "Moradia"     },
      { amount: 21.90, date: `${ym}-01`, description: "Netflix",         category: "Assinaturas" },
      { amount: 11.90, date: `${ym}-01`, description: "Spotify",         category: "Assinaturas" },
    ];
    const fixedTotal = fixedExpenses.reduce((s, e) => s + e.amount, 0); // 1183.70

    for (const fe of fixedExpenses) {
      const status = C; // Fixas são sempre pagas
      txns.push(mkTxn({
        userId: demoUserId, accountId: contaId,
        type: "expense", ...fe, status,
      }));
      if (status === C) confirmedExpense += fe.amount;
    }

    // ── Despesas variáveis ─────────────────────────────────────────────
    let varTarget = round2(desp - fixedTotal);
    // Outubro ruim: extra gasto
    if (ym === "2025-10") varTarget = round2(varTarget + 600);
    if (varTarget < 0) varTarget = 0;

    if (varTarget > 0) {
      const numVar = ym === "2025-10" ? 6 : (ym === "2025-09" ? 3 : 4);
      const amounts = splitAlmost(varTarget, numVar);
      const cats = shuffled(["Alimentação","Transporte","Alimentação","Lazer","Saúde","Vestuário"]).slice(0, numVar);

      for (let i = 0; i < numVar; i++) {
        // Somente Corrente para variáveis
        const status = isPast
          ? (Math.random() > 0.07 ? C : P)
          : (isCurrent ? (i < numVar - 2 ? C : P) : P);

        const amt = round2(Math.abs(amounts[i]));
        txns.push(mkTxn({
          userId: demoUserId, accountId: contaId,
          type: "expense", amount: amt, status,
          date: randomDay(ym, 3, 27),
          description: pick(EXPENSE_BY_CAT[cats[i]]),
          category: cats[i],
        }));
        if (status === C) confirmedExpense += amt;
      }
    }

    // ── Transferências: Corrente → Carteira ───────────────────────────
    const carteiraAmt = TRANSFERS_CARTEIRA[mi];
    if (carteiraAmt > 0) {
      // Saída da corrente
      txns.push(mkTxn({
        userId: demoUserId, accountId: contaId,
        type: "expense", amount: carteiraAmt, status: C,
        date: randomDay(ym, 18, 26),
        description: "Saque ATM - Dinheiro",
        category: "Transferência",
      }));
      confirmedExpense += carteiraAmt;

      // Entrada na carteira
      txns.push(mkTxn({
        userId: demoUserId, accountId: carteiraId,
        type: "income", amount: carteiraAmt, status: C,
        date: randomDay(ym, 18, 26),
        description: "Saque ATM",
        category: "Transferência",
      }));
      confirmedIncome += carteiraAmt;
    }

    // ── Transferências: Corrente → Poupança ───────────────────────────
    const poupancaAmt = TRANSFERS_POUPANCA[mi];
    if (poupancaAmt > 0) {
      // Saída da corrente
      txns.push(mkTxn({
        userId: demoUserId, accountId: contaId,
        type: "expense", amount: poupancaAmt, status: C,
        date: `${ym}-25`,
        description: "Transferência para Poupança",
        category: "Transferência",
      }));
      confirmedExpense += poupancaAmt;

      // Entrada na poupança
      txns.push(mkTxn({
        userId: demoUserId, accountId: poupancaId,
        type: "income", amount: poupancaAmt, status: C,
        date: `${ym}-25`,
        description: "Depósito Poupança",
        category: "Transferência",
      }));
      confirmedIncome += poupancaAmt;
    }

    // Some pending extras no mês corrente (para mostrar mistura de status)
    if (isCurrent) {
      const pendingItems = [
        { description: "Supermercado Extra", category: "Alimentação", amount: 89.50  },
        { description: "Conta de Água",       category: "Moradia",     amount: 68.30  },
        { description: "iFood",               category: "Alimentação", amount: 45.00  },
      ];
      for (const pi of pendingItems) {
        txns.push(mkTxn({
          userId: demoUserId, accountId: contaId,
          type: "expense", status: P,
          date: randomDay(ym, 21, 29),
          ...pi,
        }));
      }
    }
  }

  // ── 6. Parcelamentos ─────────────────────────────────────────────────────
  console.log("   📦 Adicionando parcelamentos...");

  // Parcelamento 1: Notebook Dell R$1.200 em 6x — Out/25 a Mar/26
  const parcM1 = ["2025-10","2025-11","2025-12","2026-01","2026-02","2026-03"];
  for (let i = 0; i < 6; i++) {
    const ym = parcM1[i];
    const isPast = ym < TODAY;
    const status = isPast ? "confirmed" : "pending";
    txns.push({
      id: i === 0 ? parc1ParentId : uuid(),
      user_id: demoUserId, account_id: contaId,
      type: "expense", amount: 200.00, status,
      date: `${ym}-12`,
      description: `Notebook Dell (${i+1}/6)`,
      category: "Tecnologia",
      tipo_transacao: "parcelado",
      numero_parcelas: 6, parcela_atual: i + 1,
      transacao_pai_id: i > 0 ? parc1ParentId : null,
      tipo_conta: "pessoal",
    });
    if (status === "confirmed") confirmedExpense += 200;
  }

  // Parcelamento 2: Conjunto de Móveis R$2.400 em 12x — Nov/25 a Out/26
  const parcM2 = [
    "2025-11","2025-12","2026-01","2026-02","2026-03",
    "2026-04","2026-05","2026-06","2026-07","2026-08","2026-09","2026-10"
  ];
  for (let i = 0; i < 12; i++) {
    const ym = parcM2[i];
    const isPast = ym < TODAY;
    const status = isPast ? "confirmed" : "pending";
    txns.push({
      id: i === 0 ? parc2ParentId : uuid(),
      user_id: demoUserId, account_id: contaId,
      type: "expense", amount: 200.00, status,
      date: `${ym}-20`,
      description: `Conjunto de Móveis (${i+1}/12)`,
      category: "Moradia",
      tipo_transacao: "parcelado",
      numero_parcelas: 12, parcela_atual: i + 1,
      transacao_pai_id: i > 0 ? parc2ParentId : null,
      tipo_conta: "pessoal",
    });
    if (status === "confirmed") confirmedExpense += 200;
  }

  // ── 7. Ajuste final de saldo na Conta Corrente ───────────────────────────
  // Total confirmed = income - expense (todas contas)
  // Ledger corrente = income_corrente - expense_corrente
  // Queremos que ledger corrente = 10000, carteira = 2000, poupança = 3000
  // Total = 15000
  //
  // Como income/expense das transferências se cancela no total:
  //   total = (confirmed_income_plan - confirmed_expense_plan) + 2000 + 3000 - 2000 - 3000
  //         = plan_delta
  //   plan_delta = confirmedIncome - confirmedExpense (somando tudo)
  //
  // Mas precisamos que plan_delta = 15000 para o total bater.
  // O ajuste vai numa transação de corrente.

  const projectedTotal = round2(confirmedIncome - confirmedExpense);
  const adjustment = round2(15000 - projectedTotal);

  console.log(`\n   🔧 Saldo projetado: R$${projectedTotal.toFixed(2)} | Ajuste: R$${adjustment.toFixed(2)}`);

  if (Math.abs(adjustment) > 0.01) {
    if (adjustment > 0) {
      txns.push(mkTxn({
        userId: demoUserId, accountId: contaId,
        type: "income", amount: adjustment, status: "confirmed",
        date: "2026-03-26",
        description: "Restituição IR 2025",
        category: "Receita Extra",
      }));
      confirmedIncome += adjustment;
    } else {
      txns.push(mkTxn({
        userId: demoUserId, accountId: contaId,
        type: "expense", amount: Math.abs(adjustment), status: "confirmed",
        date: "2026-03-26",
        description: "Imposto de Renda",
        category: "Impostos",
      }));
      confirmedExpense += Math.abs(adjustment);
    }
  }

  // ── 8. Inserir em lotes ─────────────────────────────────────────────────
  console.log(`\n   💾 Inserindo ${txns.length} transações...`);
  const BATCH = 50;
  let ok = 0;
  for (let i = 0; i < txns.length; i += BATCH) {
    const batch = txns.slice(i, i + BATCH);
    const { error } = await supabase.from("transactions").insert(batch);
    if (error) {
      console.error(`   ❌ Lote ${Math.ceil(i/BATCH)+1}: ${error.message}`);
      // Mostrar primeiro elemento problemático para debug
      console.error("   Primeiro item:", JSON.stringify(batch[0], null, 2).slice(0, 300));
    } else {
      ok += batch.length;
    }
  }
  console.log(`   ✅ ${ok}/${txns.length} transações inseridas`);

  // ── 9. Verificar saldo via ledger ────────────────────────────────────────
  console.log("\n💰 Saldo final por conta (ledger):");
  const { data: balances, error: be } = await supabase
    .from("v_accounts_with_balance")
    .select("nome, ledger_balance")
    .eq("user_id", demoUserId);

  if (be) {
    console.warn("   ⚠️ Não foi possível verificar saldo:", be.message);
  } else if (balances) {
    let total = 0;
    for (const b of balances) {
      const val = Number(b.ledger_balance);
      const icon = val < 0 ? "⚠️" : "📊";
      console.log(`   ${icon} ${b.nome.padEnd(28)}: R$ ${val.toFixed(2)}`);
      total += val;
    }
    console.log(`   ${"─".repeat(44)}`);
    console.log(`   💰 ${"SALDO TOTAL".padEnd(28)}: R$ ${total.toFixed(2)}`);

    const diff = Math.abs(total - 15000);
    if (diff < 1) console.log("   ✅ Saldo exato: R$15.000");
    else console.log(`   ⚠️  Diferença de R$${diff.toFixed(2)}`);
  }

  console.log(`
🎉 Seed v2 concluído!
${"═".repeat(50)}
📧  Email    : ${DEMO_EMAIL}
🔑  Senha    : ${DEMO_PASSWORD}
🆔  User ID  : ${demoUserId}
💎  Plano    : PAID (acesso completo)
📊  Trans.   : ${ok} inseridas
${"═".repeat(50)}
`);
}

// ─── Utils ───────────────────────────────────────────────────────────────────

function mkTxn({ userId, accountId, type, amount, status, date, description, category }) {
  return {
    id: uuid(),
    user_id: userId,
    account_id: accountId,
    type,
    amount: round2(amount),
    status,
    date,
    description,
    category,
    tipo_transacao: "unica",
    tipo_conta: "pessoal",
  };
}

function splitAlmost(total, n) {
  if (n <= 0) return [];
  if (n === 1) return [round2(total)];
  const parts = [];
  let rem = total;
  for (let i = 0; i < n - 1; i++) {
    const avg = rem / (n - i);
    const v   = avg * (0.5 + Math.random() * 0.7);
    const safe = Math.min(Math.max(round2(v), 8), rem - 8 * (n - i - 1));
    parts.push(round2(safe));
    rem = round2(rem - safe);
  }
  parts.push(round2(Math.max(rem, 8)));
  return parts;
}

main().catch(err => {
  console.error("❌ Erro fatal:", err);
  process.exit(1);
});
