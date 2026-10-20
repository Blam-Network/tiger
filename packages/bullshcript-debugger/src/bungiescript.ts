// BungieScript for Monaco: a Monarch tokenizer after the VS Code extension's
// TextMate grammar (bullshcript/vscode-extension/syntaxes) and its
// language-configuration.json.
import type * as Monaco from "monaco-editor";

export const LANGUAGE_ID = "bungiescript";

const BLOCK_START =
  /^\s*(?:def|static def|script|command_script|class|struct|enum|if|elif|else|while|for|switch|case|default)\b.*:\s*(#.*)?$/;

export const configuration: Monaco.languages.LanguageConfiguration = {
  comments: { lineComment: "#" },
  brackets: [
    ["(", ")"],
    ["[", "]"],
  ],
  autoClosingPairs: [
    { open: "(", close: ")" },
    { open: "[", close: "]" },
    { open: '"', close: '"', notIn: ["string", "comment"] },
    { open: "'", close: "'", notIn: ["string", "comment"] },
  ],
  surroundingPairs: [
    { open: "(", close: ")" },
    { open: "[", close: "]" },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  indentationRules: {
    increaseIndentPattern: BLOCK_START,
    decreaseIndentPattern: /^\s*(?:elif|else|case|default)\b.*:\s*$/,
  },
};

export const tokens: Monaco.languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".bs",
  keywords: [
    "if",
    "elif",
    "else",
    "while",
    "for",
    "in",
    "switch",
    "case",
    "default",
    "return",
    "break",
    "pass",
  ],
  logical: ["and", "or", "not"],
  constants: ["true", "false", "nil"],
  builtins: [
    "sleep",
    "sleep_until",
    "sleep_until_timeout",
    "range",
    "print",
    "assert",
    "len",
    "enum_to_int",
    "is_instance",
    "allocate",
    "schema",
    "pick_random_count",
    "event_message",
    "event_warning",
    "event_error",
    "vector4",
  ],
  types: [
    "int",
    "short",
    "real",
    "bool",
    "string",
    "string_hash",
    "vector2d",
    "vector3d",
    "vector4",
    "static_array",
    "static_stack",
    "dynamic_array",
    "table",
    "bundlelib",
    "mathlib",
    "nativemathlib",
  ],
  tokenizer: {
    root: [
      [/#.*$/, "comment"],
      // declarations
      [
        /^(\s*)(class|struct|enum)(\s+)([A-Za-z_]\w*)/,
        ["", "keyword.type", "", "type.identifier"],
      ],
      [/^(\s*)(static)(\s+)(?=def\b)/, ["", "keyword.modifier", ""]],
      [
        /^(\s*)(def)(\s+)([A-Za-z_][\w.]*)/,
        ["", "keyword.type", "", "function"],
      ],
      [
        /^(\s*)(script)(\s+)([A-Za-z_]\w*)/,
        ["", "keyword.type", "", "function"],
      ],
      [
        /^(\s*)(delegate|command_script|implements)(\s+)([A-Za-z_][\w.]*)/,
        ["", "keyword.type", "", "function"],
      ],
      // a member line: type then name (Monarch's ^ is the current position,
      // so keep keywords out of the type slot: `return total`)
      [
        /^(\s*)((?:static\s+)?)(?!(?:return|not|and|or|in|if|elif|while|for|switch|case|else|pass|break)\b)([A-Za-z_]\w*(?:<[^>]*>)?(?:\[\d*\])?)(\s+)([A-Za-z_]\w*)(?=\s*(?:=|bind\b|#|\[|$))/,
        ["", "keyword.modifier", "type.identifier", "", "variable.member"],
      ],
      [/"/, "string", "@dstring"],
      [/'/, "string", "@sstring"],
      [/0[xX][0-9A-Fa-f]+\b/, "number.hex"],
      [/\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?/, "number"],
      [/\b[cesi]_[A-Za-z0-9_]+\b/, "type.identifier"],
      [
        /[A-Za-z_]\w*(?=\s*\()/,
        {
          cases: {
            "@builtins": "predefined",
            "@keywords": "keyword",
            "@default": "function.call",
          },
        },
      ],
      [
        /[A-Za-z_]\w*/,
        {
          cases: {
            "@keywords": "keyword",
            "@logical": "keyword.operator",
            "@constants": "constant",
            "@types": "type.identifier",
            bind: "keyword",
            local: "keyword.modifier",
            self: "variable.language",
            "@default": "identifier",
          },
        },
      ],
      [/!=|==|<=|>=|[-+*/%^<>=]/, "operator"],
      [/[()[\]]/, "@brackets"],
    ],
    dstring: [
      [/\\(?:\d{1,3}|x[0-9A-Fa-f]{2}|.)/, "string.escape"],
      [/[^\\"]+/, "string"],
      [/"/, "string", "@pop"],
    ],
    sstring: [
      [/\\(?:\d{1,3}|x[0-9A-Fa-f]{2}|.)/, "string.escape"],
      [/[^\\']+/, "string"],
      [/'/, "string", "@pop"],
    ],
  },
};

// Dark theme rules for the token names above, VS Code Dark+ colours.
export const themeRules: Monaco.editor.ITokenThemeRule[] = [
  { token: "comment", foreground: "6A9955" },
  { token: "keyword", foreground: "C586C0" },
  { token: "keyword.type", foreground: "569CD6" },
  { token: "keyword.modifier", foreground: "569CD6" },
  { token: "keyword.operator", foreground: "569CD6" },
  { token: "type.identifier", foreground: "4EC9B0" },
  { token: "function", foreground: "DCDCAA" },
  { token: "function.call", foreground: "DCDCAA" },
  { token: "predefined", foreground: "DCDCAA", fontStyle: "italic" },
  { token: "variable.member", foreground: "9CDCFE" },
  { token: "variable.language", foreground: "569CD6" },
  { token: "identifier", foreground: "9CDCFE" },
  { token: "constant", foreground: "569CD6" },
  { token: "number", foreground: "B5CEA8" },
  { token: "number.hex", foreground: "B5CEA8" },
  { token: "string", foreground: "CE9178" },
  { token: "string.escape", foreground: "D7BA7D" },
  { token: "operator", foreground: "D4D4D4" },
];
