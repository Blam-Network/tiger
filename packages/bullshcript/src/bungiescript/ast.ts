// BungieScript syntax tree. Every node keeps its source line (the line the
// chunk's debug info ends up pointing at) and the byte span of its text.

import type { ActivityStart } from "./activity_start.ts";

export type BsFileKind = "bs" | "es" | "esp" | "esu";

interface BsSpan {
  readonly end: number;
  readonly line: number;
  readonly start: number;
}

export interface BsFile {
  readonly decls: readonly BsDecl[];
  readonly kind: BsFileKind;
  // as given, forward slashes: "es/utility_scripts/kill_squad_objective.esu"
  readonly path: string;
  // the lines holding only decorators (and their comments), ascending: they
  // are left out of the chunk's line numbers (stand_in.ts)
  readonly standInLines: readonly number[];
}

export type BsDeclKind = "class" | "struct" | "enum";

// `@activity_bundle("name")` on an encounter class: the bundle it runs in,
// named, or by hash where the name never cracked.
export interface BsActivityBundle {
  readonly hash: number;
  readonly line: number;
  // as written: the name, or "0x<hash>"
  readonly text: string;
}

// The head decorators that say how an activity starts (@activity and the
// start data after it), gathered; the line is the first one's.
export interface BsActivityStart extends ActivityStart {
  readonly line: number;
}

// `@member_counts(...)` on a squad, or on what holds squads: the bodies each
// member of a squad's definition spawns, by the member's name. Bungie's
// host-only squad hosts authored these; we take them from captures.
//   {dreg: 3, vandal: 1}         a squad: its members by name (or 0x<hash>)
//   {dreg: [2, 1]}               two members both named dreg, in order
//   [{thrall: 2}, {}]            an array of squads, by index
//   {_squad: [{dreg: 2}]}        an archetype instance: its members by name
export type BsCountsValue =
  | { readonly kind: "count"; readonly line: number; readonly value: number }
  | {
      readonly items: readonly BsCountsValue[];
      readonly kind: "list";
      readonly line: number;
    }
  | {
      readonly entries: readonly BsCountsEntry[];
      readonly kind: "map";
      readonly line: number;
    };

export interface BsCountsEntry {
  // a name's fnv1, or the 0x<hash> as written
  readonly hash: number;
  // as written: a name or "0x<hash>"
  readonly key: string;
  readonly line: number;
  readonly value: BsCountsValue;
}

export interface BsMemberCounts {
  readonly line: number;
  readonly value: BsCountsValue;
}

// `@objective(...)`: the Objective a squad is authored against (SquadAuth's
// ref0), by the Objective member's path in the declaring script's scope
// ("obj_plaza_amb1", "phase02.obj_x"). Bungie's squad hosts held it. On what
// holds squads a {member: ...} map reaches them, by the member's name:
//   obj_x                        a squad, or every element of an array of squads
//   {_squad: obj_x}              an archetype instance: its squads
//   {_squad: obj_x, other: {..}} and the instances inside it
export type BsObjectiveValue =
  | { readonly kind: "target"; readonly line: number; readonly path: string }
  | {
      readonly entries: readonly BsObjectiveEntry[];
      readonly kind: "map";
      readonly line: number;
    };

export interface BsObjectiveEntry {
  readonly key: string;
  readonly line: number;
  readonly value: BsObjectiveValue;
}

export interface BsMemberObjective {
  readonly line: number;
  readonly value: BsObjectiveValue;
}

// `@task(name, squad: member, condition: field)` on an Objective: the filter
// and condition of the task `name` (a name, or the 0x<hash> of one that never
// cracked). Both were host-only data of Bungie's Objective host. On an
// archetype instance, `objective:` names the Objective inside it the task is
// of.
export interface BsTask {
  // the bool field on the declaring script
  readonly condition:
    | { readonly line: number; readonly name: string }
    | undefined;
  readonly hash: number;
  readonly line: number;
  // as written: the name or "0x<hash>"
  readonly name: string;
  // the Objective inside an archetype instance
  readonly objective:
    | { readonly line: number; readonly path: string }
    | undefined;
  // the Squad or SquadGroup member the task admits
  readonly squad: { readonly line: number; readonly path: string } | undefined;
}

export interface BsDecl extends BsSpan {
  readonly activityBundle: BsActivityBundle | undefined;
  readonly activityStart: BsActivityStart | undefined;
  readonly base: string | undefined;
  // es-family files declare their one class implicitly
  readonly implicit: boolean;
  readonly kind: BsDeclKind;
  readonly members: readonly BsMember[];
  readonly name: string;
}

// `static_array<T, N>`, `T[N]`, `table<K, V>` or a plain name
export interface BsType {
  readonly args: readonly (BsType | number)[];
  // T[N]'s N
  readonly count: number | undefined;
  readonly name: string;
  readonly text: string;
}

export type BsMember =
  | BsCommandScript
  | BsDelegate
  | BsEnumValue
  | BsField
  | BsImplements
  | BsMethod
  | BsThread;

export interface BsField extends BsSpan {
  readonly bind: readonly BsExpr[] | undefined;
  readonly default: BsExpr | undefined;
  readonly isStatic: boolean;
  readonly kind: "field";
  readonly memberCounts: BsMemberCounts | undefined;
  readonly name: string;
  readonly objective: BsMemberObjective | undefined;
  // `@placed()` on a squad: the line it is written on
  readonly placed: number | undefined;
  // `@task(...)` on an Objective, one per task
  readonly tasks: readonly BsTask[];
  readonly type: BsType;
}

export interface BsThread extends BsSpan {
  readonly body: readonly BsStmt[];
  readonly kind: "thread";
  readonly name: string;
  readonly startup: boolean;
}

export interface BsMethod extends BsSpan {
  readonly body: readonly BsStmt[];
  readonly isStatic: boolean;
  readonly kind: "def";
  readonly name: string;
  // `def member.name()` implements a member's delegate
  readonly owner: string | undefined;
  readonly params: readonly string[];
}

interface BsDelegate extends BsSpan {
  readonly kind: "delegate";
  readonly name: string;
  readonly params: readonly string[];
}

export interface BsCommandScript extends BsSpan {
  readonly body: readonly BsStmt[];
  readonly kind: "command_script";
  readonly name: string;
  readonly params: readonly string[];
}

interface BsImplements extends BsSpan {
  readonly interfaceName: string;
  readonly kind: "implements";
  readonly name: string;
}

export interface BsEnumValue extends BsSpan {
  readonly kind: "enum_value";
  readonly name: string;
  readonly value: number;
}

export type BsStmt =
  | BsAssign
  | BsBreak
  | BsExprStmt
  | BsFor
  | BsIf
  | BsLocal
  | BsPass
  | BsReturn
  | BsSwitch
  | BsWhile;

interface BsExprStmt extends BsSpan {
  readonly expr: BsExpr;
  readonly kind: "expr";
}

interface BsAssign extends BsSpan {
  readonly kind: "assign";
  readonly targets: readonly BsExpr[];
  readonly value: BsExpr;
}

// `local x[, y] [= e]`: a new local even where the name is a member's
interface BsLocal extends BsSpan {
  readonly kind: "local";
  readonly names: readonly string[];
  readonly value: BsExpr | undefined;
}

export interface BsIfBranch {
  readonly body: readonly BsStmt[];
  readonly cond: BsExpr;
  readonly line: number;
}

export interface BsIf extends BsSpan {
  readonly branches: readonly BsIfBranch[];
  readonly kind: "if";
  readonly orelse: readonly BsStmt[] | undefined;
}

interface BsWhile extends BsSpan {
  readonly body: readonly BsStmt[];
  readonly cond: BsExpr;
  readonly kind: "while";
}

interface BsFor extends BsSpan {
  readonly body: readonly BsStmt[];
  readonly iter: BsExpr;
  readonly kind: "for";
  readonly targets: readonly string[];
}

export interface BsCase {
  readonly body: readonly BsStmt[];
  readonly line: number;
  readonly value: BsExpr;
}

export interface BsSwitch extends BsSpan {
  readonly cases: readonly BsCase[];
  readonly default: readonly BsStmt[] | undefined;
  readonly kind: "switch";
  readonly subject: BsExpr;
}

interface BsReturn extends BsSpan {
  readonly kind: "return";
  readonly values: readonly BsExpr[];
}

interface BsBreak extends BsSpan {
  readonly kind: "break";
}

interface BsPass extends BsSpan {
  readonly kind: "pass";
}

export type BsExpr =
  | BsAttr
  | BsBinary
  | BsBool
  | BsCall
  | BsIndex
  | BsList
  | BsName
  | BsNil
  | BsNumber
  | BsString
  | BsTuple
  | BsUnary;

interface BsName extends BsSpan {
  readonly kind: "name";
  readonly name: string;
}

interface BsNumber extends BsSpan {
  readonly kind: "number";
  // as written; Lua's reader rounds it the same way
  readonly text: string;
  readonly value: number;
}

interface BsString extends BsSpan {
  readonly kind: "string";
  // decoded bytes
  readonly value: string;
}

interface BsBool extends BsSpan {
  readonly kind: "bool";
  readonly value: boolean;
}

interface BsNil extends BsSpan {
  readonly kind: "nil";
}

interface BsAttr extends BsSpan {
  readonly kind: "attr";
  readonly name: string;
  readonly object: BsExpr;
}

interface BsIndex extends BsSpan {
  readonly index: BsExpr;
  readonly kind: "index";
  readonly object: BsExpr;
}

// `[a, b, c]`: a Python-style list, indexed from 0 like the host's arrays
export interface BsList extends BsSpan {
  readonly items: readonly BsExpr[];
  readonly kind: "list";
}

export interface BsCall extends BsSpan {
  readonly args: readonly BsExpr[];
  readonly callee: BsExpr;
  readonly kind: "call";
}

export type BsBinaryOp =
  | "!="
  | "%"
  | "*"
  | "**"
  | "+"
  | "-"
  | "/"
  | "<"
  | "<="
  | "=="
  | ">"
  | ">="
  | "and"
  | "or";

interface BsBinary extends BsSpan {
  readonly kind: "binary";
  readonly left: BsExpr;
  readonly op: BsBinaryOp;
  // the operator token's line: a condition may continue on the next line
  readonly opLine: number;
  readonly right: BsExpr;
}

type BsUnaryOp = "-" | "not";

interface BsUnary extends BsSpan {
  readonly kind: "unary";
  readonly op: BsUnaryOp;
  readonly operand: BsExpr;
}

// `(x, y, z)`: a vector constant in a member default
interface BsTuple extends BsSpan {
  readonly items: readonly BsExpr[];
  readonly kind: "tuple";
}
