import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingDown } from "lucide-react";
import { mockTransactions, formatCurrency, formatDate, totalDespesas } from "@/lib/mockData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const despesas = mockTransactions.filter((t) => t.type === "despesa");

export default function Expenses() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Despesas</h1>
          <p className="text-muted-foreground text-sm">Gerencie suas saídas financeiras</p>
        </div>
        <Button><Plus className="mr-2 h-4 w-4" /> Nova Despesa</Button>
      </div>

      <Card>
        <CardContent className="p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-destructive/10 flex items-center justify-center">
            <TrendingDown className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total de Despesas</p>
            <p className="text-2xl font-bold font-heading">{formatCurrency(totalDespesas)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-heading text-lg">Todas as Despesas</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {despesas.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.description}</TableCell>
                  <TableCell>{t.category}</TableCell>
                  <TableCell>{formatDate(t.date)}</TableCell>
                  <TableCell>
                    <Badge variant={t.status === "pago" ? "default" : t.status === "pendente" ? "secondary" : "destructive"}>
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-destructive">{formatCurrency(t.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
