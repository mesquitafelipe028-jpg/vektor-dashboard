import { motion } from "framer-motion";
import { LayoutDashboard, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrandHeader } from "@/components/branding/BrandHeader";
import { useAuth } from "@/contexts/AuthContext";

export default function LandingGate() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden font-geist text-foreground">
      {/* Background Glows - Subtle and controlled */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full dark:bg-primary/10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/[0.02] blur-[120px] rounded-full dark:bg-primary/5" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl space-y-12 relative z-10"
      >
        <div className="text-center space-y-4">
          <BrandHeader className="scale-125 mb-8" />
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Escolha sua <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">porta de entrada</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Acesse o ecossistema Vektor de forma personalizada para sua necessidade atual.
          </p>
        </div>

        <div className="flex justify-center px-4">
          {/* Option 1: System */}
          <motion.div
            whileHover={{ y: -5, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="w-full max-w-md"
          >
            <Card className="bg-card border-border backdrop-blur-xl hover:border-primary/50 transition-all cursor-pointer group h-full shadow-2xl">
              <CardContent className="p-8 flex flex-col h-full">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <LayoutDashboard className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Vektor Gestão</h3>
                <p className="text-muted-foreground mb-8 flex-1">
                  Painel financeiro completo, DRE, fluxo de caixa, clientes e controle de MEI.
                </p>
                <Link to="/dashboard" className="w-full">
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 rounded-xl text-lg font-bold gap-3 group-hover:gap-5 transition-all shadow-lg">
                    Entrar no Sistema <ArrowRight size={20} />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="text-center">
          <p className="text-muted-foreground/60 text-sm">
            Ambos os acessos utilizam a mesma conta securitizada.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
