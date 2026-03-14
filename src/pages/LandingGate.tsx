import { motion } from "framer-motion";
import { LayoutDashboard, MessageSquare, ArrowRight, Sparkles, Building2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrandHeader } from "@/components/branding/BrandHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export default function LandingGate() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4 relative overflow-hidden font-geist">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl space-y-12 relative z-10"
      >
        <div className="text-center space-y-4">
          <BrandHeader className="scale-125 mb-8" />
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Escolha sua <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">porta de entrada</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Acesse o ecossistema Vektor de forma personalizada para sua necessidade atual.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4">
          {/* Option 1: System */}
          <motion.div
            whileHover={{ y: -5, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-xl hover:border-blue-500/50 transition-all cursor-pointer group h-full">
              <CardContent className="p-8 flex flex-col h-full">
                <div className="h-16 w-16 rounded-2xl bg-blue-600/10 flex items-center justify-center mb-6 group-hover:bg-blue-600/20 transition-colors">
                  <LayoutDashboard className="h-8 w-8 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Vektor Gestão</h3>
                <p className="text-slate-400 mb-8 flex-1">
                  Painel financeiro completo, DRE, fluxo de caixa, clientes e controle de MEI.
                </p>
                <Link to="/dashboard" className="w-full">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-xl text-lg font-bold gap-3 group-hover:gap-5 transition-all">
                    Entrar no Sistema <ArrowRight size={20} />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          {/* Option 2: Agent */}
          <motion.div
            whileHover={{ y: -5, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-xl hover:border-purple-500/50 transition-all cursor-pointer group h-full border-dashed">
              <CardContent className="p-8 flex flex-col h-full relative overflow-hidden">
                <div className="absolute top-2 right-4 bg-emerald-500/10 text-emerald-400 text-[10px] uppercase font-black px-2 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1">
                  <Sparkles size={10} /> Online
                </div>
                <div className="h-16 w-16 rounded-2xl bg-purple-600/10 flex items-center justify-center mb-6 group-hover:bg-purple-600/20 transition-colors">
                  <MessageSquare className="h-8 w-8 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Vektor Agente</h3>
                <p className="text-slate-400 mb-8 flex-1">
                  Assistente de IA independente para registro rápido por voz e imagem.
                </p>
                <a href={window.location.hostname === 'localhost' ? 'http://localhost:5174' : 'https://chat.vektor.app'} className="w-full">
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white py-6 rounded-xl text-lg font-bold gap-3 group-hover:gap-5 transition-all shadow-lg shadow-purple-600/20">
                    Acessar Agente <Sparkles size={18} />
                  </Button>
                </a>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="text-center">
          <p className="text-slate-500 text-sm">
            Ambos os acessos utilizam a mesma conta securitizada.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
