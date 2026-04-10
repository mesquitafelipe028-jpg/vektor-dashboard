import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { X, Delete, Check } from "lucide-react";
import { motion } from "framer-motion";

interface CalculatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue?: string;
  onConfirm: (value: string) => void;
  accentColor?: "emerald" | "red" | "primary";
}

export function CalculatorModal({
  open,
  onOpenChange,
  initialValue,
  onConfirm,
  accentColor = "emerald"
}: CalculatorModalProps) {
  const isMobile = useIsMobile();
  
  // State for calculation
  const [currentInput, setCurrentInput] = useState("0");
  const [expression, setExpression] = useState<{ val: string; op: string }[]>([]);
  const [hasCalculated, setHasCalculated] = useState(false);

  // Initialize
  useEffect(() => {
    if (open) {
      if (initialValue && initialValue !== "0" && initialValue !== "0.00") {
        setCurrentInput(initialValue.replace(".", ","));
      } else {
        setCurrentInput("0");
      }
      setExpression([]);
      setHasCalculated(false);
    }
  }, [open, initialValue]);

  const accColorMap = {
    emerald: "text-emerald-600 dark:text-emerald-400 border-emerald-600/20 bg-emerald-600/10",
    red: "text-red-600 dark:text-red-400 border-red-600/20 bg-red-600/10",
    primary: "text-primary border-primary/20 bg-primary/10",
  };
  
  const accBgMap = {
    emerald: "bg-emerald-600 hover:bg-emerald-700 text-white",
    red: "bg-red-600 hover:bg-red-700 text-white",
    primary: "bg-primary hover:bg-primary/90 text-primary-foreground",
  };

  const EvaluateMath = (expr: {val: string, op: string}[], current: string): number => {
    let mathStr = "";
    expr.forEach(item => {
      mathStr += item.val.replace(/\./g, "").replace(",", ".") + " " + item.op.replace("×", "*").replace("÷", "/") + " ";
    });
    const currClean = current ? current.replace(/\./g, "").replace(",", ".") : "0";
    mathStr += currClean;
    
    try {
      // safe eval for basic math
      const result = new Function('return ' + mathStr)();
      if (!isFinite(result)) return 0;
      return result;
    } catch {
      return 0;
    }
  };

  const formatNumberForDisplay = (numStr: string) => {
    // numStr might be "1000,50" -> we want to format integer part as "1.000"
    const parts = numStr.split(",");
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return parts.length > 1 ? `${intPart},${parts[1]}` : intPart;
  };

  const handleDigit = (digit: string) => {
    if (hasCalculated) {
      setCurrentInput(digit === "," ? "0," : digit);
      setExpression([]);
      setHasCalculated(false);
      return;
    }

    setCurrentInput((prev) => {
      if (digit === ",") {
        if (prev.includes(",")) return prev;
        return prev + ",";
      }
      if (prev === "0") {
        return digit === "00" ? "0" : digit;
      }
      // Max 2 decimals limit logic
      if (prev.includes(",")) {
        const decimals = prev.split(",")[1];
        if (decimals && decimals.length >= 2) return prev;
      }
      // Limits size
      if (prev.replace(/\D/g, "").length > 10) return prev;
      
      return prev + digit;
    });
  };

  const handleOperator = (op: string) => {
    if (hasCalculated) {
      setHasCalculated(false);
    }
    
    // If the last pressed was an operator and currentInput is empty (e.g. they changed their mind)
    if (currentInput === "") {
      setExpression(prev => {
        const newExp = [...prev];
        if (newExp.length > 0) {
          newExp[newExp.length - 1].op = op;
        }
        return newExp;
      });
      return;
    }

    // Evaluate intermediate
    setExpression(prev => [...prev, { val: currentInput, op }]);
    setCurrentInput("0");
  };

  const handlePercent = () => {
    // If there is an expression, like 1000 + 10%
    // 10% should be evaluated as (1000 * 10 / 100)
    // If just typing: 10% -> 0.1
    let valStr = currentInput.replace(/\./g, "").replace(",", ".");
    let valNum = parseFloat(valStr) || 0;

    if (expression.length > 0) {
      // Standard calc behavior:
      // "1000 + 10 %" -> 100
      const prevMath = EvaluateMath(expression, "0"); // evaluate without the current
      valNum = (prevMath * valNum) / 100;
    } else {
      valNum = valNum / 100;
    }
    
    const newVal = valNum.toString().replace(".", ",");
    setCurrentInput(newVal);
  };

  const handleEqual = () => {
    if (expression.length === 0 && currentInput) {
      setHasCalculated(true);
      return;
    }
    
    const result = EvaluateMath(expression, currentInput);
    
    // Format to string with comma
    let resultStr = result.toFixed(2).replace(".", ",");
    // Remove trailing zero if we want to allow editing or just keep it as money.
    setCurrentInput(resultStr);
    setExpression([]);
    setHasCalculated(true);
  };

  const handleClear = () => {
    setCurrentInput("0");
    setExpression([]);
    setHasCalculated(false);
  };

  const handleBackspace = () => {
    if (hasCalculated) {
      setHasCalculated(false);
      return;
    }
    setCurrentInput(prev => {
      if (prev.length <= 1) return "0";
      return prev.slice(0, -1);
    });
  };

  const handleConfirm = () => {
    // if there is a pending operation, calculate first
    let finalValue = currentInput;
    if (expression.length > 0 && !hasCalculated) {
       const result = EvaluateMath(expression, currentInput);
       finalValue = result.toFixed(2).replace(".", ",");
    }
    
    let floatVal = parseFloat(finalValue.replace(/\./g, "").replace(",", "."));
    if (isNaN(floatVal) || floatVal < 0) floatVal = 0;
    
    // Format string to use standard dot for DB saving
    onConfirm(floatVal.toFixed(2));
    onOpenChange(false);
  };

  const renderExpression = () => {
    if (expression.length === 0) return " "; // invisible char to keep height
    return expression.map(e => `${formatNumberForDisplay(e.val)} ${e.op}`).join(" ");
  };

  // Intermediate result
  const interResult = expression.length > 0 && currentInput !== "0" && currentInput !== "" && !hasCalculated
    ? EvaluateMath(expression, currentInput) 
    : null;

  const CalculatorButton = ({ 
    label, 
    onClick, 
    variant = "default",
    icon: Icon
  }: { 
    label?: string; 
    onClick: () => void; 
    variant?: "default" | "operator" | "action" | "confirm";
    icon?: React.ElementType;
  }) => {
    const baseClasses = "flex items-center justify-center rounded-2xl text-2xl font-medium transition-colors select-none";
    let variantClasses = "";
    
    switch (variant) {
      case "default":
        variantClasses = "bg-muted/50 text-foreground hover:bg-muted active:bg-muted/80";
        break;
      case "operator":
        variantClasses = `${accColorMap[accentColor]} text-2xl active:opacity-80`;
        break;
      case "action":
        variantClasses = "bg-muted text-muted-foreground hover:bg-muted/80 active:bg-muted/60";
        break;
      case "confirm":
        variantClasses = `${accBgMap[accentColor]} shadow-md active:opacity-90 active:scale-95`;
        break;
    }

    return (
      <motion.button
        type="button"
        whileTap={{ scale: variant === "confirm" ? 0.95 : 0.92 }}
        onClick={onClick}
        className={`${baseClasses} ${variantClasses} h-[4.5rem]`}
      >
        {Icon ? <Icon className="w-6 h-6" /> : label}
      </motion.button>
    );
  };

  const content = (
    <div 
      className="flex flex-col h-full bg-background"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Hide bottom nav globally when calculator is open */}
      <style dangerouslySetInnerHTML={{ __html: `
        nav.fixed.bottom-0, nav[class*="bottom-"], .bottom-nav-container {
          display: none !important;
        }
        body { 
          overflow: hidden !important; 
        }
      `}} />
      {/* Header */}
      <div className="flex justify-between items-center p-4">
        {/* Empty left to center title or close */}
        <button type="button" onClick={() => onOpenChange(false)} className="p-2 rounded-full hover:bg-muted">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
        <span className="font-heading text-sm text-muted-foreground tracking-wide uppercase">Calculadora</span>
        <div className="w-9" />
      </div>

      {/* Display */}
      <div className="flex-1 flex flex-col justify-end items-end p-6 border-b border-border min-h-[160px]">
        <div className="text-sm text-muted-foreground text-right w-full min-h-[1.25rem] mb-2 truncate">
          {renderExpression()}
        </div>
        
        <div className="flex items-center gap-2 max-w-full overflow-hidden">
          <span className="text-xl md:text-2xl text-muted-foreground self-start mt-2">R$</span>
          <span className={`text-[3.5rem] md:text-6xl font-semibold tracking-tight text-foreground truncate ${currentInput === "0" && !hasCalculated ? "text-muted-foreground/50" : ""}`}>
            {formatNumberForDisplay(currentInput)}
          </span>
        </div>
        
        <div className="text-xs text-muted-foreground h-4 mt-1 text-right w-full">
          {interResult !== null && `= R$ ${interResult.toFixed(2).replace(".", ",")}`}
        </div>
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-4 gap-2.5 p-4 md:p-6 bg-muted/10 h-[500px] shrink-0">
        <CalculatorButton label="C" onClick={handleClear} variant="action" />
        <CalculatorButton label="%" onClick={handlePercent} variant="action" />
        <CalculatorButton icon={Delete} onClick={handleBackspace} variant="action" />
        <CalculatorButton label="÷" onClick={() => handleOperator("÷")} variant="operator" />

        <CalculatorButton label="7" onClick={() => handleDigit("7")} />
        <CalculatorButton label="8" onClick={() => handleDigit("8")} />
        <CalculatorButton label="9" onClick={() => handleDigit("9")} />
        <CalculatorButton label="×" onClick={() => handleOperator("×")} variant="operator" />

        <CalculatorButton label="4" onClick={() => handleDigit("4")} />
        <CalculatorButton label="5" onClick={() => handleDigit("5")} />
        <CalculatorButton label="6" onClick={() => handleDigit("6")} />
        <CalculatorButton label="-" onClick={() => handleOperator("-")} variant="operator" />

        <CalculatorButton label="1" onClick={() => handleDigit("1")} />
        <CalculatorButton label="2" onClick={() => handleDigit("2")} />
        <CalculatorButton label="3" onClick={() => handleDigit("3")} />
        <CalculatorButton label="+" onClick={() => handleOperator("+")} variant="operator" />

        <CalculatorButton label="00" onClick={() => handleDigit("00")} />
        <CalculatorButton label="0" onClick={() => handleDigit("0")} />
        <CalculatorButton label="," onClick={() => handleDigit(",")} />
        {expression.length > 0 && !hasCalculated ? (
          <CalculatorButton label="=" onClick={handleEqual} variant="operator" />
        ) : (
          <CalculatorButton icon={Check} onClick={handleConfirm} variant="confirm" />
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent 
          side="bottom" 
          className="z-[9999] p-0 rounded-t-3xl overflow-hidden flex flex-col border-none shadow-2xl fixed bottom-0 left-0 w-full"
          style={{ height: "80vh", maxHeight: "90vh" }}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Calculadora</SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[9999] max-w-[400px] p-0 overflow-hidden rounded-3xl border-border shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Calculadora</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
