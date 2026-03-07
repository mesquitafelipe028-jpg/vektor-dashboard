import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface QuoteResult {
  price: number;
  change: number;
  name: string;
}

export function useStockQuotes() {
  const [quotes, setQuotes] = useState<Record<string, QuoteResult>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();

  const fetchQuotes = useCallback(async (tickers: string[]) => {
    if (!tickers.length) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-quotes", {
        body: { tickers },
      });

      if (error) throw error;

      if (data?.quotes) {
        setQuotes(data.quotes);
        setLastUpdated(new Date());
      }
    } catch (err: any) {
      console.error("Error fetching quotes:", err);
      toast({
        title: "Erro ao buscar cotações",
        description: err?.message || "Verifique se a chave da BrAPI está configurada.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return { quotes, isLoading, lastUpdated, fetchQuotes };
}
