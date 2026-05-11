import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowLeft, Mail, User, Phone, MapPin, Calendar, Lock, Check, ChevronRight, Globe, Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { trackSignup, trackLogin } from "@/lib/analytics";
import { storageUrl } from "@/lib/storage";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultMode?: "login" | "signup";
}

type Step = "welcome" | "login" | "name" | "phone" | "birthdate" | "location" | "password" | "success" | "reset";

const brazilianStates = [
  { code: "AC", name: "Acre" }, { code: "AL", name: "Alagoas" }, { code: "AP", name: "Amapá" },
  { code: "AM", name: "Amazonas" }, { code: "BA", name: "Bahia" }, { code: "CE", name: "Ceará" },
  { code: "DF", name: "Distrito Federal" }, { code: "ES", name: "Espírito Santo" }, { code: "GO", name: "Goiás" },
  { code: "MA", name: "Maranhão" }, { code: "MT", name: "Mato Grosso" }, { code: "MS", name: "Mato Grosso do Sul" },
  { code: "MG", name: "Minas Gerais" }, { code: "PA", name: "Pará" }, { code: "PB", name: "Paraíba" },
  { code: "PR", name: "Paraná" }, { code: "PE", name: "Pernambuco" }, { code: "PI", name: "Piauí" },
  { code: "RJ", name: "Rio de Janeiro" }, { code: "RN", name: "Rio Grande do Norte" }, { code: "RS", name: "Rio Grande do Sul" },
  { code: "RO", name: "Rondônia" }, { code: "RR", name: "Roraima" }, { code: "SC", name: "Santa Catarina" },
  { code: "SP", name: "São Paulo" }, { code: "SE", name: "Sergipe" }, { code: "TO", name: "Tocantins" }
];

const dddToState: Record<string, string> = {
  "11": "SP", "12": "SP", "13": "SP", "14": "SP", "15": "SP", "16": "SP", "17": "SP", "18": "SP", "19": "SP",
  "21": "RJ", "22": "RJ", "24": "RJ",
  "27": "ES", "28": "ES",
  "31": "MG", "32": "MG", "33": "MG", "34": "MG", "35": "MG", "37": "MG", "38": "MG",
  "41": "PR", "42": "PR", "43": "PR", "44": "PR", "45": "PR", "46": "PR",
  "47": "SC", "48": "SC", "49": "SC",
  "51": "RS", "53": "RS", "54": "RS", "55": "RS",
  "61": "DF",
  "62": "GO", "64": "GO",
  "63": "TO",
  "65": "MT", "66": "MT",
  "67": "MS",
  "68": "AC",
  "69": "RO",
  "71": "BA", "73": "BA", "74": "BA", "75": "BA", "77": "BA",
  "79": "SE",
  "81": "PE", "87": "PE",
  "82": "AL",
  "83": "PB",
  "84": "RN",
  "85": "CE", "88": "CE",
  "86": "PI", "89": "PI",
  "91": "PA", "93": "PA", "94": "PA",
  "92": "AM", "97": "AM",
  "95": "RR",
  "96": "AP",
  "98": "MA", "99": "MA"
};

const ddiToCountry: Record<string, string> = {
  "+55": "BR", "+1": "US", "+54": "AR", "+595": "PY", "+598": "UY", "+56": "CL",
  "+51": "PE", "+57": "CO", "+58": "VE", "+591": "BO", "+593": "EC", "+52": "MX",
  "+351": "PT", "+34": "ES", "+33": "FR", "+39": "IT", "+49": "DE", "+44": "GB",
  "+41": "CH", "+31": "NL", "+32": "BE", "+353": "IE", "+46": "SE", "+47": "NO",
  "+45": "DK", "+358": "FI", "+48": "PL", "+43": "AT", "+30": "GR", "+7": "RU",
  "+81": "JP", "+82": "KR", "+86": "CN", "+91": "IN", "+61": "AU", "+64": "NZ",
  "+972": "IL", "+971": "AE", "+27": "ZA"
};

const countries = [
  { code: "BR", name: "Brasil" }, { code: "US", name: "Estados Unidos" }, { code: "AR", name: "Argentina" },
  { code: "PY", name: "Paraguai" }, { code: "UY", name: "Uruguai" }, { code: "CL", name: "Chile" },
  { code: "PE", name: "Peru" }, { code: "CO", name: "Colômbia" }, { code: "VE", name: "Venezuela" },
  { code: "BO", name: "Bolívia" }, { code: "EC", name: "Equador" }, { code: "MX", name: "México" },
  { code: "PT", name: "Portugal" }, { code: "ES", name: "Espanha" }, { code: "FR", name: "França" },
  { code: "IT", name: "Itália" }, { code: "DE", name: "Alemanha" }, { code: "GB", name: "Reino Unido" },
  { code: "CH", name: "Suíça" }, { code: "NL", name: "Holanda" }, { code: "BE", name: "Bélgica" },
  { code: "IE", name: "Irlanda" }, { code: "SE", name: "Suécia" }, { code: "NO", name: "Noruega" },
  { code: "DK", name: "Dinamarca" }, { code: "FI", name: "Finlândia" }, { code: "PL", name: "Polônia" },
  { code: "AT", name: "Áustria" }, { code: "GR", name: "Grécia" }, { code: "RU", name: "Rússia" },
  { code: "JP", name: "Japão" }, { code: "KR", name: "Coreia do Sul" }, { code: "CN", name: "China" },
  { code: "IN", name: "Índia" }, { code: "AU", name: "Austrália" }, { code: "NZ", name: "Nova Zelândia" },
  { code: "IL", name: "Israel" }, { code: "AE", name: "Emirados Árabes" }, { code: "ZA", name: "África do Sul" },
];

const loginImage = storageUrl("home/foto-login.jpg");

export default function AuthModal({ open, onClose, onSuccess, defaultMode = "signup" }: AuthModalProps) {
  const { signIn, signUp, signInWithGoogle, updateProfile, profile, user, session, resetPassword, signOut } = useAuth();
  
  const [step, setStep] = useState<Step>("welcome");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<"google" | "email" | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [country, setCountry] = useState("BR");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">(defaultMode);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (open) {
      setAuthMode(defaultMode);
      setStep("welcome");
      setError(null);
    }
  }, [open, defaultMode]);

  const stepsList: Step[] = ["name", "phone", "birthdate", "location"];
  const currentStepIndex = stepsList.indexOf(step);
  const progress = ((currentStepIndex + 1) / stepsList.length) * 100;

  useEffect(() => {
    if (user && step !== "success") {
      // Se temos o usuário mas o perfil ainda não carregou, esperamos
      if (!profile) return;

      const needsOnboarding = !profile.full_name || !profile.phone;
      
      if (needsOnboarding) {
        if (!profile.full_name) setStep("name");
        else if (!profile.phone) setStep("phone");
        // ... outros campos se necessário
      } else if (step !== "welcome") {
        // Se já completou tudo, podemos fechar
        onSuccess();
        onClose();
      }
    }
  }, [user, profile, step]);

  const handleNext = async () => {
    setError(null);
    if (step === "name" && !fullName.trim()) { setError("Seu nome é essencial."); return; }
    if (step === "phone") {
      if (phone.startsWith("+55")) {
        const ddd = phone.substring(3, 5);
        if (!dddToState[ddd]) { setError("DDD brasileiro inválido."); return; }
        const number = phone.substring(5);
        if (number.length < 8 || number.length > 9) { setError("Número de celular inválido."); return; }
      } else if (phone.length < 10) { 
        setError("O celular é nossa conexão."); return; 
      }
    }
    if (step === "birthdate") {
      if (!birthDay || !birthMonth || !birthYear) { setError("Data de nascimento completa é necessária."); return; }
      const bDay = parseInt(birthDay);
      const bMonth = parseInt(birthMonth);
      const bYear = parseInt(birthYear);
      const date = new Date(bYear, bMonth - 1, bDay);
      if (date.getFullYear() !== bYear || date.getMonth() !== bMonth - 1 || date.getDate() !== bDay) {
        setError("Data de nascimento inválida."); return;
      }
    }
    if (step === "location" && (!city.trim() || (country === "BR" && !state))) { setError("Conte-nos de onde você vê a Atmos."); return; }

    if (step === "welcome") { 
      setMethod("email"); 
      const checkedEmail = email.trim().toLowerCase();
      if (checkedEmail.includes("@gmil.com")) setEmail(checkedEmail.replace("@gmil.com", "@gmail.com"));
      else if (checkedEmail.includes("@gmai.com")) setEmail(checkedEmail.replace("@gmai.com", "@gmail.com"));
      else setEmail(checkedEmail);

      if (authMode === "login") {
        if (!email || !password) { setError("Preencha e-mail e senha."); return; }
        const result = await handleEmailLogin(checkedEmail);
        if (result?.error) {
          const msg = result.error.message || "";
          if (msg.toLowerCase().includes("invalid login credentials") || msg.toLowerCase().includes("not found")) {
            setError("E-mail não encontrado. Deseja criar uma conta?");
            setAuthMode("signup");
          } else {
            setError("Senha incorreta. Verifique seus dados ou redefina sua senha.");
          }
          setLoading(false);
        }
      }
      else {
        if (!email || !password) { setError("Defina e-mail e senha."); return; }
        if (password.length < 6) { setError("A senha deve ter no mínimo 6 caracteres."); return; }
        if (password !== confirmPassword) { setError("As senhas não coincidem."); return; }
        
        // AVANÇO INSTANTÂNEO - Sem chamada ao servidor aqui para ser rápido
        setStep("name"); 
      }
    }
    else if (step === "name") {
      if (!fullName) { setError("Conte-nos seu nome."); return; }
      setStep("phone");
    }
    else if (step === "phone") {
      if (!phone) { setError("Precisamos do seu telefone."); return; }
      setStep("birthdate");
      const sortedDdis = Object.keys(ddiToCountry).sort((a, b) => b.length - a.length);
      for (const ddi of sortedDdis) {
        if (phone.startsWith(ddi)) {
          setCountry(ddiToCountry[ddi]);
          if (ddi === "+55") {
             const ddd = phone.substring(3, 5);
             if (dddToState[ddd]) setState(dddToState[ddd]);
          }
          break;
        }
      }
    }
    else if (step === "birthdate") {
      if (!birthDay || !birthMonth || !birthYear) { setError("Sua data de nascimento é importante."); return; }
      setStep("location");
    }
    else if (step === "location") {
      setLoading(true);
      await finishOnboarding();
      setLoading(false);
    }
  };

  const handleEmailLogin = async (loginEmail?: string) => {
    setLoading(true);
    try {
      const { error } = await signIn(loginEmail || email, password);
      if (error) return { error };
      setStep("success");
      trackLogin();
      setTimeout(() => { onSuccess(); onClose(); }, 1000);
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const finishOnboarding = async () => {
    setLoading(true);
    try {
      const bDate = `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`;
      const loc = country === "BR" ? `${city}, ${state}` : `${city}, ${country}`;
      const profileData = { full_name: fullName, phone, birth_date: bDate, city: loc };

      if (method === "email") {
        // Tenta criar a conta com todos os metadados de uma vez
        const { error: signUpError } = await signUp(email, password, profileData);
        
        if (signUpError) {
          // Se já existe, apenas tenta logar e atualizar o perfil
          const { error: signInError } = await signIn(email, password);
          if (!signInError) {
            await updateProfile(profileData);
          } else {
            throw new Error("E-mail já cadastrado. Verifique sua senha.");
          }
        }
      } else {
        // Para Google/Social, apenas atualiza o perfil já existente
        const { error } = await updateProfile(profileData);
        if (error) throw new Error(error);
      }
      
      setStep("success");
      trackSignup();
      setTimeout(() => { onSuccess(); onClose(); }, 1000);
    } catch (err: any) { 
      console.error("Onboarding error:", err);
      if (err.message?.includes("User not found") || err.message?.includes("invalid_grant")) {
        setError("Sessão expirada. Por favor, faça login novamente.");
        setTimeout(() => { signOut(); onClose(); }, 2000);
      } else {
        setError(err.message || "Ocorreu um erro ao finalizar seu cadastro."); 
      }
    } finally { 
      setLoading(false); 
    }
  };

  const handleGoogleSignIn = async () => {
    setMethod("google");
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) { setError("Habilite o Google Provider no Supabase."); setLoading(false); }
  };

  const HeroImage = () => {
    return (
      <div className="relative w-full h-full bg-[#1A261B]">
        <img
          src={loginImage}
          className="absolute inset-0 w-full h-full object-cover"
          alt="Atmos Landscape"
        />
        <div className="absolute inset-0 bg-black/5" />
        
        {/* Clear Close Button on the image side */}
        <button 
          onClick={() => {
            if (user) {
              signOut();
            }
            onClose();
          }}
          className="absolute top-10 right-10 w-14 h-14 bg-white/90 backdrop-blur-md rounded-full shadow-2xl flex items-center justify-center group hover:bg-white transition-all z-[80] !rounded-full"
        >
          <X className="h-6 w-6 text-black group-hover:scale-110 transition-transform" />
        </button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-none w-screen h-[calc(100vh-80px)] top-[80px] p-0 border-none shadow-none !rounded-none bg-white z-[50] translate-y-0 [&>button]:hidden overflow-y-auto">
        <div className="flex flex-col lg:flex-row h-full w-full">
          
          <div className="w-full lg:w-1/2 flex flex-col relative min-h-full">
            {currentStepIndex !== -1 && step !== "success" && (
              <div className="absolute top-0 left-0 w-full h-1 bg-[#F5F5F5] z-[70]">
                <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-[#A88B4C]" />
              </div>
            )}

            <div className="absolute top-12 left-8 md:left-24 z-[70]">
              {step !== "welcome" && step !== "success" && (
                <button onClick={() => setStep("welcome")} className="group flex items-center gap-2 text-black/20 hover:text-black transition-all">
                  <ArrowLeft className="h-5 w-5" />
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Início</span>
                </button>
              )}
            </div>

            <div className="flex-1 flex flex-col items-start justify-center px-10 md:px-24 pt-16">
              <div className="w-full max-w-lg">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="space-y-12"
                  >
                    {step === "welcome" && (
                      <div className="space-y-12">
                        <div className="space-y-6">
                          <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as "login" | "signup")} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 h-14 bg-black/[0.03] p-1 rounded-2xl">
                              <TabsTrigger 
                                value="signup" 
                                className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg font-bold tracking-tight text-xs uppercase"
                              >
                                Cadastro
                              </TabsTrigger>
                              <TabsTrigger 
                                value="login" 
                                className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg font-bold tracking-tight text-xs uppercase"
                              >
                                Login
                              </TabsTrigger>
                            </TabsList>
                          </Tabs>

                          <h2 className="text-4xl md:text-5xl font-display text-[#1A261B] leading-tight tracking-tight pt-4">
                            {authMode === "signup" ? (
                              <>Crie sua conta <span className="italic font-light text-[#A88B4C]">Atmos.</span></>
                            ) : (
                              <>Bem-vindo de <span className="italic font-light text-[#A88B4C]">volta.</span></>
                            )}
                          </h2>
                          <p className="text-lg text-black/40 font-light max-w-sm">
                            {authMode === "signup" 
                              ? "Inicie sua jornada exclusiva pela Chapada dos Veadeiros." 
                              : "Acesse seu portal exclusivo e planeje sua próxima aventura."}
                          </p>
                        </div>
                        <div className="space-y-6 max-w-sm">
                          <Button onClick={handleGoogleSignIn} className="w-full h-16 rounded-2xl bg-white border border-black/5 text-black hover:bg-[#F8F8F8] flex items-center justify-center gap-4 font-semibold shadow-xl shadow-black/5">
                            <svg className="h-6 w-6" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/></svg>
                            Continuar com Google
                          </Button>
                          <div className="flex items-center gap-4">
                            <div className="flex-grow h-px bg-black/5"></div>
                            <span className="text-[10px] uppercase tracking-widest font-bold text-black/20 italic">Ou e-mail</span>
                            <div className="flex-grow h-px bg-black/5"></div>
                          </div>
                          <form 
                            onSubmit={(e) => { e.preventDefault(); handleNext(); }}
                            className="space-y-4"
                          >
                            <div className="relative group">
                              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-black/20 group-focus-within:text-[#A88B4C] transition-colors">
                                <Mail className="h-5 w-5" />
                              </div>
                              <Input 
                                placeholder="seu@email.com" 
                                type="email" 
                                autoComplete="email"
                                className="h-16 rounded-2xl border-black/5 bg-[#FDFCFB] text-lg pl-14 pr-6 focus:ring-[#A88B4C] transition-all" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                              />
                            </div>

                            {(authMode === "login" || authMode === "signup") && (
                              <div className="relative group">
                                <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-black/20 group-focus-within:text-[#A88B4C] transition-colors">
                                  <Lock className="h-5 w-5" />
                                </div>
                                <Input 
                                  placeholder={authMode === "login" ? "Sua senha" : "Crie sua senha (mínimo 6)"}
                                  type={showPassword ? "text" : "password"} 
                                  autoComplete={authMode === "login" ? "current-password" : "new-password"}
                                  className="h-16 rounded-2xl border-black/5 bg-[#FDFCFB] text-lg pl-14 pr-14 focus:ring-[#A88B4C] transition-all" 
                                  value={password} 
                                  onChange={(e) => setPassword(e.target.value)} 
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute inset-y-0 right-6 flex items-center text-black/20 hover:text-black transition-colors"
                                >
                                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                              </div>
                            )}

                            {authMode === "signup" && password.length > 0 && (
                              <div className="relative group animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-black/20 group-focus-within:text-[#A88B4C] transition-colors">
                                  <Check className="h-5 w-5" />
                                </div>
                                <Input 
                                  placeholder="Confirme sua senha"
                                  type={showPassword ? "text" : "password"} 
                                  autoComplete="new-password"
                                  className="h-16 rounded-2xl border-black/5 bg-[#FDFCFB] text-lg pl-14 pr-6 focus:ring-[#A88B4C] transition-all" 
                                  value={confirmPassword} 
                                  onChange={(e) => setConfirmPassword(e.target.value)} 
                                />
                              </div>
                            )}

                            {authMode === "login" && (
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!email) { toast.error("Digite seu e-mail primeiro"); return; }
                                    setResetLoading(true);
                                    const { error } = await resetPassword(email);
                                    setResetLoading(false);
                                    if (error) toast.error(error);
                                    else toast.success("E-mail de recuperação enviado!");
                                  }}
                                  className="text-[10px] font-bold text-[#A88B4C] uppercase tracking-widest hover:underline"
                                >
                                  {resetLoading ? "Enviando..." : "Esqueci minha senha"}
                                </button>
                              </div>
                            )}

                            {error && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">{error}</p>}

                            <Button type="submit" disabled={loading} className="w-full h-16 rounded-2xl bg-[#1A261B] text-white hover:bg-black font-bold tracking-widest uppercase text-[11px] shadow-lg shadow-black/10 flex items-center justify-center gap-3">
                              {loading ? (
                                <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                              ) : (
                                authMode === "login" ? "Entrar na Conta" : "Começar Jornada"
                              )}
                            </Button>
                          </form>
                        </div>
                      </div>
                    )}

                    {step === "login" && (
                      <div className="space-y-12">
                        <div className="space-y-4">
                          <h2 className="text-4xl font-display text-[#1A261B] leading-tight">
                            Boas-vindas de volta.
                          </h2>
                          <p className="text-black/40 font-light">Insira sua senha para acessar sua conta.</p>
                        </div>
                        
                        <form 
                          onSubmit={(e) => { e.preventDefault(); handleNext(); }}
                          className="space-y-6 max-w-sm"
                        >
                          <div className="space-y-4">
                            <Input 
                              disabled
                              value={email}
                              className="h-16 rounded-2xl border-black/5 bg-[#F8F8F8] text-lg px-6 opacity-60"
                            />
                            <div className="relative group">
                              <Input 
                                autoFocus
                                placeholder="Sua senha" 
                                type={showPassword ? "text" : "password"} 
                                autoComplete="current-password"
                                className="h-16 rounded-2xl border-black/5 bg-[#FDFCFB] text-lg px-6 pr-14" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-6 flex items-center text-black/20 hover:text-black transition-colors"
                              >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                              </button>
                            </div>
                          </div>

                          {error && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">{error}</p>}

                          <Button type="submit" disabled={loading} className="w-full h-16 rounded-2xl bg-[#1A261B] text-white hover:bg-black font-bold uppercase tracking-widest text-[11px] flex items-center justify-center gap-3">
                            {loading ? <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <>Entrar <ChevronRight className="h-4 w-4" /></>}
                          </Button>

                          <button 
                            type="button"
                            onClick={() => setStep("welcome")}
                            className="w-full text-[10px] uppercase tracking-[0.2em] font-bold text-black/40 hover:text-black transition-colors py-2"
                          >
                            Usar outro e-mail
                          </button>
                        </form>
                      </div>
                    )}

                    {(step === "name" || step === "phone" || step === "birthdate" || step === "location" || step === "password") && (
                      <div className="space-y-12">
                        <h3 className="text-4xl font-display text-[#1A261B] leading-tight">
                          {step === "name" && <>Nome Completo</>}
                          {step === "phone" && <>Insira seu numero de celular</>}
                          {step === "birthdate" && <>Data de nascimento</>}
                          {step === "location" && <>Onde você mora?</>}
                          {step === "password" && <>Criar sua senha</>}
                        </h3>
                        <form 
                          onSubmit={(e) => { e.preventDefault(); handleNext(); }}
                          className="space-y-8 max-w-sm"
                        >
                          {step === "name" && <Input autoFocus placeholder="Digite seu nome completo" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-16 rounded-2xl border-black/5 bg-[#FDFCFB] text-lg shadow-sm px-6" />}
                          {step === "phone" && <div className="py-2"><PhoneInput value={phone} onChange={setPhone} /></div>}
                          {step === "birthdate" && (
                            <div className="flex gap-4">
                              <Select onValueChange={setBirthDay} value={birthDay}>
                                <SelectTrigger className="w-24 h-16 rounded-2xl border-black/5 bg-[#FDFCFB] shadow-sm text-lg px-4"><SelectValue placeholder="DD" /></SelectTrigger>
                                <SelectContent className="max-h-60">
                                  {Array.from({length: 31}, (_, i) => String(i + 1).padStart(2, '0')).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <Select onValueChange={setBirthMonth} value={birthMonth}>
                                <SelectTrigger className="w-24 h-16 rounded-2xl border-black/5 bg-[#FDFCFB] shadow-sm text-lg px-4"><SelectValue placeholder="MM" /></SelectTrigger>
                                <SelectContent className="max-h-60">
                                  {Array.from({length: 12}, (_, i) => String(i + 1).padStart(2, '0')).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <Select onValueChange={setBirthYear} value={birthYear}>
                                <SelectTrigger className="w-32 h-16 rounded-2xl border-black/5 bg-[#FDFCFB] shadow-sm text-lg px-4"><SelectValue placeholder="AAAA" /></SelectTrigger>
                                <SelectContent className="max-h-60">
                                  {Array.from({length: 100}, (_, i) => String(new Date().getFullYear() - 16 - i)).map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          {step === "location" && (
                            <div className="space-y-4">
                              <Select onValueChange={setCountry} value={country}><SelectTrigger className="h-16 rounded-2xl border-black/5 bg-[#FDFCFB] shadow-sm"><SelectValue placeholder="País" /></SelectTrigger><SelectContent>{countries.map((c) => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}</SelectContent></Select>
                              {country === "BR" && <Select onValueChange={setState} value={state}><SelectTrigger className="h-16 rounded-2xl border-black/5 bg-[#FDFCFB] shadow-sm"><SelectValue placeholder="Estado" /></SelectTrigger><SelectContent className="max-h-[300px]">{brazilianStates.map((s) => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}</SelectContent></Select>}
                              <Input placeholder="Cidade" value={city} onChange={(e) => setCity(e.target.value)} className="h-16 rounded-2xl border-black/5 bg-[#FDFCFB] shadow-sm px-6" />
                            </div>
                          )}

                          {error && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">{error}</p>}

                          <Button type="submit" disabled={loading} className="w-full h-16 rounded-2xl bg-[#1A261B] text-white hover:bg-black font-bold uppercase tracking-widest text-[11px] flex items-center justify-center gap-3">
                            {loading ? <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <>Avançar <ChevronRight className="h-4 w-4" /></>}
                          </Button>

                          <button 
                            type="button"
                            onClick={() => {
                              signOut();
                              setStep("welcome");
                            }}
                            className="w-full text-[10px] uppercase tracking-[0.2em] font-bold text-black/40 hover:text-black transition-colors py-2"
                          >
                            Usar outra conta
                          </button>
                        </form>
                      </div>
                    )}

                    {step === "success" && (
                      <div className="space-y-10">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 12 }} className="w-24 h-24 bg-[#D1E0D4] rounded-full flex items-center justify-center text-[#2C3E2D]"><Check className="h-12 w-12" strokeWidth={3} /></motion.div>
                        <div className="space-y-6">
                          <h3 className="text-5xl font-display text-[#1A261B]">Bem-vindo!</h3>
                          <p className="text-2xl text-black/50 font-light italic leading-relaxed">Sua jornada pessoal começou. <br />A atmosfera está <span className="text-[#A88B4C] font-semibold not-italic">pronta para você.</span></p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <div className="p-12 pl-24 flex justify-start"><img loading="lazy" src={storageUrl("home/simboloatmos.png")} className="h-10 opacity-10" alt="ATMOS" /></div>
          </div>

          <div className="hidden lg:block lg:flex-1 h-full relative">
            <HeroImage />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
