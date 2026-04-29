import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, CheckCircle2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { storageUrl } from "@/lib/storage";

const logoAtmos = storageUrl("home/logo-atmos.png");

type Mode = "forgot" | "reset" | "done";

export default function ResetPassword() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("forgot");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentEmail, setSentEmail] = useState(false);

  // Detect recovery token in URL hash
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setMode("reset");
    }
  }, []);

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError(t("auth.error.email"));
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSentEmail(true);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError(t("auth.reset.error.min"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("auth.reset.error.match"));
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setMode("done");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <a href="/">
            <img src={logoAtmos} alt="ATMOS" className="h-16" />
          </a>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-primary text-primary-foreground px-6 py-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              {mode === "done" ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : (
                <Lock className="h-6 w-6" />
              )}
            </div>
            <h1 className="text-xl font-bold mb-1">
              {mode === "reset" ? t("auth.reset.title") : mode === "done" ? t("auth.reset.success") : t("auth.forgot.title")}
            </h1>
            {mode !== "done" && (
              <p className="text-sm opacity-80 max-w-xs mx-auto">
                {mode === "reset" ? t("auth.reset.subtitle") : t("auth.forgot.subtitle")}
              </p>
            )}
          </div>

          <div className="px-6 py-6">
            {/* Success */}
            {mode === "done" ? (
              <div className="text-center py-4">
                <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-6">{t("auth.reset.success")}</p>
                <Button className="rounded-full w-full" onClick={() => navigate("/")}>
                  {t("auth.reset.goto")}
                </Button>
              </div>
            ) : mode === "reset" ? (
              /* New password form */
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">{t("auth.reset.field")}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 pr-9"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">{t("auth.reset.confirm")}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type={showConfirm ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-9 pr-9"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
                )}

                <Button type="submit" className="w-full rounded-full" disabled={loading}>
                  {loading ? t("auth.loading") : t("auth.reset.save")}
                </Button>
              </form>
            ) : sentEmail ? (
              /* Link sent */
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-7 w-7 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                  {t("auth.forgot.sent")}
                </p>
                <p className="text-sm font-semibold text-foreground">{email}</p>
                <Button
                  variant="outline"
                  className="mt-6 rounded-full w-full"
                  onClick={() => navigate("/")}
                >
                  {t("auth.forgot.back")}
                </Button>
              </div>
            ) : (
              /* Send link form */
              <form onSubmit={handleSendLink} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-email">{t("auth.field.email")}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
                )}

                <Button type="submit" className="w-full rounded-full" disabled={loading}>
                  {loading ? t("auth.loading") : t("auth.forgot.send")}
                </Button>

                <p className="text-center text-sm">
                  <button
                    type="button"
                    onClick={() => navigate("/")}
                    className="text-muted-foreground hover:text-primary hover:underline transition-colors"
                  >
                    {t("auth.forgot.back")}
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
