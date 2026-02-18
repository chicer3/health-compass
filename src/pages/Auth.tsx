import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Activity, Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({ title: "Check your email", description: "Password reset link has been sent." });
        setMode("login");
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast({ title: "Account created!", description: "Please check your email to verify your account." });
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-primary-foreground/20"
              style={{
                width: `${100 + i * 60}px`,
                height: `${100 + i * 60}px`,
                top: `${10 + i * 15}%`,
                left: `${5 + i * 12}%`,
                animationDelay: `${i * 0.5}s`,
              }}
            />
          ))}
        </div>
        <div className="relative z-10 flex flex-col justify-center p-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center">
              <Activity className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="font-display text-3xl font-bold text-primary-foreground">MedPulse</h1>
          </div>
          <h2 className="font-display text-4xl font-bold text-primary-foreground mb-4 leading-tight">
            Your health data,<br />beautifully organized.
          </h2>
          <p className="text-primary-foreground/80 text-lg max-w-md">
            Upload medical records, track trends, and get AI-powered insights — all in one gorgeous dashboard.
          </p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">MedPulse</h1>
          </div>

          <h2 className="font-display text-2xl font-bold text-foreground mb-1">
            {mode === "login" ? "Welcome back" : mode === "signup" ? "Create account" : "Reset password"}
          </h2>
          <p className="text-muted-foreground mb-8">
            {mode === "login"
              ? "Sign in to access your health data"
              : mode === "signup"
              ? "Start tracking your health today"
              : "We'll send you a reset link"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  required
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                required
              />
            </div>
            {mode !== "forgot" && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  required
                  minLength={6}
                />
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            {mode === "login" && (
              <>
                <button onClick={() => setMode("forgot")} className="text-primary hover:underline">
                  Forgot password?
                </button>
                <p className="mt-2 text-muted-foreground">
                  Don't have an account?{" "}
                  <button onClick={() => setMode("signup")} className="text-primary font-medium hover:underline">
                    Sign up
                  </button>
                </p>
              </>
            )}
            {mode === "signup" && (
              <p className="text-muted-foreground">
                Already have an account?{" "}
                <button onClick={() => setMode("login")} className="text-primary font-medium hover:underline">
                  Sign in
                </button>
              </p>
            )}
            {mode === "forgot" && (
              <button onClick={() => setMode("login")} className="text-primary hover:underline">
                Back to sign in
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
