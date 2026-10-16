import "./monaco-setup";
import "./styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { session } from "./session";

// No webview menu (Back/Refresh/Inspect) anywhere: the app's own menus are
// opened by their elements' handlers, which still see the event.
window.addEventListener("contextmenu", (e) => e.preventDefault(), {
  capture: true,
});
// Nor dragging UI elements about (text in inputs still drags).
window.addEventListener(
  "dragstart",
  (e) => {
    const target = e.target as HTMLElement | null;
    if (!target?.closest?.("input, textarea")) {
      e.preventDefault();
    }
  },
  { capture: true }
);

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
// Reconnects on its own once started.
session.connect();
