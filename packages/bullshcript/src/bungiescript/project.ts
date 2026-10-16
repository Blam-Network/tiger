// A project: every file compiled together, so classes, bases, delegates and
// types resolve across files.

import type { BsDecl, BsFile, BsFileKind, BsMember } from "./ast.ts";
import { type BsNativeBase, nativeBaseNamed } from "./native_types.ts";
import {
  type BsImportKind,
  type BsRegistryEntry,
  IMPORT_REGISTRY,
} from "./types.ts";

export interface ProjectDecl {
  readonly base: BsNativeBase | ProjectDecl | BsRegistryEntry | undefined;
  readonly baseName: string | undefined;
  // "@es\\utility_scripts\\kill_squad_objective.esu"
  readonly chunkName: string;
  readonly decl: BsDecl;
  // the delegates this decl declares; a `def` of the same name answers one
  readonly delegates: ReadonlySet<string>;
  readonly file: BsFile;
  // by name; a field, thread or delegate wins over a def of the same name
  readonly members: ReadonlyMap<string, BsMember>;
  // "_es.utility_scripts.kill_squad_objective.kill_squad_objective"
  readonly modulePath: string;
  readonly name: string;
}

// a decl before its base is linked
interface LinkableDecl extends Omit<ProjectDecl, "base"> {
  base: BsNativeBase | ProjectDecl | BsRegistryEntry | undefined;
}

// the native base a decl with no `: base` sits on, by file kind
export const DEFAULT_NATIVE_BASE: Readonly<Record<BsFileKind, string>> = {
  bs: "c_activity_script",
  es: "c_encounter",
  esp: "c_mission_phase",
  esu: "c_activity_script",
};

export const NATIVE_BASE_METHODS: readonly string[] = [
  "get_outer",
  "get_activity_option_bool",
  "get_activity_option_integer",
  "get_activity_option_string_hash",
  "get_activity_option_bool_array",
  "get_activity_option_integer_array",
  "initialize",
  "set_activity_complete",
  "get_current_activity_time",
  "insertion_point",
  "is_complete",
];

export const NATIVE_DELEGATES: readonly string[] = [
  "d_finalize",
  "d_restore_from_game_state",
  "d_on_player_enter",
  "d_startup",
];

const NATIVE_BASE_FIELDS: readonly string[] = ["player_entered"];

const NATIVE_MEMBERS = new Set([
  ...NATIVE_BASE_METHODS,
  ...NATIVE_DELEGATES,
  ...NATIVE_BASE_FIELDS,
]);

// Builtins a body may call; emitted as plain Lua globals.
export const BUILTINS: readonly string[] = [
  "print",
  "assert",
  "len",
  "schema",
  "is_instance",
  "allocate",
  "enum_to_int",
  "pick_random_count",
  "event_message",
  "event_error",
  "event_warning",
  "vector4",
];

// Builtins the compiler lowers rather than calls.
export const SPECIAL_FORMS: readonly string[] = [
  "sleep",
  "sleep_until",
  "sleep_until_timeout",
  "range",
];

const BUILTIN_SET = new Set([...BUILTINS, ...SPECIAL_FORMS]);

export type Resolution =
  | { readonly kind: "builtin"; readonly name: string }
  | {
      readonly kind: "member";
      readonly member: BsMember | undefined;
      readonly owner: ProjectDecl | undefined;
    }
  | { readonly kind: "type"; readonly entry: BsRegistryEntry }
  | { readonly kind: "unresolved" };

export function isEsFamily(kind: BsFileKind): boolean {
  return kind !== "bs";
}

// The dotted module path import strings use: directories, file stem, decl.
// `bs\` is the root of .bs paths and is dropped; `es\` becomes `_es`.
export function modulePathOf(
  path: string,
  kind: BsFileKind,
  declName: string
): string {
  const parts = path.replaceAll("\\", "/").split("/");
  const file = parts.pop() ?? "";
  const stem = file.slice(0, file.lastIndexOf("."));
  if (parts[0] === "bs" && kind === "bs") {
    parts.shift();
  } else if (parts[0] === "es" && isEsFamily(kind)) {
    parts[0] = "_es";
  } else if (isEsFamily(kind)) {
    parts.unshift("_es");
  }
  return [...parts, stem, declName].join(".");
}

export function chunkNameOf(path: string): string {
  return `@${path.replaceAll("/", "\\")}`;
}

function declImportKind(decl: BsDecl): BsImportKind {
  switch (decl.kind) {
    case "class":
      return "class";
    case "enum":
      return "enum";
    default:
      return "schema";
  }
}

export class Project {
  readonly decls: readonly ProjectDecl[];
  private readonly byName = new Map<string, ProjectDecl>();
  private readonly registry = new Map<string, BsRegistryEntry>();

  constructor(files: readonly BsFile[]) {
    for (const entry of IMPORT_REGISTRY) {
      this.registry.set(entry.name, entry);
    }
    const decls: LinkableDecl[] = [];
    for (const file of files) {
      for (const decl of file.decls) {
        const modulePath = modulePathOf(file.path, file.kind, decl.name);
        const members = new Map<string, BsMember>();
        for (const member of decl.members) {
          if (
            member.kind !== "enum_value" &&
            (member.kind !== "def" || !members.has(member.name))
          ) {
            members.set(member.name, member);
          }
        }
        const entry: LinkableDecl = {
          base: undefined,
          baseName: decl.base,
          chunkName: chunkNameOf(file.path),
          decl,
          delegates: new Set(
            decl.members.flatMap((m) => (m.kind === "delegate" ? [m.name] : []))
          ),
          file,
          members,
          modulePath,
          name: decl.name,
        };
        decls.push(entry);
        this.byName.set(decl.name, entry);
        this.registry.set(decl.name, {
          kind: declImportKind(decl),
          name: decl.name,
          path: modulePath,
        });
      }
    }
    // bases link once every decl is known, whichever file comes first
    for (const entry of decls) {
      if (entry.baseName !== undefined) {
        entry.base =
          this.byName.get(entry.baseName) ??
          nativeBaseNamed(entry.baseName) ??
          this.registry.get(entry.baseName);
      }
    }
    this.decls = decls;
  }

  nativeBase(decl: ProjectDecl): BsNativeBase | undefined {
    const root = this.chain(decl).at(-1) ?? decl;
    if (root.base !== undefined && "complete" in root.base) {
      return root.base;
    }
    return root.base === undefined
      ? nativeBaseNamed(DEFAULT_NATIVE_BASE[root.file.kind])
      : undefined;
  }

  // Whether the decl's chain ends on the native c_encounter base: a bundle's
  // root class. The alpha has no class built on another encounter class.
  isEncounter(decl: ProjectDecl): boolean {
    return this.nativeBase(decl)?.name === "c_encounter";
  }

  typeNamed(name: string): BsRegistryEntry | undefined {
    return this.registry.get(name);
  }

  // The decl and its script bases, nearest first.
  chain(decl: ProjectDecl): ProjectDecl[] {
    const out: ProjectDecl[] = [];
    let current: ProjectDecl | undefined = decl;
    while (current !== undefined && !out.includes(current)) {
      out.push(current);
      current =
        current.base !== undefined && "decl" in current.base
          ? current.base
          : undefined;
    }
    return out;
  }

  memberOf(decl: ProjectDecl, name: string): Resolution | undefined {
    for (const owner of this.chain(decl)) {
      const member = owner.members.get(name);
      if (member !== undefined) {
        return { kind: "member", member, owner };
      }
    }
    if (
      NATIVE_MEMBERS.has(name) ||
      this.nativeBase(decl)?.members.includes(name)
    ) {
      return { kind: "member", member: undefined, owner: undefined };
    }
    return;
  }

  // Whether `def name` answers a delegate: one declared here, in a base, or
  // on the native base.
  isDelegate(decl: ProjectDecl, name: string): boolean {
    return (
      this.chain(decl).some((owner) => owner.delegates.has(name)) ||
      NATIVE_DELEGATES.includes(name)
    );
  }

  // A bare name that is neither a local nor `self`: member, type or builtin.
  resolve(decl: ProjectDecl, name: string): Resolution {
    const member = this.memberOf(decl, name);
    if (member !== undefined) {
      return member;
    }
    const entry = this.registry.get(name);
    if (entry !== undefined) {
      return { kind: "type", entry };
    }
    if (BUILTIN_SET.has(name)) {
      return { kind: "builtin", name };
    }
    return { kind: "unresolved" };
  }
}
