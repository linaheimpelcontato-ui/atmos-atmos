import { Helmet } from "react-helmet-async";
import { storageUrl } from "@/lib/storage";

const SITE_NAME = "ATMOS";
const BASE_URL = "https://atmos.tur.br";
const DEFAULT_OG_IMAGE = storageUrl("home/hero-home-1.jpg");

interface PageSEOProps {
  title: string;
  description: string;
  path: string;
  image?: string;
}

export default function PageSEO({ title, description, path, image }: PageSEOProps) {
  const fullTitle = path === "/" ? title : `${title} — ${SITE_NAME}`;
  const canonical = `${BASE_URL}${path}`;
  const ogImage = image || DEFAULT_OG_IMAGE;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
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
