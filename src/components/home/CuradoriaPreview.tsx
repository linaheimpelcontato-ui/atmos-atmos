import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { storageUrl } from "@/lib/storage";

const CATEGORIES = [
  {
    id: "cachoeiras",
    title: "CACHOEIRAS",
    bigNumber: "+35",
    unit: "atrativos",
    description: "Curadoria das melhores cachoeiras da Chapada dos Veadeiros",
    images: [
      "destaques-categorias/Cachoeira-Destaque-1.jpg",
      "destaques-categorias/Cachoeira-Destaque-2.jpg",
      "destaques-categorias/Cachoeira-Destaque-3.jpg",
      "destaques-categorias/Cachoeira-Destaque-4.jpg",
      "destaques-categorias/Cachoeira-Destaque-5.jpg"
    ]
  },
  {
    id: "experiencias",
    title: "EXPERIÊNCIAS",
    bigNumber: "+15",
    unit: "experiências",
    description: "Curadoria de experiências para deixar sua viagem mais completa",
    images: [
      "destaques-categorias/Experiencias-Destaque-1.jpeg",
      "destaques-categorias/Experiencias-Destaque-2.jpeg",
      "destaques-categorias/Experiencias-Destaque-3.jpeg",
      "destaques-categorias/Experiencias-Destaque-4.jpeg",
      "destaques-categorias/Experiencias-Destaque-5.jpeg"
    ]
  },
  {
    id: "hospedagens",
    title: "HOSPEDAGENS",
    bigNumber: "+25",
    unit: "hospedagens",
    description: "Curadoria das melhores Hospedagens da Chapada dos Veadeiros",
    images: [
      "destaques-categorias/Hospedagens-Destaque-1.jpeg",
      "destaques-categorias/Hospedagens-Destaque-2.avif",
      "destaques-categorias/Hospedagens-Destaque-3.jpeg",
      "destaques-categorias/Hospedagens-Destaque-4.jpg",
      "destaques-categorias/Hospedagens-Destaque-5.jpeg"
    ]
  },
  {
    id: "servicos",
    title: "SERVIÇOS",
    bigNumber: "+10",
    unit: "serviços curados",
    description: "A ATMOS oferece diversos serviços para facilitar sua viagem.",
    images: [
      "destaques-categorias/Serviços-Destaque-1.jpg",
      "destaques-categorias/Serviços-Destaque-2.jpg",
      "destaques-categorias/Serviços-Destaque-3.jpg",
      "destaques-categorias/Serviços-Destaque-4.jpg"
    ]
  }
];

const CategoryCard = ({ item, isLast }: { item: typeof CATEGORIES[0], isLast: boolean }) => {
  const [imgIndex, setImgIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setImgIndex((prev) => (prev + 1) % item.images.length);
    }, 2500); // Slower, more elegant transitions
    return () => clearInterval(timer);
  }, [item.images.length]);

  return (
    <div className={`relative aspect-[4/5] md:aspect-[3/4] lg:aspect-[9/16] overflow-hidden bg-[#2C3E2D] ${!isLast ? 'border-r border-white/10' : ''}`}>
      {/* Image Slideshow using storageUrl helper */}
      <div className="absolute inset-0">
        <AnimatePresence mode="popLayout">
          <motion.img
            key={imgIndex}
            src={storageUrl(item.images[imgIndex])}
            alt={item.title}
            className="absolute inset-0 w-full h-full object-cover"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ 
              opacity: { duration: 1.5, ease: "easeInOut" },
              scale: { duration: 3, ease: "easeOut" }
            }}
          />
        </AnimatePresence>
        
        {/* Deep Gradient Overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
      </div>

      {/* Content Aligned Bottom Center/Left */}
      <div className="absolute inset-x-0 bottom-0 p-8 md:p-12 pb-16 flex flex-col justify-end items-center md:items-start text-center md:text-left translate-y-4 hover:translate-y-0 transition-transform duration-700">
        
        {/* BIG NUMBERS - High Contrast & Minimalist */}
        <div className="flex flex-col mb-4 items-center md:items-start">
          <span className="text-[32px] md:text-[42px] font-sans font-light text-white tracking-tight leading-none">
            {item.bigNumber}
          </span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mt-1.5">
            {item.unit}
          </span>
        </div>

        <h3 className="text-[16px] font-sans font-bold tracking-[0.3em] text-white uppercase mb-3">
          {item.title}
        </h3>
        <p className="text-[14px] font-sans font-light leading-relaxed text-white/70 max-w-[200px] md:max-w-xs transition-opacity duration-700">
          {item.description}
        </p>

        {/* Minimal indicator line */}
        <div className="mt-6 w-8 h-px bg-white/30 group-hover:w-full transition-all duration-700" />
      </div>

      {/* Subtle border shine on hover */}
      <div className="absolute inset-0 border border-transparent hover:border-white/20 transition-colors pointer-events-none" />
    </div>
  );
};

export default function CuradoriaPreview() {
  return (
    <section className="bg-[#FAF9F6] pt-32">
      {/* Narrative Header */}
      <div className="max-w-4xl mx-auto px-6 text-center mb-24">
        <motion.span 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-[#566952] uppercase tracking-[0.4em] text-xs font-sans font-bold mb-6 block"
        >
          Curadoria Atmos
        </motion.span>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-[#2C3E2D] font-display text-4xl md:text-5xl leading-tight mb-8"
        >
          A <span className="italic font-extralight">Atmos</span> organiza toda sua viagem.
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-[#2C3E2D]/70 font-sans font-light text-lg md:text-xl leading-relaxed max-w-4xl mx-auto"
        >
          O acesso à curadoria da ATMOS é exclusivo para usuários cadastrados. <br className="hidden md:block" /> Crie sua conta gratuita e comece a salvar suas preferências para montarmos um roteiro personalizado para você.
        </motion.p>
      </div>

      {/* Edge-to-edge Grid */}
      <div className="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-4 w-full h-fit border-y border-[#2C3E2D]/5">
        {CATEGORIES.map((item, index) => (
          <CategoryCard 
            key={index} 
            item={item} 
            isLast={index === CATEGORIES.length - 1} 
          />
        ))}
      </div>

    </section>
  );
}
