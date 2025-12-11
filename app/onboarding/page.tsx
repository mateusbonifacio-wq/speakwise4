"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateRestaurantName, getRestaurantNameByPin } from "@/app/actions";
import { Store } from "lucide-react";
import { toast } from "sonner";
import { getRestaurantId, PIN_TO_RESTAURANT } from "@/lib/auth";

/**
 * Onboarding page - Set restaurant name for new PINs
 */
export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  const hasCheckedRef = useRef(false);

  // Check if restaurant already has a name and redirect if so
  // CRITICAL FIX: Use ref to prevent multiple checks and remove router from deps
  useEffect(() => {
    // Only check once
    if (hasCheckedRef.current) {
      console.log("[OnboardingPage] Already checked, skipping");
      return;
    }
    
    const checkExistingName = async () => {
      try {
        const restaurantId = getRestaurantId();
        if (restaurantId) {
          // Find PIN for this restaurant ID
          const pin = Object.entries(PIN_TO_RESTAURANT).find(
            ([_, id]) => id === restaurantId
          )?.[0];
          
          if (pin) {
            console.log("[OnboardingPage] Checking existing name for PIN:", pin);
            const existingName = await getRestaurantNameByPin(pin);
            if (existingName) {
              // Restaurant already has a name, redirect to dashboard
              console.log("[OnboardingPage] Restaurant already has name, redirecting to /hoje");
              hasCheckedRef.current = true;
              router.push("/hoje");
            } else {
              hasCheckedRef.current = true;
            }
          } else {
            hasCheckedRef.current = true;
          }
        } else {
          hasCheckedRef.current = true;
        }
      } catch (error) {
        console.error("[OnboardingPage] Error checking existing name:", error);
        hasCheckedRef.current = true;
      }
    };
    
    checkExistingName();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once - router is stable, don't include in deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Por favor, introduza um nome para o restaurante.");
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("name", name.trim());
        
        const result = await updateRestaurantName(formData);
        
        if (result?.success) {
          toast.success("Nome do restaurante guardado com sucesso!");
          // Redirect to dashboard
          router.push("/hoje");
        } else {
          toast.error("Erro ao guardar nome", {
            description: result?.error || "Ocorreu um erro ao guardar o nome do restaurante.",
          });
        }
      } catch (error) {
        console.error("Unexpected error:", error);
        toast.error("Erro inesperado", {
          description: "Ocorreu um erro inesperado. Por favor, tente novamente.",
        });
      }
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-sm bg-white rounded-xl shadow-md">
        <CardHeader className="space-y-2 text-center pb-4">
          <div className="mx-auto mb-3 rounded-full bg-primary/10 p-3 md:p-4">
            <Store className="h-6 w-6 md:h-7 md:w-7 text-primary" />
          </div>
          <CardTitle className="text-xl md:text-2xl font-bold">
            Como se chama o seu restaurante?
          </CardTitle>
          <CardDescription className="text-sm md:text-base">
            Introduza o nome do seu restaurante para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Nome do restaurante
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Café Morais"
                className="h-11 md:h-12 text-base"
                autoFocus
                disabled={isPending}
                required
                maxLength={100}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-indigo-600 text-white rounded-lg py-3 px-4 shadow-md hover:bg-indigo-700 h-11 md:h-12 text-base md:text-lg font-semibold"
              disabled={isPending || !name.trim()}
            >
              {isPending ? "A guardar..." : "Guardar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

