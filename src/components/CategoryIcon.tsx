import { getExpenseCategoryIcon, getRevenueCategoryIcon, transactionColors, type TransactionType } from "@/lib/categories";

interface CategoryIconProps {
  category: string | null;
  type: TransactionType;
  size?: number;
}

export function CategoryIcon({ category, type, size = 36 }: CategoryIconProps) {
  const Icon = type === "receita" 
    ? getRevenueCategoryIcon(category) 
    : getExpenseCategoryIcon(category);
  const colors = transactionColors[type];
  const iconSize = size * 0.44;

  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 ${colors.bg}`}
      style={{ width: size, height: size }}
    >
      <Icon className={colors.text} style={{ width: iconSize, height: iconSize }} />
    </div>
  );
}
