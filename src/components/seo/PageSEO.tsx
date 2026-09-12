import { Helmet } from "react-helmet-async";

const SITE_NAME = "ATMOS";
const BASE_URL = "https://atmos.tur.br";
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.jpg`;

interface PageSEOProps {
  title: string;
  description: string;
  path: string;
  image?: string;
  keywords?: string;
}

export default function PageSEO({ title, description, path, image, keywords }: PageSEOProps) {
  const fullTitle = path === "/" || /(?:—|\|)\s*ATMOS$/.test(title) ? title : `${title} — ${SITE_NAME}`;
  const canonical = `${BASE_URL}${path}`;
  const ogImage = new URL(image || DEFAULT_OG_IMAGE, BASE_URL).href;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={canonical} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={SITE_NAME} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
