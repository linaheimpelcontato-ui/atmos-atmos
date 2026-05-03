import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

// Global Image Error Interceptor - Automatically tries alternative extensions (.jpg, .png, etc.)
// This makes the entire platform extension-agnostic for assets.
window.addEventListener('error', (e) => {
  if (e.target instanceof HTMLImageElement) {
    const img = e.target;
    const currentSrc = img.src;
    
    // List of common extensions to cycle through
    const extensions = [".jpg", ".jpeg", ".png", ".webp", ".avif"];
    
    // Find current extension
    const match = currentSrc.match(/\.(jpg|jpeg|png|webp|avif)$/i);
    if (!match) return;
    
    const currentExt = match[0].toLowerCase();
    const currentIndex = extensions.indexOf(currentExt);
    
    // Attempt the next extension in the list
    if (currentIndex < extensions.length - 1) {
      const nextExt = extensions[currentIndex + 1];
      const newSrc = currentSrc.replace(new RegExp(`${currentExt}$`, 'i'), nextExt);
      
      // Tracking to prevent infinite loops
      const triedKey = 'triedExtensions';
      const tried = img.getAttribute(`data-${triedKey}`) || "";
      
      if (!tried.includes(nextExt)) {
        img.setAttribute(`data-${triedKey}`, tried + nextExt);
        img.src = newSrc;
      }
    }
  }
}, true); // Use capture phase because error events on elements don't bubble

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
