import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { BrandHeader } from "@/components/branding/BrandHeader";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, user } = useAuth();

  const from = location.state?.from?.pathname || "/dashboard";

  // Redirect already-logged-in users via effect
  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, navigate, from]);

  if (user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error("E-mail ou senha inválidos.");
    } else {
      navigate(from);
    }
  };

  return (
    <div className="min-h-[100dvh] grid grid-cols-1 md:grid-cols-2 bg-[#0B0F0D] text-foreground font-geist">
      {/* Coluna Esquerda: Formulário */}
      <div
        className="flex flex-col items-center justify-center p-8 md:p-12 lg:p-16 relative"
        style={{ paddingTop: "max(2rem, calc(env(safe-area-inset-top) + 2rem))" }}
      >
        <div className="w-full max-w-sm space-y-8 relative z-10">
          <div className="md:hidden flex justify-center mb-8">
            <BrandHeader className="scale-110" />
          </div>

          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white">Bem-vindo de volta</h2>
            <p className="text-muted-foreground">Entre com suas credenciais para continuar</p>
          </div>

          <div className="bg-[#111715] p-1 rounded-xl flex gap-1 border border-white/5 mb-8">
            <Button 
                variant="ghost" 
                className="flex-1 bg-[#1A1F1D] text-white hover:bg-[#1A1F1D] rounded-lg transition-all"
            >
                Iniciar Sessão
            </Button>
            <Link to="/cadastro" className="flex-1">
                <Button 
                    variant="ghost" 
                    className="w-full text-muted-foreground hover:text-white hover:bg-white/5 rounded-lg transition-all"
                >
                    Criar Conta
                </Button>
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-muted-foreground ml-1">Email</Label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    </div>
                    <Input 
                        id="email" 
                        type="email" 
                        placeholder="seu@email.com" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required 
                        className="bg-[#151C19] border-white/5 pl-10 h-12 rounded-xl focus-visible:ring-primary/20 focus-visible:border-primary/50 transition-all text-white"
                    />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                    <Label htmlFor="password" university-email-field-label="true" className="text-sm font-medium text-muted-foreground">Senha</Label>
                    <Link to="#" className="text-xs text-primary/80 hover:text-primary transition-colors">Esqueceu a senha?</Link>
                </div>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </div>
                    <Input 
                        id="password" 
                        type="password" 
                        placeholder="••••••••" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required 
                        className="bg-[#151C19] border-white/5 pl-10 h-12 rounded-xl focus-visible:ring-primary/20 focus-visible:border-primary/50 transition-all text-white"
                    />
                    <button type="button" className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 rounded-xl text-lg font-bold shadow-lg shadow-primary/10 group overflow-hidden" disabled={loading}>
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? "Entrando..." : "Entrar"} 
                {!loading && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>}
              </span>
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            <Link to="/" className="hover:text-white transition-colors">← Voltar para o início</Link>
          </p>
        </div>
      </div>

      {/* Coluna Direita: Posicionamento e Funcionalidades (Visível apenas em Desktop) */}
      <div className="hidden md:flex flex-col justify-center p-12 lg:p-24 bg-[#0F1412] border-l border-white/5 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full" />

        <div className="relative z-10 space-y-12">
          <div className="space-y-4">
            <BrandHeader className="scale-110 mb-6 origin-left" />
            <h1 className="text-4xl lg:text-5xl font-black text-white leading-[1.1] tracking-tight">
                Controle financeiro <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">inteligente</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
              Organize suas finanças pessoais e empresariais com inteligência artificial e tenha o controle total.
            </p>
          </div>

          <div className="space-y-5">
            {[
              { title: "Controle Total", desc: "Gestão de receitas e despesas simplificada" },
              { title: "Assistente Vektor IA", desc: "Mentor para decisões financeiras inteligentes" },
              { title: "Ecossistema Completo", desc: "Gestão multi-conta com isolamento total" },
              { title: "Inteligência Artificial", desc: "Categorização automática com IA" },
              { title: "Dashboards", desc: "Relatórios dinâmicos em tempo real" }
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="h-6 w-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M20 6 9 17l-5-5"/></svg>
                </div>
                <p className="text-white font-medium">
                    {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
