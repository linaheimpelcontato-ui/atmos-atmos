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
    { t: "PASSEIO A CAVALO", d: "FAZENDA SÃO BENTO", img: "produtos/experiencias/passeio-a-cavalo/passeio-a-cavalo-1.jpg" }
  ]
};

export default function FeatureShowcase() {
  const [step, setStep] = useState(0);
  const [subStep, setSubStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [activeCategory, setActiveCategory] = useState(0);

  // Helper to force production URL for uploaded assets, ensuring sync with Admin Panel
  const getProductionUrl = (path: string) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    const cleanPath = path.replace(/^\//, "");
    // Force production assets domain for images starting with 'produtos/' or 'destaques-categorias/'
    if (cleanPath.startsWith("produtos/") || cleanPath.startsWith("destaques-categorias/")) {
      // Products paths in storage are lowercase
      const finalPath = cleanPath.startsWith("produtos/") ? cleanPath.toLowerCase() : cleanPath;
      return `https://assets.atmos.tur.br/${encodeURI(finalPath)}`;
    }
    return storageUrl(cleanPath);
  };

  // Preload all critical emulator images to prevent black screens/flickering
  useEffect(() => {
    const allImages = [
      "destaques-categorias/Cachoeira-Destaque-1.jpg",
      "destaques-categorias/Experiencias-Destaque-1.jpeg",
      "destaques-categorias/Hospedagens-Destaque-1.jpeg",
      "destaques-categorias/Serviços-Destaque-1.jpg",
      ...CURATION_CATEGORIES_DATA.CACHOEIRAS.map(p => p.img),
      ...CURATION_CATEGORIES_DATA.EXPERIÊNCIAS.map(p => p.img),
      "produtos/CACHOEIRAS/Dragão/Dragão-1.jpg",
      "produtos/CACHOEIRAS/Dragão/Dragão-5.jpg"
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
          <div className="lg:col-span-5 flex flex-col gap-10 lg:gap-0 lg:justify-between lg:h-[75vh] lg:max-h-[680px] py-2">
            
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
                      className="flex flex-col items-center group relative"
                    >
                      <motion.div 
                        animate={{ 
                          scale: isActive ? 1.15 : 1,
                          backgroundColor: (isActive || isDone) ? s.accentColor : '#F5F5F3',
                          color: (isActive || isDone) ? '#FFFFFF' : '#2C3E2D'
                        }}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold z-10 shadow-sm transition-colors mb-4"
                      >
                        {i + 1}
                      </motion.div>
                      <span className={`text-[8px] font-bold tracking-[0.25em] transition-all whitespace-nowrap absolute -bottom-8 ${isActive ? 'text-[#2C3E2D]' : 'text-[#2C3E2D]/30'}`}>
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
                        {/* Static Navigation Bar */}
                        <div className="p-4 border-b border-black/5 flex items-center justify-between bg-white shrink-0 z-30 relative">
                          <img src={storageUrl("brand/logo-horizontal.svg")} className="h-3" />
                          <div className="flex gap-3">
                             <Heart className="w-4 h-4 text-[#2C3E2D]" />
                             <div className="w-4 h-4 rounded-full bg-[#A88B4C] flex items-center justify-center text-[8px] text-white font-bold">L</div>
                          </div>
                        </div>

                        <div className="flex-1 relative overflow-hidden bg-[#F9F8F3]">
                          <AnimatePresence mode="wait">
                            {/* SUB-PHASE 0 & 2: CATEGORY MENU */}
                            {(subStep === 0 || subStep === 2) && (
                              <motion.div 
                                key={`menu-${subStep}`}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.05 }}
                                className="p-4 space-y-3 h-full overflow-y-auto no-scrollbar"
                              >
                                <span className="text-[7px] font-bold text-black/30 tracking-[0.3em] uppercase block mb-4">Escolha uma categoria</span>
                                {[
                                  { label: 'CACHOEIRAS', img: 'destaques-categorias/Cachoeira-Destaque-1.jpg' },
                                  { label: 'EXPERIÊNCIAS', img: 'destaques-categorias/Experiencias-Destaque-1.jpeg' },
                                  { label: 'HOSPEDAGENS', img: 'destaques-categorias/Hospedagens-Destaque-1.jpeg' },
                                  { label: 'SERVIÇOS', img: 'destaques-categorias/Serviços-Destaque-1.jpg' }
                                ].map((cat, i) => (
                                  <div key={cat.label} className="h-28 rounded-[1.5rem] overflow-hidden relative border border-black/5 shadow-sm">
                                    <img src={getProductionUrl(cat.img)} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                      <span className="text-white font-display text-xl tracking-[0.2em] uppercase">{cat.label}</span>
                                    </div>
                                    {/* Simulation of click highlight */}
                                    {((subStep === 0 && i === 0) || (subStep === 2 && i === 1)) && (
                                      <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: [0, 1, 0] }}
                                        transition={{ duration: 0.5, repeat: 1 }}
                                        className="absolute inset-0 bg-white/20 z-10" 
                                      />
                                    )}
                                  </div>
                                ))}
                              </motion.div>
                            )}

                            {/* SUB-PHASE 1: EXPLORING CACHOEIRAS */}
                            {subStep === 1 && (
                              <motion.div 
                                key="explorer-cachoeiras"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col h-full relative"
                              >
                                {/* Header Fixo com Z-Index Alto */}
                                <div className="p-6 bg-white border-b border-black/5 z-20 relative shadow-sm">
                                   <span className="text-[7px] font-bold text-[#A88B4C] tracking-[0.3em] uppercase block mb-1">Explorando</span>
                                   <h5 className="text-2xl font-display text-[#2C3E2D] uppercase tracking-wider mb-4">Cachoeiras</h5>
                                   <div className="h-10 bg-gray-50 rounded-xl flex items-center px-4 gap-3 border border-black/5">
                                      <Search className="w-3 h-3 text-black/20" />
                                      <span className="text-[8px] text-black/20 uppercase tracking-widest">Buscar...</span>
                                   </div>
                                </div>

                                {/* Container de Scroll Animado */}
                                <div className="flex-1 overflow-hidden z-10">
                                  <motion.div 
                                    animate={{ y: [0, -500] }}
                                    transition={{ duration: 5, ease: "linear" }}
                                    className="p-6 space-y-6"
                                  >
                                     {CURATION_CATEGORIES_DATA.CACHOEIRAS.map((item, i) => (
                                       <div key={i} className="rounded-[2rem] overflow-hidden bg-white shadow-md border border-black/5">
                                          <div className="aspect-[4/3] relative">
                                            <img src={getProductionUrl(item.img)} className="w-full h-full object-cover" />
                                            <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center">
                                              <Heart className={`w-5 h-5 text-white ${i === 0 ? "fill-white" : ""}`} />
                                            </div>
                                          </div>
                                          <div className="p-5">
                                            <h6 className="text-[9px] font-bold text-[#2C3E2D] uppercase tracking-[0.2em]">{item.t}</h6>
                                            <p className="text-[7px] text-black/40 uppercase tracking-widest mt-1">{item.d}</p>
                                          </div>
                                       </div>
                                     ))}
                                  </motion.div>
                                </div>
                              </motion.div>
                            )}

                            {/* SUB-PHASE 3: EXPLORING EXPERIÊNCIAS */}
                            {subStep === 3 && (
                              <motion.div 
                                key="explorer-experiencias"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col h-full relative"
                              >
                                {/* Header Fixo */}
                                <div className="p-6 bg-white border-b border-black/5 z-20 relative shadow-sm">
                                   <span className="text-[7px] font-bold text-[#A88B4C] tracking-[0.3em] uppercase block mb-1">Explorando</span>
                                   <h5 className="text-2xl font-display text-[#2C3E2D] uppercase tracking-wider mb-4">Experiências</h5>
                                   <div className="h-10 bg-gray-50 rounded-xl flex items-center px-4 gap-3 border border-black/5">
                                      <Search className="w-3 h-3 text-black/20" />
                                      <span className="text-[8px] text-black/20 uppercase tracking-widest">Buscar...</span>
                                   </div>
                                </div>

                                <div className="flex-1 overflow-hidden z-10">
                                  <motion.div 
                                    animate={{ y: [0, -500] }}
                                    transition={{ duration: 5, ease: "linear" }}
                                    className="p-6 space-y-6"
                                  >
                                     {CURATION_CATEGORIES_DATA.EXPERIÊNCIAS.map((item, i) => (
                                       <div key={i} className="rounded-[2rem] overflow-hidden bg-white shadow-md border border-black/5">
                                          <div className="aspect-[4/3] relative">
                                            <img src={getProductionUrl(item.img)} className="w-full h-full object-cover" />
                                            <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center">
                                              <Heart className="w-5 h-5 text-white" />
                                            </div>
                                          </div>
                                          <div className="p-5">
                                            <h6 className="text-[9px] font-bold text-[#2C3E2D] uppercase tracking-[0.2em]">{item.t}</h6>
                                            <p className="text-[7px] text-black/40 uppercase tracking-widest mt-1">{item.d}</p>
                                          </div>
                                       </div>
                                     ))}
                                  </motion.div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    )}

                    {/* SCREEN 3: PREFERENCIAS */}
                    {step === 2 && (
                      <motion.div
                        key="preferencias"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-white p-4"
                      >
                         <div className="mb-4">
                           <span className="text-[7px] font-bold text-[#2C3E2D]/40 tracking-[0.3em] uppercase">Sua Seleção</span>
                           <h5 className="text-sm font-display text-[#2C3E2D] uppercase mt-1">Favoritos Atmos</h5>
                         </div>
                         <div className="grid grid-cols-2 gap-3">
                           {[1,2,3,4].map(i => (
                             <motion.div 
                               key={i}
                               initial={{ scale: 0.8, opacity: 0 }}
                               animate={{ scale: 1, opacity: 1 }}
                               transition={{ delay: i * 0.1 }}
                               className="aspect-[4/5] rounded-2xl overflow-hidden relative shadow-lg group"
                             >
                               <img src={getProductionUrl(`produtos/CACHOEIRAS/Dragão/Dragão-${i}.jpg`)} className="w-full h-full object-cover" />
                               <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent p-3 flex flex-col justify-end">
                                 <Heart className="w-4 h-4 text-white fill-white mb-2" />
                                 <div className="h-1.5 w-12 bg-white/30 rounded" />
                               </div>
                             </motion.div>
                           ))}
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
                        style={{ backgroundImage: `url(${getProductionUrl("produtos/CACHOEIRAS/Dragão/Dragão-5.jpg")})` }}
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
                               <img src={getProductionUrl("produtos/CACHOEIRAS/Dragão/Dragão-1.jpg")} className="w-full h-full object-cover opacity-50" />
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
                                   <h6 className="text-[8px] font-bold text-[#2C3E2D] uppercase tracking-wider mb-1">Cachoeira do Dragão</h6>
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
