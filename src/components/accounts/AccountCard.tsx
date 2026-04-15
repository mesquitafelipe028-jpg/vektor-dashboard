import { useMemo } from "react";
import { CreditCard, Wallet, Pencil, Trash2, ExternalLink, ArrowRightLeft } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import { getBankById } from "@/lib/banks";
import { motion } from "framer-motion";

// ── Mapeamento de cores por banco ──
const BANK_THEMES: Record<string, { from: string; to: string; accent: string; text: string }> = {
  santander: { from: "#7f0000", to: "#1a0000", accent: "#ec0000", text: "#fff" },
  bradesco:  { from: "#8a0020", to: "#1a0008", accent: "#cc092f", text: "#fff" },
  nubank:    { from: "#4a0278", to: "#0d001a", accent: "#8a05be", text: "#fff" },
  itau:      { from: "#7a3800", to: "#1a0d00", accent: "#ec7000", text: "#fff" },
  bb:        { from: "#003370", to: "#000e26", accent: "#003882", text: "#fece00" },
  caixa:     { from: "#003a6e", to: "#000f1e", accent: "#005ca9", text: "#fff" },
  inter:     { from: "#7a3a00", to: "#1a0d00", accent: "#ff7a00", text: "#fff" },
  c6:        { from: "#1a1a1a", to: "#050505", accent: "#424242", text: "#fff" },
  mercadopago: { from: "#005a8e", to: "#001520", accent: "#009ee3", text: "#fff" },
  pagbank:   { from: "#006633", to: "#001a0d", accent: "#00a859", text: "#fff" },
  neon:      { from: "#005299", to: "#00142e", accent: "#0099ff", text: "#fff" },
  outro:     { from: "#2a3040", to: "#0a0e1a", accent: "#4f6080", text: "#fff" },
};

const DEFAULT_CARD_THEME = { from: "#1a2640", to: "#070d1a", accent: "#3b5280", text: "#fff" };
const CREDIT_CARD_THEME  = { from: "#2d0a4e", to: "#0a0014", accent: "#8a05be", text: "#fff" };

function getTheme(bankId: string | null | undefined, isCredit: boolean) {
  if (isCredit) {
    const base = bankId ? BANK_THEMES[bankId] : null;
    // Cartão mix: usa cor do banco mas com escurecimento maior
    if (base) return { ...base, from: darken(base.accent, 0.65), to: darken(base.accent, 0.92) };
    return CREDIT_CARD_THEME;
  }
  if (bankId && BANK_THEMES[bankId]) return BANK_THEMES[bankId];
  return DEFAULT_CARD_THEME;
}

function darken(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `#${Math.round(r * (1 - factor)).toString(16).padStart(2, "0")}${Math.round(g * (1 - factor)).toString(16).padStart(2, "0")}${Math.round(b * (1 - factor)).toString(16).padStart(2, "0")}`;
}

// ─── Chip SVG (fake EMV) ───
function ChipIcon() {
  return (
    <svg width="36" height="28" viewBox="0 0 36 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-80">
      <rect x="0.5" y="0.5" width="35" height="27" rx="4.5" fill="url(#chipGrad)" stroke="rgba(255,255,255,0.2)"/>
      <rect x="12" y="0" width="1" height="28" fill="rgba(255,255,255,0.15)"/>
      <rect x="23" y="0" width="1" height="28" fill="rgba(255,255,255,0.15)"/>
      <rect x="0" y="9" width="36" height="1" fill="rgba(255,255,255,0.15)"/>
      <rect x="0" y="18" width="36" height="1" fill="rgba(255,255,255,0.15)"/>
      <rect x="13" y="10" width="10" height="8" rx="2" fill="rgba(255,255,255,0.25)"/>
      <defs>
        <linearGradient id="chipGrad" x1="0" y1="0" x2="36" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#d4a843"/>
          <stop offset="50%" stopColor="#f0d070"/>
          <stop offset="100%" stopColor="#b8892e"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─── Bandeira Visa (minimalista) ───
function VisaIcon() {
  return (
    <svg width="40" height="14" viewBox="0 0 40 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-90">
      <text x="0" y="12" fontFamily="serif" fontWeight="bold" fontSize="14" fill="white" letterSpacing="-0.5">VISA</text>
    </svg>
  );
}

// ─── Bandeira Mastercard (minimalista) ───
function MastercardIcon() {
  return (
    <svg width="32" height="20" viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-90">
      <circle cx="11" cy="10" r="10" fill="#EB001B" fillOpacity="0.9"/>
      <circle cx="21" cy="10" r="10" fill="#F79E1B" fillOpacity="0.9"/>
      <path d="M16 3.6a10 10 0 0 1 0 12.8A10 10 0 0 1 16 3.6z" fill="#FF5F00" fillOpacity="0.8"/>
    </svg>
  );
}

// ─── Tipos ───
export interface AccountCardProps {
  id: string;
  nome: string;
  tipo: string;           // "banco" | "digital" | "carteira" | "cartao" | "investimento"
  bankId?: string | null;
  classificacao?: string;
  isCredit?: boolean;     // conta do tipo cartão vinculada a cartoes_credito
  // Conta corrente
  saldo?: number;
  // Cartão de crédito
  limiteUsado?: number;      // total não pago (para barra de limite)
  limiteDisponivel?: number;
  limiteTotal?: number;
  faturaAtual?: number;      // valor apenas do período atual (para display)
  cartaoNome?: string;
  // Ações
  onEdit?: () => void;
  onDelete?: () => void;
  onViewFatura?: () => void;
  onClick?: () => void;
}

// ─── Tipo de conta legível ───
function tipoLabel(tipo: string, isCredit: boolean): string {
  if (isCredit) return "Fatura do Cartão";
  const labels: Record<string, string> = {
    banco: "Conta bancária",
    digital: "Conta digital",
    carteira: "Carteira",
    cartao: "Cartão de crédito",
    investimento: "Conta investimento",
  };
  return labels[tipo] ?? tipo;
}

export function AccountCard({
  id, nome, tipo, bankId, classificacao = "pessoal",
  isCredit = false,
  saldo = 0, limiteUsado = 0, limiteDisponivel = 0, limiteTotal = 0, faturaAtual = 0,
  onEdit, onDelete, onViewFatura, onClick,
}: AccountCardProps) {
  const theme = useMemo(() => getTheme(bankId, isCredit), [bankId, isCredit]);
  const bank = getBankById(bankId ?? null);
  const usagePercent = limiteTotal > 0 ? (limiteUsado / limiteTotal) * 100 : 0;
  const isDanger = usagePercent >= 85;

  const gradientStyle = {
    background: `linear-gradient(135deg, ${theme.from} 0%, ${theme.to} 100%)`,
    color: theme.text,
  };

  const shine = `radial-gradient(ellipse at 20% 20%, rgba(255,255,255,0.10) 0%, transparent 60%)`;

  return (
    <motion.div
      layout
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
      className="relative rounded-2xl overflow-hidden cursor-pointer select-none group"
      onClick={onClick}
      style={{
        ...gradientStyle,
        boxShadow: `0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.12)`,
        minHeight: isCredit ? "190px" : "160px",
      }}
    >
      {/* Shine overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: shine }} />

      {/* Subtle bottom-right glow */}
      <div
        className="absolute bottom-0 right-0 w-48 h-48 rounded-full pointer-events-none opacity-20 blur-3xl"
        style={{ backgroundColor: theme.accent, transform: "translate(30%,30%)" }}
      />

      {/* ─── TOPO ─── */}
      <div className="relative flex items-start justify-between px-5 pt-5">
        {/* Banco + Tipo */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            {bank ? (
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "rgba(255,255,255,0.18)", color: theme.text }}
              >
                {bank.initials}
              </span>
            ) : (
              <span className="opacity-70">
                {isCredit
                  ? <CreditCard className="h-4 w-4" />
                  : <Wallet className="h-4 w-4" />
                }
              </span>
            )}
            <span className="text-sm font-semibold opacity-90 truncate max-w-[140px]">{nome}</span>
          </div>
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full w-fit"
            style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.75)" }}
          >
            {tipoLabel(tipo, isCredit)}
          </span>
        </div>

        {/* Ações hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
          {isCredit && onViewFatura && (
            <button
              onClick={(e) => { e.stopPropagation(); onViewFatura(); }}
              className="p-1.5 rounded-lg transition-colors"
              style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
              title="Ver fatura completa"
            >
              <ExternalLink className="h-3.5 w-3.5 text-white" />
            </button>
          )}
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-1.5 rounded-lg transition-colors"
              style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
              title="Editar"
            >
              <Pencil className="h-3.5 w-3.5 text-white" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 rounded-lg transition-colors"
              style={{ backgroundColor: "rgba(255,0,0,0.25)" }}
              title="Excluir"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-300" />
            </button>
          )}
        </div>
      </div>

      {/* ─── CENTRO: valor principal ─── */}
      <div className="relative px-5 mt-4">
        {isCredit ? (
          <>
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] opacity-60 mb-0.5">
              Valor atual da fatura
            </p>
            <p className="text-3xl font-black tracking-tight" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
              {formatCurrency(faturaAtual)}
            </p>
          </>
        ) : (
          <>
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] opacity-60 mb-0.5">
              Saldo disponível
            </p>
            <p className={`text-3xl font-black tracking-tight ${saldo < 0 ? "text-red-300" : ""}`} style={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
              {formatCurrency(saldo)}
            </p>
          </>
        )}
      </div>

      {/* ─── CHIP + BANDEIRA (somente cartão) ─── */}
      {isCredit && (
        <div className="relative flex items-center justify-between px-5 mt-3">
          <ChipIcon />
          <MastercardIcon />
        </div>
      )}

      {/* ─── RODAPÉ ─── */}
      <div className="relative px-5 pb-5 mt-auto">
        {isCredit ? (
          <div className="space-y-2 mt-2">
            {/* Barra de uso */}
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(usagePercent, 100)}%`,
                  backgroundColor: isDanger ? "#ff4444" : "rgba(255,255,255,0.75)",
                }}
              />
            </div>
            {/* Limite info */}
            <div className="flex justify-between text-[10px] font-medium opacity-80">
              <span>Disponível: <span className={`font-bold ${isDanger ? "text-red-300" : "text-emerald-300"}`}>{formatCurrency(limiteDisponivel)}</span></span>
              <span>Limite: {formatCurrency(limiteTotal)}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between mt-4">
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }}
            >
              {classificacao === "mei" ? "MEI" : "Pessoal"}
            </span>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
              style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              Ativo
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
