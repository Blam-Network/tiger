// What a compiled host chunk says about itself, read from its instruction
// stream rather than from a table we maintain by hand.

import { HKS_OPCODES, walkInstructions } from "../bytecode/opcodes.ts";
import type { HksBytecode, Method } from "../bytecode/proto.ts";

const OP_GETFIELD = 0;
const OP_SELF = 8;
// GETFIELD_R1, the chained-read form (`self.left_switch_pillar.succeed`).
const OP_FIELD_CHAIN = 73;
const OP_CALL = 2;
const OP_GETTABLE = 10;
const OP_SETTABLE_REGISTER_KEY = 16;
const OP_SETTABLE_CONSTANT_KEY = 17;
const OP_GETGLOBAL = 91;
// SELF keeps vanilla's 9-bit RK slot on C: >= 256 means constant C - 256.
const RK_CONSTANT_BIAS = 256;

const IMPORT_ONLY_BIND = "import_only_bind";
const EXECUTE_IMPL_SUFFIX = "_d_execute_impl";

function stringConstant(prototype: Method, index: number): string | undefined {
  const constant = prototype.constants[index];
  return constant?.kind === "string" ? constant.value : undefined;
}

function* allPrototypes(prototype: Method): Generator<Method> {
  yield prototype;
  for (const child of prototype.protos) {
    yield* allPrototypes(child);
  }
}

// Every global a chunk reads, with its GETGLOBAL site count (the scripts never write one).
export function globalReads(chunk: HksBytecode): Map<string, number> {
  const reads = new Map<string, number>();
  for (const prototype of allPrototypes(chunk.root)) {
    for (const { instruction } of walkInstructions(prototype)) {
      if (instruction.opcode !== OP_GETGLOBAL) {
        continue;
      }
      const name = stringConstant(prototype, instruction.bx);
      if (name !== undefined) {
        reads.set(name, (reads.get(name) ?? 0) + 1);
      }
    }
  }
  return reads;
}

export function chunkStringConstants(chunk: HksBytecode): Set<string> {
  const strings = new Set<string>();
  for (const prototype of allPrototypes(chunk.root)) {
    for (const constant of prototype.constants) {
      if (constant.kind === "string") {
        strings.add(constant.value);
      }
    }
  }
  return strings;
}

// `self` fields the chunk binds with import_only_bind, in source order.
export function importSlotNames(chunk: HksBytecode): string[] {
  const slots: string[] = [];
  for (const prototype of allPrototypes(chunk.root)) {
    // register -> the self field last loaded into it, until the register is next
    // written by anything but that GETFIELD.
    const fields = new Map<number, string>();
    for (const { instruction } of walkInstructions(prototype)) {
      const { a, b, c, opcode } = instruction;
      if (opcode === OP_GETFIELD) {
        // only `self`, which is always the first parameter
        const name = b === 0 ? stringConstant(prototype, c) : undefined;
        if (name === undefined) {
          fields.delete(a);
        } else {
          fields.set(a, name);
        }
        continue;
      }
      if (opcode === OP_SELF) {
        const receiver = fields.get(b);
        if (
          receiver !== undefined &&
          c >= RK_CONSTANT_BIAS &&
          stringConstant(prototype, c - RK_CONSTANT_BIAS) ===
            IMPORT_ONLY_BIND &&
          !slots.includes(receiver)
        ) {
          slots.push(receiver);
        }
      }
      // Any other write to a register invalidates whatever name it carried -
      // GETTABLE, CALL results, SELF's own A, and so on.
      if (HKS_OPCODES.get(opcode)?.writesA) {
        fields.delete(a);
      }
    }
  }
  return slots;
}

// `self.<field>[i]:import_only_bind(...)`: an array of import slots, or an
// authored family (`zones[i]`); a caller tells them apart by resolving `<field>[0]`.
export function arrayImportSlotNames(chunk: HksBytecode): string[] {
  const slots: string[] = [];
  for (const prototype of allPrototypes(chunk.root)) {
    const fields = new Map<number, string>();
    // register -> that field's name, once a GETTABLE has indexed it.
    const arrayFields = new Map<number, string>();
    for (const { instruction } of walkInstructions(prototype)) {
      const { a, b, c, opcode } = instruction;
      if (opcode === OP_GETFIELD) {
        const name = b === 0 ? stringConstant(prototype, c) : undefined;
        if (name === undefined) {
          fields.delete(a);
        } else {
          fields.set(a, name);
        }
        arrayFields.delete(a);
        continue;
      }
      if (opcode === OP_GETTABLE) {
        const name = fields.get(b);
        if (name === undefined) {
          arrayFields.delete(a);
        } else {
          arrayFields.set(a, name);
        }
        fields.delete(a);
        continue;
      }
      if (opcode === OP_SELF) {
        const receiver = arrayFields.get(b);
        if (
          receiver !== undefined &&
          c >= RK_CONSTANT_BIAS &&
          stringConstant(prototype, c - RK_CONSTANT_BIAS) ===
            IMPORT_ONLY_BIND &&
          !slots.includes(receiver)
        ) {
          slots.push(receiver);
        }
      }
      if (HKS_OPCODES.get(opcode)?.writesA) {
        fields.delete(a);
        arrayFields.delete(a);
      }
    }
  }
  return slots;
}

// Field names the script treats as a handle: it calls a method on them, or
// passes them to one.
export function handleFieldNames(chunk: HksBytecode): Set<string> {
  const handles = new Set<string>();
  for (const prototype of allPrototypes(chunk.root)) {
    const fields = new Map<number, string>();
    for (const { instruction } of walkInstructions(prototype)) {
      const { a, b, c, opcode } = instruction;
      if (opcode === OP_GETFIELD || opcode === OP_FIELD_CHAIN) {
        const name = stringConstant(prototype, c);
        if (name === undefined) {
          fields.delete(a);
        } else {
          fields.set(a, name);
        }
        continue;
      }
      if (opcode === OP_SELF) {
        const receiver = fields.get(b);
        if (receiver !== undefined) {
          handles.add(receiver);
        }
        // SELF writes the receiver and the method into A and A+1.
        fields.delete(a);
        fields.delete(a + 1);
        continue;
      }
      if (opcode === OP_CALL) {
        // R(A+1)..R(A+B-1) are the arguments; B = 0 is "to the top of the
        // stack", which the corpus only uses for a MULTRET forward.
        const last = b > 0 ? a + b - 1 : prototype.maxStackSize;
        for (let reg = a + 1; reg <= last; reg++) {
          const name = fields.get(reg);
          if (name !== undefined) {
            handles.add(name);
          }
        }
      }
      // Any other write to a register invalidates whatever name it carried -
      // the same rule fieldMethodCalls applies.
      if (HKS_OPCODES.get(opcode)?.writesA) {
        fields.delete(a);
      }
    }
  }
  return handles;
}

// Method names called directly on a self field (SELF's RK(C)), keyed by field.
export function fieldMethodCalls(chunk: HksBytecode): Map<string, Set<string>> {
  const calls = new Map<string, Set<string>>();
  for (const prototype of allPrototypes(chunk.root)) {
    const fields = new Map<number, string>();
    for (const { instruction } of walkInstructions(prototype)) {
      const { a, b, c, opcode } = instruction;
      if (opcode === OP_GETFIELD || opcode === OP_FIELD_CHAIN) {
        const name = stringConstant(prototype, c);
        if (name === undefined) {
          fields.delete(a);
        } else {
          fields.set(a, name);
        }
        continue;
      }
      if (opcode === OP_SELF) {
        const receiver = fields.get(b);
        const method =
          c >= RK_CONSTANT_BIAS
            ? stringConstant(prototype, c - RK_CONSTANT_BIAS)
            : undefined;
        if (receiver !== undefined && method !== undefined) {
          const methods = calls.get(receiver) ?? new Set<string>();
          methods.add(method);
          calls.set(receiver, methods);
        }
        continue;
      }
      if (HKS_OPCODES.get(opcode)?.writesA) {
        fields.delete(a);
      }
    }
  }
  return calls;
}

// The self fields handed to a method as arguments, keyed by method.
export function fieldCallArguments(
  chunk: HksBytecode
): Map<string, Set<string>> {
  const args = new Map<string, Set<string>>();
  for (const prototype of allPrototypes(chunk.root)) {
    const fields = new Map<number, string>();
    // Call base register -> the method SELF put there.
    const pending = new Map<number, string>();
    for (const { instruction } of walkInstructions(prototype)) {
      const { a, b, c, opcode } = instruction;
      if (opcode === OP_GETFIELD || opcode === OP_FIELD_CHAIN) {
        const name = stringConstant(prototype, c);
        if (name === undefined) {
          fields.delete(a);
        } else {
          fields.set(a, name);
        }
        continue;
      }
      if (opcode === OP_SELF) {
        const method =
          c >= RK_CONSTANT_BIAS
            ? stringConstant(prototype, c - RK_CONSTANT_BIAS)
            : undefined;
        if (method === undefined) {
          pending.delete(a);
        } else {
          pending.set(a, method);
        }
        // SELF writes the receiver into a+1, so whatever field was there is
        // no longer that field.
        fields.delete(a);
        fields.delete(a + 1);
        continue;
      }
      if (opcode === OP_CALL) {
        const method = pending.get(a);
        if (method !== undefined) {
          // b = 1 + argument count, and a+1 is the receiver SELF pushed.
          const last = b === 0 ? prototype.maxStackSize : a + b;
          for (let reg = a + 2; reg < last; reg += 1) {
            const name = fields.get(reg);
            if (name === undefined) {
              continue;
            }
            const named = args.get(method) ?? new Set<string>();
            named.add(name);
            args.set(method, named);
          }
        }
        pending.delete(a);
        continue;
      }
      if (HKS_OPCODES.get(opcode)?.writesA) {
        fields.delete(a);
        pending.delete(a);
      }
    }
  }
  return args;
}

// The self fields a call hands a self field to, keyed by argument.
export function fieldHandoffs(chunk: HksBytecode): Map<string, Set<string>> {
  const handoffs = new Map<string, Set<string>>();
  for (const prototype of allPrototypes(chunk.root)) {
    const fields = new Map<number, string>();
    // Call base register -> the field SELF called the method on.
    const pending = new Map<number, string>();
    for (const { instruction } of walkInstructions(prototype)) {
      const { a, b, c, opcode } = instruction;
      if (opcode === OP_GETFIELD || opcode === OP_FIELD_CHAIN) {
        const name = stringConstant(prototype, c);
        if (name === undefined) {
          fields.delete(a);
        } else {
          fields.set(a, name);
        }
        continue;
      }
      if (opcode === OP_SELF) {
        const receiver = fields.get(b);
        if (receiver === undefined) {
          pending.delete(a);
        } else {
          pending.set(a, receiver);
        }
        fields.delete(a);
        fields.delete(a + 1);
        continue;
      }
      if (opcode === OP_CALL) {
        const receiver = pending.get(a);
        if (receiver !== undefined) {
          const last = b === 0 ? prototype.maxStackSize : a + b;
          for (let reg = a + 2; reg < last; reg += 1) {
            const name = fields.get(reg);
            if (name === undefined) {
              continue;
            }
            const receivers = handoffs.get(name) ?? new Set<string>();
            receivers.add(receiver);
            handoffs.set(name, receivers);
          }
        }
        pending.delete(a);
        continue;
      }
      if (HKS_OPCODES.get(opcode)?.writesA) {
        fields.delete(a);
        pending.delete(a);
      }
    }
  }
  return handoffs;
}

// Thread names (`sc_main_thread` for `sc_main_thread_d_execute_impl`) split
// into the ones the host starts and the ones some method wakes.
export function threadNames(
  named: ReadonlySet<string>,
  implNames: readonly string[]
): { autoStart: string[]; driven: string[] } {
  const autoStart: string[] = [];
  const driven: string[] = [];
  for (const impl of implNames) {
    if (!impl.endsWith(EXECUTE_IMPL_SUFFIX)) {
      continue;
    }
    const name = impl.slice(0, impl.length - EXECUTE_IMPL_SUFFIX.length);
    (named.has(name) ? driven : autoStart).push(name);
  }
  return { autoStart, driven };
}

export function threadNameOf(implName: string): string | undefined {
  return implName.endsWith(EXECUTE_IMPL_SUFFIX)
    ? implName.slice(0, implName.length - EXECUTE_IMPL_SUFFIX.length)
    : undefined;
}

// Fields the script indexes rather than calls: `self.obj_list[1] = ...`,
// `self.type_list[i]`.
export function tableFieldNames(chunk: HksBytecode): Set<string> {
  const names = new Set<string>();
  for (const prototype of allPrototypes(chunk.root)) {
    // register -> the self field last loaded into it, same tracking as
    // importSlotNames.
    const fields = new Map<number, string>();
    for (const { instruction } of walkInstructions(prototype)) {
      const { a, b, opcode } = instruction;
      if (opcode === OP_GETFIELD || opcode === OP_FIELD_CHAIN) {
        const name =
          b === 0 ? stringConstant(prototype, instruction.c) : undefined;
        if (name === undefined) {
          fields.delete(a);
        } else {
          fields.set(a, name);
        }
        continue;
      }
      if (opcode === OP_GETTABLE) {
        const name = fields.get(b);
        if (name !== undefined) {
          names.add(name);
        }
      }
      if (
        opcode === OP_SETTABLE_REGISTER_KEY ||
        opcode === OP_SETTABLE_CONSTANT_KEY
      ) {
        const name = fields.get(a);
        if (name !== undefined) {
          names.add(name);
        }
      }
      if (HKS_OPCODES.get(opcode)?.writesA) {
        fields.delete(a);
      }
    }
  }
  return names;
}
