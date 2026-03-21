import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PWAUpdateHandler() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log("SW Registered");
      // Optional: check for updates every 1 hour
      r && setInterval(() => {
        r.update();
      }, 60 * 60 * 1000);
    },
    onRegisterError(error) {
      console.error("SW registration error", error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      toast("Nova versão disponível!", {
        description: "Uma nova atualização do Vektor está pronta para você.",
        duration: Infinity,
        action: {
          label: "Atualizar agora",
          onClick: () => updateServiceWorker(true),
        },
        cancel: {
          label: "Depois",
          onClick: () => setNeedRefresh(false),
        },
        icon: <RefreshCw className="h-4 w-4 animate-spin-slow" />,
      });
    }
  }, [needRefresh, updateServiceWorker, setNeedRefresh]);

  return null;
}
