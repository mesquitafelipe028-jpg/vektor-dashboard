import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";

// Lazy-loaded pages
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Revenues = lazy(() => import("./pages/Revenues"));
const Expenses = lazy(() => import("./pages/Expenses"));
const CashFlow = lazy(() => import("./pages/CashFlow"));
const Taxes = lazy(() => import("./pages/Taxes"));
const Reports = lazy(() => import("./pages/Reports"));
const MonthlyReport = lazy(() => import("./pages/MonthlyReport"));
const Settings = lazy(() => import("./pages/Settings"));
const Clients = lazy(() => import("./pages/Clients"));
const Goals = lazy(() => import("./pages/Goals"));
const FinancialAnalysis = lazy(() => import("./pages/FinancialAnalysis"));
const ClientDetails = lazy(() => import("./pages/ClientDetails"));

const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min — avoid unnecessary refetches
      gcTime: 10 * 60 * 1000,   // 10 min cache
      refetchOnWindowFocus: false,
    },
  },
});

const PageFallback = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/login" element={<Login />} />
              <Route path="/cadastro" element={<Signup />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/receitas" element={<Revenues />} />
                  <Route path="/despesas" element={<Expenses />} />
                  <Route path="/fluxo-de-caixa" element={<CashFlow />} />
                  <Route path="/impostos" element={<Taxes />} />
                  <Route path="/relatorios" element={<Reports />} />
                  <Route path="/relatorio-mensal" element={<MonthlyReport />} />
                  <Route path="/configuracoes" element={<Settings />} />
                  <Route path="/clientes" element={<Clients />} />
                  <Route path="/clientes/:id" element={<ClientDetails />} />
                  <Route path="/metas" element={<Goals />} />
                  <Route path="/analise-financeira" element={<FinancialAnalysis />} />
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

export default App;
