import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap, BarChart3, Shield, TrendingUp, ArrowRight, Check } from "lucide-react";

const features = [
  { icon: BarChart3, title: "Dashboard Intuitivo", desc: "Visualize receitas, despesas e saldo em tempo real com gráficos claros." },
  { icon: Shield, title: "Controle de Impostos", desc: "Acompanhe o DAS MEI e o limite de faturamento anual automaticamente." },
  { icon: TrendingUp, title: "Fluxo de Caixa", desc: "Entenda para onde vai seu dinheiro mês a mês com relatórios visuais." },
];

const plans = [
  { name: "Gratuito", price: "R$ 0", features: ["Dashboard básico", "Até 30 transações/mês", "1 relatório"] },
  { name: "Pro", price: "R$ 29/mês", features: ["Tudo do Gratuito", "Transações ilimitadas", "Relatórios avançados", "Controle de impostos", "Exportar PDF"], highlight: true },
  { name: "Empresa", price: "R$ 79/mês", features: ["Tudo do Pro", "Multi-usuários", "API de integração", "Suporte prioritário"] },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <span className="font-heading text-xl font-bold">FluxoPro</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild><Link to="/login">Entrar</Link></Button>
            <Button asChild><Link to="/cadastro">Criar conta</Link></Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="container mx-auto px-4 py-24 text-center">
        <div className="animate-fade-in">
          <span className="inline-block mb-4 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
            Simples. Rápido. Para você.
          </span>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-6xl font-bold leading-tight mb-6 max-w-3xl mx-auto">
            Controle financeiro feito para{" "}
            <span className="text-primary">quem trabalha por conta própria</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Receitas, despesas, impostos e fluxo de caixa em um só lugar. Sem complicação.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4">
            <Button size="lg" asChild>
              <Link to="/cadastro">Começar grátis <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">Já tenho conta</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="font-heading text-3xl font-bold text-center mb-12">Tudo que você precisa</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-card p-8 hover:shadow-lg transition-shadow animate-fade-in"
              style={{ animationDelay: `${i * 150}ms`, animationFillMode: "both" }}
            >
              <f.icon className="h-10 w-10 text-primary mb-4" />
              <h3 className="font-heading text-xl font-semibold mb-2">{f.title}</h3>
              <p className="text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="font-heading text-3xl font-bold text-center mb-12">Planos</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div key={plan.name} className={`rounded-xl border p-6 sm:p-8 ${plan.highlight ? "border-primary bg-primary/5 shadow-lg sm:scale-105" : "border-border bg-card"}`}>
              <h3 className="font-heading text-xl font-semibold mb-1">{plan.name}</h3>
              <p className="text-3xl font-bold font-heading mb-6">{plan.price}</p>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" /> {f}
                  </li>
                ))}
              </ul>
              <Button className="w-full" variant={plan.highlight ? "default" : "outline"} asChild>
                <Link to="/cadastro">Escolher</Link>
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>© 2026 FluxoPro. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
