"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { validatePinAndLogin, getRestaurantNameByPin } from "@/app/actions";
import { setAuth, PIN_TO_RESTAURANT, hasValidSession, normalizePIN, clearAuth, type RestaurantId } from "@/lib/auth";
import { Lock } from "lucide-react";

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 60 * 1000; // 60 seconds in milliseconds

/**
 * Access page - PIN entry for restaurant authentication
 */
export default function AccessPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0);
  const [hasCheckedSession, setHasCheckedSession] = useState(false);

  // Check for valid session on mount (only once)
  useEffect(() => {
    // Only check once on mount, avoid loops
    if (hasCheckedSession) return;
    
    const checkSession = () => {
      try {
        if (typeof window !== "undefined" && hasValidSession()) {
          setHasCheckedSession(true);
          // Use replace to avoid adding to history and prevent loops
          router.replace("/hoje");
        } else {
          setHasCheckedSession(true);
        }
      } catch (error) {
        console.error("Error checking session:", error);
        // If there's an error, clear session and stay on access page
        if (typeof window !== "undefined") {
          clearAuth();
        }
        setHasCheckedSession(true);
      }
    };
    
    // Small delay to ensure localStorage is ready and avoid hydration issues
    const timeoutId = setTimeout(checkSession, 200);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Check if PIN has a restaurant name when PIN is 6 digits
  useEffect(() => {
    const checkRestaurantName = async () => {
      if (pin.length === 6) {
        try {
          // Try both 6-digit and normalized (4-digit padded) versions
          const normalizedPin = normalizePIN(pin);
          const name = await getRestaurantNameByPin(normalizedPin);
          setRestaurantName(name);
        } catch (error) {
          // Silently fail - this is just for display
          setRestaurantName(null);
        }
      } else {
        setRestaurantName(null);
      }
    };

    const timeoutId = setTimeout(checkRestaurantName, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [pin]);

  // Handle lockout timer
  useEffect(() => {
    if (!isLocked) return;

    const interval = setInterval(() => {
      const timeLeft = Math.ceil(lockoutTimeLeft / 1000);
      setLockoutTimeLeft((prev) => {
        const newTime = prev - 1000;
        if (newTime <= 0) {
          setIsLocked(false);
          setFailedAttempts(0);
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isLocked, lockoutTimeLeft]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Check if locked out
    if (isLocked) {
      return;
    }

    // Validate PIN length
    if (pin.length !== 6) {
      setError("O PIN deve ter 6 dígitos.");
      return;
    }

    setIsSubmitting(true);

    // Normalize PIN (handle 4-digit backward compatibility)
    const normalizedPin = normalizePIN(pin);
    
    // Validate PIN via server action
    const result = await validatePinAndLogin(normalizedPin);

    if (!result.success) {
      // Increment failed attempts
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        setIsLocked(true);
        setLockoutTimeLeft(LOCKOUT_DURATION);
        setError("Demasiadas tentativas. Tente novamente dentro de 1 minuto.");
      } else {
        setError("PIN inválido. Verifique e tente novamente.");
      }
      setIsSubmitting(false);
      return;
    }

    // Success - reset failed attempts
    setFailedAttempts(0);

    // Get restaurant ID from PIN mapping for localStorage
    const restaurantId = PIN_TO_RESTAURANT[normalizedPin] as RestaurantId | undefined;
    
    if (!restaurantId) {
      setError("PIN não está associado a um restaurante válido.");
      setIsSubmitting(false);
      return;
    }

    // Set authentication in localStorage with session
    setAuth(restaurantId, normalizedPin);

    // Small delay for better UX
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Redirect based on whether restaurant has a name
    if (result.needsOnboarding) {
      router.push("/onboarding");
    } else {
      router.push("/hoje");
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ""); // Only numbers
    if (value.length <= 6) {
      setPin(value);
      setError(null); // Clear error when user types
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      {/* Mobile-first card: full width on mobile, max-w-sm on desktop with better spacing */}
      <Card className="w-full max-w-sm bg-white rounded-xl shadow-md mt-8">
        <CardHeader className="space-y-2 text-center pb-4">
          <div className="mx-auto mb-3 rounded-full bg-primary/10 p-3 md:p-4">
            <Lock className="h-6 w-6 md:h-7 md:w-7 text-primary" />
          </div>
          <CardTitle className="text-xl md:text-2xl font-bold">Acesso Clearstock</CardTitle>
          <CardDescription className="text-sm md:text-base">
            Introduza o PIN de 6 dígitos do seu restaurante.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {restaurantName && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-700 text-center">
              PIN associado a: <span className="font-semibold">{restaurantName}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin" className="text-sm font-medium">PIN (6 dígitos)</Label>
              {/* Large PIN input for easy mobile entry */}
              <Input
                id="pin"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pin}
                onChange={handlePinChange}
                placeholder="000000"
                maxLength={6}
                className="text-center text-2xl md:text-3xl tracking-widest h-14 md:h-16"
                autoFocus
                disabled={isSubmitting || isLocked}
                required
              />
            </div>

            {error && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {isLocked && lockoutTimeLeft > 0 && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700 text-center">
                Tente novamente em {Math.ceil(lockoutTimeLeft / 1000)} segundos.
              </div>
            )}

            {/* Full-width button with indigo styling */}
            <Button
              type="submit"
              className="w-full bg-indigo-600 text-white rounded-lg py-3 px-4 shadow-md hover:bg-indigo-700 h-11 md:h-12 text-base md:text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || isLocked || pin.length !== 6}
            >
              {isSubmitting ? "A verificar..." : isLocked ? "Bloqueado" : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

