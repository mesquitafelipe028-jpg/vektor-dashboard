import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, ShieldCheck, Zap, BarChart3, 
  CreditCard, MessageSquare, Check, X, HelpCircle,
  TrendingUp, Wallet, PieChart, Users, Sparkles,
  Lock, ArrowUpRight, PlayCircle, AlertCircle, TrendingDown,
  Bot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LogoVektor } from "@/components/branding/LogoVektor";

import { Link } from "react-router-dom";

export default function LandingPage() {
  const [demoStep, setDemoStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setDemoStep((prev) => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(timer);
  }, []);
  const plans = [
    {
      name: "Free",
      price: "R$ 0",
      description: "Comece a organizar hoje.",
      features: [
        "Visualização de dados",
        "Dashboard completo",
        "Até 10 transações",
        "Relatórios básicos",
      ],
      notIncluded: [
        "Assistente IA e Voz",
        "Transações ilimitadas",
        "Insights automáticos",
      ],
      buttonText: "Começar grátis",
      popular: false,
    },
    {
      name: "Inteligente",
      price: "R$ 23",
      period: "/ mês",
      description: "A IA trabalhando por você.",
      features: [
        "Assistente IA 24/7",
        "Registro por texto ou voz",
        "Insights automáticos",
        "Previsões financeiras",
        "Transações ilimitadas",
        "Clientes e cobranças",
      ],
      buttonText: "Escolher Inteligência",
      popular: true,
      highlight: true,
    },
    {
      name: "Vitalício",
      price: "R$ 67",
      period: "único",
      description: "Gestão completa para sempre.",
      features: [
        "Transações ilimitadas",
        "Cartões ilimitados",
        "Clientes e cobranças",
        "Relatórios avançados",
        "Insights automáticos",
        "Sem mensalidade",
      ],
      notIncluded: [
        "Assistente IA e Voz",
      ],
      buttonText: "Comprar agora",
      popular: false,
    },
  ];

  const features = [
    { title: "Dashboard Inteligente", desc: "Visualize seu dinheiro de forma clara e objetiva.", image: "/images/tutorial/dashboard_real.png", icon: BarChart3 },
    { title: "Gestão de Cobranças", desc: "Gerencie clientes e receba em dia com profissionalismo.", image: "/images/tutorial/cobrancas.png", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-[#030605] text-zinc-100 selection:bg-emerald-500/30 selection:text-emerald-400 font-sans">
      {/* Decorative Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full opacity-50" />
        <div className="absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] bg-emerald-600/5 blur-[120px] rounded-full opacity-30" />
      </div>

      {/* Navigation */}
      <header className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#030605]/60 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <LogoVektor size="sm" />
          <nav className="hidden md:flex items-center gap-8">
            <a href="#recursos" className="text-sm font-medium text-zinc-400 hover:text-emerald-400 transition-colors">Recursos</a>
            <a href="#planos" className="text-sm font-medium text-zinc-400 hover:text-emerald-400 transition-colors">Planos</a>
            <a href="#faq" className="text-sm font-medium text-zinc-400 hover:text-emerald-400 transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-semibold hover:text-emerald-400 transition-colors">Entrar</Link>
            <Link to="/cadastro">
              <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold px-6 border-none">
                TESTAR GRÁTIS
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-40 pb-20 relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-bold mb-8">
                <Sparkles className="h-3.5 w-3.5" />
                CONTROLE FINANCEIRO COM IA
              </div>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[1] mb-8">
                Pare de perder dinheiro <br className="hidden md:block"/>
                <span className="text-emerald-500 italic drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">sem perceber.</span> <br className="hidden md:block"/>
                Controle tudo com uma mensagem.
              </h1>
              <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
                Registre gastos, entenda seus números e tome decisões em segundos com a ajuda de Inteligência Artificial.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col items-center justify-center gap-4 mb-20"
            >
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
                <Link to="/cadastro" className="w-full sm:w-auto">
                  <Button size="lg" className="h-16 w-full px-10 text-lg font-black bg-emerald-500 hover:bg-emerald-600 text-black gap-2 shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:scale-105 transition-transform">
                    Começar grátis agora <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/cadastro" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="h-16 w-full px-10 text-lg font-bold border-zinc-700 text-white hover:bg-zinc-800 gap-2 hover:scale-105 transition-transform">
                    Quero controlar meu dinheiro
                  </Button>
                </Link>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-zinc-400 font-bold mt-4">
                <span className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> Sem cartão de crédito</span>
                <span className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> Acesso imediato</span>
                <span className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> Cancelamento fácil</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Bloco de Dor & Demonstração de IA */}
      <section className="py-24 bg-zinc-950 border-y border-white/5 relative">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
            
            {/* Problemas */}
            <div className="space-y-12">
              <div className="space-y-4">
                <h2 className="text-3xl md:text-5xl font-black tracking-tight">O caos financeiro tem um custo alto.</h2>
                <p className="text-zinc-400 text-lg">Se você vive alguma dessas realidades, o Vektor foi feito para você:</p>
              </div>
              
              <div className="space-y-6">
                <div className="flex gap-5 items-start bg-zinc-900/50 p-6 rounded-2xl border border-white/5">
                  <div className="h-12 w-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                    <TrendingDown className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-white">Não sabe para onde o dinheiro vai?</h3>
                    <p className="text-zinc-400">Chega no fim do mês e a conta não bate. Os pequenos gastos somem com seu lucro sem você perceber.</p>
                  </div>
                </div>
                
                <div className="flex gap-5 items-start bg-zinc-900/50 p-6 rounded-2xl border border-white/5">
                  <div className="h-12 w-12 rounded-full bg-orange-500/10 text-orange-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                    <Wallet className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-white">Gasta mais do que ganha?</h3>
                    <p className="text-zinc-400">A falta de clareza em tempo real gera decisões erradas e endividamento silencioso.</p>
                  </div>
                </div>

                <div className="flex gap-5 items-start bg-zinc-900/50 p-6 rounded-2xl border border-white/5">
                  <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-white">Falta de controle e tempo?</h3>
                    <p className="text-zinc-400">Planilhas são complexas, chatas e exigem horas que você não tem para preencher.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Demonstração Interativa IA */}
            <div className="relative h-[600px] rounded-3xl border border-white/10 bg-zinc-950 overflow-hidden shadow-2xl">
              <div className="absolute top-0 inset-x-0 h-16 bg-zinc-900/80 backdrop-blur-md border-b border-white/5 flex items-center px-6 gap-4 z-20">
                <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                  <Bot className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <div className="font-bold text-sm text-white">Assistente Vektor IA</div>
                  <div className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span> Online agora
                  </div>
                </div>
              </div>

              <div className="absolute inset-0 pt-20 pb-24 px-6 overflow-hidden flex flex-col justify-end gap-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-5">
                <AnimatePresence mode="popLayout">
                  {demoStep >= 1 && (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 20, scale: 0.9, x: 20 }}
                      animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
                      className="self-end bg-emerald-600 text-white p-4 rounded-3xl rounded-tr-sm max-w-[80%] shadow-lg"
                    >
                      <p className="text-[15px]">Uber 23</p>
                    </motion.div>
                  )}
                  {demoStep >= 2 && (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 20, scale: 0.9, x: -20 }}
                      animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
                      className="self-start bg-zinc-800/90 backdrop-blur-sm text-zinc-200 p-5 rounded-3xl rounded-tl-sm max-w-[85%] border border-white/10 shadow-xl"
                    >
                      <div className="flex items-start gap-4">
                        <div className="mt-1 shrink-0"><Bot className="h-6 w-6 text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" /></div>
                        <div className="w-full">
                          <p className="font-bold flex items-center gap-2 text-white text-[15px]">
                            Despesa registrada! <Check className="h-4 w-4 text-emerald-500"/>
                          </p>
                          <div className="mt-4 bg-black/50 rounded-xl p-4 text-sm space-y-3 font-mono border border-white/5">
                            <div className="flex justify-between border-b border-white/5 pb-2">
                              <span className="text-zinc-500">Valor:</span>
                              <span className="text-white font-bold">R$ 23,00</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-2">
                              <span className="text-zinc-500">Categoria:</span>
                              <span className="text-amber-400 font-bold bg-amber-400/10 px-2 rounded">Transporte</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Cartão:</span>
                              <span className="text-white">Conta Principal</span>
                            </div>
                          </div>
                          <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="text-xs text-zinc-400 mt-4 leading-relaxed"
                          >
                            💡 Seu saldo final projetado deste mês caiu para <strong className="text-white">R$ 2.450,00</strong>.
                          </motion.p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  {demoStep >= 3 && (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="self-start text-xs font-medium text-zinc-500 flex gap-2 items-center bg-zinc-900/50 px-3 py-1.5 rounded-full border border-white/5"
                    >
                      <Zap className="h-3.5 w-3.5 text-emerald-500" /> Insights automáticos em tempo real.
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="absolute bottom-0 inset-x-0 h-24 bg-zinc-900/90 backdrop-blur-md border-t border-white/5 flex items-center px-6 z-20">
                <div className="w-full bg-zinc-950 border border-white/10 rounded-full h-14 px-6 flex items-center gap-3 text-zinc-500 shadow-inner">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[15px]">Envie uma mensagem (ex: almoço 35)...</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Prova Social */}
      <section className="py-12 border-b border-white/5 bg-[#030605]">
        <div className="container mx-auto px-4 text-center">
          <p className="text-zinc-500 font-bold text-sm tracking-widest uppercase mb-8">
            <span className="text-emerald-500 font-black">+15.000 EMPREENDEDORES</span> JÁ ASSUMIRAM O CONTROLE
          </p>
          <div className="flex flex-wrap justify-center gap-12 md:gap-20 opacity-60">
            <div className="flex items-center gap-2 font-black text-2xl text-zinc-300"><Users className="h-6 w-6"/> VAREJO+</div>
            <div className="flex items-center gap-2 font-black text-2xl text-zinc-300"><MessageSquare className="h-6 w-6"/> MENTOR_PRO</div>
            <div className="flex items-center gap-2 font-black text-2xl text-zinc-300"><PieChart className="h-6 w-6"/> STUDIO.ART</div>
            <div className="flex items-center gap-2 font-black text-2xl text-zinc-300"><ShieldCheck className="h-6 w-6"/> SEGURA_MEI</div>
          </div>
        </div>
      </section>

      {/* Main Features */}
      <section id="recursos" className="py-32 bg-[#030605]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-black mb-6">Tudo o que você precisa.</h2>
            <p className="text-zinc-400 text-lg max-w-xl mx-auto">Elimine as planilhas confusas e controle o seu fluxo de caixa conversando com a nossa Inteligência Artificial.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-12">
              <div className="group cursor-default">
                <div className="flex gap-6 items-start">
                  <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                    <Bot className="h-7 w-7 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-3 text-emerald-400">Assistente IA 24/7</h3>
                    <p className="text-zinc-400 leading-relaxed text-lg">Mande um áudio ou texto pelo WhatsApp ou no App. A IA entende, categoriza e registra tudo na hora, sem você abrir menus difíceis.</p>
                  </div>
                </div>
              </div>

              <div className="group cursor-default">
                <div className="flex gap-6 items-start">
                  <div className="h-14 w-14 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-emerald-500/50 transition-colors">
                    <BarChart3 className="h-7 w-7 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-3 group-hover:text-emerald-400 transition-colors">Dashboard Inteligente</h3>
                    <p className="text-zinc-400 leading-relaxed text-lg">Visualize seu dinheiro de forma clara. Saiba exatamente quanto você tem hoje e a previsão real para o fim do mês.</p>
                  </div>
                </div>
              </div>

              <div className="group cursor-default">
                <div className="flex gap-6 items-start">
                  <div className="h-14 w-14 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-emerald-500/50 transition-colors">
                    <Users className="h-7 w-7 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-3 group-hover:text-emerald-400 transition-colors">Gestão de Cobranças</h3>
                    <p className="text-zinc-400 leading-relaxed text-lg">Gerencie seus clientes, emita cobranças profissionais e saiba quem está devendo de forma rápida.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute -inset-4 bg-emerald-500/20 blur-[100px] rounded-full opacity-20" />
              <div className="relative rounded-2xl border border-white/10 bg-zinc-900/50 p-2 overflow-hidden shadow-2xl">
                <img 
                  src="/images/tutorial/dashboard_real.png" 
                  alt="Recursos Vektor" 
                  className="rounded-xl w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats / Proof Section */}
      <section className="py-24 bg-emerald-500/5 relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: "Usuários Ativos", val: "+15k" },
              { label: "Transações/mês", val: "200k+" },
              { label: "Avaliação", val: "4.9/5" },
              { label: "Suporte", val: "24/7" },
            ].map((s, i) => (
              <div key={i}>
                <div className="text-4xl md:text-5xl font-black text-emerald-500 mb-2">{s.val}</div>
                <div className="text-zinc-500 font-bold text-sm uppercase tracking-tighter">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="planos" className="py-32">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="outline" className="mb-6 border-amber-400/30 bg-amber-400/5 text-amber-400 font-bold px-6 py-2">
            PLANOS E PREÇOS
          </Badge>
          <h2 className="text-4xl md:text-7xl font-black mb-20 tracking-tighter">Escolha como quer <br /> <span className="text-emerald-500 underline decoration-emerald-500/30 decoration-8 underline-offset-8">evoluir seu negócio.</span></h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            {plans.map((plan, i) => (
              <Card 
                key={i} 
                className={`flex flex-col border-white/10 bg-zinc-900/40 backdrop-blur-sm transition-all duration-500 hover:translate-y-[-10px] ${plan.highlight ? 'border-amber-400/50 ring-1 ring-amber-400/20 shadow-[0_0_50px_rgba(251,191,36,0.1)] scale-105 z-10' : 'hover:border-emerald-500/30'}`}
              >
                <CardHeader className="text-left pt-10">
                  {plan.highlight && <div className="text-amber-400 text-xs font-black uppercase tracking-widest mb-4">Recomendado</div>}
                  <CardTitle className="text-2xl font-black text-white">{plan.name}</CardTitle>
                  <CardDescription className="text-zinc-500 text-lg">{plan.description}</CardDescription>
                  <div className="mt-8 flex items-baseline gap-2">
                    <span className="text-5xl font-black text-white">{plan.price}</span>
                    {plan.period && <span className="text-zinc-500 font-bold">{plan.period}</span>}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 text-left space-y-6 py-10">
                  <div className="h-px bg-white/5 w-full" />
                  <div className="space-y-4">
                    {plan.features.map((feature, j) => (
                      <div key={j} className="flex gap-4 items-center text-sm font-medium text-zinc-300">
                        <Check className="h-5 w-5 text-emerald-500 shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                    {plan.notIncluded && plan.notIncluded.map((feature, j) => (
                      <div key={j} className="flex gap-4 items-center text-sm font-medium text-zinc-600">
                        <X className="h-5 w-5 text-zinc-800 shrink-0" />
                        <span className="line-through">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="pb-10 pt-4">
                  <Link to="/cadastro" className="w-full">
                    <Button 
                      className={`w-full h-14 font-black text-lg transition-transform hover:scale-105 active:scale-95 ${plan.highlight ? 'bg-amber-400 hover:bg-amber-500 text-black shadow-[0_0_20px_rgba(251,191,36,0.3)]' : 'bg-emerald-500 hover:bg-emerald-600 text-black shadow-[0_0_20px_rgba(16,185,129,0.2)]'}`}
                    >
                      {plan.buttonText}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>

          <p className="mt-12 text-zinc-500 text-sm font-medium">Sem fidelidade. Cancele quando quiser. Pagamento seguro.</p>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-32 bg-zinc-900/20 border-t border-white/5">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex flex-col md:flex-row gap-20">
            <div className="w-full md:w-1/3">
              <h2 className="text-4xl font-black mb-6 leading-none">Dúvidas Frequentes</h2>
              <p className="text-zinc-500 font-medium">Tudo o que você precisa saber para começar agora mesmo.</p>
              <Button variant="link" className="text-emerald-500 font-bold p-0 mt-6 h-auto text-lg gap-2">
                Falar com consultor <ArrowUpRight className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="flex-1">
              <Accordion type="single" collapsible className="w-full space-y-4">
                {[
                  { q: "O Vektor é seguro para meus dados?", a: "Absolutamente. Utilizamos criptografia de nível bancário e armazenamento seguro no Supabase. Seus dados são privados e nunca compartilhados." },
                  { q: "Como funciona o período de teste?", a: "Você pode começar no plano Free sem cadastrar cartão de crédito. Use todas as funções básicas e decida se quer evoluir para os planos pagos quando sentir necessidade." },
                  { q: "IA realmente ajuda nas finanças?", a: "Sim, nossa IA categoriza gastos automaticamente, identifica padrões de desperdício e sugere economias personalizadas baseadas no seu fluxo real." },
                  { q: "Trabalho como MEI, serve para mim?", a: "O Vektor foi construído com o MEI em mente. Temos ferramentas de faturamento, controle de clientes e relatórios simplificados para quem empreende sozinho." },
                ].map((faq, i) => (
                  <AccordionItem key={i} value={`item-${i}`} className="border border-white/5 bg-zinc-900/40 rounded-2xl px-6 data-[state=open]:border-emerald-500/30 transition-all">
                    <AccordionTrigger className="text-left font-bold text-lg hover:no-underline py-6">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-zinc-400 text-lg leading-relaxed pb-6">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-40 relative overflow-hidden">
        <div className="absolute inset-0 bg-emerald-500/10 blur-[150px] rounded-full scale-150" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-5xl mx-auto rounded-[3rem] bg-gradient-to-br from-emerald-500 to-emerald-700 p-12 md:p-24 text-center text-black shadow-2xl relative">
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="space-y-10 relative z-10">
              <h2 className="text-4xl md:text-7xl font-black tracking-tighter leading-[1.1]">
                Pronto para sair do <br className="hidden md:block" /> escuro financeiro?
              </h2>
              <p className="text-xl md:text-2xl font-bold text-black/80 max-w-2xl mx-auto leading-relaxed">
                Comece agora e tenha o controle total da sua empresa em menos de 5 minutos, direto do seu celular.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Link to="/cadastro">
                  <Button size="lg" className="h-20 px-16 text-xl font-black bg-zinc-950 text-emerald-500 hover:bg-zinc-900 hover:text-emerald-400 rounded-full hover:scale-105 transition-transform shadow-2xl">
                    COMEÇAR GRATUITAMENTE
                  </Button>
                </Link>
                <div className="flex flex-col items-start gap-1 text-black/80 font-bold text-sm">
                  <span className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Sem cartão necessário</span>
                  <span className="flex items-center gap-2"><Zap className="h-5 w-5" /> Acesso liberado no ato</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="flex flex-col items-center md:items-start gap-4">
              <LogoVektor size="sm" />
              <p className="text-zinc-500 font-medium text-center md:text-left">Inteligência financeira para o pequeno empreendedor.</p>
            </div>
            <div className="flex gap-10 text-zinc-400 font-bold text-sm">
              <a href="#" className="hover:text-emerald-500 transition-colors">Instagram</a>
              <a href="#" className="hover:text-emerald-500 transition-colors">LinkedIn</a>
              <a href="#" className="hover:text-emerald-500 transition-colors">Youtube</a>
            </div>
          </div>
          <div className="mt-20 pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 text-zinc-600 text-xs font-bold uppercase tracking-widest">
            <p>© 2026 VEKTOR TECNOLOGIA LTDA.</p>
            <div className="flex gap-10">
              <a href="#" className="hover:text-white transition-colors">Privacidade</a>
              <a href="#" className="hover:text-white transition-colors">Termos de uso</a>
              <a href="#" className="hover:text-white transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
