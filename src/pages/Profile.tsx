import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Globe, Save, ArrowLeft, CheckCircle } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

const languageOptions: { code: Language; label: string; native: string }[] = [
  { code: "pt", label: "Português", native: "PT" },
  { code: "en", label: "English", native: "EN" },
  { code: "es", label: "Español", native: "ES" },
];

export default function Profile() {
  const { user, loading } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(language);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  // Load profile from DB
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, phone, language")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name ?? "");
          setPhone(data.phone ?? "");
          if (data.language) {
            setSelectedLanguage(data.language as Language);
          }
        }
      });
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSaving(true);

    const { error: dbError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        phone,
        language: selectedLanguage,
      })
      .eq("id", user.id);

    setSaving(false);

    if (dbError) {
      setError(t("profile.error.save"));
      return;
    }

    // Apply language change
    setLanguage(selectedLanguage);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">{t("auth.loading")}</div>
        </div>
      </Layout>
    );
  }

  if (!user) return null;

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {/* Hero */}
        <div className="bg-primary text-primary-foreground py-12">
          <div className="container max-w-2xl">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors mb-6 text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("profile.back")}
            </button>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary-foreground/20 flex items-center justify-center text-2xl font-bold">
                {fullName ? fullName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{t("profile.title")}</h1>
                <p className="text-primary-foreground/70 text-sm">{user.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="container max-w-2xl py-10">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="fullName">{t("auth.field.name")}</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-9"
                  placeholder={t("auth.placeholder.name")}
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone">{t("auth.field.phone")}</Label>
              <PhoneInput
                id="phone"
                value={phone}
                onChange={setPhone}
              />
            </div>

            {/* Language */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                {t("profile.language")}
              </Label>
              <div className="flex gap-3">
                {languageOptions.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setSelectedLanguage(lang.code)}
                    className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-semibold transition-all ${
                      selectedLanguage === lang.code
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    <span className="block text-lg mb-0.5">{lang.native}</span>
                    <span className="text-xs font-normal">{lang.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
            )}

            {saved && (
              <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 rounded-lg px-3 py-2">
                <CheckCircle className="h-4 w-4" />
                {t("profile.saved")}
              </div>
            )}

            <Button type="submit" className="w-full rounded-full gap-2" disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? t("auth.loading") : t("profile.save")}
            </Button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
