

## Plano: Trocar "Simulador" por menu "Mais" (…) na barra inferior mobile

### Alteração única

**`src/components/mobile/MobileBottomNav.tsx`**
- Trocar o import `LineChart` por `MoreHorizontal` (de lucide-react)
- Alterar o último item do `navItems` de `{ label: "Simulador", icon: LineChart, path: "/calculadora-investimentos" }` para `{ label: "Mais", icon: MoreHorizontal, path: "/mais" }`

