import { motion } from "framer-motion";
import { ArrowRight, Users, Settings, Globe } from "lucide-react";
import { storageUrl } from "@/lib/storage";

export default function FacilitadorSection() {
  return (
    <section id="b2b-facilitadores" className="py-20 bg-[#1A1612] overflow-hidden relative border-none">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Header Section */}
        <div className="max-w-4xl mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-4">
              <span className="text-[#A88B4C] uppercase tracking-[0.4em] text-[10px] font-bold">
                B2B • Grupos e Imersões
              </span>
            </div>
            <h2 className="text-[#E4DBCC] text-2xl md:text-4xl lg:text-[52px] font-display leading-[1.3] tracking-tight max-w-none">
              Construa conosco projetos que <br />
              fortalecem o território <span className="font-light italic text-[#A88B4C]">e elevam o padrão</span> <br />
              <span className="font-light italic text-[#A88B4C]">das experiências dos seus clientes.</span>
            </h2>
            <p className="text-[#E4DBCC]/60 text-lg md:text-xl font-sans font-light leading-relaxed max-w-4xl">
              Este espaço é para quem conduz grupos e busca um parceiro local para planejar, operar e elevar experiências na Chapada dos Veadeiros com curadoria e precisão.
            </p>
          </motion.div>
        </div>

        {/* Who we serve: Interactive Typography List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-20 gap-y-12 mb-20">
          <div className="space-y-8">
            {[
              { 
                title: "Facilitadores e Professores", 
                desc: "Instrutores e educadores que promovem retiros e imersões com propósito." 
              },
              { 
                title: "Agências de Viagem", 
                desc: "Parcerias para roteiros integrados e experiências sob curadoria ATMOS." 
              }
            ].map((item, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="group border-b border-white/10 pb-6"
              >
                <h3 className="text-[#E4DBCC] text-xl md:text-2xl font-display mb-2 flex items-center gap-4 transition-colors group-hover:text-[#A88B4C]">
                  <span className="text-xs font-sans font-bold opacity-30">0{idx + 1}</span>
                  {item.title}
                </h3>
                <p className="text-[#E4DBCC]/50 font-sans font-light text-base leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
          <div className="space-y-8">
            {[
              { 
                title: "Projetos e Marcas", 
                desc: "Ativações, eventos corporativos, lançamento de produtos e experiências de turismo regenerativo." 
              },
              { 
                title: "Grupos Corporativos", 
                desc: "Parcerias para roteiros integrados e experiências sob curadoria ATMOS." 
              }
            ].map((item, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="group border-b border-white/10 pb-6"
              >
                <h3 className="text-[#E4DBCC] text-xl md:text-2xl font-display mb-2 flex items-center gap-4 transition-colors group-hover:text-[#A88B4C]">
                  <span className="text-xs font-sans font-bold opacity-30">0{idx + 3}</span>
                  {item.title}
                </h3>
                <p className="text-[#E4DBCC]/50 font-sans font-light text-base leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Process: How it works */}
        <div className="pt-8 overflow-visible">
          <div className="mb-12">
            <h3 className="text-[#A88B4C] uppercase tracking-[0.4em] text-xs font-bold opacity-80">
              Como funciona a Parceria
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-16">
            {[
              { 
                step: "01", 
                text: "Você como facilitador é responsável pela venda das vagas para o seu público." 
              },
              { 
                step: "02", 
                text: "Nós fornecemos toda a infraestrutura: roteiro, equipe local, transporte, hospedagens, refeições, ingressos e registros." 
              },
              { 
                step: "03", 
                text: "Roteiro estruturado e testado, com flexibilidade para inserção de outras preferências do grupo." 
              },
              { 
                step: "04", 
                text: "O valor do pacote é fixado por pessoa, e você pode aplicar sua margem sobre esse valor na venda final ao seu grupo." 
              }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="flex flex-col gap-6"
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl font-display italic text-[#A88B4C] leading-none">
                    {item.step}
                  </span>
                  <div className="h-px w-8 bg-[#A88B4C]/30" />
                </div>
                <p className="text-[#E4DBCC]/70 font-sans font-light text-[13px] leading-relaxed">
                  {item.text}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Impact Visual: Large Background Symbol */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] opacity-[0.05] pointer-events-none">
          <img src="https://zjavxhmxrbpidvssrbca.supabase.co/storage/v1/object/public/assets/home/simboloatmos.png" alt="" className="w-full h-full grayscale invert" />
        </div>

      </div>
    </section>
  );
}
