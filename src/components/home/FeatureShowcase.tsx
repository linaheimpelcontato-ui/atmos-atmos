import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  MapPin, 
  Heart, 
  Sparkles, 
  Calendar, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  Map as MapIcon, 
  ArrowRight,
  ChevronLeft,
  Users,
  Search
} from 'lucide-react';
import { storageUrl, optimizedUrl, IMAGE_PRESETS } from '@/lib/storage';

const logoAtmos = optimizedUrl("home/logo-atmos.png", IMAGE_PRESETS.thumbnail);

const JOURNEY_STEPS = [
  {
    id: 'login',
    num: '01',
    label: 'CADASTRO',
    title: 'Crie seu login no site',
    description: 'Sua jornada começa com um cadastro que te dá acesso total na plataforma exclusiva da Atmos.',
    accentColor: '#1B291C',
    icon: User
  },
  {
    id: 'curadoria',
    num: '02',
    label: 'CURADORIA',
    title: 'Acesso total à curadoria',
    description: 'Explore menus completos de cachoeiras, experiências, hospedagens e serviços selecionados.',
    accentColor: '#556952',
    icon: Sparkles
  },
  {
    id: 'preferencias',
    num: '03',
    label: 'PREFERÊNCIAS',
    title: 'Adicione suas preferências',
    description: 'Salve o que faz seu coração vibrar. Basta clicar no coração nos itens que desejar.',
    accentColor: '#540202',
    icon: Heart
  },
  {
    id: 'analise',
    num: '04',
    label: 'ANÁLISE',
    title: 'Curadoria Atmos',
    description: 'Nossa equipe estuda cada uma de suas escolhas para desenhar uma jornada autêntica, com o cuidado e a atenção que você merece.',
    accentColor: '#A88B4C',
    icon: Users
  },
  {
    id: 'roteiro',
    num: '05',
    label: 'ROTEIRO',
    title: 'Seu Roteiro Atmos',
    description: 'O resultado final: uma jornada exclusiva, otimizada e pronta para ser vivida.',
    accentColor: '#1B291C',
    icon: MapIcon
  }
];

const CURATION_CATEGORIES_DATA = {
  CACHOEIRAS: [
    { t: "BOCAINA DO FARIAS", d: "RIO PRETO", img: "produtos/cachoeiras/bocaina-do-farias/bocaina-do-farias-1.jpg" },
    { t: "COUROS", d: "ALTO PARAÍSO", img: "produtos/cachoeiras/couros/couros-1.jpg" }
  ],
  EXPERIÊNCIAS: [
    { t: "VOO DE BALÃO", d: "ALTO PARAÍSO", img: "produtos/experiencias/voo-de-balao/voo-de-balao-1.jpg" },
    { t: "PASSEIO A CAVALO", d: "FAZENDA SÃO BENTO", img: "produtos/experiencias/passeio-a-cavalo/passeio-a-cavalo-6.png" }
  ]
};

// Image optimization helper using our unified storage utility
const getOptimizedImage = (path: string, size = IMAGE_PRESETS.card) => {
  if (!path) return "";
  return optimizedUrl(path, size);
};

export default function FeatureShowcase() {
  const [step, setStep] = useState(0);
  const [subStep, setSubStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());

  const stepDuration = 8000;
  const totalTime = stepDuration * JOURNEY_STEPS.length;

  const resetTimer = (targetStep: number) => {
    const newStartTime = Date.now() - (targetStep * stepDuration);
    setStartTime(newStartTime);
    setStep(targetStep);
    setProgress(0);
    setSubStep(0);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const time = elapsed % totalTime;
      
      const currentStepIndex = Math.floor(time / stepDuration);
      setStep(currentStepIndex);
      
      const stepElapsed = time % stepDuration;
      setProgress((stepElapsed / stepDuration) * 100);

      // Sub-steps for steps 1 (Curadoria) and 2 (Preferências)
      if (currentStepIndex === 1 || currentStepIndex === 2) {
        setSubStep(Math.floor((stepElapsed / stepDuration) * 4));
      }
    }, 50);

    return () => clearInterval(interval);
  }, [startTime, stepDuration, totalTime]);

  const currentStep = JOURNEY_STEPS[step];
  const Icon = currentStep.icon;

  return (
    <section id="feature-showcase" className="min-h-screen bg-white flex items-center relative overflow-hidden py-24 lg:py-32 scroll-mt-32 lg:scroll-mt-44">
      <div className="max-w-7xl mx-auto px-6 w-full relative z-20 h-full">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 items-start">
          
          <div className="lg:col-span-6 flex flex-col gap-6 lg:gap-8 py-2">
            
            <div>
              <h2 className="text-[#2C3E2D] font-display text-3xl sm:text-4xl lg:text-5xl xl:text-6xl leading-[1] tracking-tighter mb-6">
                Como montar seu roteiro
              </h2>
              <p className="text-sm lg:text-base font-sans text-[#2C3E2D] uppercase tracking-[0.2em] font-semibold mb-8 max-w-md">
                Entenda o que você acessa ao criar seu login gratuito na ATMOS.
              </p>

              <motion.button 
                animate={{ 
                  scale: [1, 1.03, 1],
                  boxShadow: [
                    "0 0 0 0px rgba(44, 62, 45, 0.1)",
                    "0 0 0 15px rgba(44, 62, 45, 0)",
                    "0 0 0 0px rgba(44, 62, 45, 0.1)"
                  ]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                onClick={() => resetTimer((step + 1) % JOURNEY_STEPS.length)}
                className="flex items-center gap-3 bg-[#2C3E2D] text-white px-6 py-3 rounded-xl mb-4 hover:bg-[#1B291C] transition-colors group"
              >
                <span className="text-[9px] font-bold tracking-[0.3em] uppercase">Próxima Etapa</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </div>

            <div className="relative mt-4 mb-8 lg:my-4 px-4">
              <div className="absolute top-5 left-0 right-0 h-[1px] bg-[#2C3E2D]/10" />
              <div className="flex justify-between relative">
                {JOURNEY_STEPS.map((s, i) => {
                  const isActive = step === i;
                  const isDone = step > i;
                  
                  return (
                    <button 
                      key={s.id}
                      onClick={() => resetTimer(i)}
                      className="flex flex-col items-center group flex-1"
                      aria-label={`Ir para etapa ${s.label}`}
                    >
                      <motion.div 
                        animate={{ 
                          scale: isActive ? 1.15 : 1,
                          backgroundColor: (isActive || isDone) ? s.accentColor : '#F5F5F3',
                          color: (isActive || isDone) ? '#FFFFFF' : '#2C3E2D'
                        }}
                        className="w-9 h-9 lg:w-10 lg:h-10 rounded-full flex items-center justify-center text-[10px] font-bold z-10 shadow-sm transition-colors mb-3"
                      >
                        {i + 1}
                      </motion.div>
                      <span className={`text-[7px] lg:text-[8px] font-bold tracking-[0.25em] transition-all uppercase text-center h-4 ${isActive ? 'text-[#2C3E2D]' : 'text-[#2C3E2D]/60'}`}>
                        {s.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="w-full max-w-xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  style={{ backgroundColor: currentStep.accentColor }}
                  className="p-5 lg:p-6 rounded-[1.5rem] shadow-xl relative overflow-hidden group"
                >
                  <span className="absolute -bottom-6 -left-6 text-[100px] font-display font-bold text-white/[0.03] leading-none select-none">
                    {currentStep.num}
                  </span>

                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-xl bg-white/10 text-white">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[7px] font-bold tracking-[0.4em] uppercase text-white/30">
                          JORNADA ATMOS
                        </span>
                        <span className="text-[9px] font-bold text-white uppercase tracking-widest">
                          PASSO {step + 1} DE 6
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <h3 className="text-xl lg:text-2xl font-display text-white leading-tight">
                        {currentStep.title}
                      </h3>
                      <p className="text-xs lg:text-sm text-white/80 leading-relaxed max-w-lg font-medium">
                        {currentStep.description}
                      </p>
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.1, ease: "linear" }}
                      className="h-full bg-white/30"
                    />
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="lg:col-span-6 flex items-center justify-center relative min-h-[500px] lg:min-h-[600px]">
            <div className="relative w-full max-w-[360px] aspect-[9/19.5] lg:aspect-auto lg:h-[clamp(500px,75vh,750px)] lg:max-h-[750px]">
              <div className="absolute inset-0 bg-[#F5F5F3] rounded-[3.5rem] border-[12px] border-[#2C3E2D] shadow-[0_120px_240px_-40px_rgba(0,0,0,0.3)] overflow-hidden z-10">
                
                <div className="absolute top-0 inset-x-0 h-14 bg-white/90 backdrop-blur-md border-b border-[#2C3E2D]/5 px-8 flex items-center justify-between z-[60]">
                  <img loading="lazy" src={logoAtmos} alt="ATMOS" className="h-6" />
                  <div className="w-8 h-8 rounded-full bg-[#2C3E2D]/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-[#2C3E2D]" />
                  </div>
                </div>

                <div className="absolute inset-0 pt-14 overflow-hidden">
                  <AnimatePresence mode="wait">
                    
                    {step === 0 && (
                      <motion.div
                        key="login"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 pt-14 bg-cover bg-center flex items-center justify-center p-6"
                        style={{ backgroundImage: `url(${getOptimizedImage("home/about-bg.jpg", IMAGE_PRESETS.large)})` }}
                      >
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="bg-white/95 backdrop-blur-md p-8 rounded-[2.5rem] shadow-2xl w-full relative z-10 text-center">
                          <div className="w-14 h-14 rounded-full bg-[#2C3E2D]/5 flex items-center justify-center mx-auto mb-6">
                            <User className="w-7 h-7 text-[#2C3E2D]" />
                          </div>
                          <h4 className="text-xl font-display text-[#2C3E2D] mb-2 leading-tight">Bem-vindo à Atmos</h4>
                          <p className="text-[10px] text-[#2C3E2D]/50 uppercase tracking-[0.2em] mb-8">Comece sua jornada exclusiva</p>
                          <div className="flex gap-3">
                            <div className="flex-1 h-12 border border-[#2C3E2D]/10 rounded-xl flex items-center justify-center text-[9px] font-bold tracking-widest uppercase text-[#2C3E2D]">Log In</div>
                            <div className="flex-1 h-12 bg-[#2C3E2D] text-white rounded-xl flex items-center justify-center text-[9px] font-bold tracking-widest uppercase">Cadastro</div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {step === 1 && (
                      <motion.div
                        key="curadoria"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 pt-14 bg-white flex flex-col overflow-hidden"
                      >
                        <div className="bg-white shrink-0 z-30 relative border-b border-black/5">
                          <div className="p-3 pb-2 flex items-center justify-between">
                            <img loading="lazy" src={logoAtmos} className="h-4" alt="Atmos" />
                            <div className="flex gap-2">
                               <Heart className="w-4 h-4 text-[#2C3E2D]" />
                               <div className="w-5 h-5 rounded-full bg-[#2C3E2D]/10 flex items-center justify-center text-[10px] text-[#2C3E2D] font-bold">U</div>
                            </div>
                          </div>

                          <div className="px-4 pt-8 pb-4 mt-1">
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { id: 'wf', label: 'Cachoeiras', img: 'destaques-categorias/Cachoeira-Destaque-1.jpg' },
                                { id: 'exp', label: 'Experiências', img: 'destaques-categorias/Experiencias-Destaque-1.jpeg' },
                                { id: 'acc', label: 'Hospedagens', img: 'destaques-categorias/Hospedagens-Destaque-1.jpeg' },
                                { id: 'srv', label: 'Serviços', img: 'destaques-categorias/Serviços-Destaque-1.jpg' }
                              ].map((cat, i) => {
                                const isCatActive = (subStep < 2 && i === 0) || (subStep >= 2 && i === 1);
                                return (
                                  <div key={cat.id} className={`relative h-12 rounded-xl overflow-hidden border-2 transition-all ${isCatActive ? 'border-[#2C3E2D] shadow-md' : 'border-transparent opacity-60'}`}>
                                    <img 
                                      loading="lazy" 
                                      src={getOptimizedImage(cat.img, IMAGE_PRESETS.thumbnail)} 
                                      className="w-full h-full object-cover" 
                                      alt={`Categoria ${cat.label}`} 
                                    />
                                    <div className={`absolute inset-0 flex items-center justify-center ${isCatActive ? 'bg-[#2C3E2D]/40' : 'bg-black/20'}`}>
                                      <span className="text-[9px] text-white font-display tracking-widest font-bold uppercase">{cat.label}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="px-4 pb-4 space-y-3">
                            <div className="h-9 bg-[#FAF9F6] rounded-full border border-black/5 flex items-center px-4 gap-2 shadow-inner">
                              <Search className="w-3 h-3 text-black/20" />
                              <span className="text-[8px] text-black/20 uppercase tracking-widest">Buscar...</span>
                            </div>
                            <div>
                               <span className="text-[7px] font-bold text-[#A88B4C] tracking-[0.3em] uppercase block">Explorando</span>
                               <h5 className="text-base font-display text-[#2C3E2D] uppercase tracking-widest leading-none mt-1">
                                 {subStep < 2 ? "Cachoeiras" : "Experiências"}
                               </h5>
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 relative overflow-hidden bg-[#FAF9F6]">
                          <AnimatePresence mode="wait">
                            {subStep < 2 && (
                              <motion.div 
                                key="explorer-wf"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col h-full"
                              >
                                <motion.div 
                                  animate={{ 
                                    y: progress < 15 ? 0 : progress > 40 ? -240 : -((progress - 15) / 25) * 240 
                                  }}
                                  transition={{ type: "spring", damping: 30, stiffness: 100 }}
                                  className="p-4 space-y-4"
                                >
                                  {CURATION_CATEGORIES_DATA.CACHOEIRAS.map((item, i) => {
                                    const isLiked = i === 0 ? progress > 8 : progress > 32;
                                    return (
                                      <div key={i} className="rounded-2xl overflow-hidden bg-white shadow-sm border border-black/5">
                                        <div className="aspect-video relative">
                                          <img loading="lazy" src={getOptimizedImage(item.img, IMAGE_PRESETS.card)} alt={`Atmos — ${item.t}`} className="w-full h-full object-cover" />
                                          <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/40 backdrop-blur-md flex items-center justify-center">
                                            <motion.div
                                              animate={{ 
                                                scale: isLiked ? [1, 1.4, 1] : 1,
                                                color: isLiked ? "#540202" : "#FFFFFF"
                                              }}
                                              transition={{ duration: 0.3 }}
                                            >
                                              <Heart 
                                                className={`w-4 h-4 ${isLiked ? "fill-[#540202]" : ""}`} 
                                              />
                                            </motion.div>
                                          </div>
                                        </div>
                                        <div className="p-3">
                                          <h6 className="text-[10px] font-bold text-[#2C3E2D] uppercase tracking-widest">{item.t}</h6>
                                          <p className="text-[8px] text-black/40 uppercase tracking-widest mt-0.5">{item.d}</p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </motion.div>
                              </motion.div>
                            )}

                            {subStep >= 2 && (
                              <motion.div 
                                key="explorer-exp"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col h-full"
                              >
                                <motion.div 
                                  animate={{ 
                                    y: (progress - 50) < 15 ? 0 : (progress - 50) > 40 ? -240 : -(((progress - 50) - 15) / 25) * 240 
                                  }}
                                  transition={{ type: "spring", damping: 30, stiffness: 100 }}
                                  className="p-4 space-y-4"
                                >
                                  {CURATION_CATEGORIES_DATA.EXPERIÊNCIAS.map((item, i) => {
                                    const isLiked = i === 0 ? progress > 58 : progress > 82;
                                    return (
                                      <div key={i} className="rounded-2xl overflow-hidden bg-white shadow-sm border border-black/5">
                                        <div className="aspect-video relative">
                                          <img loading="lazy" src={getOptimizedImage(item.img, IMAGE_PRESETS.card)} alt={`Atmos — ${item.t}`} className="w-full h-full object-cover" />
                                          <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/40 backdrop-blur-md flex items-center justify-center">
                                            <motion.div
                                              animate={{ 
                                                scale: isLiked ? [1, 1.4, 1] : 1,
                                                color: isLiked ? "#540202" : "#FFFFFF"
                                              }}
                                              transition={{ duration: 0.3 }}
                                            >
                                              <Heart 
                                                className={`w-4 h-4 ${isLiked ? "fill-[#540202]" : ""}`} 
                                              />
                                            </motion.div>
                                          </div>
                                        </div>
                                        <div className="p-3">
                                          <h6 className="text-[10px] font-bold text-[#2C3E2D] uppercase tracking-widest">{item.t}</h6>
                                          <p className="text-[8px] text-black/40 uppercase tracking-widest mt-0.5">{item.d}</p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </motion.div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    )}

                    {step === 2 && (() => {
                      const localSubStep = progress > 35 ? 1 : 0;
                      
                      return (
                        <AnimatePresence mode="wait">
                          {localSubStep === 0 ? (
                            <motion.div
                              key="wishlist-grid"
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              className="absolute inset-0 flex flex-col"
                            >
                              <div className="bg-white shrink-0 z-30 relative border-b border-black/5">
                                <div className="p-3 pb-2 flex items-center justify-between">
                                  <img loading="lazy" src={logoAtmos} className="h-4" alt="Atmos" />
                                  <div className="flex gap-2">
                                     <Heart className="w-4 h-4 text-[#2C3E2D]" />
                                     <div className="w-5 h-5 rounded-full bg-[#2C3E2D]/10 flex items-center justify-center text-[10px] text-[#2C3E2D] font-bold">U</div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex-1 overflow-y-auto p-5 pt-10 mt-1 bg-[#FAF9F6] pb-32">
                                <div className="mb-6">
                                  <span className="text-[7px] font-bold text-[#A88B4C] tracking-[0.4em] uppercase block">Minha Seleção</span>
                                  <h5 className="text-xl font-display text-[#2C3E2D] uppercase tracking-widest leading-tight mt-1">Sua Lista de Desejos</h5>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                  {[
                                    ...CURATION_CATEGORIES_DATA.CACHOEIRAS,
                                    ...CURATION_CATEGORIES_DATA.EXPERIÊNCIAS
                                  ].map((item, i) => (
                                    <motion.div 
                                      key={i}
                                      initial={{ scale: 0.9, opacity: 0, y: 10 }}
                                      animate={{ scale: 1, opacity: 1, y: 0 }}
                                      transition={{ delay: i * 0.1 }}
                                      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-black/5 flex flex-col"
                                    >
                                      <div className="relative w-full overflow-hidden" style={{ aspectRatio: '1/1' }}>
                                        <img 
                                          src={getOptimizedImage(item.img, IMAGE_PRESETS.card)} 
                                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                        />
                                        <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/60 backdrop-blur-md flex items-center justify-center">
                                          <Heart className="w-3.5 h-3.5 text-[#540202] fill-[#540202]" />
                                        </div>
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                        <div className="absolute bottom-2.5 left-2.5 right-2.5">
                                          <h6 className="text-[9px] font-bold text-white uppercase tracking-wider line-clamp-1">{item.t}</h6>
                                          <p className="text-[7px] text-white/70 uppercase tracking-widest mt-0.5">{item.d}</p>
                                        </div>
                                      </div>
                                    </motion.div>
                                  ))}
                                </div>

                                <div className="absolute bottom-6 left-6 right-6 z-40">
                                  <motion.div
                                    animate={{ y: [0, -4, 0] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                  >
                                    <div className="w-full py-5 bg-[#2C3E2D] text-white rounded-full text-[9px] font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-2 shadow-2xl border border-white/10">
                                      Prosseguir para roteiro
                                      <ChevronRight className="w-3 h-3 text-[#A88B4C]" />
                                    </div>
                                  </motion.div>
                                </div>
                              </div>
                            </motion.div>
                          ) : (
                            <motion.div
                              key="formulario-sub"
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              className="absolute inset-0 bg-[#FAF9F6] flex flex-col overflow-hidden"
                            >
                              {/* Decorative Pattern Background */}
                              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `radial-gradient(#2C3E2D 1px, transparent 1px)`, backgroundSize: '20px 20px' }} />

                              <div className="relative z-10 flex flex-col h-full overflow-y-auto pb-28">
                                <div className="p-8 pt-12 text-center">
                                  <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="inline-block px-3 py-1 bg-[#A88B4C]/10 rounded-full mb-3"
                                  >
                                    <span className="text-[7px] font-bold text-[#A88B4C] tracking-[0.4em] uppercase">Personalização</span>
                                  </motion.div>
                                  <h5 className="text-[clamp(1.2rem,5vw,1.5rem)] font-display text-[#2C3E2D] uppercase tracking-[0.2em] leading-tight mb-2">Seu Briefing de Viagem</h5>
                                  <p className="text-[8px] text-[#2C3E2D]/60 leading-relaxed max-w-[240px] mx-auto font-medium italic">
                                    "Nossa equipe utiliza estas respostas para desenhar cada detalhe da sua logística e experiência na Chapada."
                                  </p>
                                </div>

                                <div className="px-6 space-y-3">
                                  {[
                                    { label: "Destino Escolhido", value: "Chapada dos Veadeiros", icon: MapPin },
                                    { label: "Período da Jornada", value: "15 a 22 de Julho", icon: Calendar },
                                    { label: "Perfil dos Viajantes", value: "Em Casal", icon: Users }
                                  ].map((field, i) => (
                                    <motion.div 
                                      key={i}
                                      initial={{ opacity: 0, y: 15 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: i * 0.15, type: "spring", damping: 25 }}
                                    >
                                      <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-black/[0.03] flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-[#FAF9F6] flex items-center justify-center text-[#A88B4C] shadow-inner">
                                          <field.icon className="w-3 h-3" />
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-[6px] font-bold text-black/30 uppercase tracking-[0.2em] mb-0.5">{field.label}</p>
                                          <motion.p 
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: i * 0.15 + 0.2 }}
                                            className="text-[9px] font-bold text-[#2C3E2D] uppercase tracking-wider"
                                          >
                                            {field.value}
                                          </motion.p>
                                        </div>
                                      </div>
                                    </motion.div>
                                  ))}
                                </div>

                                <div className="absolute bottom-6 left-6 right-6 z-40">
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.8 }}
                                  >
                                    <div className="w-full py-5 bg-[#2C3E2D] text-white rounded-full text-[9px] font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-2xl relative overflow-hidden group border border-white/10">
                                      <motion.div 
                                        animate={{ x: ['-100%', '200%'] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                                      />
                                      <span className="relative z-10">Enviar Briefing</span>
                                      <Sparkles className="w-3 h-3 relative z-10 text-[#A88B4C]" />
                                    </div>
                                    <p className="text-[5px] text-black/20 mt-2.5 uppercase tracking-[0.5em] text-center font-bold">
                                      Curadoria Atmos • Em tempo real
                                    </p>
                                  </motion.div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      );
                    })()}

                    {step === 3 && (
                      <motion.div
                        key="analise"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 pt-14 bg-cover bg-center"
                        style={{ backgroundImage: `url(${getOptimizedImage("produtos/cachoeiras/bocaina-do-farias/bocaina-do-farias-1.jpg", IMAGE_PRESETS.large)})` }}
                      >
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                          <motion.div 
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="relative mb-6"
                          >
                            <div className="w-20 h-20 rounded-full border-2 border-white/20 p-1">
                              <img loading="lazy" src={getOptimizedImage("home/about-bg.jpg", IMAGE_PRESETS.thumbnail)} alt="Equipe Atmos — Especialista em Chapada" className="w-full h-full rounded-full object-cover grayscale" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#2C3E2D] rounded-full flex items-center justify-center border-2 border-white">
                              <Sparkles className="w-3 h-3 text-white" />
                            </div>
                          </motion.div>
                          
                          <div className="space-y-2">
                             <span className="text-[8px] font-bold text-white/60 tracking-[0.3em] uppercase">Curadoria Atmos</span>
                             <h4 className="text-xl font-display text-white uppercase tracking-widest leading-tight">Desenhando sua Jornada</h4>
                             <p className="text-[9px] text-white/50 max-w-[180px] mx-auto leading-relaxed italic">"Nossa equipe está cuidando de cada detalhe da sua logística..."</p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {step === 4 && (() => {
                      const localSubStep = progress > 70 ? 1 : 0;
                      
                      return (
                        <AnimatePresence mode="wait">
                          {localSubStep === 0 ? (
                            <motion.div
                              key="roteiro"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 pt-14 bg-[#FAF9F6] flex overflow-hidden"
                            >
                              {/* Sidebar: Consultoria */}
                              <div className="w-[130px] bg-[#1B291C] h-full flex flex-col shrink-0 border-r border-white/5 relative overflow-hidden">
                                 <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white/5 to-transparent" />
                                 
                                 <div className="flex-1 p-5 pt-12 relative z-10">
                                   <div className="mb-10">
                                     <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 p-1 mb-4 shadow-2xl">
                                       <img loading="lazy" src={getOptimizedImage("produtos/cachoeiras/bocaina-do-farias/bocaina-do-farias-1.jpg", IMAGE_PRESETS.thumbnail)} alt="Expedição 4x4 — Bocaina do Farias" className="w-full h-full object-cover rounded-xl grayscale opacity-60" />
                                     </div>
                                     <span className="text-[7px] text-white/40 tracking-[0.4em] uppercase block leading-tight mb-1">Itinerário Atmos</span>
                                   </div>

                                   <div className="space-y-8">
                                     <div className="flex items-center gap-3">
                                       <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                         <Users className="w-3.5 h-3.5 text-[#A88B4C]" />
                                       </div>
                                       <div>
                                         <p className="text-[7px] text-white font-bold uppercase tracking-wider">Lina & Família</p>
                                         <p className="text-[5px] text-white/30 uppercase tracking-widest">Viajantes</p>
                                       </div>
                                     </div>

                                     <div className="flex items-center gap-3">
                                       <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                         <Calendar className="w-3.5 h-3.5 text-[#A88B4C]" />
                                       </div>
                                       <div>
                                         <p className="text-[7px] text-white font-bold uppercase tracking-wider">7 Dias</p>
                                         <p className="text-[5px] text-white/30 uppercase tracking-widest">Duração Total</p>
                                       </div>
                                     </div>

                                     <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                                       <div className="w-8 h-8 rounded-full bg-[#A88B4C]/20 border border-[#A88B4C]/30 flex items-center justify-center shrink-0">
                                         <User className="w-3.5 h-3.5 text-[#A88B4C]" />
                                       </div>
                                       <div>
                                         <p className="text-[7px] text-white font-bold uppercase tracking-wider">Especialista Atmos</p>
                                         <p className="text-[5px] text-white/30 uppercase tracking-widest">Consultoria Humana</p>
                                       </div>
                                     </div>
                                   </div>
                                 </div>

                                 <div className="p-5 pb-10 relative z-10">
                                    <div className="bg-[#FAF9F6]/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 mb-6">
                                      <p className="text-[6px] text-white/70 leading-relaxed font-medium italic">
                                        "Desenhamos este roteiro com o cuidado de quem conhece cada segredo da Chapada."
                                      </p>
                                    </div>
                                    <img loading="lazy" src={logoAtmos} alt="ATMOS Interface" className="h-4 opacity-30 grayscale brightness-200 ml-1" />
                                 </div>
                              </div>

                              {/* Main Itinerary Content */}
                              <div className="flex-1 flex flex-col relative overflow-hidden bg-[#FAF9F6]">
                                {/* Header */}
                                <div className="relative h-44 shrink-0 overflow-hidden">
                                  <motion.img 
                                    initial={{ scale: 1.1 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 10, repeat: Infinity, repeatType: "reverse" }}
                                    src={getOptimizedImage("destaques-categorias/Cachoeira-Destaque-1.jpg", IMAGE_PRESETS.card)} 
                                    className="w-full h-full object-cover" 
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-[#FAF9F6]" />
                                  <div className="absolute inset-0 p-8 flex flex-col justify-end">
                                     <span className="text-[8px] font-bold text-white/70 tracking-[0.4em] uppercase mb-1">Seu Roteiro Exclusivo</span>
                                     <h4 className="text-3xl font-display text-white uppercase tracking-[0.1em] leading-none">Chapada dos<br/>Veadeiros</h4>
                                  </div>
                                </div>

                                {/* Days List */}
                                <div className="flex-1 overflow-y-auto px-4 py-6 no-scrollbar relative">
                                  <div className="absolute left-8 top-8 bottom-8 w-[1px] bg-black/5" />
                                  
                                  <div className="space-y-4 relative">
                                    {[
                                      { day: "DIA 01", title: "Bocaina do Farias", desc: "A mística das águas cristalinas em meio ao cânion.", img: "produtos/cachoeiras/bocaina-do-farias/bocaina-do-farias-1.jpg" },
                                      { day: "DIA 02", title: "Cachoeira dos Couros", desc: "A grandiosidade das quedas e a energia do Rio Preto.", img: "produtos/cachoeiras/couros/couros-1.jpg" },
                                      { day: "DIA 03", title: "Voo de Balão", desc: "O amanhecer sobre o Cerrado em uma vista 360º.", img: "produtos/experiencias/voo-de-balao/voo-de-balao-1.jpg" },
                                      { day: "DIA 04", title: "Passeio a Cavalo", desc: "Conexão e tranquilidade pelas trilhas da Fazenda.", img: "produtos/experiencias/passeio-a-cavalo/passeio-a-cavalo-6.png" }
                                    ].map((item, i) => (
                                      <motion.div 
                                        key={i}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.3 }}
                                        className="flex gap-4 relative"
                                      >
                                        {/* Timeline Dot */}
                                        <div className="w-8 shrink-0 flex flex-col items-center pt-2 relative z-10">
                                          <div className="w-2.5 h-2.5 rounded-full bg-[#A88B4C] border-4 border-[#FAF9F6] shadow-sm" />
                                        </div>

                                        <div className="flex-1 bg-white rounded-3xl p-4 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] border border-black/5 flex gap-4 items-center group hover:border-[#A88B4C]/20 transition-colors">
                                          <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 shadow-inner">
                                            <img loading="lazy" src={getOptimizedImage(item.img, IMAGE_PRESETS.thumbnail)} alt={`ATMOS — ${item.title}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                          </div>
                                          <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                              <span className="text-[7px] font-bold text-[#A88B4C] tracking-[0.2em] uppercase">{item.day}</span>
                                              <div className="h-[1px] flex-1 bg-black/5 mx-3" />
                                            </div>
                                            <h6 className="text-[11px] font-bold text-[#2C3E2D] uppercase tracking-wider">{item.title}</h6>
                                            <p className="text-[8px] text-black/50 mt-1 leading-tight line-clamp-1">{item.desc}</p>
                                          </div>
                                        </div>
                                      </motion.div>
                                    ))}

                                    <motion.div 
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ delay: 2 }}
                                      className="pt-6 px-4"
                                    >
                                      <button className="w-full py-4 bg-[#2C3E2D] text-white rounded-2xl text-[9px] font-bold uppercase tracking-[0.2em] shadow-xl hover:bg-[#1B291C] transition-all transform hover:-translate-y-1">
                                        Baixar PDF Completo
                                      </button>
                                      <p className="text-[6px] text-black/30 mt-4 uppercase tracking-widest text-center">
                                        Itinerário desenhado com carinho pela Equipe Atmos
                                      </p>
                                    </motion.div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ) : (
                            <motion.div
                              key="conclusao"
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 1.05 }}
                              className="absolute inset-0 pt-14 bg-[#1B291C] flex items-center justify-center p-8 text-center"
                            >
                              <div className="space-y-10 relative z-10">
                                <motion.div 
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.2 }}
                                  className="flex justify-center"
                                >
                                  <div className="w-20 h-20 rounded-full bg-[#A88B4C]/20 border border-[#A88B4C]/30 flex items-center justify-center">
                                    <Sparkles className="w-10 h-10 text-[#A88B4C]" />
                                  </div>
                                </motion.div>

                                <div className="space-y-4">
                                  <motion.h4 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                    className="text-2xl font-display text-white uppercase tracking-widest leading-tight"
                                  >
                                    Seu Sonho está<br/>Pronto para ser Vivido.
                                  </motion.h4>
                                  <motion.p 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6 }}
                                    className="text-[10px] text-white/50 max-w-[200px] mx-auto leading-relaxed"
                                  >
                                    Transformamos suas escolhas em uma jornada real e inesquecível.
                                  </motion.p>
                                </div>

                                <motion.div 
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.8 }}
                                  className="pt-4"
                                >
                                  <button className="px-10 py-4 bg-[#A88B4C] text-[#1B291C] rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] shadow-2xl hover:bg-white hover:text-[#1B291C] transition-all transform hover:-translate-y-1">
                                    Explorar Atmos
                                  </button>
                                  <p className="text-[6px] text-white/20 mt-6 uppercase tracking-[0.3em]">
                                    atmos.com.br / exclusive
                                  </p>
                                </motion.div>
                              </div>

                              <motion.div 
                                animate={{ 
                                  scale: [1, 1.3, 1],
                                  opacity: [0.1, 0.2, 0.1] 
                                }}
                                transition={{ duration: 5, repeat: Infinity }}
                                className="absolute inset-0 bg-[#A88B4C] blur-[120px] rounded-full -z-10"
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      );
                    })()}
                  </AnimatePresence>
                </div>
              </div>

              {/* Decorative Background Elements */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#2C3E2D]/5 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#A88B4C]/5 rounded-full blur-3xl" />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
