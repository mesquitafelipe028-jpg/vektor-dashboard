import { useState, lazy, Suspense } from "react";
import { icons, type LucideIcon } from "lucide-react";
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronRight, RotateCcw, Tag,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCategories, type CategoriaDB } from "@/hooks/useCategories";
import { colorMap, availableColors, availableIcons } from "@/lib/categoryColors";
import { toast } from "@/hooks/use-toast";

function LucideIconByName({ name, className }: { name: string; className?: string }) {
  const Icon = (icons as Record<string, LucideIcon>)[name] ?? icons.Package;
  return <Icon className={className} />;
}

interface EditModalProps {
  open: boolean;
  onClose: () => void;
  initial?: { nome: string; icone: string; cor: string };
  onSave: (data: { nome: string; icone: string; cor: string }) => void;
  title: string;
}

function EditModal({ open, onClose, initial, onSave, title }: EditModalProps) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [icone, setIcone] = useState(initial?.icone ?? "Package");
  const [cor, setCor] = useState(initial?.cor ?? "gray");

  const handleSave = () => {
    if (!nome.trim()) return;
    onSave({ nome: nome.trim(), icone, cor });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome da categoria"
            autoFocus
          />

          {/* Color picker */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Cor</p>
            <div className="flex flex-wrap gap-2">
              {availableColors.map((c) => {
                const classes = colorMap[c];
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCor(c)}
                    className={`w-8 h-8 rounded-full ${classes.bg} flex items-center justify-center transition-all ${
                      cor === c ? "ring-2 ring-primary scale-110" : "hover:scale-105"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full ${classes.text.includes("text-") ? classes.bg.replace("/20", "/60") : ""}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Icon picker */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Ícone</p>
            <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto">
              {availableIcons.map((name) => {
                const colors = colorMap[cor];
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setIcone(name)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                      icone === name
                        ? `${colors.bg} ring-2 ring-primary`
                        : "hover:bg-muted"
                    }`}
                  >
                    <LucideIconByName name={name} className={`h-5 w-5 ${icone === name ? colors.text : "text-muted-foreground"}`} />
                  </button>
                );
              })}
            </div>
          </div>

          <Button onClick={handleSave} className="w-full" disabled={!nome.trim()}>
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CategoryList({ tipo }: { tipo: "despesa" | "receita" }) {
  const { categories, isLoading, seedDefaults, createCategory, updateCategory, deleteCategory } = useCategories(tipo);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editModal, setEditModal] = useState<{ open: boolean; cat?: CategoriaDB; parentId?: string }>({ open: false });

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSave = (data: { nome: string; icone: string; cor: string }) => {
    if (editModal.cat) {
      updateCategory.mutate({ id: editModal.cat.id, ...data }, {
        onSuccess: () => toast({ title: "Categoria atualizada" }),
      });
    } else {
      createCategory.mutate({
        ...data,
        tipo,
        categoria_pai_id: editModal.parentId ?? null,
        ordem: categories.length,
      }, {
        onSuccess: () => toast({ title: "Categoria criada" }),
      });
    }
  };

  const handleDelete = (id: string) => {
    deleteCategory.mutate(id, {
      onSuccess: () => toast({ title: "Categoria removida" }),
    });
  };

  if (isLoading) {
    return <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>;
  }

  if (categories.length === 0) {
    return (
      <div className="text-center py-10 space-y-3">
        <p className="text-muted-foreground text-sm">Nenhuma categoria cadastrada</p>
        <Button onClick={() => seedDefaults.mutate()} disabled={seedDefaults.isPending} variant="outline">
          <RotateCcw className="h-4 w-4 mr-2" />
          Carregar categorias padrão
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {categories.map((cat) => {
        const colors = colorMap[cat.cor] ?? colorMap.gray;
        const hasSubs = cat.subcategorias && cat.subcategorias.length > 0;
        const isExpanded = expandedIds.has(cat.id);

        return (
          <div key={cat.id}>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-muted/50 group">
              {/* Expand button */}
              <button
                type="button"
                onClick={() => toggleExpand(cat.id)}
                className="w-5 h-5 flex items-center justify-center shrink-0"
              >
                {hasSubs ? (
                  isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                ) : <div className="w-4" />}
              </button>

              {/* Icon */}
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${colors.bg}`}>
                <LucideIconByName name={cat.icone} className={`h-4 w-4 ${colors.text}`} />
              </div>

              {/* Name */}
              <span className="flex-1 text-sm font-medium text-foreground">{cat.nome}</span>

              {/* Actions */}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => setEditModal({ open: true, parentId: cat.id })}
                  title="Adicionar subcategoria"
                  className="p-1.5 rounded-md hover:bg-muted"
                >
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditModal({ open: true, cat })}
                  className="p-1.5 rounded-md hover:bg-muted"
                >
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(cat.id)}
                  className="p-1.5 rounded-md hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </button>
              </div>
            </div>

            {/* Subcategories */}
            {isExpanded && cat.subcategorias?.map((sub) => {
              const subColors = colorMap[sub.cor] ?? colorMap.gray;
              return (
                <div key={sub.id} className="flex items-center gap-2 pl-12 pr-3 py-2 rounded-lg hover:bg-muted/50 group">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center ${subColors.bg}`}>
                    <LucideIconByName name={sub.icone} className={`h-3.5 w-3.5 ${subColors.text}`} />
                  </div>
                  <span className="flex-1 text-sm text-foreground">{sub.nome}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => setEditModal({ open: true, cat: sub })}
                      className="p-1.5 rounded-md hover:bg-muted"
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(sub.id)}
                      className="p-1.5 rounded-md hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Add + Restore buttons */}
      <div className="flex gap-2 pt-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditModal({ open: true })}
          className="flex-1"
        >
          <Plus className="h-4 w-4 mr-1" /> Nova Categoria
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => seedDefaults.mutate()}
          disabled={seedDefaults.isPending}
        >
          <RotateCcw className="h-4 w-4 mr-1" /> Restaurar Padrão
        </Button>
      </div>

      {editModal.open && (
        <EditModal
          open
          onClose={() => setEditModal({ open: false })}
          initial={editModal.cat ? { nome: editModal.cat.nome, icone: editModal.cat.icone, cor: editModal.cat.cor } : undefined}
          onSave={handleSave}
          title={editModal.cat ? "Editar Categoria" : editModal.parentId ? "Nova Subcategoria" : "Nova Categoria"}
        />
      )}
    </div>
  );
}

export default function Categories() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
          <Tag className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Categorias</h1>
      </div>

      <Tabs defaultValue="despesa">
        <TabsList className="w-full">
          <TabsTrigger value="despesa" className="flex-1">Despesas</TabsTrigger>
          <TabsTrigger value="receita" className="flex-1">Receitas</TabsTrigger>
        </TabsList>
        <TabsContent value="despesa">
          <div className="bg-card rounded-xl border border-border p-4 mt-3">
            <CategoryList tipo="despesa" />
          </div>
        </TabsContent>
        <TabsContent value="receita">
          <div className="bg-card rounded-xl border border-border p-4 mt-3">
            <CategoryList tipo="receita" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
