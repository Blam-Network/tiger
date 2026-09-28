import { defineConfig } from "vitepress";

export default defineConfig({
  title: "@blamnetwork/rsat",
  description:
    "Schema-first Destiny RSAT bitstream encode/decode for TypeScript.",
  base: "/rsat/",
  cleanUrls: true,
  appearance: "force-dark",
  head: [
    ["link", { rel: "preconnect", href: "https://fonts.googleapis.com" }],
    [
      "link",
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
    ],
    [
      "link",
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Overpass:wght@400;600;700&display=swap",
      },
    ],
  ],
  markdown: {
    theme: {
      light: "github-light",
      dark: "github-dark",
    },
  },
  themeConfig: {
    siteTitle:
      '<span class="blf-site-title"><span class="blf-scope">@blamnetwork/</span><span class="blf-name">rsat</span></span>',
    nav: [
      { text: "Blam Network", link: "https://blam.network" },
      { text: "Guide", link: "/guide/quick-start" },
      { text: "API", link: "/guide/api" },
      { text: "Changelog", link: "/changelog" },
      {
        text: "npm",
        link: "https://www.npmjs.com/package/@blamnetwork/rsat",
      },
      {
        text: "GitHub",
        link: "https://github.com/Blam-Network/tiger/tree/main/packages/rsat",
      },
    ],
    sidebar: [
      {
        text: "Introduction",
        items: [
          { text: "What is rsat?", link: "/" },
          { text: "Install", link: "/guide/install" },
          { text: "Quick start", link: "/guide/quick-start" },
        ],
      },
      {
        text: "Guide",
        items: [
          { text: "Field types", link: "/guide/fields" },
          { text: "Framing helpers", link: "/guide/framing" },
          { text: "Bitstream", link: "/guide/bitstream" },
        ],
      },
      {
        text: "Reference",
        items: [
          { text: "API", link: "/guide/api" },
          { text: "Changelog", link: "/changelog" },
        ],
      },
    ],
    socialLinks: [
      {
        icon: "npm",
        link: "https://www.npmjs.com/package/@blamnetwork/rsat",
        ariaLabel: "npm",
      },
      {
        icon: "github",
        link: "https://github.com/Blam-Network/tiger/tree/main/packages/rsat",
      },
      {
        icon: "discord",
        link: "https://discord.gg/77ZAgXv8a6",
        ariaLabel: "Discord",
      },
    ],
    footer: {
      message: "MIT Licensed",
      copyright:
        'Copyright © <a href="https://discord.gg/77ZAgXv8a6" target="_blank" rel="noopener noreferrer">Blam Network</a>',
    },
  },
});
