import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCallback } from "react";

export type PlanType = "TRIAL" | "FREE" | "PAID" | "EXPIRED";

export interface SubscriptionData {
  id: string;
  user_id: string;
  plano: string;
  status: string;
  plan_type: PlanType;
  trial_start_at: string | null;
  trial_expires_at: string | null;
  plan_name?: string;
  features_enabled?: { ia: boolean; billing: boolean; advanced_cashflow: boolean };
}

function computeEffectivePlanType(sub: SubscriptionData): PlanType {
  if (sub.plan_type === "PAID") return "PAID";

  if (sub.plan_type === "TRIAL" && sub.trial_expires_at) {
    const expires = new Date(sub.trial_expires_at);
    if (new Date() > expires) return "EXPIRED";
    return "TRIAL";
  }

  if (sub.plan_type === "EXPIRED") return "EXPIRED";

  return "FREE";
}

export function useSubscription() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("assinaturas")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      // Se não existe registro, criamos um trial (fallback)
      if (!data) {
        const now = new Date();
        const expires = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
        const { data: newSub, error: insertErr } = await supabase
          .from("assinaturas")
          .insert({
            user_id: user.id,
            plano: "free",
            status: "ativo",
            plan_type: "TRIAL",
            trial_start_at: now.toISOString(),
            trial_expires_at: expires.toISOString(),
          })
          .select()
          .single();
        if (insertErr) throw insertErr;
        return newSub as SubscriptionData;
      }

      return data as SubscriptionData;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Mutation para sincronizar EXPIRED no banco quando detectarmos localmente
  const expireMutation = useMutation({
    mutationFn: async (subId: string) => {
      await supabase
        .from("assinaturas")
        .update({ plan_type: "EXPIRED" })
        .eq("id", subId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription", user?.id] });
    },
  });

  const effectivePlanType: PlanType = subscription
    ? computeEffectivePlanType(subscription)
    : "FREE";

  // Se detectamos expiração localmente e o banco ainda diz TRIAL, sincronizamos
  const checkUserAccess = useCallback(() => {
    if (
      subscription &&
      subscription.plan_type === "TRIAL" &&
      effectivePlanType === "EXPIRED" &&
      !expireMutation.isPending
    ) {
      expireMutation.mutate(subscription.id);
    }
  }, [subscription, effectivePlanType, expireMutation]);

  const daysRemainingInTrial = useCallback((): number => {
    if (!subscription?.trial_expires_at) return 0;
    const expires = new Date(subscription.trial_expires_at);
    const now = new Date();
    const diff = expires.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [subscription]);

  const isUnlimitedEmail = useCallback(() => {
    const unlimitedEmails = ["mesquitafelipe028@gmail.com", "elisiane0708@gmail.com", "demo@vektor.app"];
    return !!user?.email && unlimitedEmails.includes(user.email.toLowerCase());
  }, [user?.email]);

  const isIAEnabled = effectivePlanType === "PAID" || isUnlimitedEmail();
  const canAddTransaction =
    effectivePlanType === "TRIAL" || effectivePlanType === "PAID" || isUnlimitedEmail();
  const isExpired = !isUnlimitedEmail() && (effectivePlanType === "EXPIRED" || effectivePlanType === "FREE");
  const isTrial = effectivePlanType === "TRIAL" && !isUnlimitedEmail();
  const isPaid = effectivePlanType === "PAID" || isUnlimitedEmail();

  return {
    subscription,
    isLoading,
    effectivePlanType,
    isIAEnabled,
    canAddTransaction,
    isExpired,
    isTrial,
    isPaid,
    isUnlimited: isUnlimitedEmail(),
    daysRemainingInTrial,
    checkUserAccess,
  };
}
