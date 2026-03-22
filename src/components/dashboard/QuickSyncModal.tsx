import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useAccounts } from "@/hooks/useAccounts";
import { formatCurrency } from "@/lib/utils";
import { queryKeys } from "@/lib/queryKeys";

interface QuickSyncModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orphanedBalance: number;
  orphanedCount: number;
}

export function QuickSyncModal({
  open,
  onOpenChange,
  orphanedBalance,
  orphanedCount,
}: QuickSyncModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { accounts } = useAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [shouldUpdateBalance, setShouldUpdateBalance] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    if (!selectedAccountId) {
      toast.error("Selecione uma conta para vincular.");
      return;
    }

    setIsSyncing(true);
    try {
      if (!user) throw new Error("Usuário não autenticado");

      // 1. Update orphaned transactions in the unified table
      const { error } = await supabase
        .from("transactions")
        .update({ account_id: selectedAccountId } as any)
        .eq("user_id", user.id)
        .is("account_id", null);
      
      if (error) {
        if (error.message?.includes("column \"account_id\" does not exist")) {
          throw new Error("Erro de esquema: a coluna 'account_id' não foi encontrada.");
        }
        throw error;
      }

      // Note: Step 2 (Account Balance update) is now automatic via Ledger Trigger

      toast.success("Histórico vinculado com sucesso!");
      
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts(user.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions(user.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(user.id) });
      queryClient.invalidateQueries({ queryKey: ["orphaned_transactions"] });
      
      onOpenChange(false);
    } catch (error: any) {
      console.error("Sync error:", error);
      toast.error("Erro ao sincronizar: " + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Sincronizar Histórico
          </DialogTitle>
          <DialogDescription>
            Existem {orphanedCount} transações antigas totalizando{" "}
            <span className="font-semibold text-foreground">
              {formatCurrency(Math.abs(orphanedBalance))}
            </span>{" "}
            {orphanedBalance >= 0 ? "de saldo positivo" : "de saldo negativo"} sem conta vinculada.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Vincular tudo à conta:</label>
            <Select
              value={selectedAccountId}
              onValueChange={setSelectedAccountId}
              disabled={isSyncing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma conta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-100 dark:border-amber-900/50">
            <Checkbox
              id="update-balance"
              checked={shouldUpdateBalance}
              onCheckedChange={(checked) => setShouldUpdateBalance(!!checked)}
              disabled={isSyncing}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="update-balance"
                className="text-sm font-medium leading-none cursor-pointer text-amber-900 dark:text-amber-200"
              >
                Somar ao saldo atual da conta
              </label>
              <p className="text-xs text-amber-700/70 dark:text-amber-400/70">
                Desmarque se você já informou o saldo real do extrato bancário.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={handleSync} disabled={isSyncing || !selectedAccountId} className="w-full">
            {isSyncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sincronizando...
              </>
            ) : (
              "Confirmar Vinculação"
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSyncing}
            className="w-full"
          >
            Agora não
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
