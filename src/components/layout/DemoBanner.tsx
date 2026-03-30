import { useAuth } from "@/contexts/AuthContext";
import { FlaskConical, X, LogIn } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const DEMO_EMAIL = "demo@vektor.app";

export function DemoBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  // Só exibe para a conta demo
  if (user?.email !== DEMO_EMAIL) return null;
  if (dismissed) return null;

  return (
    <div
      className="w-full bg-gradient-to-r from-indigo-950 via-violet-950 to-indigo-950 border-b border-indigo-500/30"
      role="banner"
      aria-label="Modo demonstrativo"
    >
      <div className="max-w-screen-xl mx-auto px-3 sm:px-4 h-10 flex items-center gap-3">
        {/* Ícone + texto */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FlaskConical className="h-3.5 w-3.5 shrink-0 text-violet-400" />
          <p className="text-xs sm:text-sm font-semibold text-white leading-none truncate">
            Conta demonstrativa.
            <span className="hidden sm:inline text-white/50 font-normal ml-1.5">
              Dados são somente leitura.
            </span>
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate("/cadastro")}
          className="shrink-0 flex items-center gap-1.5 px-3 h-6 rounded-md text-xs transition-all duration-150 hover:scale-105 active:scale-95 bg-violet-500 hover:bg-violet-400 text-white font-bold shadow-[0_0_12px_rgba(139,92,246,0.4)]"
          aria-label="Criar minha conta gratuita"
        >
          <LogIn className="h-3 w-3" />
          <span className="hidden xs:inline">Criar conta</span>
          <span className="xs:hidden">Criar</span>
        </button>

        {/* Fechar */}
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 p-1 rounded text-white/40 hover:text-white/80 transition-colors"
          aria-label="Fechar aviso de modo demo"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
