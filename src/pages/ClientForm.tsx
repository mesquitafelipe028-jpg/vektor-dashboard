import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const clienteSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório").max(100),
  email: z.string().trim().email("E-mail inválido").max(255).or(z.literal("")).optional(),
  telefone: z.string().trim().max(20).optional(),
});

export default function ClientForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const isEditing = !!id;

  const [form, setForm] = useState({ nome: "", email: "", telefone: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: existing } = useQuery({
    queryKey: ["clientes", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  useEffect(() => {
    if (existing && id) {
      setForm({
        nome: existing.nome,
        email: existing.email ?? "",
        telefone: existing.telefone ?? "",
      });
    }
  }, [existing, id]);

  const upsert = useMutation({
    mutationFn: async () => {
      const parsed = clienteSchema.safeParse(form);
      if (!parsed.success) {
        const fe: Record<string, string> = {};
        parsed.error.issues.forEach((i) => (fe[String(i.path[0])] = i.message));
        setErrors(fe);
        throw new Error("validation");
      }
      setErrors({});
      const payload = {
        nome: form.nome.trim(),
        email: form.email.trim() || null,
        telefone: form.telefone.trim() || null,
        user_id: user!.id,
      };
      if (isEditing) {
        const { error } = await supabase.from("clientes").update(payload).eq("id", id!);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clientes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clientes"] });
      toast.success(isEditing ? "Cliente atualizado!" : "Cliente cadastrado!");
      navigate("/clientes");
    },
    onError: (e) => {
      if (e.message !== "validation") toast.error("Erro ao salvar cliente.");
    },
  });

  const title = isEditing ? "Editar Cliente" : "Novo Cliente";

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <button type="button" onClick={() => navigate("/clientes")} className="p-1">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </button>
        <h2 className="font-heading text-base font-semibold">{title}</h2>
        <Button
          size="sm"
          onClick={() => upsert.mutate()}
          disabled={upsert.isPending}
          className="px-5 rounded-full text-sm"
        >
          {upsert.isPending ? "..." : "Salvar"}
        </Button>
      </div>

      {/* Form */}
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome *</Label>
          <Input
            id="nome"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="Nome do cliente"
            maxLength={100}
            autoFocus
          />
          {errors.nome && <p className="text-sm text-destructive">{errors.nome}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@exemplo.com"
              maxLength={255}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              placeholder="(00) 00000-0000"
              maxLength={20}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
