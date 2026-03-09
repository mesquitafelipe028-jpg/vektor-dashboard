import { lazy, Suspense, useState, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import { SplashScreen } from "./components/branding/SplashScreen";

// Lazy-loaded pages
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Revenues = lazy(() => import("./pages/Revenues"));
const Expenses = lazy(() => import("./pages/Expenses"));
const CashFlow = lazy(() => import("./pages/CashFlow"));
const Taxes = lazy(() => import("./pages/Taxes"));
const Reports = lazy(() => import("./pages/Reports"));

const Settings = lazy(() => import("./pages/Settings"));
const Clients = lazy(() => import("./pages/Clients"));
const Goals = lazy(() => import("./pages/Goals"));
const FinancialAnalysis = lazy(() => import("./pages/FinancialAnalysis"));
const ClientDetails = lazy(() => import("./pages/ClientDetails"));
const More = lazy(() => import("./pages/More"));
const InvestmentCalculator = lazy(() => import("./pages/InvestmentCalculator"));

const CreditCards = lazy(() => import("./pages/CreditCards"));
const Categories = lazy(() => import("./pages/Categories"));
const Accounts = lazy(() => import("./pages/Accounts"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const TransactionForm = lazy(() => import("./pages/TransactionForm"));
const ClientForm = lazy(() => import("./pages/ClientForm"));

const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

const PageFallback = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const App = () => {
  const [splashDone, setSplashDone] = useState(false);
  const handleSplashFinish = useCallback(() => setSplashDone(true), []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {!splashDone && <SplashScreen onFinish={handleSplashFinish} />}
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/login" element={<Login />} />
                <Route path="/cadastro" element={<Signup />} />
                <Route element={<ProtectedRoute />}>
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/receitas" element={<Revenues />} />
                    <Route path="/despesas" element={<Expenses />} />
                    <Route path="/fluxo-de-caixa" element={<CashFlow />} />
                    <Route path="/impostos" element={<Taxes />} />
                    <Route path="/relatorios" element={<Reports />} />
                    
                    <Route path="/configuracoes" element={<Settings />} />
                    <Route path="/clientes" element={<Clients />} />
                    <Route path="/clientes/:id" element={<ClientDetails />} />
                    <Route path="/metas" element={<Goals />} />
                    <Route path="/analise-financeira" element={<FinancialAnalysis />} />
                    <Route path="/calculadora-investimentos" element={<InvestmentCalculator />} />
                    
                    <Route path="/receitas/nova" element={<TransactionForm />} />
                    <Route path="/receitas/editar/:id" element={<TransactionForm />} />
                    <Route path="/despesas/nova" element={<TransactionForm />} />
                    <Route path="/despesas/editar/:id" element={<TransactionForm />} />
                    <Route path="/clientes/novo" element={<ClientForm />} />
                    <Route path="/clientes/editar/:id" element={<ClientForm />} />
                    <Route path="/cartoes" element={<CreditCards />} />
                    <Route path="/categorias" element={<Categories />} />
                    <Route path="/contas" element={<Accounts />} />
                    <Route path="/mais" element={<More />} />
                  </Route>
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
