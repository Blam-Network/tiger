// The declaration half of a decl: its members in order, with the kind, type,
// side, default and flags the definition and instance schemas carry.

import { fnv1, parseHashLiteral } from "../host/tags/name_hash.ts";
import { type ActivityStart, authoredActivityStart } from "./activity_start.ts";
import type {
  BsCountsValue,
  BsDecl,
  BsExpr,
  BsField,
  BsMember,
  BsObjectiveValue,
  BsTask,
  BsType,
} from "./ast.ts";
import { BsCompileError } from "./lexer.ts";
import {
  type BsNativeKind,
  nativeTypeNamed,
  nativeTypeSpelled,
} from "./native_types.ts";
import { bundleHashOf, scriptStem } from "./parser.ts";
import {
  DEFAULT_NATIVE_BASE,
  isEsFamily,
  type Project,
  type ProjectDecl,
} from "./project.ts";

export type BsSchemaSide = "both" | "definition" | "instance";

export type BsSchemaMemberKind =
  | "bool"
  | "c_array"
  | "class_instance"
  | "command_script"
  | "delegate"
  | "dynamic_array"
  | "enum_field"
  | "enum_value"
  | "flags"
  | "handle"
  | "implements"
  | "int"
  | "interface"
  | "method"
  | "object"
  | "pointer"
  | "real"
  | "short"
  | "static_array"
  | "static_stack"
  | "string"
  | "string_hash"
  | "struct"
  | "table"
  | "tag_reference"
  | "thread"
  | "typed_pointer"
  | "vector2d"
  | "vector3d"
  | "vector4";

export type BsSchemaDefault =
  | { readonly kind: "bool"; readonly value: boolean }
  | { readonly kind: "enum"; readonly member: string; readonly type: string }
  | { readonly kind: "number"; readonly value: number }
  // a string_hash default is stored hashed; `hash` is its FNV-1
  | { readonly kind: "string"; readonly hash: number; readonly value: string }
  | { readonly kind: "vector"; readonly values: readonly number[] };

// One squad's bodies per definition member (@member_counts): the squad the
// member is, or the one `path` names inside it ("_squad[0]", "[1]").
export interface BsSchemaMemberCounts {
  readonly members: readonly BsSchemaSquadMemberCounts[];
  readonly path?: string;
}

// The members of a squad's definition named `key` (fnv1 `hash`), in order.
export interface BsSchemaSquadMemberCounts {
  readonly counts: readonly number[];
  readonly hash: number;
  readonly key: string;
}

// Where a squad is authored against an Objective (@objective). `target` is
// the Objective member's path in the declaring script's scope; `path` names
// the squad inside the member ("_squad", "[]._squad"), where `[]` stands for
// every element of an array. Not Bungie's: their squad hosts held the ref.
export interface BsSchemaObjective {
  readonly path?: string;
  readonly target: string;
}

// An Objective's task, by the hash of its name, with what its host held that
// release dropped (@task): the Squad or SquadGroup member it admits (a path
// in the declaring script's scope) and the bool field gating it. `path`
// names the Objective inside the member when that is an archetype instance.
export interface BsSchemaTask {
  readonly condition?: string;
  readonly hash: number;
  readonly name: string;
  readonly path?: string;
  readonly squad?: string;
}

export interface BsSchemaMember {
  readonly autostart?: boolean;
  readonly default?: BsSchemaDefault;
  readonly kind: BsSchemaMemberKind;
  readonly line: number;
  // the Lua method a def, thread or command script compiles to
  readonly luaName?: string;
  // not Bungie's: their host-only squad hosts held these
  readonly memberCounts?: readonly BsSchemaMemberCounts[];
  readonly name: string;
  readonly objective?: readonly BsSchemaObjective[];
  readonly params?: readonly string[];
  // a squad that starts placed (@placed): not Bungie's either, the
  // host-only flag (+0x54) on their squad hosts
  readonly placed?: boolean;
  readonly side: BsSchemaSide;
  // not Bungie's either: their Objective hosts held these
  readonly tasks?: readonly BsSchemaTask[];
  // the type as written ("squad", "static_array<device, 10>")
  readonly type: string;
  readonly value?: number;
}

export interface BsSchema {
  // an encounter class's bundle (@activity_bundle), the hash Bungie's bundle
  // build stamped as the host's activity_bundle_name
  readonly activityBundleName?: number;
  // an encounter class's start (@activity and the decorators below it); not
  // Bungie's: their host-only scenario tags held it
  readonly activityStart?: ActivityStart;
  // a phase's @hard_wipe: a hard wipe is armed while it runs; not Bungie's
  // either, their host-only phase data held it
  readonly hardWipe?: boolean;
  readonly kind: BsDecl["kind"];
  readonly members: readonly BsSchemaMember[];
  readonly modulePath: string;
  readonly name: string;
  // the definition's name hash as bsc wrote it; absent when the native base
  // has no name
  readonly nameHash?: number;
  // the declared base, else the native base the file kind picks
  readonly parent: string;
}

const SCALARS: Readonly<Record<string, BsSchemaMemberKind>> = {
  bool: "bool",
  int: "int",
  real: "real",
  short: "short",
  string: "string",
  string_hash: "string_hash",
  vector2d: "vector2d",
  vector3d: "vector3d",
  vector4: "vector4",
};

const NATIVE_KINDS: Readonly<Record<BsNativeKind, BsSchemaMemberKind>> = {
  c_array: "c_array",
  delegate: "delegate",
  dynamic_array: "dynamic_array",
  enum: "enum_field",
  flags: "flags",
  handle: "handle",
  implements: "implements",
  interface: "interface",
  object: "object",
  pointer: "pointer",
  static_array: "static_array",
  static_stack: "static_stack",
  struct: "struct",
  tag_reference: "tag_reference",
  thread: "thread",
  typed_pointer: "typed_pointer",
};

const CONTAINERS: Readonly<Record<string, BsSchemaMemberKind>> = {
  dynamic_array: "dynamic_array",
  static_array: "static_array",
  static_stack: "static_stack",
  table: "table",
};

// the hidden command-script builder every class with a cs_* gets
const COMMAND_SCRIPT_BUILDER = "__cs";

export function emitSchema(
  decl: ProjectDecl,
  project: Project,
  luaNames: ReadonlyMap<string, string>
): BsSchema {
  const members: BsSchemaMember[] = [];
  let hasCommandScript = false;
  for (const member of decl.decl.members) {
    switch (member.kind) {
      case "field":
        members.push(fieldMember(member, project, decl));
        break;
      case "thread":
        members.push({
          autostart: member.startup,
          kind: "thread",
          line: member.line,
          luaName: luaNames.get(member.name),
          name: member.name,
          side: "both",
          type: "thread",
        });
        break;
      case "def":
        members.push({
          kind: "method",
          line: member.line,
          luaName: luaNames.get(methodKey(member.owner, member.name)),
          name:
            member.owner === undefined
              ? member.name
              : `${member.owner}.${member.name}`,
          params: member.params,
          side: member.isStatic ? "definition" : "instance",
          type: "method",
        });
        break;
      case "delegate":
        members.push({
          kind: "delegate",
          line: member.line,
          name: member.name,
          params: member.params,
          side: "instance",
          type: "delegate",
        });
        break;
      case "command_script":
        hasCommandScript = true;
        members.push({
          kind: "command_script",
          line: member.line,
          luaName: member.name,
          name: member.name,
          params: member.params,
          side: "instance",
          type: "command_script",
        });
        break;
      case "implements":
        // the record is definition data; the implementing methods are the
        // instance's
        members.push({
          kind: "implements",
          line: member.line,
          name: member.name,
          side: "definition",
          type: member.interfaceName,
        });
        break;
      case "enum_value":
        members.push({
          kind: "enum_value",
          line: member.line,
          name: member.name,
          side: "definition",
          type: decl.name,
          value: member.value,
        });
        break;
      default:
        break;
    }
  }
  if (hasCommandScript) {
    // true name of the builder's type unknown
    members.push({
      kind: "object",
      line: decl.decl.line,
      name: COMMAND_SCRIPT_BUILDER,
      side: "both",
      type: "c_command_script",
    });
  }
  const nameHash = definitionNameHash(decl, project);
  const bundle = decl.decl.activityBundle;
  const start = decl.decl.activityStart;
  return {
    ...(bundle === undefined ? {} : { activityBundleName: bundle.hash }),
    ...(start === undefined
      ? {}
      : { activityStart: authoredActivityStart(start) }),
    ...(decl.decl.hardWipe ? { hardWipe: true } : {}),
    kind: decl.decl.kind,
    members,
    modulePath: decl.modulePath,
    name: decl.name,
    ...(nameHash === undefined ? {} : { nameHash }),
    parent: decl.baseName ?? DEFAULT_NATIVE_BASE[decl.file.kind],
  };
}

// An es-family class is known by its file stem, encounters included, and bsc
// wrote that into the definition; a .bs class's name is left empty for the
// bundle build to fill.
function definitionNameHash(
  decl: ProjectDecl,
  project: Project
): number | undefined {
  if (
    decl.decl.kind !== "class" ||
    !project.nativeBase(decl)?.members.includes("name")
  ) {
    return;
  }
  return isEsFamily(decl.file.kind)
    ? bundleHashOf(scriptStem(decl.file.path))
    : fnv1("");
}

// the key luaNames is filed under for a def
export function methodKey(owner: string | undefined, name: string): string {
  return owner === undefined ? name : `${owner}.${name}`;
}

// one step of a member path: a name or an [index]
const PATH_STEP = /[A-Za-z_]\w*|\[\d+\]/g;

const SQUAD_TYPE = "squad";
const SQUAD_GROUP_TYPE = "squad_group";
const OBJECTIVE_TYPE = "objective";
const ARRAY_TYPES = new Set(["dynamic_array", "static_array", "static_stack"]);

// @member_counts against the member's type: a squad takes a {member: count}
// map, an array of them a list by index, a script class a map of its own
// members. Each squad it reaches is one entry, `path` naming it.
// an array's element type: T of static_array<T, N> or dynamic_array<T>, T
// of T[N]
function arrayElement(type: BsType): BsType | undefined {
  if (type.count !== undefined) {
    return { args: [], count: undefined, name: type.name, text: type.name };
  }
  const [arg] = type.args;
  return ARRAY_TYPES.has(type.name) && typeof arg !== "number"
    ? arg
    : undefined;
}

function squadCounts(
  value: BsCountsValue,
  type: BsType,
  path: string,
  where: string,
  project: Project,
  file: string
): BsSchemaMemberCounts[] {
  const fail = (why: string): never => {
    throw new BsCompileError(
      `@member_counts on ${where}: ${why}`,
      file,
      value.line
    );
  };
  const element = arrayElement(type);
  if (type.text === SQUAD_TYPE) {
    if (value.kind !== "map") {
      return fail("a squad takes {member: count, ...}");
    }
    const members = value.entries.map(({ hash, key, value: count }) => {
      const counts =
        count.kind === "list"
          ? count.items.map((item) =>
              item.kind === "count"
                ? item.value
                : fail(`'${key}' takes a count or a list of counts`)
            )
          : [
              count.kind === "count"
                ? count.value
                : fail(`'${key}' takes a count`),
            ];
      return { counts, hash, key };
    });
    return [path === "" ? { members } : { members, path }];
  }
  if (element !== undefined) {
    if (value.kind !== "list") {
      return fail("an array takes [..., ...] by index");
    }
    return value.items.flatMap((item, index) =>
      item.kind === "map" && item.entries.length === 0
        ? []
        : squadCounts(
            item,
            element,
            `${path}[${index}]`,
            `${where}[${index}]`,
            project,
            file
          )
    );
  }
  const decl = project.declNamed(type.name);
  if (decl === undefined || decl.decl.kind !== "class") {
    return fail(`a ${type.text} holds no squads`);
  }
  if (value.kind !== "map") {
    return fail(`a ${type.text} takes {member: ..., ...} of its squads`);
  }
  return value.entries.flatMap(({ key, value: inner }) => {
    const member = project
      .chain(decl)
      .map((owner) => owner.members.get(key))
      .find((found) => found !== undefined);
    if (member?.kind !== "field") {
      return fail(`${type.text} has no member '${key}'`);
    }
    return squadCounts(
      inner,
      member.type,
      path === "" ? key : `${path}.${key}`,
      `${where}.${key}`,
      project,
      file
    );
  });
}

// The type of the member a path names from a script ("obj_x",
// "phase02.obj_x", "inst._squad[0]"): through the members of the script and
// its bases, and of the class each step holds.
function memberTypeAt(
  project: Project,
  owner: ProjectDecl,
  path: string
): string | undefined {
  let decl: ProjectDecl | undefined = owner;
  let type: BsType | undefined;
  for (const [step] of path.matchAll(PATH_STEP)) {
    if (step.startsWith("[")) {
      type = type && arrayElement(type);
    } else {
      if (type !== undefined) {
        decl = project.declNamed(type.name);
      }
      const found: BsMember | undefined = decl
        ? project
            .chain(decl)
            .map((link) => link.members.get(step))
            .find((member) => member !== undefined)
        : undefined;
      type = found?.kind === "field" ? found.type : undefined;
    }
    if (type === undefined) {
      return;
    }
  }
  return type?.text;
}

// @objective against the member's type: a squad (or an array of them) takes
// an Objective, a script class a {member: ...} map of its squads. Each squad
// it reaches is one entry.
function objectiveTargets(
  value: BsObjectiveValue,
  type: BsType,
  path: string,
  where: string,
  owner: ProjectDecl,
  project: Project,
  file: string
): BsSchemaObjective[] {
  const fail = (why: string): never => {
    throw new BsCompileError(
      `@objective on ${where}: ${why}`,
      file,
      value.line
    );
  };
  const element = arrayElement(type);
  if (type.text === SQUAD_TYPE || element?.text === SQUAD_TYPE) {
    if (value.kind !== "target") {
      return fail("a squad takes the Objective it is against");
    }
    const found = memberTypeAt(project, owner, value.path);
    if (found === undefined) {
      return fail(`${owner.name} has no member '${value.path}'`);
    }
    if (found !== OBJECTIVE_TYPE) {
      return fail(`'${value.path}' is a ${found}, not an Objective`);
    }
    const at = element === undefined ? path : `${path}[]`;
    return [
      at === "" ? { target: value.path } : { path: at, target: value.path },
    ];
  }
  if (element !== undefined) {
    return objectiveTargets(
      value,
      element,
      `${path}[]`,
      `${where}[]`,
      owner,
      project,
      file
    );
  }
  const decl = project.declNamed(type.name);
  if (decl === undefined || decl.decl.kind !== "class") {
    return fail(`a ${type.text} holds no squads`);
  }
  if (value.kind !== "map") {
    return fail(`a ${type.text} takes {member: ..., ...} of its squads`);
  }
  return value.entries.flatMap(({ key, value: inner }) => {
    const member = project
      .chain(decl)
      .map((link) => link.members.get(key))
      .find((found) => found !== undefined);
    if (member?.kind !== "field") {
      return fail(`${type.text} has no member '${key}'`);
    }
    return objectiveTargets(
      inner,
      member.type,
      path === "" ? key : `${path}.${key}`,
      `${where}.${key}`,
      owner,
      project,
      file
    );
  });
}

// @task on an Objective: the squad is a Squad or SquadGroup member, the
// condition a bool field of the script.
function taskSchemas(
  field: BsField,
  owner: ProjectDecl,
  project: Project,
  file: string
): BsSchemaTask[] {
  const fail = (why: string, line: number): never => {
    throw new BsCompileError(`@task on ${field.name}: ${why}`, file, line);
  };
  const instance = project.declNamed(field.type.name);
  const isInstance =
    instance?.decl.kind === "class" && field.type.count === undefined;
  if (field.type.text !== OBJECTIVE_TYPE && !isInstance) {
    fail(`a ${field.type.text} is no Objective`, field.tasks[0].line);
  }
  return field.tasks.map((task: BsTask) => {
    if (field.type.text === OBJECTIVE_TYPE && task.objective !== undefined) {
      fail("an Objective has no Objective inside it", task.objective.line);
    }
    if (field.type.text !== OBJECTIVE_TYPE) {
      const found =
        task.objective === undefined || instance === undefined
          ? undefined
          : memberTypeAt(project, instance, task.objective.path);
      if (found !== OBJECTIVE_TYPE) {
        fail(
          task.objective === undefined
            ? `a ${field.type.text} takes objective: the Objective inside it`
            : `'${task.objective.path}' is not an Objective of ${field.type.text}`,
          task.objective?.line ?? task.line
        );
      }
    }
    if (task.squad !== undefined) {
      const found = memberTypeAt(project, owner, task.squad.path);
      if (found !== SQUAD_TYPE && found !== SQUAD_GROUP_TYPE) {
        fail(
          found === undefined
            ? `${owner.name} has no member '${task.squad.path}'`
            : `'${task.squad.path}' is a ${found}, not a squad or squad group`,
          task.squad.line
        );
      }
    }
    if (task.condition !== undefined) {
      const found = memberTypeAt(project, owner, task.condition.name);
      if (found !== "bool") {
        fail(
          found === undefined
            ? `${owner.name} has no member '${task.condition.name}'`
            : `'${task.condition.name}' is a ${found}, not a bool`,
          task.condition.line
        );
      }
    }
    return {
      ...(task.condition === undefined
        ? {}
        : { condition: task.condition.name }),
      hash: task.hash,
      name: task.name,
      ...(task.objective === undefined ? {} : { path: task.objective.path }),
      ...(task.squad === undefined ? {} : { squad: task.squad.path }),
    };
  });
}

function fieldMember(
  field: BsField,
  project: Project,
  owner: ProjectDecl
): BsSchemaMember {
  const path = owner.file.path;
  const kind = fieldKind(field.type, project, path, field.line);
  return {
    default:
      field.default === undefined ? undefined : defaultOf(field.default, kind),
    kind,
    line: field.line,
    ...(field.memberCounts === undefined
      ? {}
      : {
          memberCounts: squadCounts(
            field.memberCounts.value,
            field.type,
            "",
            field.name,
            project,
            path
          ),
        }),
    name: field.name,
    ...(field.objective === undefined
      ? {}
      : {
          objective: objectiveTargets(
            field.objective.value,
            field.type,
            "",
            field.name,
            owner,
            project,
            path
          ),
        }),
    ...(field.placed === undefined ? {} : { placed: squadPlaced(field, path) }),
    side: fieldSide(field, kind, project, path),
    ...(field.tasks.length === 0
      ? {}
      : { tasks: taskSchemas(field, owner, project, path) }),
    type: field.type.text,
  };
}

// @placed stands on a squad host, nothing else.
function squadPlaced(field: BsField, file: string): true {
  if (field.type.text !== SQUAD_TYPE) {
    throw new BsCompileError(
      `@placed on ${field.name}: a ${field.type.text} is no squad`,
      file,
      field.placed ?? field.line
    );
  }
  return true;
}

// Statics are definition data.
function fieldSide(
  field: BsField,
  kind: BsSchemaMemberKind,
  project: Project,
  file: string
): BsSchemaSide {
  if (field.isStatic) {
    return "definition";
  }
  if (kind === "object" || kind === "class_instance") {
    return "both";
  }
  const element =
    field.type.count === undefined
      ? field.type.args.find((arg) => typeof arg !== "number")?.name
      : field.type.name;
  if (element === undefined) {
    return "instance";
  }
  const elementKind = nameKind(element, project, file, field.line);
  return elementKind === "object" || elementKind === "class_instance"
    ? "both"
    : "instance";
}

// A type as written names something: a scalar, a container, a script class,
// struct or enum (the project's or the registry's), or a native spelling, and
// so do the types inside a container or array.
function fieldKind(
  type: BsType,
  project: Project,
  file: string,
  line: number
): BsSchemaMemberKind {
  const kind = nameKind(type.name, project, file, line);
  for (const arg of type.args) {
    if (typeof arg !== "number") {
      fieldKind(arg, project, file, line);
    }
  }
  return type.count === undefined ? kind : "c_array";
}

function nameKind(
  name: string,
  project: Project,
  file: string,
  line: number
): BsSchemaMemberKind {
  const scalar = SCALARS[name];
  if (scalar !== undefined) {
    return scalar;
  }
  const container = CONTAINERS[name];
  if (container !== undefined) {
    return container;
  }
  // the project's and the registry's types, then the native spellings
  switch (project.typeNamed(name)?.kind) {
    case "class":
      return "class_instance";
    case "schema":
      return name.startsWith("i_") ? "interface" : "struct";
    case "enum":
      return "enum_field";
    default:
      break;
  }
  const native = nativeTypeSpelled(name);
  if (native === undefined) {
    // an engine class name is no spelling; say the one a script writes
    const spelling = nativeTypeNamed(name)?.spelling;
    throw new BsCompileError(
      `unknown type '${name}'${spelling === undefined ? "" : `; a script writes '${spelling}'`}`,
      file,
      line
    );
  }
  return NATIVE_KINDS[native.kind];
}

function defaultOf(
  expr: BsExpr,
  kind: BsSchemaMemberKind
): BsSchemaDefault | undefined {
  switch (expr.kind) {
    case "number":
      if (kind === "string_hash") {
        // a hash with no known name, spelled out: string_hash x = 0x324E9A20
        const hash = parseHashLiteral(expr.text) ?? expr.value >>> 0;
        return { hash, kind: "string", value: expr.text };
      }
      return { kind: "number", value: expr.value };
    case "unary":
      return expr.op === "-" && expr.operand.kind === "number"
        ? { kind: "number", value: -expr.operand.value }
        : undefined;
    case "bool":
      return { kind: "bool", value: expr.value };
    case "string":
      return {
        hash: kind === "string_hash" ? fnv1(expr.value) : 0,
        kind: "string",
        value: expr.value,
      };
    case "tuple": {
      const values: number[] = [];
      for (const item of expr.items) {
        const value = defaultOf(item, "real");
        if (value?.kind !== "number") {
          return;
        }
        values.push(value.value);
      }
      return { kind: "vector", values };
    }
    case "attr":
      return expr.object.kind === "name"
        ? { kind: "enum", member: expr.name, type: expr.object.name }
        : undefined;
    default:
      return;
  }
}
