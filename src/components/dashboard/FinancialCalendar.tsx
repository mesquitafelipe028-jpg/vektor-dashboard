import { useState, useMemo } from "react";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, getLocalDateString } from "@/lib/utils";
import { DayTransactionsDrawer } from "./DayTransactionsDrawer";
import { QuickAddModal } from "@/components/mobile/QuickAddModal";
import { ReceitaExtended, DespesaExtended } from "@/types/transactions";

interface FinancialCalendarProps {
  receitas: ReceitaExtended[];
  despesas: DespesaExtended[];
  saldoTotal: number;
  assinaturas?: any[];
}

export function FinancialCalendar({ receitas, despesas, saldoTotal, assinaturas = [] }: FinancialCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState<string>("");

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  // Calendar Grid Dates
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 }); // Sunday
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // Daily map of transactions
  const dataMap = useMemo(() => {
    const map = new Map<string, { in: number; out: number; pendingIn: number; pendingOut: number; pendingSub: boolean; settledSub: boolean }>();
    
    // Process Receitas
    receitas.forEach(r => {
      const date = r.date || r.data;
      if (!map.has(date)) map.set(date, { in: 0, out: 0, pendingIn: 0, pendingOut: 0, pendingSub: false, settledSub: false });
      const current = map.get(date)!;
      if (r.status === 'confirmed') current.in += (r.amount || r.valor || 0);
      else current.pendingIn += (r.amount || r.valor || 0);
    });

    // Process Despesas
    despesas.forEach(d => {
      const date = d.date || d.data;
      if (!map.has(date)) map.set(date, { in: 0, out: 0, pendingIn: 0, pendingOut: 0, pendingSub: false, settledSub: false });
      const current = map.get(date)!;
      if (d.status === 'confirmed') current.out += (d.amount || d.valor || 0);
      else current.pendingOut += (d.amount || d.valor || 0);
    });

    // Process Assinaturas
    const currentMonthPrefix = format(currentDate, "yyyy-MM");
    assinaturas.forEach(a => {
       const dStr = `${currentMonthPrefix}-${String(a.dia_cobranca).padStart(2, '0')}`;
       if (!map.has(dStr)) map.set(dStr, { in: 0, out: 0, pendingIn: 0, pendingOut: 0, pendingSub: false, settledSub: false });
       const current = map.get(dStr)!;
       if (a.status === 'paid') {
          // If paid, it's ALREADY duplicated via DoubleWrite in standard despesas, so we just set a visual flag but DO NOT add to Out again!
          current.settledSub = true;
       } else {
          current.pendingSub = true;
       }
    });

    return map;
  }, [receitas, despesas, assinaturas, currentDate]);

  // Projected Balance Map
  // Calculates an initial balance to roll forward
  // We approximate the start of the current viewing month by working backwards from today.
  const dailyBalances = useMemo(() => {
    const balances = new Map<string, number>();
    
    const todayStr = getLocalDateString();
    let flowSinceGridStartToToday = 0;
    
    calendarDays.forEach(day => {
      const dStr = format(day, "yyyy-MM-dd");
      if (dStr <= todayStr) {
        const dayData = dataMap.get(dStr);
        if (dayData) {
           flowSinceGridStartToToday += (dayData.in - dayData.out);
        }
      }
    });

    let currentBalance = saldoTotal - flowSinceGridStartToToday;

    calendarDays.forEach(day => {
      const dStr = format(day, "yyyy-MM-dd");
      if (dStr <= todayStr) {
        const dayData = dataMap.get(dStr);
        if (dayData) {
          currentBalance += (dayData.in - dayData.out);
        }
        balances.set(dStr, currentBalance);
      }
    });

    return balances;
  }, [calendarDays, dataMap, saldoTotal]);

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setDrawerOpen(true);
  };

  const handleAddTransaction = (dateStr: string) => {
    setDrawerOpen(false);
    setQuickAddDate(dateStr);
    setQuickAddOpen(true);
  };

  const todayStr = getLocalDateString();

  return (
    <Card className="w-full shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row items-center justify-between pb-4 gap-4">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg font-bold font-heading">Calendário Financeiro</CardTitle>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="w-32 text-center font-semibold capitalize font-heading text-lg">
            {format(currentDate, "MMMM yyyy", { locale: ptBR })}
          </div>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-2 sm:p-6 sm:pt-0">
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="text-center text-xs font-semibold text-muted-foreground uppercase py-1">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarDays.map((day, idx) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const isFuture = dateStr > todayStr;
            const data = dataMap.get(dateStr) || { in: 0, out: 0, pendingIn: 0, pendingOut: 0, pendingSub: false, settledSub: false };
            
            const confirmedIn = data.in;
            const confirmedOut = data.out;
            const hasConfirmedActivity = confirmedIn > 0 || confirmedOut > 0;
            
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isTodayDate = isToday(day);

            return (
              <div 
                key={dateStr}
                onClick={() => handleDayClick(day)}
                className={`
                  relative min-h-[70px] sm:min-h-[90px] p-1 sm:p-2 rounded-xl transition-all cursor-pointer border
                  flex flex-col
                  ${!isCurrentMonth ? 'opacity-40 bg-muted/20 border-transparent' : 'bg-card hover:bg-muted/30 border-border/50'}
                  ${isTodayDate ? 'ring-2 ring-primary ring-offset-1 border-primary/50 bg-primary/5' : ''}
                `}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-xs sm:text-sm font-bold ${isTodayDate ? 'text-primary' : 'text-foreground'}`}>
                    {format(day, "d")}
                  </span>
                  
                  {/* Indicators for mobile/compact view and future dates */}
                  <div className="flex flex-col gap-0.5 items-end opacity-80 mt-0.5">
                    {(data.in > 0 || data.pendingIn > 0) && <span className="block w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    {(data.out > 0 || data.pendingOut > 0) && <span className="block w-1.5 h-1.5 rounded-full bg-rose-500" />}
                    {data.pendingSub && <span className="block w-1.5 h-1.5 rounded-full bg-amber-500" title="Assinatura Pendente" />}
                  </div>
                </div>

                {/* Values for desktop/larger screens (Past & Today only for confirmed) */}
                {!isFuture && hasConfirmedActivity && (
                  <div className="hidden sm:flex flex-col mt-auto space-y-0.5 mb-1">
                    {confirmedIn > 0 && (
                      <div className="text-[10px] font-bold text-emerald-600 truncate">
                        +{formatCurrency(confirmedIn)}
                      </div>
                    )}
                    {confirmedOut > 0 && (
                      <div className="text-[10px] font-bold text-rose-600 truncate">
                        -{formatCurrency(confirmedOut)}
                      </div>
                    )}
                  </div>
                )}

                {/* Real Balance (Past & Today only) */}
                {!isFuture && dailyBalances.has(dateStr) && (
                  <div className={`mt-auto text-[9px] sm:text-[10px] font-bold truncate ${(dailyBalances.get(dateStr) || 0) < 0 ? 'text-rose-500' : 'text-muted-foreground'}`}>
                    {formatCurrency(dailyBalances.get(dateStr) || 0)}
                  </div>
                )}

              </div>
            );
          })}
        </div>

      </CardContent>

      <DayTransactionsDrawer 
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        date={selectedDate}
        receitas={receitas}
        despesas={despesas}
        onAddTransaction={handleAddTransaction}
      />

      <QuickAddModal 
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        defaultDate={quickAddDate}
      />
    </Card>
  );
}
