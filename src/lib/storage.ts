import { staticMediaUrl } from "./staticMedia";

const STORAGE_BASE = import.meta.env.VITE_R2_DOMAIN || "https://assets.atmos.tur.br";
const IMAGE_PROXY_BASE = "https://wsrv.nl/";
const STORAGE_HOST = (() => {
  try {
    return new URL(STORAGE_BASE).hostname;
  } catch {
    return "assets.atmos.tur.br";
  }
})();

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

/**
 * Aliases that already exist in the R2 bucket. The source data still contains
 * a few legacy names, while the bucket uses the canonical slug on disk.
 */
const R2_FOLDER_ALIASES: Record<string, string> = {
  "almecegas": "almecegas-i-e-ii--sao-bento",
  "almecegas-sao-bento": "almecegas-i-e-ii--sao-bento",
  "almecegas-i-e-ii--sao-bento": "almecegas-i-e-ii--sao-bento",
  "canion-da-sao-felix": "canions-sao-felix-e-boa-brisa",
  "coca-cola-urucum": "urucum-coca-cola",
  "fazenda-volta-da-serra-cordovil-e-esmeralda": "fzda-volta-da-serra",
  "guardiao-curriola": "curriola-guardiao",
  "mirante-da-janeja": "mirante-da-janela",
  "marleys-house": "marley-s-house",

  // Legacy experience identifiers still used by itinerary data.
  "astroturismo": "astro-turismo",
  "batismo-de-escalada": "rapel",
  "bike-cerrado": "canionismo",
  "comitivas": "passeio-a-cavalo",
  "cozinha-de-origem": "celestial-garden",
  "expedicao-4x4": "experiencia-noturna-imersiva",
  "feira-do-produtor": "feira-dos-produtores-locais",
  "flutuacao-no-rio": "rafting",
  "forro-pe-de-serra": "aula-de-forro",
  "massagem-terapeutica": "massagem-e-bem-estar",
  "observacao-de-aves": "celestial-garden",
  "rapel-nas-cachoeiras": "rapel",
  "ritual-do-fogo": "danca-com-fogo",
  "tirolesa-vovo-a-jato": "tirolesa-fazenda-sao-bento",
  "trilha-noturna": "experiencia-noturna-imersiva",
  "voo-paramotor": "voo-de-paramotor",
  "massagem-bem-estar": "massagem-e-bem-estar",
  "yoga-meditacao": "yoga-e-meditacao",
  "passeio-cavalo": "passeio-a-cavalo",
  "aula-forro": "aula-de-forro",
  "feira-produtores": "feira-dos-produtores-locais",
};

/** Legacy service shortcuts that point to objects in the current R2 layout. */
const SERVICE_ROOT_ALIASES: Record<string, string> = {
  "lanche": "lanche-de-trilha-atmos-1.png",
  "lanche-de-trilha": "lanche-de-trilha-atmos-1.png",
  "drone": "registro-com-drone-captacao-com-edicao/registro-com-drone-captacao-com-edicao-1.jpg",
  "registro-drone": "registro-com-drone-captacao-com-edicao/registro-com-drone-captacao-com-edicao-1.jpg",
  "transfer": "transfer-aeroporto-carro-particular/transfer-aeroporto-carro-particular-1.jpg",
  "transfers": "transfer-aeroporto-carro-particular/transfer-aeroporto-carro-particular-1.jpg",
  "seguro": "pedidos-especiais-atmos/pedidos-especiais-atmos-1.jpg",
  "especial": "pedidos-especiais-atmos/pedidos-especiais-atmos-1.jpg",
};

/**
 * Several folders were uploaded with a stable extension different from the
 * old frontend guesses. Keep the key name canonical and correct only the
 * extension; dynamically listed R2 keys already arrive with their true value.
 */
const R2_EXTENSION_ALIASES: Record<string, string> = {
  "a-nossa-casa-da-arvore": "avif",
  "amana-hotel": "avif",
  "bagua-bangalos": "avif",
  "casa-alta": "jpeg",
  "casa-horizonte": "jpeg",
  "casa-kanaro": "jpeg",
  "casa-poema": "jpeg",
  "espaco-horus": "jpeg",
  "mariri-jungle-lodge": "jpeg",
  "marley-s-house": "jpeg",
  "refugio-veadeiros": "jpeg",
  "rustik-chapada": "jpeg",
  "vila-abaton": "jpeg",
  "vila-komorebi": "jpeg",
  "danca-com-fogo": "jpeg",
  "experiencia-noturna-imersiva": "png",
  "feira-dos-produtores-locais": "png",
  "gota-sat-som": "png",
  "massagem-e-bem-estar": "png",
  "passeio-a-cavalo": "png",
  "rafting": "jpeg",
  "tirolesa-fazenda-sao-bento": "png",
  "voo-de-paramotor": "png",
  "yoga-e-meditacao": "png",
};

const PRODUCT_CATEGORIES = new Set(["cachoeiras", "experiencias", "hospedagens", "servicos"]);

function canonicalStorageSegment(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function canonicalProductCategory(value: string): string | undefined {
  const category = canonicalStorageSegment(value);
  if (!PRODUCT_CATEGORIES.has(category)) return undefined;
  return category === "servicos" ? "serviços" : category;
}

function resolveR2Folder(folderKey: string): string {
  const key = canonicalStorageSegment(folderKey);
  const legacyMapped = PRODUCT_PATH_MAP[key]?.split("/")[0];
  const mappedKey = legacyMapped ? canonicalStorageSegment(legacyMapped) : key;
  return R2_FOLDER_ALIASES[key] || R2_FOLDER_ALIASES[mappedKey] || mappedKey;
}

function canonicalProductFile(fileName: string, sourceFolder: string, mappedFolder: string): string {
  const sourceExtension = fileName.match(/\.[a-z0-9]+$/i)?.[0]?.toLowerCase() || "";
  const extension = R2_EXTENSION_ALIASES[mappedFolder]
    ? `.${R2_EXTENSION_ALIASES[mappedFolder]}`
    : sourceExtension;
  const base = sourceExtension ? fileName.slice(0, -sourceExtension.length) : fileName;
  const numbered = base.match(/-(\d+)$/);
  const sourceFolderIsCanonical =
    sourceFolder === canonicalStorageSegment(sourceFolder) &&
    sourceFolder === sourceFolder.toLowerCase();

  // Do not rewrite already-canonical keys such as `_capa.jpg`.
  if (sourceFolderIsCanonical && sourceFolder === mappedFolder && /^[a-z0-9._-]+$/.test(fileName)) {
    return sourceExtension && sourceExtension !== extension
      ? `${base}${extension}`
      : fileName;
  }

  if (numbered) return `${mappedFolder}-${numbered[1]}${extension}`;
  return `${canonicalStorageSegment(base)}${extension}`;
}

export function correctStoragePath(path: string): string {
  if (!path) return path;

  const clean = path.replace(/^\/+/, "");
  const segments = clean.split("/").filter(Boolean);
  const categoryIndex = segments.findIndex((segment, index) => {
    const category = canonicalProductCategory(segment);
    const isDirectCategory = index === 0;
    const isUnderProducts = canonicalStorageSegment(segments[index - 1] || "") === "produtos";
    return !!category && (isDirectCategory || isUnderProducts);
  });

  if (categoryIndex < 0) return clean;

  const category = canonicalProductCategory(segments[categoryIndex])!;
  const prefix = categoryIndex === 0 ? ["produtos"] : segments.slice(0, categoryIndex);
  const rest = segments.slice(categoryIndex + 1);
  if (rest.length === 0) return [...prefix, category].join("/");

  // Some legacy service paths point directly to a shortcut file. Resolve them
  // to the real object rather than generating a URL that can never exist.
  if (category === "serviços" && rest.length === 1) {
    const fileName = rest[0];
    const shortcutKey = canonicalStorageSegment(fileName.replace(/\.[^.]+$/, "").replace(/-\d+$/, ""));
    const shortcut = SERVICE_ROOT_ALIASES[shortcutKey];
    if (shortcut) return [...prefix, category, shortcut].join("/");

    const extension = fileName.match(/\.[a-z0-9]+$/i)?.[0]?.toLowerCase() || "";
    const base = extension ? fileName.slice(0, -extension.length) : fileName;
    return [...prefix, category, `${canonicalStorageSegment(base)}${extension}`].join("/");
  }

  // Product assets use one folder followed by a numbered file. Normalize both
  // parts while retaining already-canonical R2 keys byte-for-byte.
  const sourceFolder = rest[0];
  let mappedFolder = resolveR2Folder(sourceFolder);
  const sourceFile = rest.slice(1).join("/");
  if (!sourceFile) return [...prefix, category, mappedFolder].join("/");

  const normalizedSourceFile = canonicalStorageSegment(sourceFile.replace(/\.[^.]+$/, ""));
  if (mappedFolder === "registro-com-drone" && normalizedSourceFile.endsWith("-1")) {
    mappedFolder = "registro-com-drone-captacao-com-edicao";
  }

  const fileName = canonicalProductFile(sourceFile, sourceFolder, mappedFolder);
  return [...prefix, category, mappedFolder, fileName].join("/");
}

export function getBaseStorageUrl(path: string): string {
  // If the path is already a full URL, return it as is
  if (path.startsWith("http")) return path;
  
  const local = staticMediaUrl(path.replace(/^\//, ""));
  if (local) return local;

  // Clean up leading slashes just in case
  let cleanPath = path.replace(/^\//, "");
  
  // Apply case correction for folders and files in local assets and R2 storage
  cleanPath = correctStoragePath(cleanPath).normalize("NFD");
  
  // Encode the path to handle spaces and special characters
  const encodedPath = cleanPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
  
  // Remote media must use the same origin in development and production.
  
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
export function optimizedUrl(path: string, options: OptimizedOptions = {}): string {
  const baseUrl = getBaseStorageUrl(path);

  // Bundled assets and third-party URLs should keep their original origin.
  // The proxy is only allowed to fetch images that belong to our R2 domain.
  let sourceUrl: URL;
  try {
    sourceUrl = new URL(baseUrl);
  } catch {
    return baseUrl;
  }

  if (sourceUrl.hostname !== STORAGE_HOST || sourceUrl.protocol !== "https:") {
    return baseUrl;
  }

  const params = new URLSearchParams({ url: sourceUrl.href });
  const width = Number.isFinite(options.width) ? Math.round(options.width!) : undefined;
  const height = Number.isFinite(options.height) ? Math.round(options.height!) : undefined;
  const quality = Number.isFinite(options.quality)
    ? Math.min(100, Math.max(1, Math.round(options.quality!)))
    : 80;

  if (width && width > 0) params.set("w", String(width));
  if (height && height > 0) params.set("h", String(height));
  if (options.resize) params.set("fit", options.resize);
  if (options.format && options.format !== "origin") params.set("output", options.format);
  if (options.format !== "origin") params.set("q", String(quality));

  return `${IMAGE_PROXY_BASE}?${params.toString()}`;
}

/**
 * Returns a FULL-RESOLUTION hero image URL — always fetches from R2 CDN,
 * piped through wsrv.nl for 1920px WebP at quality 85.
 * Use exclusively for hero background images where sharpness is critical.
 * NOTE: R2 uses lowercase paths without accents (e.g. macacao/macacao-1.jpg).
 */
const R2_BASE = import.meta.env.VITE_R2_DOMAIN || "https://assets.atmos.tur.br";
export function heroUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;

  const local = staticMediaUrl(path.replace(/^\//, ""));
  if (local) return local;

  // Use the raw lowercase path — R2 stores files with lowercase, no-accent slugs
  const cleanPath = correctStoragePath(path.replace(/^\//, ""));

  // Encode each segment for URL safety (handles spaces, etc.)
  const encodedPath = cleanPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
  const r2Url = `${R2_BASE}/${encodedPath}`;

  // Pipe through wsrv.nl: 1920px wide, quality 85, WebP, cover resize
  return `https://wsrv.nl/?url=${encodeURIComponent(r2Url)}&w=1920&q=85&output=webp&fit=cover`;
}

/**
 * Returns a card/gallery image URL — always fetches from R2 CDN,
 * piped through wsrv.nl for 900px WebP at quality 82.
 * Use for day gallery carousels, product cards, etc.
 * NOTE: R2 uses lowercase paths without accents (e.g. macacao/macacao-1.jpg).
 */
export function cardUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;

  const local = staticMediaUrl(path.replace(/^\//, ""));
  if (local) return local;

  const cleanPath = correctStoragePath(path.replace(/^\//, ""));
  const encodedPath = cleanPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
  const r2Url = `${R2_BASE}/${encodedPath}`;

  return `https://wsrv.nl/?url=${encodeURIComponent(r2Url)}&w=900&q=82&output=webp&fit=cover`;
}

export const normalize = (str: any): string => {
  if (!str) return "";
  let val = "";
  if (typeof str === "string") {
    val = str;
  } else if (typeof str === "object") {
    val = str.pt || str.en || str.es || "";
  } else {
    val = String(str);
  }
  return val
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

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
