// Parser for BungieScript: declarations (members, scripts, methods, delegates,
// command scripts) and Python 2 statements plus `switch`.

import { fnv1, parseHashLiteral } from "../host/tags/name_hash.ts";
import {
  type ActivityPhaseStart,
  type ActivityStartPhase,
  sliceRegionHash,
} from "./activity_start.ts";
import type {
  BsActivityBundle,
  BsActivityStart,
  BsBinaryOp,
  BsCase,
  BsCountsEntry,
  BsCountsValue,
  BsDecl,
  BsDeclKind,
  BsEnumValue,
  BsExpr,
  BsFile,
  BsFileKind,
  BsIfBranch,
  BsMember,
  BsMemberCounts,
  BsMemberObjective,
  BsObjectiveEntry,
  BsObjectiveValue,
  BsStmt,
  BsTask,
  BsType,
} from "./ast.ts";
import { BsCompileError, type BsToken, tokenize } from "./lexer.ts";
import { type BsTokenSpan, standInLinesOf } from "./stand_in.ts";

const FILE_KINDS: readonly BsFileKind[] = ["bs", "es", "esp", "esu"];
const DECL_KINDS: readonly BsDeclKind[] = ["class", "struct", "enum"];
const COMPARISONS = new Set(["==", "!=", "<", "<=", ">", ">="]);
const TERM_OPERATORS = new Set(["*", "/", "%"]);
const WHOLE_NUMBER = /^\d+$/;
// words that start a member other than a field
const NOT_FIELD_WORDS = new Set([
  "command_script",
  "def",
  "delegate",
  "implements",
  "pass",
  "script",
]);

// One of the decorators that say how an activity starts.
type BsStartPart =
  | { readonly kind: "activity"; readonly names: readonly string[] }
  | { readonly kind: "phase"; readonly value: ActivityPhaseStart }
  | {
      readonly kind: "region_spawn_transition";
      readonly region: number;
      readonly value: number;
    }
  | { readonly kind: "spawn_transition"; readonly value: number }
  | {
      readonly kind: "start_slice";
      readonly phase?: ActivityStartPhase;
      readonly value: string;
    }
  | { readonly kind: "time_of_day"; readonly value: number };

interface BsStartDecorator {
  readonly kind: "start";
  readonly line: number;
  readonly name: string;
  readonly part: BsStartPart;
}

type BsDecorator =
  | {
      readonly kind: "activity_bundle";
      readonly name: string;
      readonly value: BsActivityBundle;
    }
  | {
      readonly kind: "member_counts";
      readonly name: string;
      readonly value: BsMemberCounts;
    }
  | {
      readonly kind: "objective";
      readonly name: string;
      readonly value: BsMemberObjective;
    }
  | {
      readonly kind: "placed";
      readonly line: number;
      readonly name: string;
    }
  | {
      readonly kind: "startup";
      readonly line: number;
      readonly name: string;
    }
  | {
      readonly kind: "task";
      readonly name: string;
      readonly value: BsTask;
    }
  | BsStartDecorator;

// What decorates a member: its squad counts, that it starts placed, the
// Objective its squads are against and its Objective's tasks; on a script,
// that it starts with its class.
type BsMemberDecorator = Extract<
  BsDecorator,
  { kind: "member_counts" | "objective" | "placed" | "startup" | "task" }
>;

const MEMBER_DECORATORS: ReadonlySet<string> = new Set([
  "member_counts",
  "objective",
  "placed",
  "startup",
  "task",
]);

function isMemberDecorator(
  decorator: BsDecorator
): decorator is BsMemberDecorator {
  return MEMBER_DECORATORS.has(decorator.kind);
}

// What the head decorators gave: the bundle, the activity's start and the
// first member's own decorators.
interface BsHead {
  readonly bundle: BsActivityBundle | undefined;
  readonly members: BsMemberDecorator[];
  readonly start: BsActivityStart | undefined;
}

export function bsFileKind(path: string): BsFileKind | undefined {
  const extension = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  return FILE_KINDS.find((kind) => kind === extension);
}

// "es/venus/x/enc_x_amb1.es" -> "enc_x_amb1", as is a chunk's source path
// "@es\venus\x\enc_x_amb1.es". A script's name: what other scripts, handles
// and its bundle hash know it by.
export function scriptStem(path: string): string {
  const cut = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  const base = path.slice(cut + 1);
  const name = base.startsWith("@") ? base.slice(1) : base;
  const dot = name.lastIndexOf(".");
  return dot < 0 ? name : name.slice(0, dot);
}

// Every class on the native c_encounter base carries this prefix, and no other
// class does. Only the class name has it: bundles, hosts and threads all know
// an encounter by its file stem.
export const ENCOUNTER_PREFIX = "c_encounter__";

// The class an encounter's file declares: implicit in a `.es` file, written
// out in a `.bs` file such as story_common.bs.
export function encounterDeclName(path: string): string {
  return `${ENCOUNTER_PREFIX}${scriptStem(path)}`;
}

// The one class an es-family file declares: `.es` files get the compiler's
// `c_encounter__` prefix, `.esp`/`.esu` are named after the file. The class
// name only; the script itself is still known by its stem.
export function implicitDeclName(path: string, kind: BsFileKind): string {
  return kind === "es" ? encounterDeclName(path) : scriptStem(path);
}

// A bundle whose name never cracked keeps its script as unknown_<hash> (true
// name unknown); every other file's name is the one that hashes to its bundle.
export const UNKNOWN_NAME = /^unknown_([0-9a-f]{8})$/;

// The fnv1 a script is known by: its file stem, or the hash an unknown_<hash>
// stem stands for.
export function bundleHashOf(stem: string): number {
  const unknown = UNKNOWN_NAME.exec(stem);
  return unknown ? Number.parseInt(unknown[1] ?? "", 16) >>> 0 : fnv1(stem);
}

export function parseBungieScript(source: string, path: string): BsFile {
  const normalized = path.replaceAll("\\", "/");
  const kind = bsFileKind(normalized);
  if (kind === undefined) {
    throw new BsCompileError(
      "not a BungieScript source (.bs/.es/.esp/.esu)",
      normalized,
      1
    );
  }
  const parser = new BsParser(source, normalized);
  const decls =
    kind === "bs"
      ? parser.bsFile()
      : [parser.implicitDecl(implicitDeclName(normalized, kind))];
  return {
    decls,
    kind,
    path: normalized,
    standInLines: parser.standInLines(),
  };
}

class BsParser {
  private readonly decoratorSpans: BsTokenSpan[] = [];
  private readonly path: string;
  private position = 0;
  private readonly source: string;
  private readonly tokens: BsToken[];

  constructor(source: string, path: string) {
    this.source = source;
    this.path = path;
    this.tokens = tokenize(source, path);
  }

  // the lines chunks are numbered without (stand_in.ts)
  standInLines(): number[] {
    return standInLinesOf(this.source, this.tokens, this.decoratorSpans);
  }

  private get token(): BsToken {
    return this.tokens[this.position];
  }

  private peek(offset = 1): BsToken {
    return this.tokens[
      Math.min(this.position + offset, this.tokens.length - 1)
    ];
  }

  private next(): BsToken {
    const token = this.token;
    if (token.kind !== "eof") {
      this.position += 1;
    }
    return token;
  }

  private error(message: string, token: BsToken = this.token): never {
    throw new BsCompileError(
      `${message} near ${describe(token)}`,
      this.path,
      token.line
    );
  }

  private atOp(text: string): boolean {
    return this.token.kind === "op" && this.token.text === text;
  }

  private atWord(text: string): boolean {
    return this.token.kind === "name" && this.token.text === text;
  }

  private acceptOp(text: string): boolean {
    if (this.atOp(text)) {
      this.next();
      return true;
    }
    return false;
  }

  private acceptWord(text: string): boolean {
    if (this.atWord(text)) {
      this.next();
      return true;
    }
    return false;
  }

  private expectOp(text: string): BsToken {
    if (!this.atOp(text)) {
      this.error(`'${text}' expected`);
    }
    return this.next();
  }

  private expectWord(text: string): BsToken {
    if (!this.atWord(text)) {
      this.error(`'${text}' expected`);
    }
    return this.next();
  }

  private expectName(): BsToken {
    if (this.token.kind !== "name") {
      this.error("name expected");
    }
    return this.next();
  }

  private expectKind(kind: BsToken["kind"]): BsToken {
    if (this.token.kind !== kind) {
      this.error(`${kind} expected`);
    }
    return this.next();
  }

  private skipNewlines(): void {
    while (this.token.kind === "newline") {
      this.next();
    }
  }

  bsFile(): BsDecl[] {
    const decls: BsDecl[] = [];
    this.skipNewlines();
    while (this.token.kind !== "eof") {
      const head = this.headDecorators(this.decorators(), false);
      const activityBundle = head.bundle;
      const start = this.token;
      const kind = DECL_KINDS.find((k) => this.atWord(k));
      if (kind === undefined) {
        this.error("'class', 'struct' or 'enum' expected");
      }
      this.next();
      const name = this.expectName().text;
      const base =
        this.acceptOp(":") && !this.atKindNewline()
          ? this.expectName().text
          : undefined;
      if (base !== undefined) {
        this.expectOp(":");
      }
      if (activityBundle !== undefined && kind !== "class") {
        this.error("@activity_bundle decorates a class", start);
      }
      if (head.start !== undefined && kind !== "class") {
        this.error("@activity decorates a class", start);
      }
      const members = this.declSuite(kind);
      decls.push({
        activityBundle,
        activityStart: head.start,
        base,
        end: this.peek(-1).end,
        implicit: false,
        kind,
        line: start.line,
        members,
        name,
        start: start.start,
      });
      this.skipNewlines();
    }
    return decls;
  }

  // The decorators here, each on its own line or sharing one:
  // `@activity_bundle("name")` or `@activity_bundle(0x<hash>)`,
  // `@member_counts(["path",] n0, ...)` and the ones that say how an activity
  // starts (startPart).
  private decorators(): BsDecorator[] {
    const out: BsDecorator[] = [];
    while (this.acceptOp("@")) {
      const first = this.position - 1;
      const name = this.expectName();
      this.expectOp("(");
      out.push(this.decorator(name));
      this.expectOp(")");
      this.decoratorSpans.push({ first, last: this.position - 1 });
      // a member's decorator can share its member's line
      if (MEMBER_DECORATORS.has(name.text) && this.token.kind === "name") {
        break;
      }
      if (this.atOp("@")) {
        continue;
      }
      this.expectKind("newline");
      this.skipNewlines();
    }
    return out;
  }

  private decorator(name: BsToken): BsDecorator {
    if (name.text === "activity_bundle") {
      return {
        kind: "activity_bundle",
        name: name.text,
        value: this.activityBundle(name),
      };
    }
    if (name.text === "member_counts") {
      return {
        kind: "member_counts",
        name: name.text,
        value: this.memberCounts(name),
      };
    }
    if (name.text === "objective") {
      return {
        kind: "objective",
        name: name.text,
        value: { line: name.line, value: this.objectiveValue(name) },
      };
    }
    if (name.text === "placed") {
      return { kind: "placed", line: name.line, name: name.text };
    }
    if (name.text === "startup") {
      return { kind: "startup", line: name.line, name: name.text };
    }
    if (name.text === "task") {
      return { kind: "task", name: name.text, value: this.task(name) };
    }
    const part = this.startPart(name);
    if (part === undefined) {
      this.error(`unknown decorator '@${name.text}'`, name);
    }
    return { kind: "start", line: name.line, name: name.text, part };
  }

  // `@activity("name", ...)`, `@start_slice("region", "phase")`,
  // `@phase("name", "region")`, `@spawn_transition("spawn point")`,
  // `@region_spawn_transition(region, "spawn point")` and
  // `@time_of_day(fraction)`; a name that never cracked is its 0x<hash>.
  private startPart(name: BsToken): BsStartPart | undefined {
    switch (name.text) {
      case "activity":
        return { kind: "activity", names: this.activityNames() };
      case "start_slice": {
        const slice = this.sliceName(name);
        if (!this.acceptOp(",")) {
          return { kind: "start_slice", value: slice };
        }
        const { hash, text } = this.nameOrHash(name);
        return {
          kind: "start_slice",
          phase: { hash, name: text },
          value: slice,
        };
      }
      case "phase": {
        const phase = this.nameOrHash(name);
        this.expectOp(",");
        return {
          kind: "phase",
          value: {
            hash: phase.hash,
            name: phase.text,
            slice: this.sliceName(name),
          },
        };
      }
      case "spawn_transition":
        return { kind: "spawn_transition", value: this.nameOrHash(name).hash };
      case "region_spawn_transition": {
        const region = this.wholeNumber(name);
        this.expectOp(",");
        return {
          kind: "region_spawn_transition",
          region,
          value: this.nameOrHash(name).hash,
        };
      }
      case "time_of_day":
        return { kind: "time_of_day", value: this.timeOfDay() };
      default:
        return;
    }
  }

  private activityNames(): string[] {
    const names: string[] = [];
    do {
      const token = this.expectKind("string");
      if (token.text === "") {
        this.error("@activity takes activity names", token);
      }
      names.push(token.text);
    } while (this.acceptOp(","));
    return names;
  }

  // `0.77`: a fraction of the day, as written (the wire rounds it to an f32)
  private timeOfDay(): number {
    const number = this.expectKind("number");
    const fraction = Number.parseFloat(number.text);
    if (!(fraction >= 0 && fraction < 1)) {
      this.error("@time_of_day takes a fraction of the day, 0 up to 1", number);
    }
    return fraction;
  }

  // a slice's region name, as written (a name, or the 0x<hash> of one that
  // never cracked)
  private sliceName(decorator: BsToken): string {
    const token = this.token;
    if (token.kind === "string" && token.text === "") {
      this.error(`@${decorator.text} takes a slice name`, token);
    }
    return this.nameOrHash(decorator).text;
  }

  private wholeNumber(decorator: BsToken): number {
    const token = this.token;
    if (token.kind !== "number" || !WHOLE_NUMBER.test(token.text)) {
      this.error(`@${decorator.text} takes whole numbers`, token);
    }
    this.next();
    return token.value;
  }

  // a name (hashed with fnv1) or the 0x<hash> of one that never cracked
  private nameOrHash(decorator: BsToken): { hash: number; text: string } {
    const token = this.token;
    let hash: number | undefined;
    if (token.kind === "string") {
      hash = fnv1(token.text);
    } else if (token.kind === "number") {
      hash = parseHashLiteral(token.text);
    }
    if (hash === undefined) {
      this.error(`@${decorator.text} takes a name or a 0x<hash>`, token);
    }
    this.next();
    return { hash, text: token.text };
  }

  private activityBundle(name: BsToken): BsActivityBundle {
    const arg = this.token;
    let hash: number | undefined;
    if (arg.kind === "string") {
      hash = fnv1(arg.text);
    } else if (arg.kind === "number") {
      hash = parseHashLiteral(arg.text);
    }
    if (hash === undefined) {
      this.error("@activity_bundle takes a bundle name or a 0x<hash>", arg);
    }
    this.next();
    return { hash, line: name.line, text: arg.text };
  }

  private memberCounts(name: BsToken): BsMemberCounts {
    return { line: name.line, value: this.countsValue() };
  }

  // a count, a [list] or a {map} of them, across lines if need be
  private countsValue(): BsCountsValue {
    this.skipLayout();
    const start = this.token;
    if (this.acceptOp("[")) {
      const items: BsCountsValue[] = [];
      this.skipLayout();
      while (!this.atOp("]")) {
        items.push(this.countsValue());
        this.skipLayout();
        if (!this.acceptOp(",")) {
          break;
        }
        this.skipLayout();
      }
      this.skipLayout();
      this.expectOp("]");
      return { items, kind: "list", line: start.line };
    }
    if (this.acceptOp("{")) {
      const entries: BsCountsEntry[] = [];
      const keys = new Set<number>();
      this.skipLayout();
      while (!this.atOp("}")) {
        const entry = this.countsEntry();
        if (keys.has(entry.hash)) {
          this.error(`@member_counts names '${entry.key}' twice`);
        }
        keys.add(entry.hash);
        entries.push(entry);
        this.skipLayout();
        if (!this.acceptOp(",")) {
          break;
        }
        this.skipLayout();
      }
      this.skipLayout();
      this.expectOp("}");
      return { entries, kind: "map", line: start.line };
    }
    if (start.kind !== "number" || !WHOLE_NUMBER.test(start.text)) {
      this.error(
        "@member_counts takes whole numbers, lists and {member: count} maps",
        start
      );
    }
    this.next();
    return { kind: "count", line: start.line, value: start.value };
  }

  // `name: value`, or `0x<hash>: value` for a member whose name never cracked
  private countsEntry(): BsCountsEntry {
    const key = this.token;
    let hash: number | undefined;
    if (key.kind === "name") {
      hash = fnv1(key.text);
    } else if (key.kind === "number") {
      hash = parseHashLiteral(key.text);
    }
    if (hash === undefined) {
      this.error("@member_counts keys are member names or 0x<hash>", key);
    }
    this.next();
    this.expectOp(":");
    return { hash, key: key.text, line: key.line, value: this.countsValue() };
  }

  // A target (`obj_x`, `phase02.obj_x`) or a {member: value} map of them,
  // across lines if need be.
  private objectiveValue(decorator: BsToken): BsObjectiveValue {
    this.skipLayout();
    const start = this.token;
    if (!this.acceptOp("{")) {
      return {
        kind: "target",
        line: start.line,
        path: this.memberPath(decorator),
      };
    }
    const entries: BsObjectiveEntry[] = [];
    const keys = new Set<string>();
    this.skipLayout();
    while (!this.atOp("}")) {
      const key = this.expectName();
      if (keys.has(key.text)) {
        this.error(`@objective names '${key.text}' twice`, key);
      }
      keys.add(key.text);
      this.expectOp(":");
      entries.push({
        key: key.text,
        line: key.line,
        value: this.objectiveValue(decorator),
      });
      this.skipLayout();
      if (!this.acceptOp(",")) {
        break;
      }
      this.skipLayout();
    }
    this.skipLayout();
    this.expectOp("}");
    return { entries, kind: "map", line: start.line };
  }

  // `name`, `a.b` or `a[2].b`: a member of the declaring script, as written
  private memberPath(decorator: BsToken): string {
    if (this.token.kind !== "name") {
      this.error(`@${decorator.text} takes a member name`);
    }
    let path = this.next().text;
    for (;;) {
      if (this.acceptOp(".")) {
        path += `.${this.expectName().text}`;
      } else if (this.acceptOp("[")) {
        path += `[${this.expectKind("number").text}]`;
        this.expectOp("]");
      } else {
        return path;
      }
    }
  }

  // `"name"` or `0x<hash>`, then `squad: member`, `condition: field` and, on
  // an archetype instance, `objective: member` in any order, each optional
  private task(decorator: BsToken): BsTask {
    const { hash, text } = this.nameOrHash(decorator);
    let squad: BsTask["squad"];
    let condition: BsTask["condition"];
    let objective: BsTask["objective"];
    while (this.acceptOp(",")) {
      const key = this.expectName();
      this.expectOp(":");
      if (key.text === "squad" && squad === undefined) {
        squad = { line: key.line, path: this.memberPath(decorator) };
      } else if (key.text === "condition" && condition === undefined) {
        condition = { line: key.line, name: this.expectName().text };
      } else if (key.text === "objective" && objective === undefined) {
        objective = { line: key.line, path: this.memberPath(decorator) };
      } else {
        this.error(
          `@task takes squad:, condition: and objective: once each, not '${key.text}'`,
          key
        );
      }
    }
    return {
      condition,
      hash,
      line: decorator.line,
      name: text,
      objective,
      squad,
    };
  }

  // inside brackets a value may run over lines
  private skipLayout(): void {
    while (
      this.token.kind === "newline" ||
      this.token.kind === "indent" ||
      this.token.kind === "dedent"
    ) {
      this.next();
    }
  }

  // A class's or file's head takes one @activity_bundle and the decorators
  // that say how its activity starts; an es-family file's head decorators
  // can also be its first member's, below those.
  private headDecorators(
    decorators: readonly BsDecorator[],
    memberFollows: boolean
  ): BsHead {
    let bundle: BsActivityBundle | undefined;
    const members: BsMemberDecorator[] = [];
    const starts: BsStartDecorator[] = [];
    for (const decorator of decorators) {
      if (isMemberDecorator(decorator)) {
        if (!memberFollows) {
          this.error(`@${decorator.name} decorates a member`);
        }
        members.push(decorator);
      } else if (members.length > 0) {
        this.error(`@${decorator.name} goes above the member's decorators`);
      } else if (decorator.kind === "start") {
        starts.push(decorator);
      } else if (bundle === undefined) {
        bundle = decorator.value;
      } else {
        this.error("an encounter takes one @activity_bundle");
      }
    }
    return { bundle, members, start: this.activityStart(starts) };
  }

  // The start decorators together: @activity names the activities and the
  // rest is their start. Each is written once but @phase (in the order the
  // lifetime runs them) and @region_spawn_transition.
  private activityStart(
    starts: readonly BsStartDecorator[]
  ): BsActivityStart | undefined {
    if (starts.length === 0) {
      return;
    }
    const fail = (message: string, line: number): never => {
      throw new BsCompileError(message, this.path, line);
    };
    const once = (current: unknown, { line, name }: BsStartDecorator) => {
      if (current !== undefined) {
        fail(`@${name} is written once`, line);
      }
    };
    let activities: readonly string[] | undefined;
    let spawnTransition: number | undefined;
    let startSlice: string | undefined;
    let startPhase: ActivityStartPhase | undefined;
    let timeOfDay: number | undefined;
    const phases: ActivityPhaseStart[] = [];
    const regionSpawnTransitions: Record<number, number> = {};
    for (const decorator of starts) {
      const { part } = decorator;
      switch (part.kind) {
        case "activity":
          once(activities, decorator);
          activities = part.names;
          break;
        case "start_slice":
          once(startSlice, decorator);
          startSlice = part.value;
          startPhase = part.phase;
          break;
        case "spawn_transition":
          once(spawnTransition, decorator);
          spawnTransition = part.value;
          break;
        case "time_of_day":
          once(timeOfDay, decorator);
          timeOfDay = part.value;
          break;
        case "phase":
          phases.push(part.value);
          break;
        case "region_spawn_transition":
          if (part.region in regionSpawnTransitions) {
            fail(
              `@region_spawn_transition names region ${part.region} twice`,
              decorator.line
            );
          }
          regionSpawnTransitions[part.region] = part.value;
          break;
        default:
          break;
      }
    }
    const line = starts[0].line;
    if (activities === undefined) {
      return fail("the start decorators need an @activity", line);
    }
    this.checkStartPhase(starts, startSlice, startPhase, phases);
    return {
      activities,
      line,
      phases,
      regionSpawnTransitions,
      ...(spawnTransition === undefined ? {} : { spawnTransition }),
      ...(startPhase === undefined ? {} : { startPhase }),
      ...(startSlice === undefined ? {} : { startSlice }),
      ...(timeOfDay === undefined ? {} : { timeOfDay }),
    };
  }

  // The start state is the one a phase owns in the start slice, so the
  // @start_slice names that phase: required when a @phase plays in the slice,
  // and then one of those. Left out, no phase owns the start state and the
  // activity starts in the slice's state 0.
  private checkStartPhase(
    starts: readonly BsStartDecorator[],
    startSlice: string | undefined,
    startPhase: ActivityStartPhase | undefined,
    phases: readonly ActivityPhaseStart[]
  ): void {
    const decorator = starts.find(({ part }) => part.kind === "start_slice");
    if (decorator === undefined || startSlice === undefined) {
      return;
    }
    const sliceHash = sliceRegionHash(startSlice);
    const inSlice = phases.filter(
      (p) => sliceRegionHash(p.slice) === sliceHash
    );
    const fail = (message: string): never => {
      throw new BsCompileError(message, this.path, decorator.line);
    };
    if (startPhase === undefined) {
      if (inSlice.length > 0) {
        fail(
          `@start_slice("${startSlice}") needs the @phase that owns the start state (a @phase plays in ${startSlice})`
        );
      }
    } else if (!inSlice.some((p) => p.hash === startPhase.hash)) {
      fail(
        `@start_slice names phase '${startPhase.name}', which is not a @phase in ${startSlice}`
      );
    }
  }

  // after `class name :`, is this the block's own colon (followed by a
  // newline or a one-line body) rather than a base name?
  private atKindNewline(): boolean {
    return this.token.kind !== "name";
  }

  implicitDecl(name: string): BsDecl {
    const members: BsMember[] = [];
    this.skipNewlines();
    // an es-family file's decorator heads the file, as its class's would
    const head = this.headDecorators(this.decorators(), true);
    const activityBundle = head.bundle;
    let leading = head.members;
    while (this.token.kind !== "eof") {
      const member = this.member(leading);
      leading = [];
      if (member !== undefined) {
        members.push(member);
      }
      this.skipNewlines();
    }
    if (leading.length > 0) {
      this.error(`@${leading[0].name} decorates a member`);
    }
    return {
      activityBundle,
      activityStart: head.start,
      base: undefined,
      end: this.source.length,
      implicit: true,
      kind: "class",
      line: 1,
      members,
      name,
      start: 0,
    };
  }

  private declSuite(kind: BsDeclKind): BsMember[] {
    this.expectKind("newline");
    this.skipNewlines();
    this.expectKind("indent");
    const members: BsMember[] = [];
    let value = 0;
    while (!this.atBlockEnd()) {
      if (kind === "enum") {
        const entry = this.enumValue(value);
        if (entry !== undefined) {
          members.push(entry);
          value = entry.value + 1;
        }
      } else {
        const member = this.member([]);
        if (member !== undefined) {
          members.push(member);
        }
      }
      this.skipNewlines();
    }
    this.next();
    return members;
  }

  private enumValue(nextValue: number): BsEnumValue | undefined {
    if (this.acceptWord("pass")) {
      this.expectKind("newline");
      return;
    }
    const name = this.expectName();
    let value = nextValue;
    if (this.acceptOp("=")) {
      const negative = this.acceptOp("-");
      const number = this.expectKind("number").value;
      value = negative ? -number : number;
    }
    this.expectKind("newline");
    return {
      end: name.end,
      kind: "enum_value",
      line: name.line,
      name: name.text,
      start: name.start,
      value,
    };
  }

  private member(leading: readonly BsMemberDecorator[]): BsMember | undefined {
    const decorated = [...leading, ...this.memberDecorators()];
    const start = this.token;
    const startups = decorated.filter((d) => d.kind === "startup");
    const fieldDecorators = decorated.filter((d) => d.kind !== "startup");
    if (startups.length > 0 && !this.atWord("script")) {
      this.error("@startup decorates a script", start);
    }
    if (fieldDecorators.length > 0 && !this.atFieldStart()) {
      this.error(`@${fieldDecorators[0].name} decorates a member`, start);
    }
    if (startups.length > 1) {
      this.error("a script takes one @startup", start);
    }
    if (this.acceptWord("pass")) {
      this.expectKind("newline");
      return;
    }
    if (this.acceptWord("script")) {
      const name = this.expectName().text;
      // a script takes no arguments, but its parentheses are written
      this.expectOp("(");
      this.expectOp(")");
      this.expectOp(":");
      const body = this.suite();
      return {
        body,
        end: this.peek(-1).end,
        kind: "thread",
        line: start.line,
        name,
        start: start.start,
        startup: startups.length > 0,
      };
    }
    if (this.atWord("delegate")) {
      this.next();
      const name = this.expectName().text;
      const params = this.paramList();
      this.expectKind("newline");
      return {
        end: this.peek(-1).end,
        kind: "delegate",
        line: start.line,
        name,
        params,
        start: start.start,
      };
    }
    if (this.atWord("command_script")) {
      this.next();
      const name = this.expectName().text;
      const params = this.paramList();
      this.expectOp(":");
      const body = this.suite();
      return {
        body,
        end: this.peek(-1).end,
        kind: "command_script",
        line: start.line,
        name,
        params,
        start: start.start,
      };
    }
    if (this.atWord("implements")) {
      this.next();
      const interfaceName = this.expectName().text;
      const name = this.expectName().text;
      this.expectKind("newline");
      return {
        end: this.peek(-1).end,
        interfaceName,
        kind: "implements",
        line: start.line,
        name,
        start: start.start,
      };
    }
    const isStatic = this.acceptWord("static");
    if (this.atWord("def")) {
      this.next();
      let name = this.expectName().text;
      let owner: string | undefined;
      if (this.acceptOp(".")) {
        owner = name;
        name = this.expectName().text;
      }
      const params = this.paramList();
      this.expectOp(":");
      const body = this.suite();
      return {
        body,
        end: this.peek(-1).end,
        isStatic,
        kind: "def",
        line: start.line,
        name,
        owner,
        params,
        start: start.start,
      };
    }
    const declared = this.type();
    const name = this.expectName().text;
    // `T name[N]` declares a C array as `T[N] name` does
    const type = this.atOp("[")
      ? {
          ...declared,
          count: this.arrayCount(),
          text: `${declared.text}[${this.peek(-2).text}]`,
        }
      : declared;
    const defaultValue = this.acceptOp("=") ? this.expr() : undefined;
    let bind: BsExpr[] | undefined;
    if (this.acceptWord("bind")) {
      this.expectOp("(");
      bind = this.atOp(")") ? [] : this.exprList();
      this.expectOp(")");
    }
    this.expectKind("newline");
    const counts = decorated.filter((d) => d.kind === "member_counts");
    const objectives = decorated.filter((d) => d.kind === "objective");
    const placed = decorated.filter((d) => d.kind === "placed");
    const tasks = decorated.flatMap((d) =>
      d.kind === "task" ? [d.value] : []
    );
    if (counts.length > 1) {
      this.error(`'${name}' takes one @member_counts`, start);
    }
    if (objectives.length > 1) {
      this.error(`'${name}' takes one @objective`, start);
    }
    if (placed.length > 1) {
      this.error(`'${name}' takes one @placed`, start);
    }
    const twice = tasks.find(
      (task, i) => tasks.findIndex((t) => t.hash === task.hash) !== i
    );
    if (twice !== undefined) {
      this.error(`'${name}' takes @task ${twice.name} once`, start);
    }
    return {
      bind,
      default: defaultValue,
      end: this.peek(-1).end,
      isStatic,
      kind: "field",
      line: start.line,
      memberCounts: counts[0]?.value,
      name,
      objective: objectives[0]?.value,
      placed: placed[0]?.line,
      start: start.start,
      tasks,
      type,
    };
  }

  // a member's own decorators: not the ones that head the file or its class
  private memberDecorators(): BsMemberDecorator[] {
    return this.decorators().map((decorator) => {
      if (!isMemberDecorator(decorator)) {
        this.error(`@${decorator.name} heads the file or its class`);
      }
      return decorator;
    });
  }

  // a field starts with its type or `static`, never a member keyword
  private atFieldStart(): boolean {
    return (
      this.token.kind === "name" &&
      !NOT_FIELD_WORDS.has(this.token.text) &&
      !(this.atWord("static") && this.peek().text === "def")
    );
  }

  private type(): BsType {
    const start = this.token;
    const name = this.expectName().text;
    const args: (BsType | number)[] = [];
    if (this.acceptOp("<")) {
      do {
        if (this.token.kind === "number") {
          args.push(this.next().value);
        } else {
          args.push(this.type());
        }
      } while (this.acceptOp(","));
      this.expectOp(">");
    }
    const count = this.atOp("[") ? this.arrayCount() : undefined;
    return {
      args,
      count,
      name,
      text: this.source.slice(start.start, this.peek(-1).end),
    };
  }

  private arrayCount(): number {
    this.expectOp("[");
    const count = this.expectKind("number").value;
    this.expectOp("]");
    return count;
  }

  private paramList(): string[] {
    this.expectOp("(");
    const params: string[] = [];
    if (!this.atOp(")")) {
      do {
        params.push(this.expectName().text);
      } while (this.acceptOp(","));
    }
    this.expectOp(")");
    return params;
  }

  // ---- statements --------------------------------------------------------

  private atBlockEnd(): boolean {
    const kind = this.token.kind;
    return kind === "dedent" || kind === "eof";
  }

  private suite(): BsStmt[] {
    if (this.token.kind !== "newline") {
      return this.simpleStatements();
    }
    this.skipNewlines();
    this.expectKind("indent");
    const body: BsStmt[] = [];
    while (!this.atBlockEnd()) {
      body.push(...this.statement());
      this.skipNewlines();
    }
    this.next();
    return body;
  }

  // simple statements share a line with `;` between them
  private simpleStatements(): BsStmt[] {
    const statements = [this.simpleStatement()];
    while (this.acceptOp(";")) {
      if (this.token.kind === "newline") {
        break;
      }
      statements.push(this.simpleStatement());
    }
    this.expectKind("newline");
    return statements;
  }

  private statement(): BsStmt[] {
    const start = this.token;
    if (this.atWord("if")) {
      return [this.ifStatement()];
    }
    if (this.atWord("while")) {
      this.next();
      const cond = this.expr();
      this.expectOp(":");
      const body = this.suite();
      return [
        {
          body,
          cond,
          end: this.peek(-1).end,
          kind: "while",
          line: start.line,
          start: start.start,
        },
      ];
    }
    if (this.atWord("for")) {
      this.next();
      const targets = [this.expectName().text];
      while (this.acceptOp(",")) {
        targets.push(this.expectName().text);
      }
      this.expectWord("in");
      const iter = this.expr();
      this.expectOp(":");
      const body = this.suite();
      return [
        {
          body,
          end: this.peek(-1).end,
          iter,
          kind: "for",
          line: start.line,
          start: start.start,
          targets,
        },
      ];
    }
    if (this.atWord("switch")) {
      return [this.switchStatement()];
    }
    return this.simpleStatements();
  }

  private ifStatement(): BsStmt {
    const start = this.token;
    const branches: BsIfBranch[] = [];
    let orelse: BsStmt[] | undefined;
    this.expectWord("if");
    for (;;) {
      const line = this.peek(-1).line;
      const cond = this.expr();
      this.expectOp(":");
      branches.push({ body: this.suite(), cond, line });
      this.skipNewlines();
      if (this.acceptWord("elif")) {
        continue;
      }
      if (this.acceptWord("else")) {
        this.expectOp(":");
        orelse = this.suite();
      }
      break;
    }
    return {
      branches,
      end: this.peek(-1).end,
      kind: "if",
      line: start.line,
      orelse,
      start: start.start,
    };
  }

  private switchStatement(): BsStmt {
    const start = this.next();
    const subject = this.expr();
    this.expectOp(":");
    this.expectKind("newline");
    this.skipNewlines();
    this.expectKind("indent");
    const cases: BsCase[] = [];
    let defaultBody: BsStmt[] | undefined;
    while (!this.atBlockEnd()) {
      const line = this.token.line;
      if (this.acceptWord("case")) {
        const value = this.expr();
        this.expectOp(":");
        cases.push({ body: this.suite(), line, value });
      } else if (this.acceptWord("default")) {
        this.expectOp(":");
        defaultBody = this.suite();
      } else {
        this.error("'case' or 'default' expected");
      }
      this.skipNewlines();
    }
    this.next();
    return {
      cases,
      default: defaultBody,
      end: this.peek(-1).end,
      kind: "switch",
      line: start.line,
      start: start.start,
      subject,
    };
  }

  private simpleStatement(): BsStmt {
    const start = this.token;
    if (this.acceptWord("return")) {
      const values = this.token.kind === "newline" ? [] : this.exprList();
      return {
        end: this.peek(-1).end,
        kind: "return",
        line: start.line,
        start: start.start,
        values,
      };
    }
    if (this.acceptWord("break")) {
      return {
        end: start.end,
        kind: "break",
        line: start.line,
        start: start.start,
      };
    }
    if (this.acceptWord("pass")) {
      return {
        end: start.end,
        kind: "pass",
        line: start.line,
        start: start.start,
      };
    }
    if (this.acceptWord("local")) {
      const names = [this.expectName().text];
      while (this.acceptOp(",")) {
        names.push(this.expectName().text);
      }
      const value = this.acceptOp("=") ? this.expr() : undefined;
      return {
        end: this.peek(-1).end,
        kind: "local",
        line: start.line,
        names,
        start: start.start,
        value,
      };
    }
    const targets = this.exprList();
    if (this.acceptOp("=")) {
      const value = this.expr();
      return {
        end: value.end,
        kind: "assign",
        line: start.line,
        start: start.start,
        targets,
        value,
      };
    }
    if (targets.length !== 1) {
      this.error("'=' expected");
    }
    const expr = targets[0];
    if (expr.kind !== "call") {
      this.error("statement has no effect", start);
    }
    return {
      end: expr.end,
      expr,
      kind: "expr",
      line: start.line,
      start: start.start,
    };
  }

  // ---- expressions -------------------------------------------------------

  private exprList(): BsExpr[] {
    const list = [this.expr()];
    while (this.acceptOp(",")) {
      list.push(this.expr());
    }
    return list;
  }

  expr(): BsExpr {
    return this.orTest();
  }

  private binary(left: BsExpr, op: BsToken, right: BsExpr): BsExpr {
    return {
      end: right.end,
      kind: "binary",
      left,
      line: left.line,
      op: op.text as BsBinaryOp,
      opLine: op.line,
      right,
      start: left.start,
    };
  }

  private orTest(): BsExpr {
    let left = this.andTest();
    while (this.atWord("or")) {
      left = this.binary(left, this.next(), this.andTest());
    }
    return left;
  }

  private andTest(): BsExpr {
    let left = this.notTest();
    while (this.atWord("and")) {
      left = this.binary(left, this.next(), this.notTest());
    }
    return left;
  }

  private notTest(): BsExpr {
    const start = this.token;
    if (this.acceptWord("not")) {
      const operand = this.notTest();
      return {
        end: operand.end,
        kind: "unary",
        line: start.line,
        op: "not",
        operand,
        start: start.start,
      };
    }
    return this.comparison();
  }

  private comparison(): BsExpr {
    const left = this.arith();
    if (this.token.kind === "op" && COMPARISONS.has(this.token.text)) {
      const op = this.next();
      const right = this.arith();
      if (this.token.kind === "op" && COMPARISONS.has(this.token.text)) {
        this.error("chained comparisons are not supported");
      }
      return this.binary(left, op, right);
    }
    return left;
  }

  private arith(): BsExpr {
    let left = this.term();
    while (this.atOp("+") || this.atOp("-")) {
      left = this.binary(left, this.next(), this.term());
    }
    return left;
  }

  private term(): BsExpr {
    let left = this.factor();
    while (this.token.kind === "op" && TERM_OPERATORS.has(this.token.text)) {
      left = this.binary(left, this.next(), this.factor());
    }
    return left;
  }

  private factor(): BsExpr {
    const start = this.token;
    if (this.acceptOp("-")) {
      const operand = this.factor();
      return {
        end: operand.end,
        kind: "unary",
        line: start.line,
        op: "-",
        operand,
        start: start.start,
      };
    }
    if (this.acceptOp("+")) {
      return this.factor();
    }
    return this.power();
  }

  private power(): BsExpr {
    const base = this.postfix();
    if (this.atOp("**")) {
      return this.binary(base, this.next(), this.factor());
    }
    return base;
  }

  private postfix(): BsExpr {
    let expr = this.atom();
    for (;;) {
      if (this.acceptOp(".")) {
        const name = this.expectName();
        expr = {
          end: name.end,
          kind: "attr",
          line: expr.line,
          name: name.text,
          object: expr,
          start: expr.start,
        };
      } else if (this.acceptOp("[")) {
        const index = this.expr();
        const close = this.expectOp("]");
        expr = {
          end: close.end,
          index,
          kind: "index",
          line: expr.line,
          object: expr,
          start: expr.start,
        };
      } else if (this.acceptOp("(")) {
        const args = this.atOp(")") ? [] : this.exprList();
        const close = this.expectOp(")");
        expr = {
          args,
          callee: expr,
          end: close.end,
          kind: "call",
          line: expr.line,
          start: expr.start,
        };
      } else {
        return expr;
      }
    }
  }

  private atom(): BsExpr {
    const token = this.token;
    switch (token.kind) {
      case "number":
        this.next();
        return {
          end: token.end,
          kind: "number",
          line: token.line,
          start: token.start,
          text: token.text,
          value: token.value,
        };
      case "string":
        this.next();
        return {
          end: token.end,
          kind: "string",
          line: token.line,
          start: token.start,
          value: token.text,
        };
      case "name":
        this.next();
        if (token.text === "true" || token.text === "false") {
          return {
            end: token.end,
            kind: "bool",
            line: token.line,
            start: token.start,
            value: token.text === "true",
          };
        }
        if (token.text === "nil") {
          return {
            end: token.end,
            kind: "nil",
            line: token.line,
            start: token.start,
          };
        }
        return {
          end: token.end,
          kind: "name",
          line: token.line,
          name: token.text,
          start: token.start,
        };
      case "op":
        if (token.text === "(") {
          this.next();
          const items = this.exprList();
          const close = this.expectOp(")");
          if (items.length === 1) {
            return items[0];
          }
          return {
            end: close.end,
            items,
            kind: "tuple",
            line: token.line,
            start: token.start,
          };
        }
        if (token.text === "[") {
          this.next();
          const items: BsExpr[] = [];
          while (!this.atOp("]")) {
            items.push(this.expr());
            if (!this.acceptOp(",")) {
              break;
            }
          }
          const close = this.expectOp("]");
          return {
            end: close.end,
            items,
            kind: "list",
            line: token.line,
            start: token.start,
          };
        }
        break;
      default:
        break;
    }
    this.error("expression expected");
  }
}

function describe(token: BsToken): string {
  switch (token.kind) {
    case "name":
    case "op":
    case "number":
      return `'${token.text}'`;
    case "string":
      return `'"${token.text.slice(0, 40)}"'`;
    default:
      return token.kind;
  }
}
