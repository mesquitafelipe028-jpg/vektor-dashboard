import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { expenseCategories, revenueCategories } from "@/lib/categories";

export interface CategoriaDB {
  id: string;
  nome: string;
  tipo: string;
  icone: string;
  cor: string;
  categoria_pai_id: string | null;
  ordem: number;
  user_id: string;
  created_at: string;
  subcategorias?: CategoriaDB[];
}

const QUERY_KEY = "categorias-custom";

export function useCategories(tipo?: "despesa" | "receita") {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [QUERY_KEY, user?.id, tipo],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("categorias")
        .select("*")
        .eq("user_id", user.id) as any;
      if (error) throw error;

      // Filter by tipo if needed and sort by ordem
      let rows = (data as any[]) as CategoriaDB[];
      if (tipo) rows = rows.filter((r) => r.tipo === tipo);
      rows.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
      if (error) throw error;

      // Cast since types.ts doesn't have new columns yet
      const rows = (data as any[]) as CategoriaDB[];

      // Build hierarchy
      const parents = rows.filter((r) => !r.categoria_pai_id);
      return parents.map((p) => ({
        ...p,
        subcategorias: rows.filter((r) => r.categoria_pai_id === p.id),
      }));
    },
    enabled: !!user,
  });

  const seedDefaults = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      // Delete existing categories for this user
      await supabase.from("categorias").delete().eq("user_id", user.id);

      const rows: any[] = [];
      expenseCategories.forEach((c, i) => {
        // Extract color base name from the bg class e.g. "bg-orange-500/20" → "orange"
        const cor = c.bg.match(/bg-(\w+)-/)?.[1] ?? "gray";
        const icone = c.icon.displayName || "Package";
        rows.push({
          nome: c.name,
          tipo: "despesa",
          icone,
          cor,
          ordem: i,
          user_id: user.id,
        });
      });
      revenueCategories.forEach((c, i) => {
        const cor = c.bg.match(/bg-(\w+)-/)?.[1] ?? "gray";
        const icone = c.icon.displayName || "Banknote";
        rows.push({
          nome: c.name,
          tipo: "receita",
          icone,
          cor,
          ordem: i,
          user_id: user.id,
        });
      });

      const { error } = await supabase.from("categorias").insert(rows as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });

  const createCategory = useMutation({
    mutationFn: async (cat: { nome: string; tipo: string; icone: string; cor: string; categoria_pai_id?: string | null; ordem?: number }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("categorias").insert({
        ...cat,
        user_id: user.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; nome?: string; icone?: string; cor?: string; ordem?: number }) => {
      const { error } = await supabase.from("categorias").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categorias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });

  return {
    categories: query.data ?? [],
    isLoading: query.isLoading,
    seedDefaults,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
