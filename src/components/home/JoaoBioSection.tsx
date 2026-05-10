import { useLanguage } from "@/contexts/LanguageContext";
import { optimizedUrl, IMAGE_PRESETS } from "@/lib/storage";
import { motion } from "framer-motion";

const joaoAccioly = optimizedUrl("home/Joao/joao-1.jpg", IMAGE_PRESETS.card);

const StatItem = ({ value, label }: { value: string; label: string }) => (
  <div className="flex flex-col border-l border-border pl-5 py-2">
    <strong className="text-4xl md:text-5xl lg:text-6xl font-black text-foreground mb-1 tracking-tighter">
      {value}
    </strong>
    <span className="text-xs tracking-widest uppercase font-semibold text-muted-foreground">
      {label}
    </span>
  </div>
);

export default function JoaoBioSection() {
  const { t } = useLanguage();

  return (
    <section className="relative py-24 md:py-32 bg-background overflow-hidden border-t items-center flex">
      {/* Subtle Texture Grain in background */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay" style={{ backgroundImage: "url('https://grainy-gradients.vercel.app/noise.svg')" }} />
      
      <div className="container px-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-16 lg:gap-24 relative z-10">
          
          <motion.div 
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex-1 w-full"
          >
            <div className="flex items-center gap-4 mb-6">
              <span className="h-[1px] w-12 bg-accent" />
              <span className="text-accent text-xs font-bold uppercase tracking-[0.2em]">{t("guide.title")}</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] mb-8 tracking-tight">
               Liderando trilhas <br/> há quase uma década
            </h2>
            
            <div className="space-y-6 text-lg text-muted-foreground/80 leading-relaxed font-light max-w-2xl">
              <p>{t("guide.text1")}</p>
              <p>{t("guide.text2")}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mt-12">
               <StatItem value="10+" label="Anos de Experiência" />
               <StatItem value="35+" label="Atrativos Mapeados" />
               <StatItem value="17" label="Experiências Curadas" />
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="w-full lg:w-[45%] flex-shrink-0 relative"
          >
            <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl relative group">
              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-700 z-10" />
              <img loading="lazy" 
                src={joaoAccioly} 
                alt="João Accioly" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out" 
              />
            </div>
            
            {/* Design Element */}
            <div className="absolute -z-10 -bottom-8 -right-8 w-full h-full border-2 border-border/50 rounded-3xl" />
          </motion.div>

        </div>
      </div>
    </section>
  );
}
