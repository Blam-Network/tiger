// BungieScript declaration -> the Lua text bsc emitted for it, in Bungie's
// shape, with a line map from generated Lua line to source line for the Lua
// compiler's debug info.

import type {
  BsCall,
  BsCase,
  BsCommandScript,
  BsExpr,
  BsMember,
  BsMethod,
  BsStmt,
  BsThread,
} from "./ast.ts";
import { BsCompileError } from "./lexer.ts";
import {
  isEsFamily,
  type Project,
  type ProjectDecl,
  type Resolution,
  SPECIAL_FORMS,
} from "./project.ts";
import { py2DictOrder } from "./pydict.ts";
import type { BsRegistryEntry } from "./types.ts";

export interface BsDiagnostic {
  readonly line: number;
  readonly message: string;
  readonly path: string;
  readonly severity: "error" | "warning";
}

export interface GeneratedLua {
  readonly diagnostics: readonly BsDiagnostic[];
  // the registry entries the chunk imports, in upvalue_provider order
  readonly imports: readonly BsRegistryEntry[];
  // generated Lua line (1-based index) -> source line; [0] is the line
  // every unmapped Lua line, the main chunk's included, maps to
  readonly lineMap: readonly number[];
  readonly lua: string;
}

interface LuaLine {
  readonly sourceLine: number;
  readonly text: string;
}

const PREC = {
  or: 1,
  and: 2,
  compare: 3,
  add: 5,
  mul: 6,
  unary: 7,
  pow: 8,
  atom: 9,
} as const;

const BINARY: Readonly<
  Record<string, { lua: string; prec: number; rightAssoc: boolean }>
> = {
  or: { lua: "or", prec: PREC.or, rightAssoc: false },
  and: { lua: "and", prec: PREC.and, rightAssoc: false },
  "==": { lua: "==", prec: PREC.compare, rightAssoc: false },
  "!=": { lua: "~=", prec: PREC.compare, rightAssoc: false },
  "<": { lua: "<", prec: PREC.compare, rightAssoc: false },
  "<=": { lua: "<=", prec: PREC.compare, rightAssoc: false },
  ">": { lua: ">", prec: PREC.compare, rightAssoc: false },
  ">=": { lua: ">=", prec: PREC.compare, rightAssoc: false },
  "+": { lua: "+", prec: PREC.add, rightAssoc: false },
  "-": { lua: "-", prec: PREC.add, rightAssoc: false },
  "*": { lua: "*", prec: PREC.mul, rightAssoc: false },
  "/": { lua: "/", prec: PREC.mul, rightAssoc: false },
  "%": { lua: "%", prec: PREC.mul, rightAssoc: false },
  "**": { lua: "^", prec: PREC.pow, rightAssoc: true },
};

const GETTERS: Readonly<Record<BsRegistryEntry["kind"], string>> = {
  class: "__class_definition_get",
  enum: "__enum_definition_get",
  schema: "__schema_get",
};

// what es-family files import whether or not their code touches it
const BUNDLELIB = "bundlelib";
const SLEEP_FORMS = new Set(["sleep", "sleep_until", "sleep_until_timeout"]);
const DEFAULT_SLEEP_UNTIL_PERIOD = "1";
const GENERATED_LINE = 1;
const INDENT = "  ";
const PRINTABLE = /^[\x20-\x7e]$/;
// a source line marker inside emitted expression text, resolved by
// FunctionBody.line; the bytes never occur in Lua text (luaString escapes them)
const MARK_START = "\x01";
const MARK_END = "\x02";
const MARKER = new RegExp(`${MARK_START}(\\d+)${MARK_END}`, "g");

function mark(line: number): string {
  return `${MARK_START}${line}${MARK_END}`;
}

interface Emitted {
  readonly prec: number;
  readonly text: string;
}

export function generateLua(
  decl: ProjectDecl,
  project: Project,
  source: string
): GeneratedLua {
  return new DeclGenerator(decl, project, source).generate();
}

class DeclGenerator {
  private readonly decl: ProjectDecl;
  private readonly diagnostics: BsDiagnostic[] = [];
  readonly esFamily: boolean;
  // every global the emitted code references, in first-emission order
  private readonly keys: string[] = [];
  private readonly project: Project;
  private readonly source: string;
  private readonly typesUsed = new Map<string, BsRegistryEntry>();

  constructor(decl: ProjectDecl, project: Project, source: string) {
    this.decl = decl;
    this.project = project;
    this.source = source;
    this.esFamily = isEsFamily(decl.file.kind);
  }

  generate(): GeneratedLua {
    if (this.esFamily) {
      this.useType(this.project.typeNamed(BUNDLELIB));
    }
    const functions: LuaLine[][] = [];
    for (const member of this.decl.decl.members) {
      const lines = this.memberFunction(member);
      if (lines !== undefined) {
        functions.push(lines);
      }
    }
    if (this.esFamily) {
      functions.push(this.importFunction());
    }
    const imports = py2DictOrder(this.keys).flatMap((key) => {
      const entry = this.typesUsed.get(key);
      return entry === undefined ? [] : [entry];
    });
    const first = functions[0]?.[0]?.sourceLine ?? this.decl.decl.line;
    const last = functions.at(-1)?.at(-1)?.sourceLine ?? this.decl.decl.line;
    const trailer = this.esFamily ? GENERATED_LINE : last;
    const lines: LuaLine[] = [
      ...[
        "local _M = {}",
        `_M.decl_name = ${luaString(this.decl.name)}`,
        "_M.definition = {}",
        "_M.instance = {}",
        "local print = print",
        "local assert = assert",
        ...imports.map((entry) => `local ${entry.name} = false`),
      ].map((text) => ({ sourceLine: first, text })),
      ...functions.flat(),
      ...this.provider(imports).map((text) => ({ sourceLine: trailer, text })),
      { sourceLine: trailer, text: "return _M" },
    ];
    return {
      diagnostics: this.diagnostics,
      imports,
      lineMap: [first, ...lines.map((line) => line.sourceLine)],
      lua: `${lines.map((line) => line.text).join("\n")}\n`,
    };
  }

  private warn(line: number, message: string): void {
    this.diagnostics.push({
      line,
      message,
      path: this.decl.file.path,
      severity: "warning",
    });
  }

  private fail(line: number, message: string): never {
    throw new BsCompileError(message, this.decl.file.path, line);
  }

  private useGlobal(name: string): void {
    if (!this.keys.includes(name)) {
      this.keys.push(name);
    }
  }

  private useType(entry: BsRegistryEntry | undefined): void {
    if (entry === undefined) {
      return;
    }
    this.useGlobal(entry.name);
    if (!this.typesUsed.has(entry.name)) {
      this.typesUsed.set(entry.name, entry);
    }
  }

  private provider(imports: readonly BsRegistryEntry[]): string[] {
    if (imports.length === 0) {
      return ["function _M.upvalue_provider()", `${INDENT}return {}`, "end"];
    }
    const entries = imports.map(
      (entry, i) =>
        `${INDENT}${INDENT}${entry.name} = ${GETTERS[entry.kind]}(${luaString(entry.path)})${i < imports.length - 1 ? "," : ""}`
    );
    return [
      "function _M.upvalue_provider()",
      `${INDENT}local _result = {`,
      ...entries,
      `${INDENT}}`,
      `${INDENT}return _result`,
      "end",
    ];
  }

  private memberFunction(member: BsMember): LuaLine[] | undefined {
    switch (member.kind) {
      case "def":
        return this.method(member);
      case "thread":
        return this.thread(member);
      case "command_script":
        return this.commandScript(member);
      default:
        return;
    }
  }

  private luaMethodName(method: BsMethod): string {
    if (method.owner !== undefined) {
      return `${method.owner}_${method.name}_impl`;
    }
    return this.project.isDelegate(this.decl, method.name)
      ? `${method.name}_impl`
      : method.name;
  }

  private method(method: BsMethod): LuaLine[] {
    const side = method.isStatic ? "definition" : "instance";
    const body = new FunctionBody(this, method.params, method.line);
    body.block(method.body, 1);
    return body.finish(
      `function _M.${side}:${this.luaMethodName(method)}(${method.params.join(", ")})`
    );
  }

  private thread(thread: BsThread): LuaLine[] {
    const body = new FunctionBody(this, [], thread.line);
    body.block(thread.body, 1);
    return body.finish(`function _M.instance:${thread.name}_d_execute_impl()`);
  }

  // Every statement is an atom appended to the hidden __cs builder, on its
  // own line; the generated clear(), return and `end` sit on the header line.
  private commandScript(script: BsCommandScript): LuaLine[] {
    const body = new FunctionBody(this, script.params, script.line, {
      commandScript: true,
      endOnHeader: true,
    });
    body.line("self.__cs:clear()", script.line, 1);
    body.block(script.body, 1);
    body.line("return self.__cs", script.line, 1);
    return body.finish(
      `function _M.instance:${script.name}(${script.params.join(", ")})`
    );
  }

  // es-family import(): the bind chain, then user_import if the class has one
  private importFunction(): LuaLine[] {
    const body = new FunctionBody(this, [], GENERATED_LINE, {
      fixedLine: true,
    });
    body.line("local success", GENERATED_LINE, 1);
    body.line("success = true", GENERATED_LINE, 1);
    for (const member of this.decl.decl.members) {
      if (member.kind === "field" && member.bind !== undefined) {
        const args = member.bind.map((arg) => body.expr(arg).text).join(", ");
        body.line("if success then", GENERATED_LINE, 1);
        body.line(
          `success = self.${member.name}:import_only_bind(${args})`,
          GENERATED_LINE,
          2
        );
        body.line("end", GENERATED_LINE, 1);
      }
    }
    if (this.decl.members.get("user_import")?.kind === "def") {
      body.line("self:user_import()", GENERATED_LINE, 1);
    }
    body.line("return success", GENERATED_LINE, 1);
    return body.finish("function _M.instance:import()");
  }

  // ---- name resolution, shared by every function body --------------------

  resolve(name: string): Resolution {
    return this.project.resolve(this.decl, name);
  }

  noteType(entry: BsRegistryEntry): void {
    this.useType(entry);
  }

  noteGlobal(name: string): void {
    this.useGlobal(name);
  }

  unresolved(line: number, name: string): void {
    this.warn(line, `'${name}' is not declared; taken as a member`);
  }

  rawText(expr: BsExpr): string {
    return this.source.slice(expr.start, expr.end);
  }

  error(line: number, message: string): never {
    return this.fail(line, message);
  }
}

// One Lua function being written: its lines, local scopes and the source
// line its `end` will take.
class FunctionBody {
  private readonly commandScript: boolean;
  private readonly endOnHeader: boolean;
  private readonly fixedLine: boolean;
  private readonly gen: DeclGenerator;
  private readonly headerLine: number;
  private lastLine: number;
  private readonly lines: LuaLine[] = [];
  private readonly scopes: Set<string>[];

  constructor(
    gen: DeclGenerator,
    params: readonly string[],
    headerLine: number,
    options: {
      commandScript?: boolean;
      endOnHeader?: boolean;
      fixedLine?: boolean;
    } = {}
  ) {
    this.gen = gen;
    this.headerLine = headerLine;
    this.lastLine = headerLine;
    this.scopes = [new Set(["self", ...params])];
    // every line of a generated body takes the header line
    this.fixedLine = options.fixedLine === true;
    // a command script's `end` sits on its header line
    this.endOnHeader = options.endOnHeader === true;
    this.commandScript = options.commandScript === true;
  }

  finish(header: string): LuaLine[] {
    return [
      { sourceLine: this.headerLine, text: header },
      ...this.lines,
      {
        sourceLine: this.endOnHeader ? this.headerLine : this.lastLine,
        text: "end",
      },
    ];
  }

  line(text: string, sourceLine: number, depth: number): void {
    const base = this.fixedLine ? this.headerLine : sourceLine;
    let current = base;
    let buffer = INDENT.repeat(depth);
    let last = 0;
    for (const match of text.matchAll(MARKER)) {
      buffer += text.slice(last, match.index);
      last = match.index + match[0].length;
      const next = this.fixedLine ? this.headerLine : Number(match[1]);
      if (next !== current) {
        if (buffer.trim() !== "") {
          this.push(buffer, current);
          buffer = INDENT.repeat(depth + 2);
        }
        current = next;
      }
    }
    this.push(buffer + text.slice(last), current);
  }

  private push(text: string, sourceLine: number): void {
    this.lines.push({ sourceLine, text: text.trimEnd() });
    this.lastLine = sourceLine;
  }

  // a block-closing token: no code, so it takes the previous line
  private closer(text: string, depth: number): void {
    this.line(text, this.lastLine, depth);
  }

  private isLocal(name: string): boolean {
    return this.scopes.some((scope) => scope.has(name));
  }

  private declareLocal(name: string): void {
    (this.scopes.at(-1) as Set<string>).add(name);
  }

  private scoped(names: readonly string[], body: () => void): void {
    this.scopes.push(new Set(names));
    body();
    this.scopes.pop();
  }

  // ---- statements --------------------------------------------------------

  block(statements: readonly BsStmt[], depth: number): void {
    this.scoped([], () => {
      for (const statement of statements) {
        this.statement(statement, depth);
      }
    });
  }

  private statement(statement: BsStmt, depth: number): void {
    switch (statement.kind) {
      case "expr":
        this.exprStatement(statement.expr, statement.line, depth);
        return;
      case "assign":
        this.assign(statement.targets, statement.value, statement.line, depth);
        return;
      case "local":
        this.line(`local ${statement.names.join(", ")}`, statement.line, depth);
        for (const name of statement.names) {
          this.declareLocal(name);
        }
        if (statement.value !== undefined) {
          this.line(
            `${statement.names.join(", ")} = ${this.expr(statement.value).text}`,
            statement.line,
            depth
          );
        }
        return;
      case "if": {
        statement.branches.forEach((branch, i) => {
          const cond = this.expr(branch.cond).text;
          this.line(
            `${i === 0 ? "if" : "elseif"} ${cond} then`,
            branch.line,
            depth
          );
          this.block(branch.body, depth + 1);
        });
        if (statement.orelse !== undefined) {
          this.closer("else", depth);
          this.block(statement.orelse, depth + 1);
        }
        this.closer("end", depth);
        return;
      }
      case "while":
        this.line(
          `while ${this.expr(statement.cond).text} do`,
          statement.line,
          depth
        );
        this.block(statement.body, depth + 1);
        this.closer("end", depth);
        return;
      case "for":
        this.forStatement(
          statement.targets,
          statement.iter,
          statement.body,
          statement.line,
          depth
        );
        return;
      case "switch": {
        const name = `switch_value_${statement.line}`;
        this.line(
          `local ${name} = ${this.expr(statement.subject).text}`,
          statement.line,
          depth
        );
        this.declareLocal(name);
        this.switchCases(name, statement.cases, statement.default, 0, depth);
        return;
      }
      case "return": {
        const values = statement.values.map((value) => this.expr(value).text);
        this.line(
          values.length === 0 ? "return" : `return ${values.join(", ")}`,
          statement.line,
          depth
        );
        return;
      }
      case "break":
        this.line("break", statement.line, depth);
        return;
      default:
        return;
    }
  }

  // `switch` is an if/else chain: each case nests in the previous one's else,
  // and the innermost else holds the default (empty when there is none).
  private switchCases(
    name: string,
    cases: readonly BsCase[],
    fallback: readonly BsStmt[] | undefined,
    index: number,
    depth: number
  ): void {
    if (index >= cases.length) {
      if (fallback !== undefined) {
        this.block(fallback, depth);
      }
      return;
    }
    const current = cases[index];
    this.line(
      `if ${name} == ${this.expr(current.value).text} then`,
      current.line,
      depth
    );
    this.block(current.body, depth + 1);
    this.closer("else", depth);
    this.switchCases(name, cases, fallback, index + 1, depth + 1);
    this.closer("end", depth);
  }

  private forStatement(
    targets: readonly string[],
    iter: BsExpr,
    body: readonly BsStmt[],
    line: number,
    depth: number
  ): void {
    const special =
      iter.kind === "call" && iter.callee.kind === "name"
        ? (this.specialForm(iter.callee.name) ??
          this.builtinNamed(iter.callee.name))
        : undefined;
    let header: string;
    if (special === "range") {
      const call = iter as BsCall;
      if (
        targets.length !== 1 ||
        call.args.length < 1 ||
        call.args.length > 2
      ) {
        this.gen.error(
          line,
          "range takes one or two bounds and one loop variable"
        );
      }
      const [low, high] =
        call.args.length === 1
          ? ["0", this.exclusiveBound(call.args[0])]
          : [this.expr(call.args[0]).text, this.exclusiveBound(call.args[1])];
      header = `for ${targets[0]} = ${low}, ${high} do`;
    } else if (special === "pick_random_count") {
      header = `for ${targets.join(", ")} in ${this.expr(iter).text} do`;
    } else {
      const names =
        targets.length === 1 ? [`index_${line}_unused`, targets[0]] : targets;
      if (names.length !== 2) {
        this.gen.error(line, "a collection loop takes one or two variables");
      }
      // enum_of is not a bookkept global
      header = `for ${names.join(", ")} in enum_of(${this.expr(iter).text}) do`;
    }
    this.line(header, line, depth);
    this.scoped(targets, () => this.block(body, depth + 1));
    this.closer("end", depth);
  }

  // range's end is exclusive: `b - 1`, which Lua folds for a constant
  private exclusiveBound(bound: BsExpr): string {
    const high = this.expr(bound);
    return `${high.prec < PREC.add ? `(${high.text})` : high.text} - 1`;
  }

  // sleep, sleep_until, sleep_until_timeout and range are keywords in position:
  // a member of the same name does not hide them, only a local does
  private specialForm(name: string): string | undefined {
    if (this.isLocal(name)) {
      return;
    }
    return SPECIAL_FORMS.includes(name) ? name : undefined;
  }

  private builtinNamed(name: string): string | undefined {
    if (this.isLocal(name)) {
      return;
    }
    const resolution = this.gen.resolve(name);
    return resolution.kind === "builtin" ? resolution.name : undefined;
  }

  private exprStatement(expr: BsExpr, line: number, depth: number): void {
    if (expr.kind !== "call") {
      this.gen.error(line, "statement has no effect");
    }
    if (this.commandScript) {
      if (expr.callee.kind !== "name" || this.isLocal(expr.callee.name)) {
        this.gen.error(line, "a command script body holds atom calls only");
      }
      const args = expr.args.map((arg) => this.expr(arg).text).join(", ");
      this.line(`self.__cs:${expr.callee.name}(${args})`, line, depth);
      return;
    }
    const form =
      expr.callee.kind === "name"
        ? this.specialForm(expr.callee.name)
        : undefined;
    if (form !== undefined && SLEEP_FORMS.has(form)) {
      this.sleep(form, expr, line, depth);
      return;
    }
    this.line(this.expr(expr).text, line, depth);
  }

  // sleep(t) -> bundlelib:sleep(t); sleep_until(c[, p]) and
  // sleep_until_timeout(c, t) pack the condition with its own source text.
  private sleep(form: string, call: BsCall, line: number, depth: number): void {
    const bundlelib = this.gen.resolve(BUNDLELIB);
    if (bundlelib.kind === "type") {
      this.gen.noteType(bundlelib.entry);
    }
    if (form === "sleep") {
      if (call.args.length !== 1) {
        this.gen.error(line, "sleep takes one argument");
      }
      this.line(
        `bundlelib:sleep(${this.expr(call.args[0]).text})`,
        line,
        depth
      );
    } else {
      if (
        call.args.length < 1 ||
        call.args.length > 2 ||
        (form === "sleep_until_timeout" && call.args.length !== 2)
      ) {
        this.gen.error(
          line,
          `${form} takes a condition and a ${form === "sleep_until" ? "period" : "timeout"}`
        );
      }
      this.gen.noteGlobal("predicate_pack");
      const condition = this.expr(call.args[0]).text;
      const text = luaString(this.gen.rawText(call.args[0]));
      const period =
        call.args[1] === undefined
          ? DEFAULT_SLEEP_UNTIL_PERIOD
          : this.expr(call.args[1]).text;
      this.line(`bundlelib:${form}(predicate_pack(function()`, line, depth);
      this.line(`return ${condition}, ${text}`, line, depth + 1);
      this.line(`end), ${period})`, line, depth);
    }
    this.gen.noteGlobal("__coro_yield");
    // in a .bs decl bsc put a sleep's yield on the line after the statement;
    // es-family files and the sleep_until forms keep it on the statement's line
    const yieldLine = form === "sleep" && !this.gen.esFamily ? line + 1 : line;
    this.line("__coro_yield()", yieldLine, depth);
  }

  // Bare names not yet locals or members become locals here: `local x` on
  // its own line, then the assignment, both on the source line.
  private assign(
    targets: readonly BsExpr[],
    value: BsExpr,
    line: number,
    depth: number
  ): void {
    const fresh: string[] = [];
    for (const target of targets) {
      if (
        target.kind === "name" &&
        !this.isLocal(target.name) &&
        !this.isMember(target.name)
      ) {
        fresh.push(target.name);
      }
    }
    const lhs = targets.map((target) => this.target(target, fresh)).join(", ");
    const rhs = this.expr(value).text;
    if (fresh.length > 0) {
      this.line(`local ${fresh.join(", ")}`, line, depth);
      for (const name of fresh) {
        this.declareLocal(name);
      }
    }
    this.line(`${lhs} = ${rhs}`, line, depth);
  }

  private isMember(name: string): boolean {
    return this.gen.resolve(name).kind === "member";
  }

  private target(target: BsExpr, fresh: readonly string[]): string {
    switch (target.kind) {
      case "name":
        if (fresh.includes(target.name) || this.isLocal(target.name)) {
          return target.name;
        }
        return `self.${target.name}`;
      case "attr":
        return `${this.receiver(target.object)}.${target.name}`;
      case "index":
        return `${this.receiver(target.object)}[${this.expr(target.index).text}]`;
      default:
        return this.gen.error(target.line, "cannot assign to this expression");
    }
  }

  // ---- expressions -------------------------------------------------------

  expr(expr: BsExpr): Emitted {
    const emitted = this.exprText(expr);
    return { prec: emitted.prec, text: `${mark(expr.line)}${emitted.text}` };
  }

  private exprText(expr: BsExpr): Emitted {
    switch (expr.kind) {
      case "name":
        return { prec: PREC.atom, text: this.name(expr.name, expr.line) };
      case "number":
        return { prec: PREC.atom, text: expr.text };
      case "string":
        return { prec: PREC.atom, text: luaString(expr.value) };
      case "bool":
        return { prec: PREC.atom, text: expr.value ? "true" : "false" };
      case "nil":
        return { prec: PREC.atom, text: "nil" };
      case "attr":
        return {
          prec: PREC.atom,
          text: `${this.receiver(expr.object)}.${expr.name}`,
        };
      case "index":
        return {
          prec: PREC.atom,
          text: `${this.receiver(expr.object)}[${this.expr(expr.index).text}]`,
        };
      case "call":
        return { prec: PREC.atom, text: this.call(expr) };
      case "list": {
        // keyed from 0 like the host's arrays (a positional constructor
        // would start at 1), and the keys keep a call element to one value
        const items = expr.items.map(
          (item, i) => `[${i}] = ${this.expr(item).text}`
        );
        return { prec: PREC.atom, text: `{${items.join(", ")}}` };
      }
      case "unary": {
        const operand = this.expr(expr.operand);
        const text =
          operand.prec < PREC.pow ? `(${operand.text})` : operand.text;
        return {
          prec: PREC.unary,
          text: expr.op === "not" ? `not ${text}` : `-${text}`,
        };
      }
      case "binary": {
        const op = BINARY[expr.op];
        const left = this.expr(expr.left);
        const right = this.expr(expr.right);
        const lt =
          left.prec < op.prec || (left.prec === op.prec && op.rightAssoc)
            ? `(${left.text})`
            : left.text;
        const rt =
          right.prec < op.prec || (right.prec === op.prec && !op.rightAssoc)
            ? `(${right.text})`
            : right.text;
        return {
          prec: op.prec,
          text: `${lt} ${mark(expr.opLine)}${op.lua} ${rt}`,
        };
      }
      default:
        return this.gen.error(
          expr.line,
          "a vector literal is only a member default"
        );
    }
  }

  // The object of a `.`, `[` or `:`: a string literal needs parentheses
  // (`("%s"):format(x)`), anything below an atom too.
  private receiver(object: BsExpr): string {
    const emitted = this.expr(object);
    return object.kind === "string" || emitted.prec < PREC.atom
      ? `(${emitted.text})`
      : emitted.text;
  }

  private call(call: BsCall): string {
    const callee = call.callee;
    if (callee.kind === "attr") {
      const args = call.args.map((arg) => this.expr(arg).text).join(", ");
      return `${this.receiver(callee.object)}:${callee.name}(${args})`;
    }
    if (callee.kind === "name") {
      return this.nameCall(callee.name, call);
    }
    const args = call.args.map((arg) => this.expr(arg).text).join(", ");
    return `${this.receiver(callee)}(${args})`;
  }

  private nameCall(name: string, call: BsCall): string {
    const argText = () =>
      call.args.map((arg) => this.expr(arg).text).join(", ");
    if (this.isLocal(name)) {
      return `${name}(${argText()})`;
    }
    const resolution = this.gen.resolve(name);
    switch (resolution.kind) {
      case "member":
        return `self:${name}(${argText()})`;
      case "type":
        this.gen.noteType(resolution.entry);
        return `${name}(${argText()})`;
      case "builtin":
        if (SLEEP_FORMS.has(name) || name === "range") {
          this.gen.error(call.line, `${name} is a statement here`);
        }
        this.gen.noteGlobal(name);
        if (name === "assert" && call.args.length === 1) {
          // an assert carries its own condition text, as a predicate does
          return `assert(${this.expr(call.args[0]).text}, ${luaString(this.gen.rawText(call.args[0]))})`;
        }
        return `${name}(${argText()})`;
      default:
        this.gen.unresolved(call.line, name);
        return `self:${name}(${argText()})`;
    }
  }

  private name(name: string, line: number): string {
    if (this.isLocal(name)) {
      return name;
    }
    const resolution = this.gen.resolve(name);
    switch (resolution.kind) {
      case "member":
        return `self.${name}`;
      case "type":
        this.gen.noteType(resolution.entry);
        return name;
      case "builtin":
        this.gen.noteGlobal(name);
        return name;
      default:
        this.gen.unresolved(line, name);
        return `self.${name}`;
    }
  }
}

// A Lua string literal for a byte string: printable ASCII as is, the rest
// as \ddd, the way the decompiler writes them.
export function luaString(bytes: string): string {
  let out = '"';
  for (const c of bytes) {
    if (c === '"' || c === "\\") {
      out += `\\${c}`;
    } else if (c === "\n") {
      out += "\\n";
    } else if (PRINTABLE.test(c)) {
      out += c;
    } else {
      out += `\\${c.charCodeAt(0).toString().padStart(3, "0")}`;
    }
  }
  return `${out}"`;
}
