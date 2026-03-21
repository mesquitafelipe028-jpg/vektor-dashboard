import React from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tables } from "@/integrations/supabase/types";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Compra = Tables<"compras_cartao">;
type Cartao = Tables<"cartoes_credito">;

interface PhysicalInvoiceProps {
  cartao: Cartao;
  compras: Compra[];
  mesRef: string;
  onEditCompra: (c: Compra) => void;
  onDeleteCompra: (id: string) => void;
}

export function PhysicalInvoice({ cartao, compras, mesRef, onEditCompra, onDeleteCompra }: PhysicalInvoiceProps) {
  const [year, month] = mesRef.split("-").map(Number);
  const monthName = new Date(year, month - 1).toLocaleDateString("pt-BR", { month: "long" }).toUpperCase();

  // Separate "Pagamento de Fatura" vs others
  const payments = compras.filter(c => c.descricao.toLowerCase().includes("pagamento"));
  const expenses = compras.filter(c => !c.descricao.toLowerCase().includes("pagamento"));

  const totalPayments = payments.reduce((acc, c) => acc + c.valor, 0);
  const totalExpenses = expenses.reduce((acc, c) => acc + c.valor, 0);
  const balance = totalExpenses - totalPayments;

  return (
    <div className="bg-white text-slate-900 min-h-[600px] shadow-2xl rounded-sm p-4 sm:p-12 font-sans border border-slate-200">
      {/* Invoice Header */}
      <div className="flex flex-col sm:flex-row justify-between border-b-2 border-slate-900 pb-6 mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic text-slate-900">BRADESCO CARTOES</h1>
          <p className="text-sm font-bold text-slate-500 mt-1 uppercase">Detalhamento da Fatura</p>
          <p className="font-bold text-lg mt-4">{cartao.nome.toUpperCase()}</p>
        </div>
        <div className="text-right flex flex-col items-end">
          <Badge variant="outline" className="border-slate-900 text-slate-900 font-bold mb-2">
            REFERÊNCIA: {monthName} / {year}
          </Badge>
          <p className="text-xs text-slate-500 uppercase font-bold">Vencimento</p>
          <p className="text-xl font-black">{cartao.dia_vencimento}/{String(month).padStart(2, '0')}/{year}</p>
        </div>
      </div>

      {/* Summary Boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <div className="border border-slate-200 p-3 rounded-md bg-slate-50">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Total a Pagar</p>
          <p className="text-lg font-black">{formatCurrency(balance > 0 ? balance : 0)}</p>
        </div>
        <div className="border border-slate-200 p-3 rounded-md">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Limite Utilizado</p>
          <p className="text-lg font-bold">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="border border-slate-200 p-3 rounded-md">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Limite Disponível</p>
          <p className="text-lg font-bold text-emerald-600">{formatCurrency(cartao.limite_total ? cartao.limite_total - totalExpenses : 0)}</p>
        </div>
        <div className="border border-slate-200 p-3 rounded-md">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Melhor Dia</p>
          <p className="text-lg font-bold">{String(cartao.dia_fechamento).padStart(2, '0')}/{String(month).padStart(2, '0')}</p>
        </div>
      </div>

      {/* Transactions */}
      <div className="space-y-8">
        <div>
          <h3 className="text-sm font-black border-b border-slate-900 mb-2 uppercase flex justify-between">
            <span>Despesas</span>
            <span>R$</span>
          </h3>
          <Table>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow><TableCell className="text-xs italic text-slate-400">Nenhuma despesa registrada</TableCell></TableRow>
              ) : (
                expenses.map((c) => (
                  <TableRow key={c.id} className="hover:bg-slate-50 group border-slate-100">
                    <TableCell className="text-xs font-mono py-2 w-16">{formatDate(c.data).split('/').slice(0, 2).join('/')}</TableCell>
                    <TableCell className="text-xs font-bold py-2">
                       <div className="flex items-center gap-2">
                         {c.descricao}
                         <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                           <Button variant="ghost" size="icon" className="h-5 w-5 text-slate-400" onClick={() => onEditCompra(c)}><Pencil className="h-3 w-3" /></Button>
                           <Button variant="ghost" size="icon" className="h-5 w-5 text-slate-400 hover:text-destructive" onClick={() => onDeleteCompra(c.id)}><Trash2 className="h-3 w-3" /></Button>
                         </div>
                       </div>
                    </TableCell>
                    <TableCell className="text-xs text-right font-bold py-2">{formatCurrency(c.valor)}</TableCell>
                  </TableRow>
                ))
              )}
              <TableRow className="bg-slate-50 border-t border-slate-900">
                <TableCell colSpan={2} className="text-xs font-black uppercase">Valor Total despesas</TableCell>
                <TableCell className="text-xs text-right font-black">{formatCurrency(totalExpenses)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {payments.length > 0 && (
          <div>
            <h3 className="text-sm font-black border-b border-slate-900 mb-2 uppercase flex justify-between">
              <span>Pagamentos e Créditos</span>
              <span>R$</span>
            </h3>
            <Table>
              <TableBody>
                {payments.map((c) => (
                  <TableRow key={c.id} className="hover:bg-slate-50 group border-slate-100">
                    <TableCell className="text-xs font-mono py-2 w-16">{formatDate(c.data).split('/').slice(0, 2).join('/')}</TableCell>
                    <TableCell className="text-xs font-bold py-2">{c.descricao}</TableCell>
                    <TableCell className="text-xs text-right font-bold py-2 text-emerald-600">-{formatCurrency(c.valor)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="mt-16 text-[9px] text-slate-400 uppercase leading-tight font-mono">
        <p>Demais informações consulte o verso ou nosso atendimento. central de atendimento: 4004 xxxx / 0800 xxxx xxxx.</p>
        <p>Este documento é uma representação digital gerada pelo sistema Vektor.</p>
      </div>
    </div>
  );
}
