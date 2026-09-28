import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import Layout from "./Layout.vue";
import "./fonts.css";
import "./style.css";

export default {
  extends: DefaultTheme,
  Layout,
} satisfies Theme;
