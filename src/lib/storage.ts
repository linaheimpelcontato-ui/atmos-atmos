const STORAGE_BASE = import.meta.env.VITE_R2_DOMAIN || "https://assets.atmos.tur.br";

/**
 * Legacy path mapping for R2. Kept as an identity function to prevent breaking 
 * imports in r2.ts and shared.tsx, since we've migrated back to Supabase.
 */
export const MAP_R2_PATH = (path: string): string => {
  return path;
};

const PRODUCT_PATH_MAP: Record<string, string> = {
  // Cachoeiras
  "segredo": "Segredo/Segredo-1.jpg",
  "vale-da-lua": "Vale da lua /Vale da lua -1.jpg",
  "macacao": "Macacão/Macacão-1.jpg",
  "dragao": "Dragão/Dragão-1.jpg",
  "almecegas": "Almecegas/Almecegas-1.jpg",
  "almecegas-sao-bento": "Almecegas/Almecegas-1.jpg",
  "almecegas-i-e-ii--sao-bento": "Almecegas/Almecegas-1.jpg",
  "macaquinhos": "Macaquinhos/Macaquinhos-1.jpg",
  "couros": "Couros/Couros-1.jpg",
  "ponte-de-pedra": "Ponte de Pedra/Ponte de Pedra-1.jpg",
  "anjos-e-arcanjos": "Anjos e Arcanjos/Anjos e Arcanjos-1.jpg",
  "bocaina-do-farias": "Bocaina do Farias/Bocaina do Farias-1.jpg",
  "boqueirao": "Boqueirão/Boqueirão-1.jpg",
  "agua-fria": "Água fria /Água fria -1.jpg",
  "alpes-goianos": "Alpes Goianos/Alpes Goianos-1.jpg",
  "bona-espero": "Bona espero/Bona espero-1.jpg",
  "candaru": "Candaru/Candaru-1.jpg",
  "canjica-e-aguas-lindas": "Canjica e Águas lindas/Canjica e Águas lindas-1.jpg",
  "caracol": "Caracol/Caracol-1.jpg",
  "catoa": "Catoá/Catoá-1.jpg",
  "canion-da-sao-felix": "Cânion da São Félix /Cânion da São Félix -1.jpg",
  "chapada-alta": "Chapada Alta/Chapada Alta-1.jpg",
  "coca-cola-urucum": "Coca cola - Urucum/Coca cola - Urucum-1.jpg",
  "fazenda-volta-da-serra-cordovil-e-esmeralda": "Fazenda volta da Serra (Cordovil e Esmeralda)/Fazenda volta da Serra (Cordovil e Esmeralda)-1.jpg",
  "guardiao-curriola": "Guardião - Curriola/Guardião - Curriola-1.jpg",
  "label": "Label/Label-1.jpg",
  "lajeado": "Lajeado/Lajeado-1.jpg",
  "loquinhas": "Loquinhas/Loquinhas-1.jpg",
  "mirante-da-janeja": "Mirante da Janeja/Mirante da Janeja-1.jpg",
  "mirante-morro-da-baleia": "Mirante morro da baleia/Mirante morro da baleia-1.jpg",
  "papagaio": "Papagaio/Papagaio-1.jpg",
  "poco-encantado": "Poço Encantado/Poço Encantado-1.jpg",
  "prata": "Prata/Prata-1.jpg",
  "rio-lages": "Rio Lages/Rio Lages-1.jpg",
  "sertao-zen": "Sertão Zen/Sertão Zen-1.jpg",
  "simao-correia": "Simão Correia/Simão Correia-1.jpg",

  // Experiências
  "astro-turismo": "Astro Turismo/Astro Turismo-1.jpg",
  "astroturismo": "Astro Turismo/Astro Turismo-1.jpg",
  "aula-de-forro": "Aula de Forró/Aula de Forró-1.jpg",
  "aula-forro": "Aula de Forró/Aula de Forró-1.jpg",
  "canionismo": "Canionismo/Canionismo-1.jpg",
  "experiencia-noturna-imersiva": "Experiencia Noturna Imersiva/Experiencia Noturna Imersiva-1.jpg",
  "feira-dos-produtores-locais": "Feira Dos Produtores Locais/Feira Dos Produtores Locais-1.jpg",
  "feira-produtores": "Feira Dos Produtores Locais/Feira Dos Produtores Locais-1.jpg",
  "massagem-e-bem-estar": "Massagem e Bem Estar/Massagem e Bem Estar-1.jpg",
  "massagem-bem-estar": "Massagem e Bem Estar/Massagem e Bem Estar-1.jpg",
  "passeio-a-cavalo": "Passeio a Cavalo/Passeio a Cavalo-1.jpg",
  "passeio-cavalo": "Passeio a Cavalo/Passeio a Cavalo-1.jpg",
  "voo-de-balao": "Voo de Balao/Voo de Balao-1.jpg",
  "voo-balao": "Voo de Balao/Voo de Balao-1.jpg",
  "voo-de-paramotor": "Voo de Paramotor/Voo de Paramotor-1.jpg",
  "voo-paramotor": "Voo de Paramotor/Voo de Paramotor-1.jpg",
  "yoga-e-meditacao": "Yoga e Meditacao/Yoga e Meditacao-1.png",
  "yoga-meditacao": "Yoga e Meditacao/Yoga e Meditacao-1.png",
  "danca-com-fogo": "Dança com Fogo/Dança com Fogo-1.jpg",
  "celestial-garden": "Celestial Garden/Celestial Garden-1.jpg",
  "rapel": "Rapel/Rapel-1.jpg",
  "tirolesa-fazenda-sao-bento": "Tirolesa Fazenda Sao Bento/Tirolesa Fazenda Sao Bento-1.jpg",
  "rafting": "Rafting/Rafting-1.jpg",
  "mesa-lira": "Mesa Lira/Mesa Lira-1.jpg",

  // Hospedagens
  "a-nossa-casa-da-arvore": "A Nossa Casa da Arvore/A Nossa Casa da Arvore-1.jpg",
  "amana-hotel": "Amana Hotel/Amana Hotel-1.jpg",
  "bagua-bangalos": "Bagua Bangalos/Bagua Bangalos-1.jpg",
  "casa-alta": "Casa Alta/Casa Alta-1.jpg",
  "casa-horizonte": "Casa Horizonte/Casa Horizonte-1.jpg",
  "casa-kanaro": "Casa Kanaro/Casa Kanaro-1.jpg",
  "casa-poema": "Casa Poema/Casa Poema-1.jpg",
  "espaco-horus": "Espaço Horus/Espaço Horus-1.jpg",
  "mariri-jungle-lodge": "Mariri Jungle Lodge/Mariri Jungle Lodge-1.jpg",
  "marley-s-house": "Marley’s House/Marley’s House-1.jpg",
  "pousada-casa-de-shiva": "Pousada Casa de Shiva/Pousada Casa de Shiva-1.jpg",
  "pousada-maya": "Pousada Maya/Pousada Maya-1.jpg",
  "refugio-veadeiros": "Refugio Veadeiros/Refugio Veadeiros-1.jpg",
  "rustik-chapada": "Rustik Chapada/Rustik Chapada-1.jpg",
  "terra-gaia": "Terra Gaia/Terra Gaia-1.jpg",
  "vila-abaton": "Vila Abaton/Vila Abaton-1.jpg",
  "vila-baru": "Vila Baru/Vila Baru-1.jpg",
  "vila-cerrado": "Vila Cerrado/Vila Cerrado-1.jpg",
  "vila-chapada": "Vila Chapada/Vila Chapada-1.jpg",
  "vila-komorebi": "Vila Komorebi/Vila Komorebi-1.jpg",
  "vila-libelula": "Vila Libelula/Vila Libelula-1.jpg",
  "vila-suindara": "Vila Suindara/Vila Suindara-1.jpg",
  "vila-toa": "Vila Toa/Vila Toa-1.jpg",
  "villa-azaleia": "Villa Azaleia/Villa Azaleia-1.jpg",

  // Serviços
  "transfer-aeroporto-carro-particular": "Transfer Aeroporto Carro Particular/Transfer Aeroporto Carro Particular-1.jpg",
  "transfers": "Transfer Aeroporto Carro Particular/Transfer Aeroporto Carro Particular-1.jpg",
  "pedidos-especiais-atmos": "Pedidos Especiais ATMOS/Pedidos Especiais ATMOS-1.jpg",
  "seguro-viagem": "Pedidos Especiais ATMOS/Pedidos Especiais ATMOS-1.jpg",
  "lanche-de-trilha": "Lanche de Trilha ATMOS/Lanche de Trilha ATMOS-1.jpg",
  "lanche-de-trilha-atmos": "Lanche de Trilha ATMOS/Lanche de Trilha ATMOS-1.jpg",
  "registro-drone": "Registro com Drone/Registro com Drone-1.jpg",
  "registro-com-drone": "Registro com Drone/Registro com Drone-1.jpg",
};

export function correctStoragePath(path: string): string {
  if (!path) return path;
  
  let clean = path.replace(/^\//, "");
  
  const subfolders = ["cachoeiras", "experiencias", "hospedagens", "serviços", "serviços"];
  
  for (const sub of subfolders) {
    const trigger = `produtos/${sub}/`;
    if (clean.includes(trigger)) {
      const parts = clean.split(trigger);
      const prefix = parts[0] + trigger;
      const rest = parts[1]; // e.g. "macacao/macacao-1.jpg"
      const subParts = rest.split("/");
      const folder = subParts[0].toLowerCase();
      
      const mapped = PRODUCT_PATH_MAP[folder];
      if (mapped) {
        const match = subParts[1]?.match(/-(\d+)\.(jpg|png|jpeg|svg|webp)$/i);
        if (match) {
          const index = match[1];
          const ext = match[2];
          const mappedFolder = mapped.split("/")[0];
          return `${prefix}${mappedFolder}/${mappedFolder}-${index}.${ext}`;
        }
        return prefix + mapped;
      }
    }
  }
  
  return clean;
}

export function getBaseStorageUrl(path: string): string {
  // If the path is already a full URL, return it as is
  if (path.startsWith("http")) return path;
  
  // Clean up leading slashes just in case
  let cleanPath = path.replace(/^\//, "");
  
  // Apply case correction for folders and files in local assets and R2 storage
  cleanPath = correctStoragePath(cleanPath);
  
  // Encode the path to handle spaces and special characters
  const encodedPath = cleanPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
  
  // In development, prefer local assets if R2 domain is not set
  if (import.meta.env.DEV && !import.meta.env.VITE_R2_DOMAIN) {
    return `/assets/${encodedPath}`;
  }
  
  return `${STORAGE_BASE}/${encodedPath}`;
}

export function storageUrl(path: string): string {
  return getBaseStorageUrl(path);
}

interface OptimizedOptions {
  width?: number;
  height?: number;
  quality?: number;
  /** default "cover" */
  resize?: "cover" | "contain" | "fill";
  format?: "origin" | "avif" | "webp";
}

export const IMAGE_PRESETS = {
  thumbnail: { width: 400, quality: 70, format: "webp" as const },
  card: { width: 800, quality: 75, format: "webp" as const },
  large: { width: 1024, quality: 75, format: "webp" as const },
  hero: { width: 1920, quality: 80, format: "webp" as const },
  gallery: { width: 1200, quality: 75, format: "webp" as const },
};

/**
 * Returns an optimized image URL using wsrv.nl proxy.
 * This handles resizing, compression, and format conversion (WebP/AVIF) at the edge without extra costs.
 */
export function optimizedUrl(path: string, options: { width?: number; height?: number; quality?: number; format?: string } = {}): string {
  return getBaseStorageUrl(path);
}

/** 
 * Cleans a string for matching: no accents, lowercase, only letters/numbers 
 */
export const normalize = (str: string) => 
  str.normalize("NFD")
     .replace(/[\u0300-\u036f]/g, "")
     .toLowerCase()
     .replace(/[^a-z0-9]+/g, "-")
     .replace(/(^-|-$)/g, "");

/**
 * Flexible matching for images.
 * Matches if the filename contains the product name OR vice-versa.
 */
export function isImageMatch(fullKey: string, prefix: string, rawName?: string): boolean {
  const fileName = fullKey.split('/').pop() || "";
  const nameWithoutExt = fileName.split('.').shift() || "";
  const normFile = normalize(nameWithoutExt).replace(/-\d+$/, ""); // remove trailing numbers
  const normPrefix = normalize(prefix);
  const normRaw = rawName ? normalize(rawName) : normPrefix;
  const normFullKey = normalize(fullKey);

  // 1. Check if filename matches exactly (ignoring trailing numbers)
  // Example: "registro-com-drone-1" matching "registro-com-drone"
  if (normFile === normPrefix || normFile === normRaw) return true;
  
  // 2. Check if filename starts with prefix followed by a dash (for numbered files)
  if (normFile.startsWith(normPrefix + "-") || normFile.startsWith(normRaw + "-")) return true;

  // 3. Fallback check for the full key (only if we are sure it's the right folder)
  // This is riskier but helps if the file was named differently
  if (normFullKey.endsWith(`/${normPrefix}/${fileName}`) || normFullKey.endsWith(`/${normRaw}/${fileName}`)) return true;

  return false;
}

