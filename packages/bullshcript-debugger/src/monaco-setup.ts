// Monaco bundled locally (Tauri runs offline): the editor core, its one
// worker, BungieScript, the theme, and hovers that evaluate in the selected
// frame.
import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor/esm/vs/editor/edcore.main";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import { configuration, LANGUAGE_ID, themeRules, tokens } from "./bungiescript";
import { session } from "./session";

export const THEME = "bsdbg-dark";
const IDENTIFIER_CHAIN = /[\w.]/;
const LEADING_DOTS = /^\.+/;
const STARTS_WITH_DIGIT = /^\d/;

self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco });

monaco.languages.register({
  id: LANGUAGE_ID,
  extensions: [".bs", ".es", ".esp", ".esu"],
});
monaco.languages.setLanguageConfiguration(LANGUAGE_ID, configuration);
monaco.languages.setMonarchTokensProvider(LANGUAGE_ID, tokens);
monaco.editor.defineTheme(THEME, {
  base: "vs-dark",
  inherit: true,
  rules: themeRules,
  colors: { "editor.background": "#1e1e1e" },
});

monaco.languages.registerHoverProvider(LANGUAGE_ID, {
  provideHover: async (model, position) => {
    const word = model.getWordAtPosition(position);
    if (!word || session.state.selectedFrameId === undefined) {
      return null;
    }
    // Take the dotted chain the word ends: `sq_guards.count`.
    const text = model.getLineContent(position.lineNumber);
    let start = word.startColumn - 1;
    while (start > 0 && IDENTIFIER_CHAIN.test(text[start - 1] ?? "")) {
      start -= 1;
    }
    const expression = text
      .slice(start, word.endColumn - 1)
      .replace(LEADING_DOTS, "");
    if (!expression || STARTS_WITH_DIGIT.test(expression)) {
      return null;
    }
    const result = await session.hover(expression);
    if (!result) {
      return null;
    }
    return {
      range: new monaco.Range(
        position.lineNumber,
        start + 1,
        position.lineNumber,
        word.endColumn
      ),
      contents: [
        {
          value: `\`${expression}\`${result.type ? ` *${result.type}*` : ""}\n\n\`\`\`\n${result.result}\n\`\`\``,
        },
      ],
    };
  },
});
