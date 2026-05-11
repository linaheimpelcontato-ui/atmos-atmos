import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowLeft, Mail, User, Phone, MapPin, Calendar, Lock, Check, ChevronRight, Globe, Eye, EyeOff, ChevronsUpDown } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { trackSignup, trackLogin } from "@/lib/analytics";
import { storageUrl } from "@/lib/storage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Country, State, City } from 'country-state-city';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultMode?: "login" | "signup";
}

type Step = "welcome" | "login" | "name" | "phone" | "birthdate" | "location" | "password" | "success" | "reset";

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

const loginImage = `${storageUrl("home/foto-login.jpg")}?v=2`;

const normalizeString = (str: string) => 
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");

  const allCountries = Country.getAllCountries();
  const statesOfCountry = country ? State.getStatesOfCountry(country) : [];
  const citiesOfState = (country && state) ? City.getCitiesOfState(country, state) : [];
  const [authMode, setAuthMode] = useState<"login" | "signup">(defaultMode);
  const [showPassword, setShowPassword] = useState(false);

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
    if (user && profile && step === "welcome") {
      if (profile.full_name && !fullName) setFullName(profile.full_name);
      if (profile.phone && !phone) setPhone(profile.phone);
      if (!method) setMethod("google");
      setStep("name");
    }
  }, [user, profile, step]);

  const handleNext = async () => {
    setError(null);

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
      } else {
        if (!email || !password) { setError("Defina e-mail e senha."); return; }
        if (password.length < 6) { setError("A senha deve ter no mínimo 6 caracteres."); return; }
        if (password !== confirmPassword) { setError("As senhas não coincidem."); return; }
        setStep("name"); 
      }
    }
    else if (step === "name") {
      if (!fullName || fullName.trim().length < 3) { setError("Conte-nos seu nome completo."); return; }
      setStep("phone");
    }
    else if (step === "phone") {
      if (!phone || phone.length < 10) { setError("Precisamos do seu telefone para contato."); return; }
      
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
      setStep("birthdate");
    }
    else if (step === "birthdate") {
      if (!birthDay || !birthMonth || !birthYear) { setError("Sua data de nascimento é importante."); return; }
      const bDay = parseInt(birthDay);
      const bMonth = parseInt(birthMonth);
      const bYear = parseInt(birthYear);
      const date = new Date(bYear, bMonth - 1, bDay);
      if (date.getFullYear() !== bYear || date.getMonth() !== bMonth - 1 || date.getDate() !== bDay) {
        setError("Data de nascimento inválida."); 
        return;
      }
      setStep("location");
    }
    else if (step === "location") {
      if (!city.trim() || (country === "BR" && !state)) { 
        setError("Conte-nos de onde você vê a Atmos."); 
        return; 
      }
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
        const { error: signUpError } = await signUp(email, password, profileData);
        if (signUpError) {
          const { error: signInError } = await signIn(email, password);
          if (!signInError) {
            await updateProfile(profileData);
          } else {
            throw new Error("E-mail já cadastrado. Verifique sua senha.");
          }
        }
      } else {
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
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-none w-screen h-[calc(100vh-80px)] top-[80px] p-0 border-none shadow-none !rounded-none bg-white z-[50] translate-y-0 [&>button]:hidden overflow-hidden">
        <div 
          role="button"
          onClick={() => {
            if (user) signOut();
            onClose();
          }}
          className="absolute top-6 right-10 w-12 h-12 bg-white/90 backdrop-blur-md rounded-full shadow-2xl flex items-center justify-center group hover:bg-white transition-all z-[100] border border-black/5 cursor-pointer"
        >
          <X className="h-5 w-5 text-black group-hover:scale-110 transition-transform" />
        </div>

        <div className="w-full h-full overflow-y-auto">
          <div className="flex flex-col lg:flex-row h-full w-full">
            
            <div className="w-full lg:w-1/2 flex flex-col relative min-h-full">
              {currentStepIndex !== -1 && step !== "success" && (
                <div className="absolute top-0 left-0 w-full h-1 bg-[#F5F5F5] z-[70]">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-[#A88B4C]" />
                </div>
              )}

              <div className="flex-1 flex flex-col items-start justify-center px-10 md:px-24 pt-16 pb-16">
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
                        <div className="space-y-12 animate-in fade-in duration-700">
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
                              <svg className="h-6 w-6" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/></svg>
                              Continuar com Google
                            </Button>
                            <div className="flex items-center gap-4">
                              <div className="flex-grow h-px bg-black/5"></div>
                              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-black/20">ou e-mail</span>
                              <div className="flex-grow h-px bg-black/5"></div>
                            </div>
                            <form 
                              onSubmit={(e) => { e.preventDefault(); handleNext(); }}
                              className="space-y-4"
                            >
                              <Input placeholder="E-mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-16 rounded-2xl border-black/5 bg-[#FDFCFB] text-lg shadow-sm px-6" />
                              {authMode === "signup" && <Input placeholder="Senha" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-16 rounded-2xl border-black/5 bg-[#FDFCFB] text-lg shadow-sm px-6" />}
                              {authMode === "signup" && (
                                <div className="relative">
                                  <Input 
                                    placeholder="Confirme sua senha" 
                                    type={showPassword ? "text" : "password"} 
                                    autoComplete="new-password" 
                                    value={confirmPassword} 
                                    onChange={(e) => setConfirmPassword(e.target.value)} 
                                    className={cn(
                                      "h-16 rounded-2xl border-black/5 bg-[#FDFCFB] text-lg shadow-sm px-6 transition-all",
                                      confirmPassword && password && confirmPassword !== password && "border-red-500 focus:ring-red-500",
                                      confirmPassword && password && confirmPassword === password && "border-green-500 focus:ring-green-500"
                                    )} 
                                  />
                                  {confirmPassword && password && confirmPassword === password && (
                                    <Check className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                                  )}
                                </div>
                              )}
                              {authMode === "login" && (
                                <div className="relative">
                                  <Input placeholder="Senha" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-16 rounded-2xl border-black/5 bg-[#FDFCFB] text-lg shadow-sm px-6" />
                                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-black/20 hover:text-black transition-colors">{showPassword ? "Ocultar" : "Mostrar"}</button>
                                </div>
                              )}
                              {error && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">{error}</p>}
                              <Button type="submit" disabled={loading} className="w-full h-16 rounded-2xl bg-[#1A261B] text-white hover:bg-black font-bold uppercase tracking-widest text-[11px] flex items-center justify-center gap-3">
                                {loading ? <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <>{authMode === "signup" ? "Criar conta" : "Acessar portal"} <ChevronRight className="h-4 w-4" /></>}
                              </Button>
                            </form>
                          </div>
                        </div>
                      )}

                      {step === "login" && (
                        <div className="space-y-12 animate-in fade-in duration-700">
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

                      {(step === "name" || step === "phone" || step === "birthdate" || step === "location") && (
                        <div className="space-y-12 animate-in fade-in duration-700">
                          <h3 className="text-4xl font-display text-[#1A261B] leading-tight">
                            {step === "name" && <>Nome Completo</>}
                            {step === "phone" && <>Insira seu numero de celular</>}
                            {step === "birthdate" && <>Data de nascimento</>}
                            {step === "location" && <>Onde você mora?</>}
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
                              <div className="space-y-6">
                                <div className="space-y-2">
                                  <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-black/40 pl-1">País</label>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button variant="outline" role="combobox" className="w-full h-16 rounded-2xl border-black/5 bg-[#FDFCFB] justify-between px-6 text-lg font-normal hover:bg-white hover:border-[#A88B4C]/30 transition-all">
                                        <span className="truncate">{country ? allCountries.find(c => c.isoCode === country)?.name : "Selecione o País"}</span>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-2xl border-black/5 shadow-2xl z-[100]">
                                      <Command 
                                        className="rounded-2xl"
                                        filter={(value, search) => {
                                          if (normalizeString(value).includes(normalizeString(search))) return 1;
                                          return 0;
                                        }}
                                      >
                                        <CommandInput placeholder="Procurar país..." className="h-14" />
                                        <CommandEmpty>País não encontrado.</CommandEmpty>
                                        <CommandGroup className="max-h-60 overflow-y-auto">
                                          {allCountries.map((c) => (
                                            <CommandItem
                                              key={c.isoCode}
                                              value={c.name}
                                              onSelect={() => {
                                                setCountry(c.isoCode);
                                                setState("");
                                                setCity("");
                                              }}
                                              className="h-12 px-4 cursor-pointer hover:bg-black/5"
                                            >
                                              <Check className={cn("mr-2 h-4 w-4", country === c.isoCode ? "opacity-100" : "opacity-0")} />
                                              {c.name}
                                            </CommandItem>
                                          ))}
                                        </CommandGroup>
                                      </Command>
                                    </PopoverContent>
                                  </Popover>
                                </div>

                                {statesOfCountry.length > 0 && (
                                  <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-500">
                                    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-black/40 pl-1">Estado / Província</label>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" className="w-full h-16 rounded-2xl border-black/5 bg-[#FDFCFB] justify-between px-6 text-lg font-normal hover:bg-white hover:border-[#A88B4C]/30 transition-all">
                                          <span className="truncate">{state ? statesOfCountry.find(s => s.isoCode === state)?.name : "Selecione o Estado"}</span>
                                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-2xl border-black/5 shadow-2xl z-[100]">
                                        <Command 
                                          className="rounded-2xl"
                                          filter={(value, search) => {
                                            if (normalizeString(value).includes(normalizeString(search))) return 1;
                                            return 0;
                                          }}
                                        >
                                          <CommandInput placeholder="Procurar estado..." className="h-14" />
                                          <CommandEmpty>Estado não encontrado.</CommandEmpty>
                                          <CommandGroup className="max-h-60 overflow-y-auto">
                                            {statesOfCountry.map((s) => (
                                              <CommandItem
                                                key={s.isoCode}
                                                value={s.name}
                                                onSelect={() => {
                                                  setState(s.isoCode);
                                                  setCity("");
                                                }}
                                                className="h-12 px-4 cursor-pointer hover:bg-black/5"
                                              >
                                                <Check className={cn("mr-2 h-4 w-4", state === s.isoCode ? "opacity-100" : "opacity-0")} />
                                                {s.name}
                                              </CommandItem>
                                            ))}
                                          </CommandGroup>
                                        </Command>
                                      </PopoverContent>
                                    </Popover>
                                  </div>
                                )}

                                <div className="space-y-2">
                                  <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-black/40 pl-1">Cidade</label>
                                  {citiesOfState.length > 0 ? (
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" className="w-full h-16 rounded-2xl border-black/5 bg-[#FDFCFB] justify-between px-6 text-lg font-normal hover:bg-white hover:border-[#A88B4C]/30 transition-all">
                                          <span className="truncate">{city || "Selecione a Cidade"}</span>
                                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-2xl border-black/5 shadow-2xl z-[100]">
                                        <Command 
                                          className="rounded-2xl"
                                          filter={(value, search) => {
                                            if (normalizeString(value).includes(normalizeString(search))) return 1;
                                            return 0;
                                          }}
                                        >
                                          <CommandInput placeholder="Procurar cidade..." className="h-14" />
                                          <CommandEmpty>Cidade não encontrada.</CommandEmpty>
                                          <CommandGroup className="max-h-60 overflow-y-auto">
                                            {citiesOfState.map((c) => (
                                              <CommandItem
                                                key={c.name}
                                                value={c.name}
                                                onSelect={() => setCity(c.name)}
                                                className="h-12 px-4 cursor-pointer hover:bg-black/5"
                                              >
                                                <Check className={cn("mr-2 h-4 w-4", city === c.name ? "opacity-100" : "opacity-0")} />
                                                {c.name}
                                              </CommandItem>
                                            ))}
                                          </CommandGroup>
                                        </Command>
                                      </PopoverContent>
                                    </Popover>
                                  ) : (
                                    <Input 
                                      placeholder="Digite o nome da sua cidade" 
                                      value={city} 
                                      onChange={(e) => setCity(e.target.value)} 
                                      className="h-16 rounded-2xl border-black/5 bg-[#FDFCFB] text-lg shadow-sm px-6" 
                                    />
                                  )}
                                </div>
                              </div>
                            )}

                            {error && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">{error}</p>}
                            <Button type="submit" disabled={loading} className="w-full h-16 rounded-2xl bg-[#1A261B] text-white hover:bg-black font-bold uppercase tracking-widest text-[11px] flex items-center justify-center gap-3">
                              {loading ? <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <>Avançar <ChevronRight className="h-4 w-4" /></>}
                            </Button>
                            <div className="flex flex-col items-center gap-2">
                              <button 
                                type="button"
                                onClick={() => {
                                  const steps: Step[] = ["welcome", "name", "phone", "birthdate", "location"];
                                  const idx = steps.indexOf(step);
                                  if (idx > 0) setStep(steps[idx - 1]);
                                }}
                                className="w-full text-[10px] uppercase tracking-[0.2em] font-bold text-black/20 hover:text-black transition-colors py-2"
                              >
                                Voltar
                              </button>
                              <button 
                                type="button"
                                onClick={() => {
                                  signOut();
                                  setStep("welcome");
                                }}
                                className="w-full text-[10px] uppercase tracking-[0.2em] font-bold text-black/10 hover:text-black/40 transition-colors py-2"
                              >
                                Sair da conta
                              </button>
                            </div>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
