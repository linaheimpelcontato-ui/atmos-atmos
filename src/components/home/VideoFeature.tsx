import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import { storageUrl } from "@/lib/storage";

export default function VideoFeature() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  // Scale expansion effect - Fixed top origin
  const scale = useTransform(scrollYProgress, [0, 0.4], [0.65, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.25], [0, 1]);
  const borderRadius = useTransform(scrollYProgress, [0.4, 0.7], ["3rem", "0rem"]);

  const handlePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <section ref={containerRef} className="relative min-h-[60vh] bg-transparent flex flex-col items-center pt-0 pb-32 overflow-visible -mt-[25vh] z-30">
      
      {/* GREEN BACKGROUND foundation */}
      <div className="absolute top-[25vh] inset-0 z-0 bg-[#141C15]" />

      {/* Video Call to Action */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="text-center mb-8 px-6 z-20 flex flex-col items-center pt-16"
      >
        <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-[#FAF9F6]">
          <div className="w-6 h-6 rounded-full border border-[#FAF9F6]/40 flex items-center justify-center">
            <div className="border-t-[4px] border-t-transparent border-l-[7px] border-l-[#FAF9F6] border-b-[4px] border-b-transparent ml-0.5" />
          </div>
          <span>Embarque nessa atmosfera</span>
        </div>
      </motion.div>

      {/* 
          EXPANDING VIDEO CONTAINER 
          - Increased max-height to 90vh for more impact
          - Removed bg-black to eliminate black bars
          - w-full h-auto focus
      */}
      <motion.div
        style={{ scale, opacity, borderRadius, transformOrigin: "top" }}
        className="relative w-[88vw] max-w-[1400px] max-h-[82vh] mx-auto overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] border-2 border-white/90 z-10 cursor-pointer group flex items-start justify-center"
        onClick={handlePlay}
      >
        <video
          ref={videoRef}
          playsInline
          preload="metadata"
          poster={storageUrl("home/curadoria-bg.jpg")}
          className="w-full h-auto max-h-[82vh] object-cover block"
          onEnded={() => setIsPlaying(false)}
        >
          <source
            src={storageUrl("home/video-destaque.mp4")}
            type="video/mp4"
          />
          Your browser does not support the video tag.
        </video>

        {/* HIGH-END EDITORIAL PLAY OVERLAY */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center transition-all duration-700 group-hover:bg-black/50">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-8 md:gap-16 text-white"
            >
              {/* Left: Watch Label */}
              <div className="flex items-center gap-3">
                <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-white border-b-[8px] border-b-transparent" />
                <span className="text-xl md:text-2xl font-light tracking-wide">ASSISTA</span>
              </div>

              <div className="relative">
                <motion.img
                  src={storageUrl("home/simboloatmos.png")}
                  alt="ATMOS"
                  className="w-16 h-16 md:w-24 md:h-24"
                  style={{ filter: "brightness(0) invert(1)" }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                />
                <motion.div 
                  className="absolute inset-0 border border-white/30 rounded-full"
                  animate={{ scale: [1, 1.2], opacity: [0.5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>

              {/* Right: The Film Label */}
              <div className="flex items-center gap-3">
                <span className="text-xl md:text-2xl font-light tracking-wide whitespace-nowrap">AO FILME</span>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </section>
  );
}
