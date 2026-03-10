import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Send, Bot, User as UserIcon, X, Sparkles, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { generateAssistantResponse, type AssistantData } from "@/lib/assistantEngine";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { AnimatePresence, motion } from "framer-motion";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function AssistantWidget() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Olá! Sou o Assistente Vektor. Como posso ajudar com suas finanças?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Buscar dados
  const { data: receitas = [] } = useQuery({
    queryKey: ["receitas", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("receitas").select("*");
      if (error) throw error;
      return data;
    },
    enabled: !!user && isOpen,
  });

  const { data: despesas = [] } = useQuery({
    queryKey: ["despesas", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("despesas").select("*");
      if (error) throw error;
      return data;
    },
    enabled: !!user && isOpen,
  });

  const scrollToBottom = () => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, isOpen]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const data: AssistantData = {
        receitas: receitas,
        despesas: despesas
      };
      
      const responseContent = generateAssistantResponse(userMsg.content, data);
      
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responseContent,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 800 + Math.random() * 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const sugestoes = [
    "Quanto gastei este mês?",
    "Quanto recebi este mês?",
    "Saldo atual?",
    "Maior despesa?"
  ];

  // Não renderiza o widget se o usuário não estiver logado
  if (!user) return null;

  return (
    <>
      <div 
        className={`fixed z-[9999] transition-all duration-300 ${isMobile ? 'bottom-20 right-4' : 'bottom-6 right-6'}`}
      >
        <AnimatePresence>
          {!isOpen && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
            >
              <Button
                size="icon"
                className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 bg-primary hover:bg-primary/90 hover:scale-105 active:scale-95"
                onClick={() => setIsOpen(true)}
              >
                <Bot size={28} className="text-primary-foreground" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`fixed z-[10000] flex flex-col shadow-2xl overflow-hidden border border-border
              ${isMobile 
                ? 'inset-4 bottom-20 rounded-2xl bg-background' 
                : 'bottom-24 right-6 w-[380px] h-[600px] rounded-2xl bg-background max-h-[calc(100vh-8rem)]'
              }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-primary text-primary-foreground">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Assistente Vektor</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                    <span className="text-xs text-primary-foreground/80">Online</span>
                  </div>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsOpen(false)}
                className="text-primary-foreground hover:bg-primary-foreground/20 h-8 w-8 shrink-0"
              >
                <X size={18} />
              </Button>
            </div>

            {/* Chat History Area */}
            <ScrollArea className="flex-1 p-4 bg-muted/20" ref={scrollRef}>
              <div className="flex flex-col gap-4 pb-2">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <Avatar className="h-8 w-8 border border-primary/20 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          <Bot size={16} />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className={`flex flex-col gap-1 max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                      <div
                        className={`px-3.5 py-2.5 rounded-2xl text-sm ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-background border shadow-sm text-foreground rounded-tl-sm"
                        }`}
                      >
                        <p className="leading-relaxed whitespace-pre-line">
                          {msg.content}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground px-1">
                        {msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    {msg.role === "user" && (
                      <Avatar className="h-8 w-8 border shrink-0">
                        <AvatarFallback className="bg-background text-xs">
                          <UserIcon size={14} className="text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex gap-3 justify-start">
                    <Avatar className="h-8 w-8 border border-primary/20 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        <Bot size={16} />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-background border shadow-sm px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5 h-[38px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/80 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Sugestões (Somente se poucas msgs e não digitando) */}
            {messages.length <= 2 && !isTyping && (
              <div className="px-4 py-2 bg-muted/20 border-t flex gap-2 overflow-x-auto no-scrollbar scroll-smooth">
                {sugestoes.map((sugestao) => (
                  <Button
                    key={sugestao}
                    variant="secondary"
                    size="sm"
                    className="rounded-full text-[11px] h-7 shrink-0 bg-background border shadow-sm hover:bg-muted"
                    onClick={() => {
                      setInput(sugestao);
                      setTimeout(() => {
                        const event = { key: 'Enter', preventDefault: () => {}, shiftKey: false } as React.KeyboardEvent<HTMLInputElement>;
                        handleKeyDown(event);
                      }, 0);
                    }}
                  >
                    {sugestao}
                  </Button>
                ))}
              </div>
            )}

            {/* Input Area */}
            <div className="p-3 bg-background border-t shrink-0">
              <div className="relative flex items-center">
                <Input
                  placeholder="Pergunte algo..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pr-12 py-5 rounded-xl bg-muted/50 border-transparent focus-visible:bg-background text-sm"
                  disabled={isTyping}
                />
                <Button 
                  onClick={handleSend} 
                  disabled={!input.trim() || isTyping}
                  size="icon"
                  className="absolute right-1.5 h-8 w-8 rounded-lg"
                >
                  <Send size={14} className="translate-x-[1px]" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
