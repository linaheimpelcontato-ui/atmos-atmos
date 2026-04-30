import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Search, Heart, User, CheckCircle2, ClipboardList, Map, Calendar, ArrowRight, Users } from 'lucide-react';
import { storageUrl } from '@/lib/storage';
const logoAtmos = storageUrl("home/logo-atmos.png");

const JOURNEY_STEPS = [
  {
    id: 'login',
    label: 'Cadastro',
    title: 'Crie seu login no site',
    description: 'Sua jornada começa com um cadastro que te da acesso total na plataforma exclusiva da Atmos.',
    bgColor: 'bg-white',
    btnColor: '#1F2C17',
    progColor: '#1F2C17'
  },
  {
    id: 'curadoria',
    label: 'Curadoria',
    title: 'Acesso total à curadoria',
    description: 'Explore menus completos de cachoeiras, experiências, hospedagens e serviços selecionados pela Atmos.',
    bgColor: 'bg-[#F8F8F5]',
    btnColor: '#556952',
    progColor: '#556952'
  },
  {
    id: 'preferencias',
    label: 'Preferências',
    title: 'Adicione suas preferências',
    description: 'Salve o que faz seu coração vibrar. Basta clicar no {heart} nos itens que forem da sua preferência.',
    bgColor: 'bg-[#F8F8F5]',
    btnColor: '#744404',
    progColor: '#744404'
  },
  {
    id: 'analise',
    label: 'Análise de Perfil',
    title: 'Entendendo seu perfil',
    description: 'Nossa equipe estuda suas escolhas para desenhar uma jornada autêntica e com a sua cara.',
    bgColor: 'bg-[#2C3E2D]',
    btnColor: '#8D7B63',
    progColor: '#8D7B63'
  },
  {
    id: 'roteiro',
    label: 'Roteiro Personalizado',
    title: 'Seu Roteiro Sob Medida',
    description: 'Criamos um roteiro personalizado especialmente para você que faça sentido com seu perfil.',
    bgColor: 'bg-white',
    btnColor: '#540202',
    progColor: '#540202'
  }
];

const CURATION_CATEGORIES = [
  {
    id: 'cachoeiras',
    label: 'CACHOEIRAS',
    items: [
      { t: 'Dragão', d: 'Cachoeira', img: storageUrl('cachoeiras/dragao-1.jpg') },
      { t: 'Macacão', d: 'Cachoeira', img: storageUrl('cachoeiras/macacao-1.jpg') },
      { t: 'Canjica e Aguas Lindas', d: 'Cachoeira', img: storageUrl('cachoeiras/canjica-aguas-lindas-1.jpg') },
      { t: 'Prata', d: 'Cachoeira', img: storageUrl('cachoeiras/prata-1.jpg') },
      { t: 'Cânions São Felix', d: 'Cachoeira', img: storageUrl('cachoeiras/canions-sao-felix-1.jpg') },
      { t: 'Bocaina do Farias', d: 'Cachoeira', img: storageUrl('cachoeiras/bocaina-farias-1.jpg') },
      { t: 'Macaquinhos', d: 'Cachoeira', img: storageUrl('cachoeiras/macaquinhos-1.jpg') },
      { t: 'Curriola (Guardião)', d: 'Cachoeira', img: storageUrl('cachoeiras/curriola-guardiao-1.jpg') }
    ]
  },
  {
    id: 'hospedagens',
    label: 'HOSPEDAGENS',
    items: [
      { t: 'Amana', d: 'Hospedagem', img: storageUrl('hospedagens/amana-hotel-1.jpg') },
      { t: 'Vila Baru', d: 'Hospedagem', img: storageUrl('hospedagens/vila-baru-1.jpg') },
      { t: 'Vila Abaton', d: 'Hospedagem', img: storageUrl('hospedagens/vila-abaton-1.jpg') },
      { t: 'Villa Eya', d: 'Hospedagem', img: storageUrl('hospedagens/villa-eya-1.jpg') },
      { t: 'Casa Poema', d: 'Hospedagem', img: storageUrl('hospedagens/casa-poema-1.jpg') },
      { t: 'Bagua Bangalos', d: 'Hospedagem', img: storageUrl('hospedagens/bagua-bangalos-1.jpg') },
      { t: 'Vila Toa', d: 'Hospedagem', img: storageUrl('hospedagens/vila-toa-1.jpg') },
      { t: 'Terra Gaia', d: 'Hospedagem', img: storageUrl('hospedagens/terra-gaia-1.jpg') }
    ]
  },
  {
    id: 'experiencias',
    label: 'EXPERIÊNCIAS',
    items: [
      { t: 'Noturna Imersiva', d: 'Experiência', img: storageUrl('experiencias/noturna-1.jpg') },
      { t: 'Voo de Balão', d: 'Experiência', img: storageUrl('experiencias/balao-1.jpg') },
      { t: 'Passeio a Cavalo', d: 'Experiência', img: storageUrl('experiencias/cavalo-1.jpg') },
      { t: 'Canionismo', d: 'Experiência', img: storageUrl('experiencias/canionismo-1.jpg') },
      { t: 'Rapel', d: 'Experiência', img: storageUrl('experiencias/rapel-1.jpg') },
      { t: 'Rafting', d: 'Experiência', img: storageUrl('experiencias/rafting-1.jpg') },
      { t: 'Astro Turismo', d: 'Experiência', img: storageUrl('experiencias/astro-1.jpg') },
      { t: 'Yoga e Meditação', d: 'Experiência', img: storageUrl('experiencias/yoga-1.jpg') }
    ]
  },
  {
    id: 'servicos',
    label: 'SERVIÇOS',
    items: [
      { t: 'Registro Drone', d: 'Serviço', img: storageUrl('servicos/drone.jpg') },
      { t: 'Lanche de Trilha', d: 'Serviço', img: storageUrl('servicos/lanche.jpg') },
      { t: 'Transfer Aeroporto', d: 'Serviço', img: storageUrl('servicos/transfer.jpg') },
      { t: 'Pedidos Especiais', d: 'Serviço', img: storageUrl('servicos/especial.jpg') }
    ]
  }
];

export default function FeatureShowcase() {
  const [step, setStep] = useState(0);
  const [activeCategory, setActiveCategory] = useState(0);
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { amount: 0.3 });

  useEffect(() => {
    if (!isInView) return; // Only run if section is in view

    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % JOURNEY_STEPS.length);
    }, 20000); // Progresses every 20 seconds
    return () => clearInterval(timer);
  }, [step, isInView]);

  // Secondary timer to cycle through categories during Step 2
  useEffect(() => {
    if (!isInView) return; // Only run if section is in view
    
    if (step === 1) {
      const categoryTimer = setInterval(() => {
        setActiveCategory((prev) => (prev + 1) % CURATION_CATEGORIES.length);
      }, 2500); // 2.5 seconds per category
      return () => clearInterval(categoryTimer);
    } else {
      setActiveCategory(0);
    }
  }, [step, isInView]);

  const currentStep = JOURNEY_STEPS[step];

  return (
    <section ref={sectionRef} className="bg-white pb-16 pt-24 md:pt-32 relative overflow-hidden font-poppins">
      <div className="max-w-7xl mx-auto px-6">

        {/* Section Header: Minimalist Editorial Design */}
        <div className="text-center mb-12 relative">
          <motion.span 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-[#A88B4C] text-[10px] font-bold tracking-[0.4em] uppercase mb-4 block"
          >
            A importância de se cadastrar
          </motion.span>

          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.8 }}
            className="text-[#1B291C] font-display text-4xl md:text-5xl tracking-tight"
          >
            Entenda sua <span className="italic font-extralight italic">Jornada</span>
          </motion.h2>
        </div>

        {/* Step Indicator (Desktop) - Enhanced with connecting line */}
        <div className="hidden md:block max-w-5xl mx-auto mb-16 relative">
          {/* Background Line */}
          <div className="absolute top-[50%] left-0 right-0 h-[2px] bg-[#2C3E2D]/5 -translate-y-1/2" />

          {/* Animated Progress Line */}
          <motion.div
            className="absolute top-[50%] left-0 h-[2px] -translate-y-1/2 z-10"
            initial={{ width: "0%" }}
            animate={{
              width: `${(step / (JOURNEY_STEPS.length - 1)) * 100}%`,
              backgroundColor: currentStep.btnColor
            }}
            transition={{
              width: { duration: 0.8, ease: "easeInOut" },
              backgroundColor: { duration: 0.5 }
            }}
          />

          <div className="flex justify-between items-center relative z-20">
            {JOURNEY_STEPS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setStep(i)}
                className="flex flex-col items-center gap-4 group outline-none"
              >
                <motion.div
                  animate={{
                    backgroundColor: i <= step ? JOURNEY_STEPS[i].btnColor : '#FFFFFF',
                    color: i <= step ? '#FFFFFF' : '#2C3E2D80'
                  }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-bold transition-all duration-700 relative shadow-sm border ${i === step ? 'scale-110 shadow-xl ring-4 ring-white border-transparent' : 'border-[#2C3E2D1A]'
                    }`}
                >
                  {i < step ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                  {i === step && (
                    <motion.div
                      layoutId="outer-ring"
                      className="absolute -inset-2 rounded-full border border-[#2C3E2D1A]"
                    />
                  )}
                </motion.div>
                <span className={`text-[9px] uppercase tracking-[0.25em] font-bold transition-colors duration-500 bg-white px-2`} style={{ color: i === step ? JOURNEY_STEPS[i].btnColor : '#2C3E2D80' }}>
                  {s.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Narrative Block - Redesigned for compactness and action */}
        <motion.div
          animate={{ backgroundColor: currentStep.btnColor }}
          transition={{ duration: 0.8 }}
          className="max-w-5xl mx-auto mb-10 border border-white/10 rounded-2xl p-6 relative overflow-hidden group shadow-2xl"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col md:flex-row items-center justify-between gap-6"
            >
              <div className="flex-shrink-0 flex items-center gap-6">
                {/* Stage Number Index */}
                <span className="text-[#e4dbcc]/30 font-poppins font-bold text-4xl md:text-5xl select-none">
                  0{step + 1}
                </span>
                <h3 className="text-[#e4dbcc] font-display text-xl md:text-2xl">{currentStep.title}</h3>
              </div>

              <div className="flex-grow max-w-xl">
                <p className="text-[#e4dbcc]/80 text-xs md:text-sm font-light leading-relaxed flex items-center flex-wrap gap-x-1">
                  {currentStep.description.split('{heart}').map((part, i, arr) => (
                    <React.Fragment key={i}>
                      {part}
                      {i < arr.length - 1 && <Heart className="w-3.5 h-3.5 inline text-[#e4dbcc] fill-current" />}
                    </React.Fragment>
                  ))}
                </p>
              </div>

              <div className="flex-shrink-0 flex items-center gap-4">
                <motion.button
                  onClick={() => setStep((prev) => (prev + 1) % JOURNEY_STEPS.length)}
                  animate={{
                    scale: [1, 1.05, 1],
                    color: currentStep.btnColor,
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  style={{ backgroundColor: '#e4dbcc' }}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-bold tracking-[0.2em] shadow-2xl transition-colors group/btn"
                >
                  <span>PRÓXIMO PASSO</span>
                  <ArrowRight className="w-3 h-3 transition-transform group-hover/btn:translate-x-2" />
                </motion.button>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Soft progress line at bottom of the narrative card */}
          <div className="absolute bottom-0 left-0 h-0.5 bg-[#566952]/10 w-full" />
          <motion.div
            key={step}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 20, ease: "linear" }}
            style={{ backgroundColor: '#e4dbcc' }}
            className="absolute bottom-0 left-0 h-0.5"
          />
        </motion.div>

        {/* Transition Instructional Phrase */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="text-center mb-8"
        >
          <p className="text-[#2C3E2D]/70 font-poppins font-bold text-xs md:text-sm tracking-wide italic">
            Clique próximos passos para descobrir como transformamos seus desejos em um itinerário autêntico.
          </p>
        </motion.div>

        {/* The Journey Emulator */}
        <div className="relative max-w-[1000px] mx-auto group">
          <div className={`relative aspect-[16/9] ${currentStep.bgColor} rounded-2xl border border-[#2C3E2D]/10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] overflow-hidden transition-colors duration-1000`}>

            {/* Header Mockup */}
            <div className={`absolute top-0 left-0 right-0 h-14 border-b z-50 flex items-center px-8 transition-colors duration-1000 ${currentStep.id === 'analise' ? 'bg-[#2C3E2D]/30 border-white/10' : 'bg-white border-[#2C3E2D]/5'
              }`}>
              <div className="flex gap-1.5 mr-auto">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]/30" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]/30" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]/30" />
              </div>

              {/* Atmos Logo (instead of search bar) */}
              <div className="absolute left-1/2 -translate-x-1/2 flex items-center h-full">
                <img
                  src={storageUrl("home/flower-symbol.png")}
                  alt="ATMOS"
                  className={`h-10 transition-all duration-1000 ${currentStep.id === 'analise' ? 'grayscale invert opacity-50 shadow-none' : 'opacity-100'
                    }`}
                />
              </div>

              <div className="ml-auto w-8 h-8 rounded-full bg-gradient-to-tr from-[#2C3E2D] to-[#566952] flex items-center justify-center shadow-md">
                <User className="w-4 h-4 text-white" />
              </div>
            </div>

            {/* Sub-header Curation Menus (Step 2 & 3) */}
            <AnimatePresence>
              {(currentStep.id === 'curadoria' || currentStep.id === 'preferencias') && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-14 left-0 right-0 h-10 border-b border-[#2C3E2D]/5 flex items-center px-8 bg-white/80 backdrop-blur-sm z-40"
                >
                  <div className="flex gap-6 items-center w-full">
                    {currentStep.id === 'preferencias' ? (
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse" />
                        <span className="text-[9px] font-bold text-[#2C3E2D] tracking-[0.25em] border-b-2 border-red-500/30 pb-0.5 uppercase">SUA CURADORIA EXCLUSIVA</span>
                      </div>
                    ) : (
                      CURATION_CATEGORIES.map((cat, i) => (
                        <div
                          key={cat.id}
                          className={`text-[8px] font-bold tracking-[0.2em] relative transition-colors duration-300 ${activeCategory === i ? 'text-[#2C3E2D]' : 'text-[#2C3E2D]/30'
                            }`}
                        >
                          {cat.label}
                          {activeCategory === i && (
                            <motion.div
                              layoutId="active-menu"
                              className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#566952]"
                            />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step Contents */}
            <div className={`absolute inset-0 pt-14 ${(currentStep.id === 'curadoria' || currentStep.id === 'preferencias') ? 'pt-24' : ''
              }`}>
              <AnimatePresence mode="wait">

                {/* STEP 1: LOGIN */}
                {currentStep.id === 'login' && (
                  <motion.div
                    key="login"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center px-8 bg-cover bg-center"
                    style={{ backgroundImage: `url(${storageUrl("home/about-bg.jpg")})` }}
                  >
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-sm relative z-10 text-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-[#2C3E2D]/5 flex items-center justify-center mx-auto mb-6">
                        <User className="w-8 h-8 text-[#2C3E2D]" />
                      </div>
                      <h4 className="text-xl font-display text-[#2C3E2D] mb-2">Bem-vindo à Atmos</h4>
                      <p className="text-sm text-[#2C3E2D]/50 font-light mb-8">Comece sua jornada exclusiva na Chapada dos Veadeiros.</p>

                      <div className="grid grid-cols-2 gap-4">
                        <button className="h-12 border border-[#2C3E2D]/20 text-[#2C3E2D] rounded-xl text-[10px] font-bold tracking-[0.1em] hover:bg-[#2C3E2D]/5 transition-colors">LOG IN</button>
                        <button className="h-12 bg-[#2C3E2D] text-white rounded-xl text-[10px] font-bold tracking-[0.1em] shadow-lg shadow-[#2C3E2D]/20">CADASTRO</button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}

                {/* STEP 2: CURADORIA (MENUS CYCLING) */}
                {currentStep.id === 'curadoria' && (
                  <motion.div
                    key="curadoria"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-8 h-full flex flex-col"
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeCategory}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.4 }}
                        className="flex flex-col flex-grow"
                      >
                        {activeCategory === 3 && (
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="mb-6 max-w-2xl"
                          >
                            <p className="text-[10px] md:text-[11px] font-light text-[#2C3E2D]/60 leading-relaxed italic">
                              Personalize sua viagem com serviços e detalhes extras. Esses diferenciais foram pensados para ampliar o conforto, o registro e a imersão na Chapada dos Veadeiros.
                            </p>
                          </motion.div>
                        )}

                        <div className={`grid gap-6 ${activeCategory === 3 ? 'grid-cols-4' : 'grid-cols-4'}`}>
                          {CURATION_CATEGORIES[activeCategory].items.map((item, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.05 }}
                              className="bg-white rounded-xl overflow-hidden shadow-sm border border-[#2C3E2D]/5 flex flex-col group/card"
                            >
                              <div className="relative aspect-[4/3] overflow-hidden bg-[#F0F0ED]">
                                <img src={item.img} className="w-full h-full object-cover" alt={item.t} />
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                  <div className="w-6 h-6 rounded-full bg-white/50 backdrop-blur-md flex items-center justify-center">
                                    <Heart className="w-3 h-3 text-[#2C3E2D]" />
                                  </div>
                                </div>
                              </div>
                              <div className="p-3">
                                <h4 className="text-[9px] font-bold text-[#2C3E2D] uppercase tracking-wider mb-0.5">{item.t}</h4>
                                <p className="text-[8px] font-light text-[#2C3E2D]/40 uppercase tracking-[0.1em]">{item.d}</p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* STEP 3: PREFERENCIAS (HEART PULSE) */}
                {currentStep.id === 'preferencias' && (
                  <motion.div
                    key="preferencias"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-8 grid grid-cols-4 gap-6 relative"
                  >
                    {[
                      { t: 'Dragão', d: 'Cachoeira', img: storageUrl('cachoeiras/dragao-1.jpg'), fav: true },
                      { t: 'Curriola', d: 'Cachoeira', img: storageUrl('cachoeiras/curriola-guardiao-1.jpg'), fav: true },
                      { t: 'Passeio a Cavalo', d: 'Experiência', img: storageUrl('experiencias/cavalo-1.jpg'), fav: true },
                      { t: 'Voo de Balao', d: 'Experiência', img: storageUrl('experiencias/balao-1.jpg'), fav: true },
                      { t: 'Amaná', d: 'Hospedagem', img: storageUrl('hospedagens/amana-hotel-1.jpg'), fav: true },
                      { t: 'Lanche de Trilha', d: 'Serviço', img: storageUrl('servicos/lanche.jpg'), fav: true },
                      { t: 'Registro de Drone', d: 'Serviço', img: storageUrl('servicos/drone.jpg'), fav: true },
                      { t: 'Transfer Aeroporto', d: 'Serviço', img: storageUrl('servicos/transfer.jpg'), fav: true }
                    ].map((item, i) => (
                      <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm border border-[#2C3E2D]/5 flex flex-col relative">
                        <div className="relative aspect-[4/3] overflow-hidden bg-[#F0F0ED]">
                          <img src={item.img} className="w-full h-full object-cover" alt={item.t} />
                          {item.fav && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.3, duration: 0.5 }}
                              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 shadow-md flex items-center justify-center z-10"
                            >
                              <Heart className="w-3.5 h-3.5 fill-white text-white" />
                            </motion.div>
                          )}
                        </div>
                        <div className="p-3">
                          <h4 className="text-[9px] font-bold text-[#2C3E2D] uppercase tracking-wider mb-0.5">{item.t}</h4>
                          <p className="text-[8px] font-light text-[#2C3E2D]/40 uppercase tracking-[0.1em]">{item.d}</p>
                        </div>
                      </div>
                    ))}

                    {/* Activity Indicator Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black/5 backdrop-blur-[1px] z-50">
                      <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className="bg-[#2C3E2D]/95 backdrop-blur-xl text-white px-10 py-5 rounded-3xl flex flex-col items-center gap-4 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border border-white/10"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Users className="w-5 h-5 text-[#A5B8A1]" />
                            <motion.div
                              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="absolute inset-0 bg-[#A5B8A1] rounded-full blur-md"
                            />
                          </div>
                          <div className="h-4 w-px bg-white/20" />
                          <span className="text-[11px] font-bold tracking-[0.3em] uppercase text-white/90">Curadoria Humana em Progresso</span>
                        </div>

                        <div className="flex flex-col items-center gap-1.5">
                          <span className="text-[9px] font-light tracking-[0.1em] text-white/50 text-center uppercase">
                            Nossos especialistas em roteiro estão analisando<br />cada detalhe do seu perfil de viajante...
                          </span>
                        </div>

                        {/* Pulse loading line */}
                        <div className="w-48 h-0.5 bg-white/10 rounded-full overflow-hidden mt-2">
                          <motion.div
                            animate={{ x: [-200, 200] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="w-1/2 h-full bg-gradient-to-r from-transparent via-[#A5B8A1] to-transparent"
                          />
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 4: ANALISE (STUDIO) */}
                {currentStep.id === 'analise' && (
                  <motion.div
                    key="analise"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center overflow-hidden"
                  >
                    {/* Background Photo with slow zoom */}
                    <motion.div
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 12, ease: "linear" }}
                      className="absolute inset-0 z-0"
                    >
                      <img
                        src={storageUrl("home/curadoria-bg.jpg")}
                        className="w-full h-full object-cover"
                        alt="Curadoria Atmos Background"
                      />
                      {/* Subtler neutral overlay for text legibility */}
                      <div className="absolute inset-0 bg-black/30" />
                    </motion.div>

                    <div className="relative z-10 flex flex-col items-center">
                      {/* Human Element */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center gap-6"
                      >
                        <div className="w-14 h-14 rounded-full border-2 border-white/10 bg-[#1B291C] p-1 overflow-hidden shadow-2xl">
                          <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop" className="w-full h-full object-cover rounded-full grayscale" />
                        </div>

                        <div className="px-6 py-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm">
                          <span className="text-[10px] font-bold tracking-[0.4em] text-white/90 uppercase">Roteiro Personalizado</span>
                        </div>

                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.5 }}
                          className="text-[9px] font-medium tracking-[0.2em] text-white/60 uppercase"
                        >
                          Analisando preferências do perfil
                        </motion.p>
                      </motion.div>

                      <div className="mt-12 text-center">
                        <motion.p
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-white text-[11px] font-bold tracking-[0.6em] uppercase whitespace-nowrap"
                        >
                          Desenhando sua atmosfera única
                        </motion.p>

                        <div className="mt-8 flex justify-center gap-1.5">
                          {[0, 1, 2].map(i => (
                            <motion.div
                              key={i}
                              animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                              transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
                              className="w-2 h-2 rounded-full bg-white shadow-xl"
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}                {currentStep.id === 'roteiro' && (
                  <motion.div
                    key="roteiro"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex bg-[#F9F8F3]"
                  >
                    {/* Sidebar Map Preview */}
                    <div className="w-[30%] h-full border-r border-[#2C3E2D]/10 flex flex-col p-8 bg-white/50 backdrop-blur-md">
                      <div className="w-full aspect-[4/5] bg-[#1B291C] rounded-[2rem] flex flex-col items-center justify-center relative overflow-hidden shadow-2xl group">
                        {/* Elegant Leaf Texture Background (User Provided) */}
                        <div 
                          className="absolute inset-0 opacity-80 bg-cover grayscale contrast-125 brightness-50" 
                          style={{ backgroundImage: `url(${storageUrl("home/texture-leaf.jpg")})` }}
                        />

                        {/* Atmos Symbol Centered */}
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.5, duration: 1 }}
                          className="relative z-10 flex flex-col items-center"
                        >
                          <img
                            src={storageUrl("home/flower-symbol.png")}
                            alt="Atmos Symbol"
                            className="w-20 h-20 object-contain invert opacity-90 shadow-2xl"
                          />
                          <div className="mt-6 h-[1px] w-12 bg-white/30" />
                        </motion.div>

                        {/* Title Overlay */}
                        <div className="absolute bottom-10 inset-x-0 text-center">
                          <span className="text-[10px] font-bold text-white tracking-[0.5em] uppercase opacity-60">Itinerário Exclusivo</span>
                        </div>
                      </div>

                      <div className="mt-8 space-y-6">
                        <div className="flex items-center gap-4 group">
                          <div className="w-10 h-10 rounded-xl bg-[#1B291C]/5 flex items-center justify-center border border-[#1B291C]/10">
                            <Users className="w-4 h-4 text-[#A88B4C]" />
                          </div>
                          <div>
                            <h5 className="text-[9px] font-bold text-[#1B291C] tracking-[0.2em] uppercase">Consultoria Premium</h5>
                            <p className="text-[10px] text-[#2C3E2D]/50 font-light">Especialista Atmos</p>
                          </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-[#A88B4C]/5 border border-[#A88B4C]/10">
                          <p className="text-[10.5px] font-light text-[#744404] leading-relaxed italic">
                            "Selecionamos os itens de sua preferência para criar um roteiro que respeita seu ritmo e perfil."
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Main Itinerary Content */}
                    <div className="flex-1 overflow-hidden">
                      <motion.div
                        initial={{ y: 0 }}
                        animate={{ y: [0, -150] }}
                        transition={{
                          duration: 10,
                          ease: "linear",
                          repeat: Infinity,
                          repeatType: "reverse"
                        }}
                        className="h-full"
                      >
                        {/* Hero Header Wrapper - Consistent Brand Background */}
                        <div className="h-64 relative overflow-hidden">
                          <img
                            src={storageUrl("home/about-bg.jpg")}
                            className="w-full h-full object-cover"
                            alt="Chapada Header"
                          />
                          <div className="absolute inset-0 bg-black/30" />
                          <div className="absolute bottom-8 left-12">
                            <h5 className="text-[10px] font-bold text-white/90 tracking-[0.5em] uppercase mb-2">Seu Roteiro Personalizado</h5>
                            <h4 className="text-5xl font-display text-white">Chapada <span className="italic font-extralight text-[#E4DBCC]">Dos Veadeiros</span></h4>
                          </div>
                        </div>

                        <div className="p-12 space-y-8 pb-40">
                          {[
                            { day: '01', title: 'Cachoeira do Dragão', desc: 'Sua escolha: Uma das trilhas mais místicas e exclusivas da Chapada.', img: storageUrl('cachoeiras/dragao-1.jpg') },
                            { day: '02', title: 'Voo de Balão ao Amanhecer', desc: 'Sua escolha: Contemplação única do cerrado seguida de estadia no Amaná.', img: storageUrl('experiencias/balao-1.jpg') },
                            { day: '03', title: 'Cachoeira da Curriola', desc: 'Sua escolha: O refúgio perfeito com registro profissional de drone.', img: storageUrl('cachoeiras/curriola-guardiao-1.jpg') },
                          ].map((d, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.15 }}
                              className="bg-white rounded-3xl p-6 flex gap-8 shadow-sm border border-[#2C3E2D]/5 hover:shadow-xl transition-all duration-500 group"
                            >
                              <div className="w-32 h-32 rounded-2xl overflow-hidden flex-shrink-0 bg-[#F0F0ED]">
                                <img src={d.img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={d.title} />
                              </div>
                              <div className="flex flex-col justify-center">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="text-[#A88B4C] text-[10px] font-bold tracking-widest uppercase">Dia {d.day}</span>
                                  <div className="w-12 h-[1px] bg-[#A88B4C]/20" />
                                </div>
                                <h5 className="text-[14px] font-bold text-[#1B291C] uppercase tracking-wider mb-2">{d.title}</h5>
                                <p className="text-[12.5px] font-light text-[#2C3E2D]/60 leading-relaxed max-w-md">{d.desc}</p>
                              </div>
                            </motion.div>
                          ))}

                          <div className="pt-8 flex justify-between items-center border-t border-[#2C3E2D]/10">
                            <div className="flex -space-x-3">
                              {[1, 2, 3].map(j => (
                                <div key={j} className="w-10 h-10 rounded-full border-2 border-white overflow-hidden ring-4 ring-[#F9F8F3]">
                                  <img src={`https://i.pravatar.cc/100?img=${j + 10}`} className="w-full h-full object-cover grayscale" alt="Consultant" />
                                </div>
                              ))}
                              <div className="pl-6 text-[10px] font-medium text-[#2C3E2D]/40 italic self-center">Consultores Atmos validando seu trajeto</div>
                            </div>

                            <div className="inline-flex bg-[#1B291C] text-white px-10 py-4 rounded-full items-center gap-4 shadow-2xl hover:bg-[#A88B4C] transition-all duration-500 cursor-pointer group">
                              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Confirmar Roteiro</span>
                              <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

          </div>
        </div>

        {/* Closing Transition Element: Rotating Atmos Symbol (Green) */}
        <div className="flex justify-center mt-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          >
            <img
              src={storageUrl("home/flower-symbol.png")}
              alt="Atmos Symbol"
              className="w-16 h-16 object-contain"
              style={{ filter: "invert(41%) sepia(20%) saturate(464%) hue-rotate(58deg) brightness(95%) contrast(84%)" }}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
