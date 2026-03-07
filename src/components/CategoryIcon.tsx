import { getExpenseCategoryIcon, getRevenueCategoryIcon, expenseCategories, revenueCategories, type TransactionType } from "@/lib/categories";

interface CategoryIconProps {
  category: string | null;
  type: TransactionType;
  size?: number;
}

export function CategoryIcon({ category, type, size = 36 }: CategoryIconProps) {
  const Icon = type === "receita" 
    ? getRevenueCategoryIcon(category) 
    : getExpenseCategoryIcon(category);

  // Find per-category colors instead of generic type colors
  const catList = type === "receita" ? revenueCategories : expenseCategories;
  const meta = catList.find((c) => c.name === category);
  const bg = meta?.bg ?? (type === "receita" ? "bg-emerald-500/20" : "bg-red-500/20");
  const text = meta?.color ?? (type === "receita" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400");

  const iconSize = size * 0.44;

  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 ${bg}`}
      style={{ width: size, height: size }}
    >
      <Icon className={text} style={{ width: iconSize, height: iconSize }} />
    </div>
  );
}
