export const BRAND = "CuboSites";
export const BRAND_TAGLINE = "Built in control";
export const OG_IMAGE = "https://www.cubosites.com/og.jpg";
export const SITE_URL = "https://app.cubosites.com";

export const pageHead = (title: string, description: string) => () => ({
  meta: [
    { title: `${title} | ${BRAND}` },
    { name: "description", content: description },
    { name: "author", content: "Cubixmet" },
    { name: "application-name", content: BRAND },
    { name: "theme-color", content: "#2e6e4a" },
    { property: "og:site_name", content: BRAND },
    { property: "og:title", content: `${title} | ${BRAND}` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: SITE_URL },
    { property: "og:image", content: OG_IMAGE },
    { property: "og:image:width", content: "1280" },
    { property: "og:image:height", content: "720" },
    { property: "og:image:alt", content: "CuboSites — bookkeeping for every construction site" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: `${title} | ${BRAND}` },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: OG_IMAGE },
  ],
  links: [{ rel: "canonical", href: SITE_URL }],
});
