export const pageHead = (title: string, description: string) => () => ({
  meta: [
    { title: `${title} — CubeSites` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — CubeSites` },
    { property: "og:description", content: description },
  ],
});
