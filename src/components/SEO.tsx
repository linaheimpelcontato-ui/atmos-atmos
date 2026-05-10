import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
}

const SEO = ({ 
  title, 
  description, 
  keywords, 
  image = "https://atmos.tur.br/og-image.jpg", 
  url = "https://atmos.tur.br/", 
  type = "website" 
}: SEOProps) => {
  const siteTitle = "ATMOS — Experiências na Chapada dos Veadeiros";
  const fullTitle = title ? `${title} | ATMOS` : siteTitle;
  const defaultDescription = "Curadoria de experiências exclusivas na Chapada dos Veadeiros. Roteiros personalizados, guias bilingues e imersões na natureza.";

  return (
    <Helmet>
      {/* Standard metadata tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description || defaultDescription} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={url} />

      {/* Open Graph / Facebook tags */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description || defaultDescription} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />

      {/* Twitter tags */}
      <meta name="twitter:creator" content="ATMOS Turismo" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description || defaultDescription} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};

export default SEO;
