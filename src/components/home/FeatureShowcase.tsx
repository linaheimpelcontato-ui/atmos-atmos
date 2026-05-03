import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Heart, Sparkles, Users, Map, ArrowRight, Calendar, Search } from 'lucide-react';
import { storageUrl } from '@/lib/storage';

const logoAtmos = storageUrl("home/logo-atmos.png");

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
    accentColor: '#744404',
    icon: Heart
  },
  {
    id: 'analise',
    num: '04',
    label: 'ANÁLISE',
    title: 'Entendendo seu perfil',
    description: 'Nossa equipe estuda suas escolhas para desenhar uma jornada autêntica e com a sua cara.',
    accentColor: '#8D7B63',
    icon: Users
  },
  {
    id: 'roteiro',
    num: '05',
    label: 'ROTEIRO',
    title: 'Seu Roteiro Sob Medida',
    description: 'Criamos um roteiro personalizado especialmente para você que faça sentido com seu perfil.',
    accentColor: '#540202',
    icon: Map
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

export default function FeatureShowcase() {
  const [step, setStep] = useState(0);
  const [subStep, setSubStep] = useState(0);
  const [progress, setProgress] = useState(0);

  // Helper to force production URL for uploaded assets, ensuring sync with Admin Panel
  const getProductionUrl = (path: string) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    const cleanPath = path.replace(/^\//, "");
    
    const productionFolders = ["produtos/", "destaques-categorias/", "experiencias/"];
    if (productionFolders.some(folder => cleanPath.startsWith(folder))) {
      return `https://assets.atmos.tur.br/${encodeURI(cleanPath)}`;
    }
    
    return storageUrl(cleanPath);
  };

  // Preload all critical emulator images in the background to prevent black screens/flickering
  useEffect(() => {
    const allImages = [
      "destaques-categorias/Cachoeira-Destaque-1.jpg",
      "destaques-categorias/Experiencias-Destaque-1.jpeg",
      "destaques-categorias/Hospedagens-Destaque-1.jpeg",
      "destaques-categorias/Serviços-Destaque-1.jpg",
      "home/about-bg.jpg",
      "home/hero-bg.jpg",
      ...CURATION_CATEGORIES_DATA.CACHOEIRAS.map(p => p.img),
      ...CURATION_CATEGORIES_DATA.EXPERIÊNCIAS.map(p => p.img)
    ];

    allImages.forEach(path => {
      const img = new Image();
      img.src = getProductionUrl(path);
    });
  }, []);

  useEffect(() => {
    const duration = step === 1 ? 16000 : 6000; 
    const startTime = Date.now();
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const p = (elapsed / duration) * 100;
      
      if (p >= 100) {
        setStep((prev) => (prev + 1) % JOURNEY_STEPS.length);
        setSubStep(0);
        setProgress(0);
      } else {
        setProgress(p);
        if (step === 1) {
          const currentSub = Math.floor((p / 100) * 4);
          setSubStep(currentSub);
        }
      }
    }, 50);

    return () => clearInterval(interval);
  }, [step]);

  const currentStep = JOURNEY_STEPS[step];
  const Icon = currentStep.icon;

  return (
    <section className="min-h-screen lg:h-screen lg:min-h-[850px] bg-white flex items-center relative overflow-hidden py-12 lg:py-20">
      <div className="max-w-7xl mx-auto px-6 w-full relative z-20 h-full">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 items-start">
          
          {/* Left Column: Content */}
          <div className="lg:col-span-5 flex flex-col gap-8 lg:gap-0 lg:justify-between lg:h-[75vh] lg:max-h-[680px] py-2 overflow-y-auto no-scrollbar">
            
            {/* Header Area */}
            <div>
              <h2 className="text-3xl sm:text-4xl lg:text-6xl font-display text-[#2C3E2D] mb-4 tracking-tight leading-[0.85] pt-1">
                Como montar seu roteiro
              </h2>
              <p className="text-sm lg:text-base font-sans text-[#2C3E2D] opacity-60 uppercase tracking-[0.2em] font-semibold mb-8 max-w-md">
                Entenda o que você acessa ao criar seu login gratuito na ATMOS.
              </p>

              {/* Pulsing Next Step Button (Above Stepper) */}
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
                onClick={() => { setStep((prev) => (prev + 1) % JOURNEY_STEPS.length); setProgress(0); }}
                className="flex items-center gap-3 bg-[#2C3E2D] text-white px-6 py-3 rounded-xl mb-4 hover:bg-[#1B291C] transition-colors group"
              >
                <span className="text-[9px] font-bold tracking-[0.3em] uppercase">Próxima Etapa</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </div>

            {/* Premium Stepper */}
            <div className="relative mt-8 mb-16 lg:my-6 px-4">
              <div className="absolute top-5 left-0 right-0 h-[1px] bg-[#2C3E2D]/10" />
              <div className="flex justify-between relative">
                {JOURNEY_STEPS.map((s, i) => {
                  const isActive = step === i;
                  const isDone = step > i;
                  
                  return (
                    <button 
                      key={s.id}
                      onClick={() => { setStep(i); setProgress(0); }}
                      className="flex flex-col items-center group flex-1"
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
                      <span className={`text-[7px] lg:text-[8px] font-bold tracking-[0.25em] transition-all uppercase text-center h-4 ${isActive ? 'text-[#2C3E2D]' : 'text-[#2C3E2D]/30'}`}>
                        {s.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step Card (Ultra-compact & Status-bar style) */}
            <div className="w-full max-w-xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  style={{ backgroundColor: currentStep.accentColor }}
                  className="p-6 lg:p-7 rounded-[2rem] shadow-xl relative overflow-hidden group"
                >
                  {/* Background Number (Smaller and subtle) */}
                  <span className="absolute -bottom-6 -left-6 text-[100px] font-display font-bold text-white/[0.03] leading-none select-none">
                    {currentStep.num}
                  </span>

                  <div className="relative z-10">
                    {/* Top Row: Info */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-xl bg-white/10 text-white">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[7px] font-bold tracking-[0.4em] uppercase text-white/30">
                          JORNADA ATMOS
                        </span>
                        <span className="text-[9px] font-bold text-white uppercase tracking-widest">
                          PASSO {step + 1} DE 5
                        </span>
                      </div>
                    </div>

                    {/* Middle: Content */}
                    <div className="flex flex-col gap-1.5">
                      <h3 className="text-xl lg:text-2xl font-display text-white leading-tight">
                        {currentStep.title}
                      </h3>
                      <p className="text-xs lg:text-sm text-white/80 leading-relaxed max-w-lg font-medium">
                        {currentStep.description}
                      </p>
                    </div>
                  </div>

                  {/* Full-width Progress Bar at Bottom */}
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

          {/* Right Column: Emulator */}
          <div className="lg:col-span-7 flex items-start justify-center relative min-h-[500px] lg:h-[75vh] lg:max-h-[680px]">
            <div className="relative w-full max-w-[420px] h-full">
              {/* Device Frame */}
              <div className="absolute inset-0 bg-[#F5F5F3] rounded-[3.5rem] border-[12px] border-[#2C3E2D] shadow-[0_120px_240px_-40px_rgba(0,0,0,0.3)] overflow-hidden z-10">
                
                {/* Emulator Top Bar */}
                <div className="absolute top-0 inset-x-0 h-14 bg-white/90 backdrop-blur-md border-b border-[#2C3E2D]/5 px-8 flex items-center justify-between z-[60]">
                  <img src={logoAtmos} alt="ATMOS" className="h-6" />
                  <div className="w-8 h-8 rounded-full bg-[#2C3E2D]/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-[#2C3E2D]" />
                  </div>
                </div>

                {/* Screens Content */}
                <div className="absolute inset-0 pt-14 overflow-hidden">
                  <AnimatePresence mode="wait">
                    
                    {/* SCREEN 1: LOGIN */}
                    {step === 0 && (
                      <motion.div
                        key="login"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-cover bg-center flex items-center justify-center p-6"
                        style={{ backgroundImage: `url(${storageUrl("home/about-bg.jpg")})` }}
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

                    {/* SCREEN 2: MONTE SEU ROTEIRO (CURADORIA) */}
                    {step === 1 && (
                      <motion.div
                        key="curadoria"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-white flex flex-col overflow-hidden"
                      >
                        {/* Header Fixo do Mockup (Layout Real) */}
                        <div className="bg-white shrink-0 z-30 relative border-b border-black/5">
                          {/* Logo Bar */}
                          <div className="p-3 pb-2 flex items-center justify-between">
                            <img src={logoAtmos} className="h-4" alt="Atmos" />
                            <div className="flex gap-2">
                               <Heart className="w-4 h-4 text-[#2C3E2D]" />
                               <div className="w-5 h-5 rounded-full bg-[#2C3E2D]/10 flex items-center justify-center text-[10px] text-[#2C3E2D] font-bold">U</div>
                            </div>
                          </div>

                          {/* 4 Category Cards (2x2 Grid with Generous Spacing) */}
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
                                    <img src={getProductionUrl(cat.img)} className="w-full h-full object-cover" />
                                    <div className={`absolute inset-0 flex items-center justify-center ${isCatActive ? 'bg-[#2C3E2D]/40' : 'bg-black/20'}`}>
                                      <span className="text-[9px] text-white font-display tracking-widest font-bold uppercase">{cat.label}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Search Bar & Category Title (Compact) */}
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

                        {/* Product List Content with PROGRESS-DRIVEN Scroll */}
                        <div className="flex-1 relative overflow-hidden bg-[#FAF9F6]">
                          <AnimatePresence mode="wait">
                            {/* SUB-PHASE 0-1: WATERFALLS */}
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
                                    // Simulated like: Item 1 likes early, Item 2 likes mid-scroll
                                    const isLiked = i === 0 ? progress > 8 : progress > 32;
                                    return (
                                      <div key={i} className="rounded-2xl overflow-hidden bg-white shadow-sm border border-black/5">
                                        <div className="aspect-video relative">
                                          <img src={getProductionUrl(item.img)} className="w-full h-full object-cover" />
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

                            {/* SUB-PHASE 2-3: EXPERIENCES */}
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
                                    // Simulated like: Item 1 likes early in sub-phase, Item 2 likes mid-scroll
                                    const isLiked = i === 0 ? progress > 58 : progress > 82;
                                    return (
                                      <div key={i} className="rounded-2xl overflow-hidden bg-white shadow-sm border border-black/5">
                                        <div className="aspect-video relative">
                                          <img src={getProductionUrl(item.img)} className="w-full h-full object-cover" />
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

                    {/* SCREEN 3: PREFERENCIAS (WISHLIST) */}
                    {step === 2 && (
                      <motion.div
                        key="preferencias"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-white flex flex-col overflow-hidden"
                      >
                        {/* Header Fixo do Mockup (Consistency) */}
                        <div className="bg-white shrink-0 z-30 relative border-b border-black/5">
                          <div className="p-3 pb-2 flex items-center justify-between">
                            <img src={logoAtmos} className="h-4" alt="Atmos" />
                            <div className="flex gap-2">
                               <Heart className="w-4 h-4 text-[#2C3E2D]" />
                               <div className="w-5 h-5 rounded-full bg-[#2C3E2D]/10 flex items-center justify-center text-[10px] text-[#2C3E2D] font-bold">U</div>
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 pt-10 mt-2 bg-[#FAF9F6]">
                          <div className="mb-6">
                            <span className="text-[7px] font-bold text-[#A88B4C] tracking-[0.4em] uppercase block">Minha Seleção</span>
                            <h5 className="text-lg font-display text-[#2C3E2D] uppercase tracking-widest leading-tight mt-1">Sua Lista de Desejo na Chapada</h5>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            {[
                              ...CURATION_CATEGORIES_DATA.CACHOEIRAS,
                              ...CURATION_CATEGORIES_DATA.EXPERIÊNCIAS
                            ].map((item, i) => (
                              <motion.div 
                                key={i}
                                initial={{ scale: 0.9, opacity: 0, y: 10 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="bg-white rounded-2xl overflow-hidden shadow-md border border-black/5 flex flex-col"
                              >
                                <div className="aspect-[4/5] relative">
                                  <img 
                                    src={getProductionUrl(item.img)} 
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                  />
                                  <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/60 backdrop-blur-md flex items-center justify-center">
                                    <Heart className="w-3.5 h-3.5 text-[#540202] fill-[#540202]" />
                                  </div>
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                  <div className="absolute bottom-3 left-3 right-3">
                                    <h6 className="text-[9px] font-bold text-white uppercase tracking-wider line-clamp-1">{item.t}</h6>
                                    <p className="text-[7px] text-white/70 uppercase tracking-widest mt-0.5">{item.d}</p>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* SCREEN 4: ANALISE */}
                    {step === 3 && (
                      <motion.div
                        key="analise"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${getProductionUrl("produtos/cachoeiras/bocaina-do-farias/bocaina-do-farias-1.jpg")})` }}
                      >
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                          <motion.div 
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="relative mb-6"
                          >
                            <div className="w-20 h-20 rounded-full border-2 border-white/20 p-1">
                              <img src={storageUrl("home/about-bg.jpg")} className="w-full h-full rounded-full object-cover grayscale" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#2C3E2D] rounded-full flex items-center justify-center border-2 border-white">
                              <Sparkles className="w-3 h-3 text-white" />
                            </div>
                          </motion.div>
                          
                          <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-5 rounded-[2rem] w-full">
                            <h5 className="text-white text-[10px] font-bold tracking-[0.4em] uppercase mb-4">Roteiro Personalizado</h5>
                            <p className="text-white/60 text-[8px] tracking-widest uppercase leading-relaxed">
                              Desenhando sua atmosfera única...
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* SCREEN 5: ROTEIRO */}
                    {step === 4 && (
                      <motion.div
                        key="roteiro"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-[#F5F5F3] flex"
                      >
                        {/* Sidebar */}
                        <div className="w-1/3 bg-[#1B291C] h-full flex flex-col p-4 border-r border-white/5">
                           <div className="flex-1">
                             <div className="w-full aspect-[4/5] rounded-2xl bg-white/5 overflow-hidden mb-4 border border-white/10 relative">
                               <img src={getProductionUrl("produtos/cachoeiras/couros/couros-1.jpg")} className="w-full h-full object-cover opacity-50" />
                               <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                                  <span className="text-[6px] text-white/40 tracking-[0.3em] uppercase text-center mb-1">Itinerário Exclusivo</span>
                                  <div className="h-[1px] w-8 bg-white/20 mb-4" />
                               </div>
                             </div>
                             
                             <div className="flex items-center gap-2 mb-6">
                               <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                 <Users className="w-3 h-3 text-white/50" />
                               </div>
                               <div>
                                 <p className="text-[6px] text-white/80 font-bold uppercase tracking-wider">Consultoria Premium</p>
                                 <p className="text-[5px] text-white/40 uppercase tracking-widest">Especialista Atmos</p>
                               </div>
                             </div>
                           </div>

                           <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                              <p className="text-[5px] text-white/60 leading-relaxed italic">"Selecionamos os itens de sua preferência para criar um roteiro autêntico."</p>
                           </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                           <div className="h-32 relative shrink-0">
                             <img src={getProductionUrl("destaques-categorias/Cachoeira-Destaque-1.jpg")} className="w-full h-full object-cover" />
                             <div className="absolute inset-0 bg-gradient-to-t from-[#F5F5F3] via-transparent to-transparent" />
                             <div className="absolute bottom-4 left-4">
                               <span className="text-[6px] text-[#2C3E2D]/40 font-bold uppercase tracking-[0.4em]">Seu Roteiro</span>
                               <h5 className="text-lg font-display text-[#2C3E2D] uppercase leading-tight">Chapada dos<br/>Veadeiros</h5>
                             </div>
                           </div>
                           
                           <div className="flex-1 p-4 space-y-3 overflow-hidden">
                              {[1,2].map(i => (
                                <motion.div 
                                  key={i}
                                  initial={{ x: 20, opacity: 0 }}
                                  animate={{ x: 0, opacity: 1 }}
                                  transition={{ delay: i * 0.2 }}
                                  className="bg-white p-4 rounded-2xl border border-black/5 shadow-sm"
                                >
                                   <div className="flex items-center gap-3 mb-2">
                                     <span className="text-[6px] font-bold text-[#A88B4C] tracking-widest uppercase">DIA 0{i}</span>
                                     <div className="h-[1px] flex-1 bg-[#A88B4C]/20" />
                                   </div>
                                   <h6 className="text-[8px] font-bold text-[#2C3E2D] uppercase tracking-wider mb-1">Cachoeira dos Couros</h6>
                                   <p className="text-[6px] text-black/40 leading-relaxed">Uma das trilhas mais místicas da Chapada.</p>
                                </motion.div>
                              ))}
                           </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Decorative Circle Background */}
              <div className="absolute -inset-20 rounded-full blur-[120px] opacity-10 bg-[#A88B4C] -z-10" />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
