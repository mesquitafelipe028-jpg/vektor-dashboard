import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, LayoutDashboard, TrendingUp, TrendingDown, 
  Settings, Upload, ShieldCheck, Zap, Sparkles, ChevronRight,
  Wallet, CreditCard, Users, Receipt, Calculator, 
  History, FileText, Tags
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

const tutorialSteps = [
  {
    title: "1. Dashboard: Sua Visão 360°",
    description: "O Dashboard é onde tudo começa. Veja seu 'Saldo Total' no topo para saber quanto tem agora. Abaixo, acompanhe suas 'Entradas' e 'Saídas' do mês. Dica: Clique no ícone de olho para ocultar valores sensíveis se estiver em público.",
    image: "/images/tutorial/dashboard_real.png",
    icon: LayoutDashboard,
    color: "text-primary",
    bgColor: "bg-primary/10"
  },
  {
    title: "2. Cadastro de Receita (Passo a Passo)",
    description: "Para registrar um ganho: 1. Clique em 'Receitas' no menu inferior; 2. Toque no botão flutuante Verde (+); 3. Digite a 'Descrição' e o 'Valor'; 4. Escolha a categoria e clique em 'Salvar' no topo direito.",
    image: "/images/tutorial/cadastro_receita.png",
    icon: TrendingUp,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10"
  },
  {
    title: "3. Cadastro de Despesa (Passo a Passo)",
    description: "Para registrar um gasto: 1. Clique em 'Despesas'; 2. Toque no botão flutuante Vermelho (+); 3. Preencha o valor e o que foi comprado; 4. Selecione a 'Conta/Origem' (ex: Carteira ou Banco) e clique em 'Salvar'.",
    image: "/images/tutorial/cadastro_despesa.png",
    icon: TrendingDown,
    color: "text-destructive",
    bgColor: "bg-destructive/10"
  },
  {
    title: "4. Contas Financeiras: Onde está seu dinheiro",
    description: "Gerencie seus bancos: 1. Vá em 'Mais' > 'Contas'; 2. Adicione seus bancos ou carteiras físicas; 3. O Vektor soma tudo para dar o seu saldo real consolidado.",
    image: "/images/tutorial/contas.png",
    icon: Wallet,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10"
  },
  {
    title: "5. Cartões de Crédito: Controle sua Fatura",
    description: "Não tome sustos no fim do mês: 1. Em 'Mais' > 'Cartões', cadastre seus cartões; 2. Defina o limite e o dia de fechamento; 3. Todas as despesas no cartão serão somadas automaticamente aqui.",
    image: "/images/tutorial/cartoes.png",
    icon: CreditCard,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10"
  },
  {
    title: "6. Gestão de Clientes: Quem te paga",
    description: "Organize seus contatos comerciais: 1. Vá em 'Mais' > 'Clientes'; 2. Cadastre quem compra de você; 3. Ao lançar uma receita, você pode vincular a esse cliente para saber quem traz mais lucro.",
    image: "/images/tutorial/clientes.png",
    icon: Users,
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10"
  },
  {
    title: "7. Central de Cobranças: Suas Contas a Receber",
    description: "Acompanhe pagamentos futuros: 1. Em 'Mais' > 'Cobranças', veja tudo o que ainda vai entrar; 2. Filtre por vencimento; 3. Mantenha o fluxo de caixa saudável sabendo o que esperar.",
    image: "/images/tutorial/cobrancas.png",
    icon: Receipt,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10"
  },
  {
    title: "8. Simulador de Investimentos: Projete o futuro",
    description: "Planeje quanto seu dinheiro pode render: 1. Vá em 'Mais' > 'Investimentos'; 2. Simule aportes mensais e taxas; 3. Veja gráficos de evolução patrimonial a longo prazo.",
    image: "/images/tutorial/investimentos.png",
    icon: Calculator,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10"
  },
  {
    title: "9. Radar de Assinaturas: Evite desperdícios",
    description: "Controle seus gastos recorrentes: 1. Vá em 'Mais' > 'Assinaturas'; 2. Veja tudo o que vence todo mês (Netflix, Software, Aluguel); 3. Cancele o que não usa e economize.",
    image: "/images/tutorial/assinaturas.png",
    icon: History,
    color: "text-rose-500",
    bgColor: "bg-rose-500/10"
  },
  {
    title: "10. Área Fiscal MEI: Sua contabilidade simples",
    description: "Prepare-se para o imposto de renda: 1. Em 'Mais' > 'Fiscal', acompanhe seu faturamento anual; 2. Veja quanto falta para o limite do MEI; 3. Gere relatórios prontos para a declaração anual.",
    image: "/images/tutorial/fiscal.png",
    icon: FileText,
    color: "text-slate-500",
    bgColor: "bg-slate-500/10"
  },
  {
    title: "11. Categorias: Organize tudo",
    description: "Agrupe seus lançamentos: 1. Vá em 'Mais' > 'Categorias'; 2. Crie ou edite grupos como 'Lazer', 'Moradia' ou 'Software'; 3. Isso gera gráficos claros de onde seu dinheiro circula.",
    image: "/images/tutorial/categorias.png",
    icon: Tags,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10"
  },
  {
    title: "12. Metas: O Caminho para seus Sonhos",
    description: "Defina objetivos financeiros: 1. Vá em 'Mais' > 'Metas'; 2. Clique em 'Nova Meta'; 3. Defina o valor total, quanto já tem e o prazo; 4. O Vektor mostrará uma barra de progresso para te motivar.",
    image: "/images/tutorial/cadastro_meta.png",
    icon: Sparkles,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10"
  },
  {
    title: "13. Importação: Sem Digitação Manual",
    description: "Poupe tempo: 1. Vá em 'Mais' > 'Importar Extrato'; 2. Arraste seu arquivo CSV ou PDF; 3. O sistema listará tudo; 4. Você só precisa confirmar as categorias e pronto!",
    image: "/images/tutorial/importacao_real.png",
    icon: Upload,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10"
  },
  {
    title: "14. Ajustes e Segurança",
    description: "Personalize tudo em 'Mais' > 'Configurações'. Lá você altera seu perfil, senha e gerencia o que deseja ver no sistema. Lembre-se: seus dados estão sempre seguros conosco.",
    image: "/images/tutorial/configuracoes_real.png",
    icon: Settings,
    color: "text-muted-foreground",
    bgColor: "bg-muted"
  }
];

export default function Tutorial() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center gap-4 px-4 py-4 bg-background/80 backdrop-blur-md border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold font-heading">Guia do Vektor</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-12">
        {/* Intro */}
        <section className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            <Sparkles className="h-3 w-3" /> Bem-vindo à clareza
          </div>
          <h2 className="text-3xl font-bold font-heading">Como aproveitar o Vektor</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Este guia rápido vai te mostrar as principais ferramentas para você dominar suas finanças pessoais e empresariais.
          </p>
        </section>

        {/* Steps */}
        <div className="space-y-24">
          {tutorialSteps.map((step, index) => (
            <motion.section 
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-8 items-center`}
            >
              <div className="flex-1 space-y-4 text-center lg:text-left">
                <div className={`inline-flex items-center justify-center p-3 rounded-2xl ${step.bgColor}`}>
                  <step.icon className={`h-6 w-6 ${step.color}`} />
                </div>
                <h3 className="text-2xl font-bold font-heading flex items-center justify-center lg:justify-start gap-2">
                  <span className="text-primary/40 font-mono text-sm">0{index + 1}.</span> {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed text-lg">
                  {step.description}
                </p>
                <div className="flex items-center justify-center lg:justify-start gap-4 pt-4">
                   <div className="flex items-center gap-2 text-xs font-medium text-primary">
                     <ShieldCheck className="h-4 w-4" /> Seguro e Criptografado
                   </div>
                </div>
              </div>

              <div className="flex-1 w-full max-w-sm lg:max-w-none">
                <Card className="overflow-hidden border-2 border-primary/10 shadow-xl shadow-primary/5 rounded-3xl">
                  <CardContent className="p-0">
                    <div className="relative group">
                      <img 
                        src={step.image} 
                        alt={step.title} 
                        className="w-full h-auto transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent pointer-events-none" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.section>
          ))}
        </div>

        {/* Call to action */}
        <section className="bg-primary/5 rounded-[2rem] p-8 lg:p-12 text-center space-y-6 mt-20 border border-primary/10">
          <h2 className="text-2xl font-bold font-heading">Pronto para começar?</h2>
          <p className="text-muted-foreground">
            Agora que você conhece o básico, explore o sistema e comece a organizar sua vida financeira.
          </p>
          <Button size="lg" onClick={() => navigate("/dashboard")} className="rounded-full px-8 gap-2">
            Ir para o Dashboard <ChevronRight className="h-4 w-4" />
          </Button>
        </section>
      </div>
    </div>
  );
}
