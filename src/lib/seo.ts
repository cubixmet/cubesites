const BRAND = "Cubixmet's CubeSites";

export const pageHead = (title: string, description: string) => () => ({
  meta: [
    { title: `${title} — ${BRAND}` },
    { name: "description", content: description },
    { name: "author", content: "Cubixmet" },
    { property: "og:site_name", content: BRAND },
    { property: "og:title", content: `${title} — ${BRAND}` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: `${title} — ${BRAND}` },
    { name: "twitter:description", content: description },
  ],
});
