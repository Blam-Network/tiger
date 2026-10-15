// Lifts an alpha script tag back to BungieScript: the decompiled Lua gives
// the bodies, the schemas the declarations, the line table the layout.
// A statement the layout cannot place is put on the next free line and reported.

import { luaString } from "../../../../bungiescript/codegen.ts";
import {
  BUILTINS,
  NATIVE_DELEGATES,
} from "../../../../bungiescript/project.ts";
import type { HksBytecode, Method } from "../../../../hks/bytecode/proto.ts";
import { readBytecode } from "../../../../hks/bytecode/reader.ts";
import { compileLua } from "../../../../hks/compiler/compile.ts";
import { formatScriptTag } from "../../../../hks/source/script_source.ts";
import { FNV1_EMPTY } from "../../../../host/tags/name_hash.ts";
import { decompile } from "../lua/decompile.ts";
import {
  type LuaCall,
  type LuaExpr,
  type LuaFunction,
  type LuaIf,
  type LuaModule,
  LuaReadError,
  type LuaStmt,
  readLuaModule,
} from "./lua_reader.ts";
import { nativeBaseById, nativeTypeById } from "./native_ids.ts";

// ---- inputs ----------------------------------------------------------------

// A schema member (gibbon s_schema_member) plus what its fast-init image
// holds for it: a scalar, a vector, a string hash, or a thread's flags.
export interface LiftMember {
  readonly kind: number;
  readonly name: string;
  readonly offset: number;
  readonly threadFlags?: number;
  readonly type: number;
  readonly value?: LiftValue;
}

export type LiftValue =
  | boolean
  | number
  | readonly number[]
  | { readonly hash: number };

// One of a script tag's two schemas, members in offset order.
export interface LiftSide {
  readonly members: readonly LiftMember[];
  readonly methods: readonly string[];
  readonly name: string;
  readonly parent: number;
  // the names a script parent's schema holds (inherited, so not declared here)
  readonly parentMembers?: readonly string[];
  readonly schema: number;
}

// A package schema tag the member types may name.
export interface LiftPackageType {
  // static arrays and enums: element count
  readonly count: number;
  readonly id: number;
  readonly kind: number;
  readonly members: readonly LiftMember[];
  readonly name: string;
  // containers: the element type; definition/instance: the twin
  readonly other: number;
  readonly parent: number;
}

export interface LiftContext {
  // the parameter list of every `<delegate>_impl` in the project, by delegate
  readonly delegateParams: ReadonlyMap<string, readonly string[]>;
  readonly packageTypes: ReadonlyMap<number, LiftPackageType>;
  // cracked string hashes
  readonly strings: ReadonlyMap<number, string>;
}

export interface LiftScriptInput {
  readonly chunk: HksBytecode;
  // whether the native parent has one derived schema only, so its own
  // members cannot be told from the script's: declare what the code uses
  readonly conservative: boolean;
  // dotted module path with the decl name last
  readonly declName: string;
  readonly definition: LiftSide;
  readonly instance: LiftSide;
  readonly tags: readonly string[];
}

export interface LiftOptions {
  // a statement's source line -> how many leading operands of its condition
  // stay on that line before a continuation; the lift tool searches this
  readonly continuations?: ReadonlyMap<number, number>;
}

// ---- outputs ---------------------------------------------------------------

export interface LiftedDecl {
  readonly baseName: string | undefined;
  // `# true name unknown` applies to the base
  readonly baseUnknown: boolean;
  // member -> its `bind(args)` clause, in the generated import()'s order
  readonly bindings: ReadonlyMap<string, string>;
  // code lines (methods, threads, statements), by line, unindented for the
  // class level; the renderer indents .bs classes
  readonly code: ReadonlyMap<number, string>;
  // member declaration lines, in schema order, unindented
  readonly declarations: readonly string[];
  readonly firstLine: number;
  readonly implicit: boolean;
  readonly lastLine: number;
  readonly name: string;
  readonly notes: readonly string[];
  readonly tags: readonly string[];
  // schema members this source does not declare, with the reason
  readonly unexpressed: readonly string[];
}

export interface LiftedTypeDecl {
  readonly kind: "enum" | "struct";
  // header plus member lines, unindented
  readonly lines: readonly string[];
  readonly name: string;
}

export interface LiftedFile {
  readonly decls: readonly LiftedDecl[];
  readonly extras: readonly LiftedTypeDecl[];
  readonly kind: "bs" | "es" | "esp" | "esu";
  // "es/utility_scripts/kill_squad_objective.esu"
  readonly path: string;
}

const KIND = {
  bool: 0x0b,
  c_array: 0x1a,
  delegate: 0x0c,
  dynamic_array: 0x17,
  enum_field: 0x21,
  enum_value: 0x1f,
  flags: 0x22,
  handle: 0x13,
  implements: 0x1d,
  int: 0x01,
  interface_ref: 0x0f,
  method: 0x14,
  object: 0x06,
  pointer: 0x07,
  real: 0x09,
  script_definition: 0x1c,
  script_instance: 0x1b,
  short: 0x02,
  static_array: 0x15,
  static_stack: 0x16,
  string: 0x11,
  string_hash: 0x12,
  struct: 0x19,
  table: 0x18,
  tag_reference: 0x08,
  typed_pointer: 0x04,
  vector2d: 0x28,
  vector3d: 0x2a,
  vector4: 0x29,
} as const;

const SCALAR_TYPES: Readonly<Record<number, string>> = {
  [KIND.bool]: "bool",
  [KIND.int]: "int",
  [KIND.real]: "real",
  [KIND.short]: "short",
  [KIND.string]: "string",
  [KIND.string_hash]: "string_hash",
  [KIND.vector2d]: "vector2d",
  [KIND.vector3d]: "vector3d",
  [KIND.vector4]: "vector4",
};

// the scalar types by id, for the element of a native container
const SCALAR_IDS: Readonly<Record<number, string>> = {
  2155872257: "bool",
  2155872298: "string",
  2155872305: "string_hash",
  2155872327: "short",
  2155872328: "int",
  2155872335: "real",
  2155872542: "vector4",
  2155872550: "vector2d",
  2155872551: "vector3d",
};

// the generated Lua names bsc derived from source names
const THREAD_BODY = /^(.+)_d_execute_impl$/;
const DELEGATE_IMPL = /^(.+)_impl$/;
const SWITCH_VALUE = /^switch_value_(\d+)$/;
const UNUSED_INDEX = /^index_(\d+)_unused$/;
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

const THREAD_DEFINITION = 0x80800472;
const THREAD_INSTANCE = 0x80800473;
const SCRIPT_DELEGATE = 0x80800385;
const THREAD_AUTOSTART = 0x01000000;
const COMMAND_SCRIPT_BUILDER = "__cs";
const UNKNOWN_NOTE = "# true name unknown";
const INDENT = "    ";
const BUILTIN_SET = new Set(BUILTINS);
const GENERATED_LINE = 1;
const FLOAT_DIGITS = 9;

const KIND_NAMES: Readonly<Record<number, string>> = Object.fromEntries(
  Object.entries(KIND).map(([name, value]) => [value, name])
);

function lastSegment(path: string): string {
  return path.slice(path.lastIndexOf(".") + 1);
}

// ---- types -----------------------------------------------------------------

interface TypeText {
  readonly text: string;
  readonly unknown: boolean;
}

const TEMPLATE =
  /^(st_dynamic_array|s_static_array|c_static_stack)<(.+?)(?:, *(\d+))?>$/;
const C_ARRAY = /^(.+)\[(\d+)\]$/;
const GENERATED_TABLE = /^bs_compiler_generated\.s_(.+)_table$/;
const TABLE_OWNER = /^.*?_definition_/;
const SIDE_SUFFIX = /_(definition|instance)$/;
// a line that ends a block header, or opens one, takes no `;` neighbour
const HEADER_LINE =
  /^\s*(def|thread|startup|command_script|if|elif|else|while|for|switch|case|default)\b/;
const COLON_END = /:$/;

class TypeNamer {
  private readonly context: LiftContext;

  constructor(context: LiftContext) {
    this.context = context;
  }

  // the BungieScript spelling of a member type given its definition-side
  // and/or instance-side id
  name(definition: number | undefined, instance: number | undefined): TypeText {
    const id = definition ?? instance;
    if (id === undefined) {
      return { text: "unknown", unknown: true };
    }
    const pkg = this.context.packageTypes.get(id);
    if (pkg !== undefined) {
      return this.packageName(
        pkg,
        instance === undefined
          ? undefined
          : this.context.packageTypes.get(instance)
      );
    }
    const scalar = SCALAR_IDS[id];
    if (scalar !== undefined) {
      return { text: scalar, unknown: false };
    }
    const native = nativeTypeById(id);
    if (native !== undefined) {
      return { text: native.name, unknown: !native.known };
    }
    return { text: `unknown_${formatScriptTag(id)}`, unknown: true };
  }

  // whether a definition-side and an instance-side type are two halves of one
  // declared member
  twins(definition: number, instance: number): boolean {
    const pkg = this.context.packageTypes.get(definition);
    const other = this.context.packageTypes.get(instance);
    if (pkg !== undefined && other !== undefined) {
      if (pkg.kind === 0x1c && pkg.other === instance) {
        return true;
      }
      if (pkg.kind === other.kind && TEMPLATE.test(pkg.name)) {
        return this.twins(pkg.other, other.other);
      }
      if (pkg.kind === other.kind && C_ARRAY.test(pkg.name)) {
        return this.twins(pkg.parent, other.parent);
      }
      return definition === instance;
    }
    if (pkg !== undefined || other !== undefined) {
      return false;
    }
    return nativeTypeById(definition)?.ids.includes(instance) === true;
  }

  private packageName(
    def: LiftPackageType,
    inst: LiftPackageType | undefined
  ): TypeText {
    const template = TEMPLATE.exec(def.name);
    if (template !== null) {
      const element = this.name(def.other, inst?.other);
      const container = {
        s_static_array: "static_array",
        st_dynamic_array: "dynamic_array",
        c_static_stack: "static_stack",
      }[template[1]];
      const count = template[3] === undefined ? "" : `, ${template[3]}`;
      return {
        text: `${container}<${element.text}${count}>`,
        unknown: element.unknown,
      };
    }
    const array = C_ARRAY.exec(def.name);
    if (array !== null) {
      const element = this.name(def.parent, inst?.parent);
      return { text: `${element.text}[${array[2]}]`, unknown: element.unknown };
    }
    const table = GENERATED_TABLE.exec(def.name);
    if (table !== null) {
      // s_<owner>_definition_<value struct>_<key enum>_table
      const rest = table[1].replace(TABLE_OWNER, "");
      const at = rest.lastIndexOf("_e_");
      return {
        text: `table<${rest.slice(at + 1)}, ${rest.slice(0, at)}>`,
        unknown: false,
      };
    }
    const stem = lastSegment(def.name).replace(SIDE_SUFFIX, "");
    return { text: stem, unknown: false };
  }
}

// ---- lines: pairing the decompiled Lua with the chunk --------------------

// The chunk's source lines behind each decompiled line, and each function's
// source line behind its decompiled `function` line.
interface LineMap {
  readonly functions: ReadonlyMap<number, number>;
  readonly lines: ReadonlyMap<number, readonly number[]>;
}

// Compiles the decompiled text and walks it beside the original to map
// decompiled lines to source lines.
function pairLines(original: HksBytecode, lua: string): LineMap {
  const compiled = readBytecode(
    compileLua(Buffer.from(lua, "latin1"), {
      chunkName: original.root.source ?? "",
    }),
    "lifted"
  );
  const lines = new Map<number, number[]>();
  const functions = new Map<number, number>();
  const walk = (a: Method, b: Method) => {
    if (
      a.code.length !== b.code.length ||
      a.protos.length !== b.protos.length
    ) {
      throw new LuaReadError(
        "does not compile back to the chunk's code shape",
        b.lineDefined
      );
    }
    functions.set(b.lineDefined, a.lineDefined);
    for (let pc = 0; pc < a.code.length; pc++) {
      const list = lines.get(b.lineInfo[pc]) ?? [];
      if (!list.includes(a.lineInfo[pc])) {
        list.push(a.lineInfo[pc]);
      }
      lines.set(b.lineInfo[pc], list);
    }
    for (const [i, child] of a.protos.entries()) {
      walk(child, b.protos[i]);
    }
  };
  walk(original.root, compiled.root);
  return { functions, lines };
}

// ---- the lift --------------------------------------------------------------

interface Declaration {
  readonly name: string;
  // a trailing `# ...` remark
  readonly note: string | undefined;
  readonly text: string;
}

// a node of the laid-out body: a header with a body, a separator (else:,
// default:) with a body, or a simple statement
interface Node {
  readonly body?: Node[];
  // elif/else/case/default siblings a header carries
  readonly chain?: Node[];
  // the chain nests one level deeper (switch cases)
  readonly chainDeeper?: boolean;
  // the source line, or undefined for a line-less separator
  readonly line: number | undefined;
  readonly simple: boolean;
  readonly text: string;
}

interface Scope {
  readonly names: Set<string>;
}

export function liftScript(
  input: LiftScriptInput,
  context: LiftContext,
  options: LiftOptions = {}
): LiftedDecl {
  return new ScriptLifter(input, context, options).lift();
}

class ScriptLifter {
  private readonly bindings = new Map<string, string>();
  private readonly code = new Map<number, string>();
  // every name a body may use bare: declared members, methods, bases
  private readonly knownMembers = new Set<string>();
  private readonly lines: LineMap;
  private readonly module: LuaModule;
  private readonly name: string;
  private readonly namer: TypeNamer;
  private readonly notes: string[] = [];
  private readonly scopes: Scope[] = [];
  private readonly threadFlags = new Map<string, number>();
  private readonly unexpressed: string[] = [];
  private readonly usedNames = new Set<string>();
  private readonly implementsNames: string[] = [];
  private readonly delegates = new Set<string>();

  private readonly input: LiftScriptInput;
  private readonly context: LiftContext;
  private readonly options: LiftOptions;

  constructor(
    input: LiftScriptInput,
    context: LiftContext,
    options: LiftOptions
  ) {
    this.input = input;
    this.context = context;
    this.options = options;
    this.name = lastSegment(input.declName);
    this.namer = new TypeNamer(context);
    const lua = decompile(input.chunk).source;
    this.module = readLuaModule(lua);
    this.lines = pairLines(input.chunk, lua);
    for (const fn of this.module.functions) {
      this.collectUsedNames(fn.body);
    }
  }

  lift(): LiftedDecl {
    const declarations = this.declarations();
    const functions = this.module.functions.filter(
      (fn) => !this.isGeneratedImport(fn)
    );
    for (const fn of this.module.functions) {
      this.member(fn);
    }
    const declared = declarations.map((d) => {
      const bind = this.bindings.get(d.name);
      return `${d.text}${bind === undefined ? "" : ` ${bind}`}${d.note === undefined ? "" : `  ${d.note}`}`;
    });
    const lines = [...this.code.keys()];
    const first = Math.min(...functions.map((fn) => this.functionLine(fn)));
    const base = this.baseName();
    return {
      baseName: base?.text,
      baseUnknown: base?.unknown ?? false,
      bindings: this.bindings,
      code: this.code,
      declarations: declared,
      firstLine: Number.isFinite(first) ? first : 1,
      implicit: this.input.declName.startsWith("_es."),
      lastLine: lines.length === 0 ? 0 : Math.max(...lines),
      name: this.name,
      notes: this.notes,
      tags: this.input.tags,
      unexpressed: this.unexpressed,
    };
  }

  private note(message: string): void {
    this.notes.push(`${this.name}: ${message}`);
  }

  // ---- the declaration half -----------------------------------------------

  private baseName(): TypeText | undefined {
    const parent = this.input.instance.parent;
    const pkg = this.context.packageTypes.get(parent);
    if (pkg !== undefined) {
      return this.namer.name(this.input.definition.parent, parent);
    }
    const native = nativeBaseById(parent);
    if (native !== undefined) {
      return { text: native.name, unknown: !native.known };
    }
    return { text: `unknown_${formatScriptTag(parent)}`, unknown: true };
  }

  // the members a side declares itself: not its native base's, not a script
  // parent's
  private ownMembers(side: LiftSide): LiftMember[] {
    const inherited = new Set<string>(side.parentMembers ?? []);
    const native = nativeBaseById(side.parent);
    if (native !== undefined && side.parentMembers === undefined) {
      for (const name of native.members) {
        inherited.add(name);
      }
    }
    // a method typed with a native class is one it inherited
    return side.members.filter(
      (m) =>
        !(
          inherited.has(m.name) ||
          (m.kind === KIND.method && !this.context.packageTypes.has(m.type))
        )
    );
  }

  private declarations(): Declaration[] {
    const def = this.ownMembers(this.input.definition).filter(
      (m) => m.kind !== KIND.method
    );
    const inst = this.ownMembers(this.input.instance).filter(
      (m) => m.kind !== KIND.method
    );
    for (const list of [this.input.definition, this.input.instance]) {
      for (const name of list.methods) {
        this.knownMembers.add(name);
      }
      for (const name of list.parentMembers ?? []) {
        this.knownMembers.add(name);
      }
      const native = nativeBaseById(list.parent);
      if (native !== undefined) {
        for (const name of native.members) {
          this.knownMembers.add(name);
        }
      }
    }
    const implsNeeded = new Set(
      this.module.functions
        .map((fn) => fn.name)
        .filter((n) => n.endsWith("_impl"))
    );
    const keep = (m: LiftMember, side: LiftSide): boolean => {
      if (m.name === COMMAND_SCRIPT_BUILDER) {
        return false;
      }
      if (m.kind === KIND.implements) {
        // an implements record the script answers with `<member>_<x>_impl`
        return [...implsNeeded].some((n) => n.startsWith(`${m.name}_`));
      }
      if (m.kind === KIND.delegate) {
        return m.type === SCRIPT_DELEGATE;
      }
      if (!this.input.conservative) {
        return true;
      }
      if (m.type === THREAD_DEFINITION || m.type === THREAD_INSTANCE) {
        return true;
      }
      if (this.usedNames.has(m.name) || this.context.packageTypes.has(m.type)) {
        return true;
      }
      this.unexpressed.push(
        `${side.name.endsWith("_definition") ? "definition" : "instance"} ${m.name} (${KIND_NAMES[m.kind] ?? formatScriptTag(m.kind)} ${formatScriptTag(m.type)}): single derived schema, unused by the code, so native or declared is undecidable`
      );
      return false;
    };
    const defKept = def.filter((m) => keep(m, this.input.definition));
    const instKept = inst.filter((m) => keep(m, this.input.instance));
    const merged = mergeSides(defKept, instKept, (a, b) =>
      this.namer.twins(a, b)
    );
    const out: Declaration[] = [];
    for (const entry of merged) {
      const name = entry.name;
      this.knownMembers.add(name);
      const d = entry.definition;
      const i = entry.instance;
      const kind = (d ?? i)?.kind as number;
      if (
        (d ?? i)?.type === THREAD_DEFINITION ||
        (d ?? i)?.type === THREAD_INSTANCE
      ) {
        this.threadFlags.set(name, d?.threadFlags ?? 0);
        continue;
      }
      if (kind === KIND.delegate) {
        this.delegates.add(name);
        const params = this.context.delegateParams.get(name) ?? [];
        out.push({
          name,
          note: undefined,
          text: `delegate ${name}(${params.join(", ")})`,
        });
        continue;
      }
      if (kind === KIND.implements) {
        this.implementsNames.push(name);
        const type = this.namer.name((d ?? i)?.type, undefined);
        out.push({
          name,
          note: type.unknown ? UNKNOWN_NOTE : undefined,
          text: `implements ${type.text} ${name}`,
        });
        continue;
      }
      const type = this.fieldType(d, i);
      const isStatic = d !== undefined && i === undefined;
      const value = this.defaultText(d ?? i, kind);
      const notes: string[] = [];
      if (type.unknown) {
        notes.push(UNKNOWN_NOTE);
      }
      if (value?.note !== undefined) {
        notes.push(value.note);
      }
      out.push({
        name,
        note: notes.length > 0 ? notes.join("; ") : undefined,
        text: `${isStatic ? "static " : ""}${type.text} ${name}${value === undefined ? "" : ` = ${value.text}`}`,
      });
    }
    return out;
  }

  private fieldType(
    d: LiftMember | undefined,
    i: LiftMember | undefined
  ): TypeText {
    const kind = (d ?? i)?.kind as number;
    const scalar = SCALAR_TYPES[kind];
    if (scalar !== undefined) {
      return { text: scalar, unknown: false };
    }
    return this.namer.name(d?.type, i?.type);
  }

  private defaultText(
    m: LiftMember | undefined,
    kind: number
  ): { note?: string; text: string } | undefined {
    const value = m?.value;
    if (value === undefined) {
      return;
    }
    if (typeof value === "boolean") {
      return value ? { text: "true" } : undefined;
    }
    if (typeof value === "number") {
      if (value === 0 || kind === KIND.enum_field || kind === KIND.flags) {
        if (value !== 0) {
          this.note(
            `${m?.name}: non-zero ${KIND_NAMES[kind]} default ${value} not expressed`
          );
        }
        return;
      }
      return { text: numberText(value) };
    }
    if (Array.isArray(value)) {
      return value.every((v) => v === 0)
        ? undefined
        : { text: `(${value.map(numberText).join(", ")})` };
    }
    const hash = (value as { hash: number }).hash;
    if (hash === FNV1_EMPTY) {
      return;
    }
    const text = this.context.strings.get(hash);
    if (text !== undefined) {
      return { text: luaString(text) };
    }
    return { note: "# hash not cracked", text: `0x${formatScriptTag(hash)}` };
  }

  // ---- the code half ------------------------------------------------------

  private collectUsedNames(body: readonly LuaStmt[]): void {
    const visitExpr = (e: LuaExpr): void => {
      switch (e.kind) {
        case "index":
          if (
            e.object.kind === "name" &&
            e.object.name === "self" &&
            e.field !== undefined
          ) {
            this.usedNames.add(e.field);
          }
          visitExpr(e.object);
          visitExpr(e.key);
          break;
        case "call":
          if (
            e.method !== undefined &&
            e.callee.kind === "name" &&
            e.callee.name === "self"
          ) {
            this.usedNames.add(e.method);
          }
          visitExpr(e.callee);
          e.args.forEach(visitExpr);
          break;
        case "binary":
          visitExpr(e.left);
          visitExpr(e.right);
          break;
        case "unary":
          visitExpr(e.operand);
          break;
        case "closure":
          this.collectUsedNames(e.body);
          break;
        default:
          break;
      }
    };
    for (const s of body) {
      switch (s.kind) {
        case "local":
          if (s.value) {
            visitExpr(s.value);
          }
          break;
        case "assign":
          s.targets.forEach(visitExpr);
          s.values.forEach(visitExpr);
          break;
        case "call":
          visitExpr(s.call);
          break;
        case "if":
          for (const c of s.clauses) {
            visitExpr(c.cond);
            this.collectUsedNames(c.body);
          }
          if (s.orelse) {
            this.collectUsedNames(s.orelse);
          }
          break;
        case "while":
          visitExpr(s.cond);
          this.collectUsedNames(s.body);
          break;
        case "for":
          visitExpr(s.start);
          visitExpr(s.limit);
          this.collectUsedNames(s.body);
          break;
        case "for_in":
          visitExpr(s.iterator);
          this.collectUsedNames(s.body);
          break;
        case "return":
          s.values.forEach(visitExpr);
          break;
        default:
          break;
      }
    }
  }

  // the es-family import() bsc generated: `local success; success = true`,
  // one guarded import_only_bind per bind clause, user_import, return
  private isGeneratedImport(fn: LuaFunction): boolean {
    if (
      fn.name !== "import" ||
      fn.side !== "instance" ||
      !this.input.declName.startsWith("_es.")
    ) {
      return false;
    }
    if (this.functionLine(fn) !== GENERATED_LINE) {
      this.note("import() is not on line 1; treated as authored");
      return false;
    }
    return true;
  }

  private generatedImport(fn: LuaFunction): void {
    for (const s of fn.body) {
      if (
        s.kind === "if" &&
        s.clauses.length === 1 &&
        s.clauses[0].body.length === 1
      ) {
        const inner = s.clauses[0].body[0];
        if (inner.kind === "assign" && inner.values[0]?.kind === "call") {
          const call = inner.values[0];
          const target = call.callee;
          if (
            call.method === "import_only_bind" &&
            target.kind === "index" &&
            target.field !== undefined
          ) {
            this.pushScope([]);
            const args = call.args.map((a) => this.expr(a).text).join(", ");
            this.popScope();
            this.bindings.set(target.field, `bind(${args})`);
            continue;
          }
        }
      }
      if (
        (s.kind === "local" && s.names[0] === "success") ||
        (s.kind === "assign" &&
          s.targets[0].kind === "name" &&
          s.targets[0].name === "success") ||
        s.kind === "return" ||
        (s.kind === "call" && s.call.method === "user_import")
      ) {
        continue;
      }
      this.note(
        `generated import() holds an unexpected statement on decompiled line ${s.line}`
      );
    }
  }

  private sourceLine(dl: number): number {
    const lines = this.lines.lines.get(dl);
    if (lines === undefined) {
      throw new LuaReadError(`${this.name}: no instructions on the line`, dl);
    }
    return lines[0];
  }

  private functionLine(fn: LuaFunction): number {
    const line = this.lines.functions.get(fn.line);
    if (line === undefined) {
      throw new LuaReadError(
        `${this.name}: no prototype starts on the line`,
        fn.line
      );
    }
    return line;
  }

  private member(fn: LuaFunction): void {
    if (this.isGeneratedImport(fn)) {
      this.generatedImport(fn);
      return;
    }
    const line = this.functionLine(fn);
    const header = this.header(fn);
    const nodes = this.block(fn.body, header.commandScript, fn.params);
    this.place(
      [{ body: nodes, line, simple: false, text: header.text }],
      0,
      line - 1
    );
  }

  private header(fn: LuaFunction): { commandScript: boolean; text: string } {
    const params = fn.params.join(", ");
    const thread = THREAD_BODY.exec(fn.name);
    if (thread !== null && this.threadFlags.has(thread[1])) {
      const startup = (this.threadFlags.get(thread[1]) ?? 0) & THREAD_AUTOSTART;
      return {
        commandScript: false,
        text: `${startup ? "startup " : ""}thread ${thread[1]}:`,
      };
    }
    if (this.isCommandScript(fn)) {
      return {
        commandScript: true,
        text: `command_script ${fn.name}(${params}):`,
      };
    }
    const impl = DELEGATE_IMPL.exec(fn.name);
    if (impl !== null) {
      const owner = this.implementsNames.find((m) =>
        impl[1].startsWith(`${m}_`)
      );
      if (owner !== undefined) {
        return {
          commandScript: false,
          text: `def ${owner}.${impl[1].slice(owner.length + 1)}(${params}):`,
        };
      }
      if (
        this.delegates.has(impl[1]) ||
        NATIVE_DELEGATES.includes(impl[1]) ||
        this.context.delegateParams.has(impl[1])
      ) {
        return {
          commandScript: false,
          text: `${fn.side === "definition" ? "static " : ""}def ${impl[1]}(${params}):`,
        };
      }
      this.note(`${fn.name} ends in _impl but answers no known delegate`);
    }
    return {
      commandScript: false,
      text: `${fn.side === "definition" ? "static " : ""}def ${fn.name}(${params}):`,
    };
  }

  private isCommandScript(fn: LuaFunction): boolean {
    const first = fn.body[0];
    const last = fn.body.at(-1);
    const isBuilder = (e: LuaExpr) =>
      e.kind === "index" &&
      e.field === COMMAND_SCRIPT_BUILDER &&
      e.object.kind === "name" &&
      e.object.name === "self";
    return (
      first?.kind === "call" &&
      first.call.method === "clear" &&
      isBuilder(first.call.callee) &&
      last?.kind === "return" &&
      last.values.length === 1 &&
      isBuilder(last.values[0])
    );
  }

  // ---- scopes --------------------------------------------------------------

  private pushScope(names: readonly string[]): void {
    this.scopes.push({ names: new Set(names) });
  }

  private popScope(): void {
    this.scopes.pop();
  }

  private isLocal(name: string): boolean {
    return this.scopes.some((s) => s.names.has(name));
  }

  private declareLocal(name: string): void {
    this.scopes.at(-1)?.names.add(name);
  }

  // ---- statements -----------------------------------------------------------

  private block(
    statements: readonly LuaStmt[],
    commandScript: boolean,
    scopeNames: readonly string[] = []
  ): Node[] {
    this.pushScope(scopeNames);
    const out: Node[] = [];
    const list = commandScript ? statements.slice(1, -1) : statements;
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      const next = list[i + 1];
      // bsc's two-line lowerings: `local x` + `x = e`, sleeps + __coro_yield
      if (
        s.kind === "local" &&
        s.value === undefined &&
        next?.kind === "assign" &&
        sameNames(s.names, next.targets)
      ) {
        out.push(this.assignNode(next, s.names));
        i++;
        continue;
      }
      if (s.kind === "local" && s.value !== undefined) {
        const sw = SWITCH_VALUE.exec(s.names[0]);
        if (sw !== null && next?.kind === "if") {
          out.push(
            this.switchNode(s.value, next, s.names[0], this.sourceLine(s.line))
          );
          i++;
          continue;
        }
        out.push(
          this.assignNode(
            {
              line: s.line,
              targets: s.names.map((n) => ({
                kind: "name",
                line: s.line,
                name: n,
              })),
              values: [s.value],
            },
            s.names
          )
        );
        continue;
      }
      if (
        s.kind === "call" &&
        this.isSleep(s.call) &&
        next?.kind === "call" &&
        this.isYield(next.call)
      ) {
        out.push(this.sleepNode(s.call, s.line));
        i++;
        continue;
      }
      if (commandScript) {
        out.push(this.atomNode(s));
        continue;
      }
      out.push(...this.statement(s));
    }
    this.popScope();
    return out;
  }

  private statement(s: LuaStmt): Node[] {
    switch (s.kind) {
      case "local":
        // a lone `local x`: declared ahead of its first assignment
        return [
          {
            line: this.sourceLine(s.line),
            simple: true,
            text: `local ${s.names.join(", ")}`,
          },
        ];
      case "assign":
        return [this.assignNode(s, [])];
      case "call":
        if (this.isYield(s.call)) {
          this.note(`stray __coro_yield() on decompiled line ${s.line}`);
        }
        return [
          {
            line: this.sourceLine(s.line),
            simple: true,
            text: this.callStatement(s.call),
          },
        ];
      case "return":
        return [
          {
            line: this.sourceLine(s.line),
            simple: true,
            text:
              s.values.length === 0
                ? "return"
                : `return ${s.values.map((v) => this.expr(v).text).join(", ")}`,
          },
        ];
      case "break":
        return [{ line: this.sourceLine(s.line), simple: true, text: "break" }];
      case "if":
        return [this.ifNode(s)];
      case "while": {
        const line = this.sourceLine(s.line);
        const cond = this.condition(s.cond, line);
        return [
          {
            body: this.block(s.body, false),
            line,
            simple: false,
            text: `while ${cond}:`,
          },
        ];
      }
      case "for": {
        const line = this.sourceLine(s.line);
        const text = `for ${s.variable} in ${this.rangeText(s.start, s.limit, s.step, line)}:`;
        return [
          {
            body: this.block(s.body, false, [s.variable]),
            line,
            simple: false,
            text,
          },
        ];
      }
      case "for_in": {
        const line = this.sourceLine(s.line);
        return [
          {
            body: this.block(s.body, false, s.names),
            line,
            simple: false,
            text: this.forInText(s.names, s.iterator, line),
          },
        ];
      }
      default:
        return [];
    }
  }

  private assignNode(
    s: {
      line: number;
      targets: readonly LuaExpr[];
      values: readonly LuaExpr[];
    },
    fresh: readonly string[]
  ): Node {
    const line = this.sourceLine(s.line);
    // a fresh local that shadows a member needs the explicit form
    const shadows = fresh.some((n) => this.knownMembers.has(n));
    for (const n of fresh) {
      this.declareLocal(n);
    }
    const rhs = s.values.map((v) => this.expr(v).text).join(", ");
    const lhs = s.targets
      .map((t) =>
        t.kind === "name" && fresh.includes(t.name) ? t.name : this.target(t)
      )
      .join(", ");
    return {
      line,
      simple: true,
      text: `${shadows ? "local " : ""}${lhs} = ${rhs}`,
    };
  }

  private target(e: LuaExpr): string {
    if (e.kind === "name") {
      if (this.isLocal(e.name)) {
        return e.name;
      }
      this.note(
        `assignment to global '${e.name}' (bsc scoping bug); written as self.${e.name}`
      );
      return `self.${e.name}`;
    }
    if (
      e.kind === "index" &&
      e.object.kind === "name" &&
      e.object.name === "self" &&
      e.field !== undefined
    ) {
      // an undeclared member assigned bare would become a local
      return this.knownMembers.has(e.field) && !this.isLocal(e.field)
        ? e.field
        : `self.${e.field}`;
    }
    return this.expr(e).text;
  }

  private callStatement(call: LuaCall): string {
    if (
      call.method === undefined &&
      call.callee.kind === "name" &&
      call.callee.name === "assert" &&
      call.args.length === 2
    ) {
      const cond = this.expr(call.args[0]);
      const text = call.args[1];
      if (text.kind === "string" && text.value === cond.text) {
        return `assert(${cond.text})`;
      }
    }
    return this.expr(call).text;
  }

  private atomNode(s: LuaStmt): Node {
    if (
      s.kind === "call" &&
      s.call.method !== undefined &&
      s.call.callee.kind === "index" &&
      s.call.callee.field === COMMAND_SCRIPT_BUILDER
    ) {
      const args = s.call.args.map((a) => this.expr(a).text).join(", ");
      return {
        line: this.sourceLine(s.line),
        simple: true,
        text: `${s.call.method}(${args})`,
      };
    }
    this.note(
      `command script holds a non-atom statement on decompiled line ${s.line}`
    );
    return {
      line: this.sourceLine(s.line),
      simple: true,
      text: this.expr(
        (s as { call: LuaCall }).call ?? { kind: "nil", line: s.line }
      ).text,
    };
  }

  private isSleep(call: LuaCall): boolean {
    return (
      call.method !== undefined &&
      ["sleep", "sleep_until", "sleep_until_timeout"].includes(call.method) &&
      call.callee.kind === "name" &&
      call.callee.name === "bundlelib"
    );
  }

  private isYield(call: LuaCall): boolean {
    return (
      call.method === undefined &&
      call.callee.kind === "name" &&
      call.callee.name === "__coro_yield" &&
      call.args.length === 0
    );
  }

  private sleepNode(call: LuaCall, dl: number): Node {
    const line = this.sourceLine(dl);
    if (call.method === "sleep") {
      return {
        line,
        simple: true,
        text: `sleep(${this.expr(call.args[0]).text})`,
      };
    }
    // bundlelib:sleep_until(predicate_pack(function() return c, "text" end), p):
    // the string is the condition as the source spelled it
    const pack = call.args[0];
    let condition: string | undefined;
    if (pack.kind === "call" && pack.args[0]?.kind === "closure") {
      const ret = pack.args[0].body[0];
      if (ret?.kind === "return" && ret.values[1]?.kind === "string") {
        condition = ret.values[1].value;
      }
    }
    if (condition === undefined) {
      this.note(`sleep form without predicate text on decompiled line ${dl}`);
      condition = "true";
    }
    const period =
      call.args[1] === undefined ? undefined : this.expr(call.args[1]).text;
    const tail =
      call.method === "sleep_until" && (period === undefined || period === "1")
        ? ""
        : `, ${period}`;
    return { line, simple: true, text: `${call.method}(${condition}${tail})` };
  }

  private ifNode(s: LuaIf): Node {
    const first = s.clauses[0];
    const line = this.sourceLine(first.line);
    const head: Node = {
      body: this.block(first.body, false),
      chain: [],
      line,
      simple: false,
      text: `if ${this.condition(first.cond, line)}:`,
    };
    for (const clause of s.clauses.slice(1)) {
      const clauseLine = this.sourceLine(clause.line);
      head.chain?.push({
        body: this.block(clause.body, false),
        line: clauseLine,
        simple: false,
        text: `elif ${this.condition(clause.cond, clauseLine)}:`,
      });
    }
    let orelse = s.orelse;
    // a lone nested if is an elif chain
    while (
      orelse !== undefined &&
      orelse.length === 1 &&
      orelse[0].kind === "if"
    ) {
      const inner = orelse[0];
      for (const clause of inner.clauses) {
        const clauseLine = this.sourceLine(clause.line);
        head.chain?.push({
          body: this.block(clause.body, false),
          line: clauseLine,
          simple: false,
          text: `elif ${this.condition(clause.cond, clauseLine)}:`,
        });
      }
      orelse = inner.orelse;
    }
    if (orelse !== undefined) {
      head.chain?.push({
        body: this.block(orelse, false),
        line: undefined,
        simple: false,
        text: "else:",
      });
    }
    return head;
  }

  private switchNode(
    subject: LuaExpr,
    chain: LuaIf,
    variable: string,
    line: number
  ): Node {
    if (!variable.endsWith(`_${line}`)) {
      this.note(`${variable} names another line than ${line}`);
    }
    const head: Node = {
      chain: [],
      chainDeeper: true,
      line,
      simple: false,
      text: `switch ${this.expr(subject).text}:`,
    };
    let current: LuaIf | undefined = chain;
    while (current !== undefined) {
      for (const clause of current.clauses) {
        const cond = clause.cond;
        if (
          !(
            cond.kind === "binary" &&
            cond.op === "==" &&
            cond.left.kind === "name" &&
            cond.left.name === variable
          )
        ) {
          this.note(`switch on ${variable}: a clause is not a case test`);
        }
        const value = cond.kind === "binary" ? this.expr(cond.right).text : "?";
        head.chain?.push({
          body: this.block(clause.body, false),
          line: this.sourceLine(clause.line),
          simple: false,
          text: `case ${value}:`,
        });
      }
      const orelse: readonly LuaStmt[] | undefined = current.orelse;
      if (
        orelse !== undefined &&
        orelse.length === 1 &&
        orelse[0].kind === "if"
      ) {
        current = orelse[0];
      } else {
        if (orelse !== undefined && orelse.length > 0) {
          head.chain?.push({
            body: this.block(orelse, false),
            line: undefined,
            simple: false,
            text: "default:",
          });
        }
        current = undefined;
      }
    }
    return head;
  }

  private rangeText(
    start: LuaExpr,
    limit: LuaExpr,
    step: LuaExpr | undefined,
    line: number
  ): string {
    if (step !== undefined) {
      this.note(`for with a step on line ${line}: not expressible`);
    }
    let bound: string;
    if (
      limit.kind === "binary" &&
      limit.op === "-" &&
      limit.right.kind === "number" &&
      limit.right.text === "1"
    ) {
      bound = this.expr(limit.left).text;
    } else if (limit.kind === "number") {
      bound = numberText(Number(limit.text) + 1);
    } else {
      this.note(
        `for bound on line ${line} is not <x> - 1: written as + 1, which compiles differently`
      );
      bound = `${this.expr(limit).text} + 1`;
    }
    const low = this.expr(start).text;
    return low === "0" ? `range(${bound})` : `range(${low}, ${bound})`;
  }

  private forInText(
    names: readonly string[],
    iterator: LuaExpr,
    line: number
  ): string {
    if (
      iterator.kind === "call" &&
      iterator.method === undefined &&
      iterator.callee.kind === "name" &&
      iterator.callee.name === "enum_of"
    ) {
      const unused = UNUSED_INDEX.exec(names[0]);
      if (unused !== null && Number(unused[1]) !== line) {
        this.note(
          `${names[0]} names line ${unused[1]} but the loop sits on ${line}`
        );
      }
      const vars = unused === null ? names : names.slice(1);
      return `for ${vars.join(", ")} in ${this.expr(iterator.args[0]).text}:`;
    }
    return `for ${names.join(", ")} in ${this.expr(iterator).text}:`;
  }

  // a condition continued after its k-th operand (the operator stays with the
  // first line) when the chunk puts the rest there
  private condition(expr: LuaExpr, line: number): string {
    const split = this.options.continuations?.get(line);
    if (split === undefined) {
      return this.expr(expr).text;
    }
    const parts = flattenLogical(expr);
    const operands = (parts.length + 1) / 2;
    if (split <= 0 || split >= operands) {
      return this.expr(expr).text;
    }
    const head = parts
      .slice(0, split * 2)
      .map((o) => this.operandText(o))
      .join(" ");
    const tail = parts
      .slice(split * 2)
      .map((o) => this.operandText(o))
      .join(" ");
    return `${head} \\\n${tail}`;
  }

  private operandText(o: LogicalPart): string {
    return typeof o === "string" ? o : this.exprAt(o, 3).text;
  }

  // ---- expressions ----------------------------------------------------------

  private static readonly PREC: Readonly<Record<string, number>> = {
    or: 1,
    and: 2,
    not: 3,
    "==": 4,
    "~=": 4,
    "<": 4,
    "<=": 4,
    ">": 4,
    ">=": 4,
    "+": 5,
    "-": 5,
    "*": 6,
    "/": 6,
    "%": 6,
    neg: 7,
    "^": 8,
    atom: 9,
  };

  expr(e: LuaExpr): { prec: number; text: string } {
    switch (e.kind) {
      case "name":
        return { prec: 9, text: this.nameText(e.name) };
      case "number":
        return { prec: 9, text: numberText(Number(e.text)) };
      case "string":
        return { prec: 9, text: luaString(e.value) };
      case "bool":
        return { prec: 9, text: e.value ? "true" : "false" };
      case "nil":
        return { prec: 9, text: "nil" };
      case "index":
        return { prec: 9, text: this.indexText(e) };
      case "call":
        return { prec: 9, text: this.callText(e) };
      case "closure":
        this.note("a closure outside a sleep form is not expressible");
        return { prec: 9, text: "nil" };
      case "unary": {
        const prec = e.op === "not" ? 3 : 7;
        const operand = this.exprAt(e.operand, prec + 1);
        return {
          prec,
          text: e.op === "not" ? `not ${operand.text}` : `-${operand.text}`,
        };
      }
      case "binary": {
        const prec = ScriptLifter.PREC[e.op];
        const rightAssoc = e.op === "^";
        const left = this.exprAt(e.left, rightAssoc ? prec + 1 : prec);
        const right = this.exprAt(e.right, rightAssoc ? prec : prec + 1);
        const op = { "~=": "!=", "^": "**" }[e.op] ?? e.op;
        return { prec, text: `${left.text} ${op} ${right.text}` };
      }
      default:
        return { prec: 9, text: "nil" };
    }
  }

  private exprAt(e: LuaExpr, atLeast: number): { prec: number; text: string } {
    const inner = this.expr(e);
    // comparisons never chain, and a comparison under a comparison needs
    // parentheses whichever side it is on
    const needs = inner.prec < atLeast || (inner.prec === 4 && atLeast === 4);
    return needs ? { prec: 9, text: `(${inner.text})` } : inner;
  }

  private nameText(name: string): string {
    if (name === "self" || this.isLocal(name)) {
      return name;
    }
    if (
      this.module.imports.some((i) => i.name === name) ||
      BUILTIN_SET.has(name)
    ) {
      return name;
    }
    this.note(
      `global '${name}' read (bsc scoping bug); written as self.${name}`
    );
    return `self.${name}`;
  }

  private indexText(e: LuaExpr & { kind: "index" }): string {
    if (
      e.object.kind === "name" &&
      e.object.name === "self" &&
      e.field !== undefined
    ) {
      return this.isLocal(e.field) || !this.knownMembers.has(e.field)
        ? `self.${e.field}`
        : e.field;
    }
    const object = this.receiverText(e.object);
    if (e.field !== undefined) {
      return `${object}.${e.field}`;
    }
    if (e.key.kind === "string" && IDENTIFIER.test(e.key.value)) {
      return `${object}.${e.key.value}`;
    }
    return `${object}[${this.expr(e.key).text}]`;
  }

  private receiverText(e: LuaExpr): string {
    const inner = this.expr(e);
    return inner.prec < 9 ? `(${inner.text})` : inner.text;
  }

  private callText(e: LuaCall): string {
    const args = e.args.map((a) => this.expr(a).text).join(", ");
    if (e.method !== undefined) {
      if (e.callee.kind === "name" && e.callee.name === "self") {
        return this.isLocal(e.method) || !this.knownMembers.has(e.method)
          ? `self.${e.method}(${args})`
          : `${e.method}(${args})`;
      }
      return `${this.receiverText(e.callee)}.${e.method}(${args})`;
    }
    return `${this.receiverText(e.callee)}(${args})`;
  }

  // ---- layout ---------------------------------------------------------------

  // Writes nodes at their lines from `cursor` on; a statement whose line is
  // taken moves down and is noted. Returns the last line written.
  private place(nodes: readonly Node[], depth: number, cursor: number): number {
    let last = cursor;
    for (const node of nodes) {
      last = this.placeNode(node, depth, last);
    }
    return last;
  }

  private placeNode(node: Node, depth: number, cursor: number): number {
    const indent = INDENT.repeat(depth);
    let line: number;
    if (node.line === undefined) {
      // a separator: just before its body when that line is free
      const firstBody = firstLineOf(node.body ?? []);
      line = Math.max(
        cursor + 1,
        firstBody === undefined ? cursor + 1 : firstBody - 1
      );
    } else if (node.line > cursor) {
      line = node.line;
    } else if (
      node.line === cursor &&
      node.simple &&
      this.canJoin(cursor, indent)
    ) {
      this.code.set(cursor, `${this.code.get(cursor)}; ${node.text}`);
      return cursor;
    } else {
      line = cursor + 1;
      this.note(`statement on line ${node.line} moved to ${line} (line taken)`);
    }
    const body = node.body;
    // a continued condition: its tail sits on the next line, indented
    const [head, ...rest] = node.text.split("\n");
    const last = line + rest.length;
    for (const [i, tail] of rest.entries()) {
      this.code.set(line + 1 + i, `${indent}${INDENT}${INDENT}${tail}`);
    }
    if (body === undefined) {
      this.code.set(line, `${indent}${head}`);
      cursor = last;
    } else {
      const oneLiner =
        body.length === 1 &&
        body[0].simple &&
        body[0].line === last &&
        rest.length === 0;
      if (body.length === 0 || oneLiner) {
        const tail = body.length === 0 ? "pass" : body[0].text;
        this.code.set(line, `${indent}${head} ${tail}`);
        cursor = last;
      } else {
        this.code.set(line, `${indent}${head}`);
        cursor = this.place(body, depth + 1, last);
      }
    }
    for (const sibling of node.chain ?? []) {
      cursor = this.placeNode(
        sibling,
        node.chainDeeper ? depth + 1 : depth,
        cursor
      );
    }
    return cursor;
  }

  // two simple statements share a line with `;` when the line's own text is
  // a simple statement at the same depth
  private canJoin(line: number, indent: string): boolean {
    const text = this.code.get(line) ?? "";
    return (
      text.startsWith(indent) &&
      !text.startsWith(`${indent} `) &&
      !COLON_END.test(text) &&
      !HEADER_LINE.test(text)
    );
  }
}

type LogicalPart = LuaExpr | string;

// `a and b and c` as [a, "and", b, "and", c]: the chain of the top-level
// logical operator, operands between
function flattenLogical(e: LuaExpr, op?: string): LogicalPart[] {
  if (
    e.kind === "binary" &&
    (e.op === "and" || e.op === "or") &&
    (op === undefined || e.op === op)
  ) {
    return [
      ...flattenLogical(e.left, e.op),
      e.op,
      ...flattenLogical(e.right, e.op),
    ];
  }
  return [e];
}

function firstLineOf(nodes: readonly Node[]): number | undefined {
  for (const node of nodes) {
    if (node.line !== undefined) {
      return node.line;
    }
    const inner = firstLineOf(node.body ?? []);
    if (inner !== undefined) {
      return inner;
    }
  }
  return;
}

function sameNames(
  names: readonly string[],
  targets: readonly LuaExpr[]
): boolean {
  return (
    names.length === targets.length &&
    targets.every((t, i) => t.kind === "name" && t.name === names[i])
  );
}

interface MergedMember {
  readonly definition: LiftMember | undefined;
  readonly instance: LiftMember | undefined;
  readonly name: string;
}

// One declaration order out of both sides' offset orders: the longest common
// subsequence anchors it, definition-only members come first between anchors.
function mergeSides(
  def: readonly LiftMember[],
  inst: readonly LiftMember[],
  twins: (definition: number, instance: number) => boolean
): MergedMember[] {
  const paired = (d: LiftMember) =>
    inst.some((m) => m.name === d.name && twins(d.type, m.type));
  const anchors = commonSubsequence(
    def.filter(paired).map((m) => m.name),
    inst
      .map((m) => m.name)
      .filter((n) => def.some((m) => m.name === n && paired(m)))
  );
  const out: MergedMember[] = [];
  let i = 0;
  for (const d of def) {
    if (!anchors.has(d.name)) {
      out.push({ definition: d, instance: undefined, name: d.name });
      continue;
    }
    // everything on the instance side ahead of this anchor
    while (i < inst.length && inst[i].name !== d.name) {
      if (!anchors.has(inst[i].name)) {
        out.push({
          definition: undefined,
          instance: inst[i],
          name: inst[i].name,
        });
      }
      i++;
    }
    out.push({ definition: d, instance: inst[i], name: d.name });
    i++;
  }
  for (; i < inst.length; i++) {
    if (!anchors.has(inst[i].name)) {
      out.push({
        definition: undefined,
        instance: inst[i],
        name: inst[i].name,
      });
    }
  }
  return out;
}

function commonSubsequence(
  a: readonly string[],
  b: readonly string[]
): Set<string> {
  const table: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0)
  );
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] =
        a[i] === b[j]
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const out = new Set<string>();
  for (let i = 0, j = 0; i < a.length && j < b.length; ) {
    if (a[i] === b[j]) {
      out.add(a[i]);
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return out;
}

// the shortest decimal that reads back as the same single-precision float
export function numberText(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  for (let digits = 1; digits <= FLOAT_DIGITS; digits++) {
    const text = value.toPrecision(digits);
    if (Math.fround(Number(text)) === Math.fround(value)) {
      return String(Number(text));
    }
  }
  return String(value);
}

// ---- files -----------------------------------------------------------------

export function typeDeclLines(
  type: LiftPackageType,
  context: LiftContext
): LiftedTypeDecl {
  const namer = new TypeNamer(context);
  const name = lastSegment(type.name);
  if (type.kind === 0x20) {
    const values = [...type.members].sort((a, b) => a.offset - b.offset);
    return {
      kind: "enum",
      lines: [
        `enum ${name}:`,
        ...values.map(
          (v, i) =>
            `${INDENT}${v.name}${v.offset === i ? "" : ` = ${v.offset}`}`
        ),
      ],
      name,
    };
  }
  const parent = context.packageTypes.get(type.parent);
  const inherited = new Set(parent?.members.map((m) => m.name) ?? []);
  const base =
    type.parent === 0xffffffff ? undefined : namer.name(type.parent, undefined);
  const lines = [
    `struct ${name}${base === undefined ? "" : ` : ${base.text}`}:${base?.unknown ? `  ${UNKNOWN_NOTE}` : ""}`,
  ];
  const members = [...type.members]
    .filter((m) => !inherited.has(m.name))
    .sort((a, b) => a.offset - b.offset);
  for (const m of members) {
    const scalar = SCALAR_TYPES[m.kind];
    const text =
      scalar === undefined
        ? namer.name(m.type, undefined)
        : { text: scalar, unknown: false };
    lines.push(
      `${INDENT}${text.text} ${m.name}${text.unknown ? `  ${UNKNOWN_NOTE}` : ""}`
    );
  }
  if (members.length === 0) {
    lines.push(`${INDENT}pass`);
  }
  return { kind: "struct", lines, name };
}

interface RenderedFile {
  readonly notes: readonly string[];
  readonly text: string;
}

// Each decl's declarations before its first method, structs and enums ahead
// of the first class, code at its lines, the tag list after the last line.
export function renderLiftedFile(file: LiftedFile): RenderedFile {
  const notes: string[] = [];
  const lines = new Map<number, string>();
  const put = (line: number, text: string) => {
    if (lines.has(line)) {
      notes.push(
        `${file.path}: line ${line} already holds "${lines.get(line)}"; "${text}" moved`
      );
      return false;
    }
    lines.set(line, text);
    return true;
  };
  const decls = [...file.decls].sort((a, b) => a.firstLine - b.firstLine);
  let regionStart = 1;
  for (const extra of file.extras) {
    for (const text of extra.lines) {
      put(regionStart, text);
      regionStart++;
    }
    regionStart++;
  }
  for (const decl of decls) {
    const header: string[] = [];
    const indent = decl.implicit ? "" : INDENT;
    if (!decl.implicit) {
      const base = decl.baseName === undefined ? "" : ` : ${decl.baseName}`;
      header.push(
        `class ${decl.name}${base}:${decl.baseUnknown ? `  ${UNKNOWN_NOTE}` : ""}`
      );
    }
    header.push(...decl.declarations.map((d) => `${indent}${d}`));
    if (header.length === 0 && !decl.implicit) {
      header.push(`${indent}pass`);
    }
    const codeStart =
      decl.code.size === 0 ? Number.POSITIVE_INFINITY : decl.firstLine;
    let line = regionStart;
    for (const text of header) {
      if (text === "") {
        line++;
        continue;
      }
      if (line >= codeStart) {
        notes.push(
          `${file.path}: ${decl.name}: declarations overflow the ${codeStart - regionStart} lines before line ${codeStart}`
        );
      }
      put(line, text);
      line++;
    }
    for (const [at, text] of decl.code) {
      put(at, `${indent}${text}`);
    }
    regionStart = Math.max(decl.lastLine, line) + 1;
  }
  const last = Math.max(0, ...lines.keys());
  const out: string[] = [];
  for (let i = 1; i <= last; i++) {
    out.push(lines.get(i) ?? "");
  }
  out.push("");
  out.push("# Decompiled from 36735.13.12.02.1953.alpha script tags");
  // a file with several decls names the decl each tag line belongs to
  const named = decls.length > 1;
  for (const decl of decls) {
    if (decl.tags.length === 0) {
      continue;
    }
    const label = decl.tags.length === 1 ? "tag" : "tags";
    const owner = named ? ` (${decl.name})` : "";
    out.push(`# See ${label} ${decl.tags.join(", ")}${owner}`);
  }
  for (const decl of decls) {
    for (const u of decl.unexpressed) {
      out.push(`# schema only: ${decl.name}.${u}`);
    }
  }
  return { notes, text: `${out.join("\n")}\n` };
}
