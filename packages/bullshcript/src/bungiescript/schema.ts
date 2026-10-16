// The declaration half of a decl: its members in order, with the kind, type,
// side, default and flags the definition and instance schemas carry.

import { fnv1, parseHashLiteral } from "../host/tags/name_hash.ts";
import type { BsDecl, BsExpr, BsField, BsType } from "./ast.ts";
import { type BsNativeKind, nativeTypeNamed } from "./native_types.ts";
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

export interface BsSchemaMember {
  readonly autostart?: boolean;
  readonly default?: BsSchemaDefault;
  readonly kind: BsSchemaMemberKind;
  readonly line: number;
  // the Lua method a def, thread or command script compiles to
  readonly luaName?: string;
  readonly name: string;
  readonly params?: readonly string[];
  readonly side: BsSchemaSide;
  // the type as written ("c_squad_sensor_host", "static_array<c_device_host, 10>")
  readonly type: string;
  readonly value?: number;
}

export interface BsSchema {
  // an encounter class's bundle (@activity_bundle), the hash Bungie's bundle
  // build stamped as the host's activity_bundle_name
  readonly activityBundleName?: number;
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
        members.push(fieldMember(member, project));
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
  return {
    ...(bundle === undefined ? {} : { activityBundleName: bundle.hash }),
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

function fieldMember(field: BsField, project: Project): BsSchemaMember {
  const kind = fieldKind(field.type, project);
  return {
    default:
      field.default === undefined ? undefined : defaultOf(field.default, kind),
    kind,
    line: field.line,
    name: field.name,
    side: fieldSide(field, kind, project),
    type: field.type.text,
  };
}

// Statics are definition data.
function fieldSide(
  field: BsField,
  kind: BsSchemaMemberKind,
  project: Project
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
  const elementKind = fieldKind(
    { args: [], count: undefined, name: element, text: element },
    project
  );
  return elementKind === "object" || elementKind === "class_instance"
    ? "both"
    : "instance";
}

function fieldKind(type: BsType, project: Project): BsSchemaMemberKind {
  if (type.count !== undefined) {
    return "c_array";
  }
  const scalar = SCALARS[type.name];
  if (scalar !== undefined) {
    return scalar;
  }
  const container = CONTAINERS[type.name];
  if (container !== undefined) {
    return container;
  }
  // a type the project or the registry knows: a script class, a struct or
  // an enum; then the native registry; anything else is a native object
  switch (project.typeNamed(type.name)?.kind) {
    case "class":
      return "class_instance";
    case "schema":
      return type.name.startsWith("i_") ? "interface" : "struct";
    case "enum":
      return "enum_field";
    default:
      break;
  }
  const native = nativeTypeNamed(type.name);
  return native === undefined ? "object" : NATIVE_KINDS[native.kind];
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
