import { CheckCircle, Clock, AlertTriangle, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { TransactionTypeBadge } from "@/components/transaction/TransactionBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import type { TipoTransacao, StatusReceita, StatusDespesa } from "@/types/transactions";

interface TransactionCardProps {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  categoria?: string | null;
  status?: StatusReceita | StatusDespesa | string | null;
  tipo_transacao?: TipoTransacao | null;
  parcela_atual?: number | null;
  numero_parcelas?: number | null;
  clienteNome?: string | null;
  type: "receita" | "despesa";
  index?: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onMarkAsPaid?: (id: string) => void;
  deleteWarning?: string;
  isVirtual?: boolean;
}

function getStatusIcon(status: string | null | undefined) {
  switch (status) {
    case "confirmed":
    case "recebido":
    case "pago":
      return <CheckCircle className="h-5 w-5 text-emerald-500" />;
    case "atrasado":
      return <AlertTriangle className="h-5 w-5 text-destructive" />;
    case "pending":
    case "pendente":
    default:
      return <Clock className="h-5 w-5 text-amber-500" />;
  }
}

function formatWeekday(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
}

export default function TransactionCard({
  id,
  descricao,
  valor,
  data,
  categoria,
  status,
  tipo_transacao,
  parcela_atual,
  numero_parcelas,
  clienteNome,
  type,
  index = 0,
  onEdit,
  onDelete,
  deleteWarning,
  isVirtual,
  onMarkAsPaid,
}: TransactionCardProps) {
  const isReceita = type === "receita";
  const isPending = status === "pending" || status === "pendente";
  
  const colorClass = isReceita
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-600 dark:text-red-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
        isPending ? "opacity-[0.65] grayscale-[0.2] bg-muted/20 hover:bg-muted/40 border-muted-foreground/20" : "border-border bg-card hover:bg-muted/30"
      }`}
    >
      {/* Status icon */}
      <div className="shrink-0">{getStatusIcon(status)}</div>

      {/* Center content */}
      <div className="flex-1 min-w-0">
        {clienteNome && (
          <p className="text-[11px] text-muted-foreground truncate">{clienteNome}</p>
        )}
        <p className="font-semibold text-sm truncate">{descricao}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {categoria && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1 border-border">
              <CategoryIcon category={categoria} type={type === "receita" ? "receita" : "despesa"} size={12} />
              <span className="truncate max-w-[100px]">{categoria}</span>
            </Badge>
          )}
          {isPending && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1 border-amber-600/30 text-amber-600 bg-amber-600/10">
              <Clock className="h-2.5 w-2.5" />
              Previsto
            </Badge>
          )}
          <TransactionTypeBadge
            tipo={tipo_transacao || "unica"}
            parcela_atual={parcela_atual}
            numero_parcelas={numero_parcelas}
          />
        </div>
      </div>

      {/* Right: date + amount */}
      <div className="shrink-0 text-right">
        <p className="text-[11px] text-muted-foreground">
          {formatDate(data)} · {formatWeekday(data)}
        </p>
        <p className={`font-heading font-bold text-sm ${colorClass}`}>
          {isReceita ? "+" : "-"}{formatCurrency(valor)}
        </p>
      </div>

      {/* Actions menu */}
      <AlertDialog>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isPending && onMarkAsPaid && (
              <DropdownMenuItem onClick={() => onMarkAsPaid(id)} className="text-emerald-600 focus:text-emerald-500 font-medium">
                <CheckCircle className="mr-2 h-4 w-4" /> Marcar como pago
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onEdit(id)}>
              <Pencil className="mr-2 h-4 w-4" /> Editar
            </DropdownMenuItem>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> {isVirtual ? "Excluir Ocorrência Origem" : "Excluir"}
              </DropdownMenuItem>
            </AlertDialogTrigger>
          </DropdownMenuContent>
        </DropdownMenu>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir {isReceita ? "receita" : "despesa"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteWarning || `Essa ação não pode ser desfeita. "${descricao}" será removido permanentemente.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
