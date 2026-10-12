// Opcode table for Destiny's forked Lua 5.1 VM (the alpha's script tag class
// 80800B48).

import type { LuaInstruction, LuaPrototype } from "./types.ts";

export type LuaOperandKind =
  // not an operand: always 0 across the corpus
  | "unused"
  // stack slot index, always < maxstacksize
  | "register"
  // direct index into the prototype's constant pool
  | "constant"
  // vanilla's 9-bit RK slot: >= 256 means constant (value - 256)
  | "rk"
  // index into the prototype's upvalue list
  | "upvalue"
  // index into the prototype's child-prototype list
  | "prototype"
  // a plain integer: a count, a size hint or a boolean flag
  | "value"
  // signed jump displacement (sBx)
  | "jump";

type LuaOperandMode = "iABC" | "iABx" | "iAsBx";

interface LuaOpcode {
  readonly a: LuaOperandKind;
  readonly b: LuaOperandKind;
  readonly c: LuaOperandKind;
  // one-line pseudo-code; empty when the effect is not known
  readonly effect: string;
  readonly followedByJump: boolean;
  readonly mode: LuaOperandMode;
  readonly name: string;
  readonly opcode: number;
  // trailing argument words (opcode 76) this instruction consumes.
  // "nups" = as many as the closed prototype has upvalues.
  readonly trailingWords: "nups" | number;
  readonly writesA: boolean;
}

// Opcode 76 is not an instruction: it is the trailing argument word that ops
// 0/10/73/91 and CLOSURE consume.
export const TRAILING_WORD_OPCODE = 76;

// A trailing word after CLOSURE: A=1 captures a parent register (Bx <
// maxstacksize), A=2 a parent upvalue (Bx < nups).
export const CLOSURE_UPVALUE_FROM_REGISTER = 1;
export const CLOSURE_UPVALUE_FROM_UPVALUE = 2;

type OpcodeRow = Omit<LuaOpcode, "followedByJump" | "writesA"> &
  Partial<Pick<LuaOpcode, "followedByJump" | "writesA">>;

function arithmeticRow(
  opcode: number,
  name: string,
  b: "constant" | "register",
  operator: string
): OpcodeRow {
  const left = b === "register" ? "R(B)" : "K(B)";
  return {
    opcode,
    name,
    mode: "iABC",
    a: "register",
    b,
    c: "rk",
    trailingWords: 0,
    writesA: true,
    effect: `R(A) := ${left} ${operator} RK(C)`,
  };
}

const ROWS: OpcodeRow[] = [
  // string key; the two trailing words are an unfilled inline cache
  {
    opcode: 0,
    name: "GETFIELD",
    mode: "iABC",
    a: "register",
    b: "register",
    c: "constant",
    trailingWords: 2,
    writesA: true,
    effect: "R(A) := R(B)[K(C)]",
  },
  {
    opcode: 1,
    name: "TEST",
    mode: "iABC",
    a: "register",
    b: "unused",
    c: "value",
    trailingWords: 0,
    followedByJump: true,
    effect: "if isfalse(R(A)) ~= C then take the following JMP",
  },
  {
    opcode: 2,
    name: "CALL",
    mode: "iABC",
    a: "register",
    b: "value",
    c: "value",
    trailingWords: 0,
    writesA: true,
    effect: "R(A)..R(A+C-2) := R(A)(R(A+1)..R(A+B-1))",
  },
  {
    opcode: 4,
    name: "EQ",
    mode: "iABC",
    a: "value",
    b: "register",
    c: "rk",
    trailingWords: 0,
    followedByJump: true,
    effect: "if (R(B) == RK(C)) == A then take the following JMP",
  },
  // constant on the left: an assert's `1 == 0`
  {
    opcode: 5,
    name: "EQ",
    mode: "iABC",
    a: "value",
    b: "constant",
    c: "rk",
    trailingWords: 0,
    followedByJump: true,
    effect: "if (K(B) == RK(C)) == A then take the following JMP",
  },
  {
    opcode: 7,
    name: "MOVE",
    mode: "iABC",
    a: "register",
    b: "register",
    c: "unused",
    trailingWords: 0,
    writesA: true,
    effect: "R(A) := R(B)",
  },
  // always followed by CALL_I_R1 on the same A, then the real CALL
  {
    opcode: 8,
    name: "SELF",
    mode: "iABC",
    a: "register",
    b: "register",
    c: "rk",
    trailingWords: 0,
    writesA: true,
    effect: "R(A+1) := R(B); R(A) := R(B)[RK(C)]",
  },
  {
    opcode: 9,
    name: "RETURN",
    mode: "iABC",
    a: "register",
    b: "value",
    c: "unused",
    trailingWords: 0,
    effect: "return R(A)..R(A+B-2)",
  },
  // the two trailing words are an unfilled inline cache
  {
    opcode: 10,
    name: "GETTABLE",
    mode: "iABC",
    a: "register",
    b: "register",
    c: "rk",
    trailingWords: 2,
    writesA: true,
    effect: "R(A) := R(B)[RK(C)]",
  },
  {
    opcode: 13,
    name: "LOADBOOL",
    mode: "iABC",
    a: "register",
    b: "value",
    c: "value",
    trailingWords: 0,
    writesA: true,
    effect: "R(A) := (B ~= 0); if C ~= 0 then pc++",
  },
  {
    opcode: 14,
    name: "TFORLOOP",
    mode: "iABC",
    a: "register",
    b: "unused",
    c: "value",
    trailingWords: 0,
    followedByJump: true,
    effect:
      "R(A+3)..R(A+2+C) := R(A)(R(A+1), R(A+2)); if R(A+3) ~= nil then " +
      "R(A+2) := R(A+3) else skip the following JMP",
  },
  // string key
  {
    opcode: 15,
    name: "SETFIELD",
    mode: "iABC",
    a: "register",
    b: "constant",
    c: "rk",
    trailingWords: 0,
    effect: "R(A)[K(B)] := RK(C)",
  },
  {
    opcode: 16,
    name: "SETTABLE",
    mode: "iABC",
    a: "register",
    b: "register",
    c: "rk",
    trailingWords: 0,
    effect: "R(A)[R(B)] := RK(C)",
  },
  // number key (op 15 takes the string keys)
  {
    opcode: 17,
    name: "SETTABLE",
    mode: "iABC",
    a: "register",
    b: "constant",
    c: "rk",
    trailingWords: 0,
    effect: "R(A)[K(B)] := RK(C)",
  },
  {
    opcode: 22,
    name: "TAILCALL",
    mode: "iABC",
    a: "register",
    b: "value",
    c: "unused",
    trailingWords: 0,
    effect: "return R(A)(R(A+1)..R(A+B-1))",
  },
  {
    opcode: 25,
    name: "LOADK",
    mode: "iABx",
    a: "register",
    b: "constant",
    c: "constant",
    trailingWords: 0,
    writesA: true,
    effect: "R(A) := K(Bx)",
  },
  {
    opcode: 26,
    name: "LOADNIL",
    mode: "iABC",
    a: "register",
    b: "register",
    c: "unused",
    trailingWords: 0,
    writesA: true,
    effect: "R(A)..R(B) := nil",
  },
  // sBx is biased by 0xFFFF
  {
    opcode: 28,
    name: "JMP",
    mode: "iAsBx",
    a: "unused",
    b: "jump",
    c: "jump",
    trailingWords: 0,
    effect: "pc += sBx",
  },
  {
    opcode: 38,
    name: "GETUPVAL",
    mode: "iABC",
    a: "register",
    b: "upvalue",
    c: "unused",
    trailingWords: 0,
    writesA: true,
    effect: "R(A) := U(B)",
  },
  {
    opcode: 40,
    name: "ADD",
    mode: "iABC",
    a: "register",
    b: "register",
    c: "rk",
    trailingWords: 0,
    writesA: true,
    effect: "R(A) := R(B) + RK(C)",
  },
  {
    opcode: 41,
    name: "ADD",
    mode: "iABC",
    a: "register",
    b: "constant",
    c: "rk",
    trailingWords: 0,
    writesA: true,
    effect: "R(A) := K(B) + RK(C)",
  },
  {
    opcode: 42,
    name: "SUB",
    mode: "iABC",
    a: "register",
    b: "register",
    c: "rk",
    trailingWords: 0,
    writesA: true,
    effect: "R(A) := R(B) - RK(C)",
  },
  {
    opcode: 43,
    name: "SUB",
    mode: "iABC",
    a: "register",
    b: "constant",
    c: "rk",
    trailingWords: 0,
    writesA: true,
    effect: "R(A) := K(B) - RK(C)",
  },
  {
    opcode: 44,
    name: "MUL",
    mode: "iABC",
    a: "register",
    b: "register",
    c: "rk",
    trailingWords: 0,
    writesA: true,
    effect: "R(A) := R(B) * RK(C)",
  },
  {
    opcode: 45,
    name: "MUL",
    mode: "iABC",
    a: "register",
    b: "constant",
    c: "rk",
    trailingWords: 0,
    writesA: true,
    effect: "R(A) := K(B) * RK(C)",
  },
  {
    opcode: 46,
    name: "DIV",
    mode: "iABC",
    a: "register",
    b: "register",
    c: "rk",
    trailingWords: 0,
    writesA: true,
    effect: "R(A) := R(B) / RK(C)",
  },
  {
    opcode: 47,
    name: "DIV",
    mode: "iABC",
    a: "register",
    b: "constant",
    c: "rk",
    trailingWords: 0,
    writesA: true,
    effect: "R(A) := K(B) / RK(C)",
  },
  {
    opcode: 50,
    name: "POW",
    mode: "iABC",
    a: "register",
    b: "register",
    c: "rk",
    trailingWords: 0,
    writesA: true,
    effect: "R(A) := R(B) ^ RK(C)",
  },
  {
    opcode: 52,
    name: "NEWTABLE",
    mode: "iABC",
    a: "register",
    b: "value",
    c: "value",
    trailingWords: 0,
    writesA: true,
    effect: "R(A) := {} -- B array slots, C hash slots",
  },
  {
    opcode: 53,
    name: "UNM",
    mode: "iABC",
    a: "register",
    b: "register",
    c: "unused",
    trailingWords: 0,
    writesA: true,
    effect: "R(A) := -R(B)",
  },
  {
    opcode: 54,
    name: "NOT",
    mode: "iABC",
    a: "register",
    b: "register",
    c: "unused",
    trailingWords: 0,
    writesA: true,
    effect: "R(A) := not R(B)",
  },
  {
    opcode: 56,
    name: "LT",
    mode: "iABC",
    a: "value",
    b: "register",
    c: "rk",
    trailingWords: 0,
    followedByJump: true,
    effect: "if (R(B) < RK(C)) == A then take the following JMP",
  },
  // constant on the left: the compiler's swapped form of `a > b`
  {
    opcode: 57,
    name: "LT",
    mode: "iABC",
    a: "value",
    b: "constant",
    c: "rk",
    trailingWords: 0,
    followedByJump: true,
    effect: "if (K(B) < RK(C)) == A then take the following JMP",
  },
  {
    opcode: 58,
    name: "LE",
    mode: "iABC",
    a: "value",
    b: "register",
    c: "rk",
    trailingWords: 0,
    followedByJump: true,
    effect: "if (R(B) <= RK(C)) == A then take the following JMP",
  },
  // constant on the left: the compiler's swapped form of `a >= b`
  {
    opcode: 59,
    name: "LE",
    mode: "iABC",
    a: "value",
    b: "constant",
    c: "rk",
    trailingWords: 0,
    followedByJump: true,
    effect: "if (K(B) <= RK(C)) == A then take the following JMP",
  },
  {
    opcode: 62,
    name: "FORPREP",
    mode: "iAsBx",
    a: "register",
    b: "jump",
    c: "jump",
    trailingWords: 0,
    effect: "R(A) -= R(A+2); pc += sBx",
  },
  {
    opcode: 63,
    name: "FORLOOP",
    mode: "iAsBx",
    a: "register",
    b: "jump",
    c: "jump",
    trailingWords: 0,
    effect: "R(A) += R(A+2); if in range then R(A+3) := R(A); pc += sBx",
  },
  {
    opcode: 65,
    name: "CLOSE",
    mode: "iABC",
    a: "register",
    b: "unused",
    c: "unused",
    trailingWords: 0,
    effect: "close every upvalue captured from a register >= A",
  },
  {
    opcode: 66,
    name: "CLOSURE",
    mode: "iABx",
    a: "register",
    b: "prototype",
    c: "prototype",
    trailingWords: "nups",
    writesA: true,
    effect: "R(A) := closure(P[Bx]) -- then nups trailing words",
  },
  // after SELF it is a companion word, not a call (true purpose unknown);
  // after a __coro_yield GETGLOBAL it is the zero-argument call itself
  {
    opcode: 69,
    name: "CALL_I_R1",
    mode: "iABC",
    a: "register",
    b: "value",
    c: "value",
    trailingWords: 0,
    effect:
      "R(A)..R(A+C-2) := R(A)(R(A+1)..R(A+B-1)) -- B=C=3 right after a " +
      "SELF into the same register is not executed",
  },
  {
    opcode: 71,
    name: "TEST_R1",
    mode: "iABC",
    a: "register",
    b: "unused",
    c: "value",
    trailingWords: 0,
    followedByJump: true,
    effect: "if isfalse(R(A)) ~= C then take the following JMP",
  },
  // the base is a just-loaded upvalue: an imported module or enum table
  {
    opcode: 73,
    name: "GETFIELD_R1",
    mode: "iABC",
    a: "register",
    b: "register",
    c: "constant",
    trailingWords: 2,
    writesA: true,
    effect: "R(A) := R(B)[K(C)] -- always emitted with A == B",
  },
  // the base was written by the preceding instruction (NEWTABLE, a read)
  {
    opcode: 74,
    name: "SETFIELD_R1",
    mode: "iABC",
    a: "register",
    b: "constant",
    c: "rk",
    trailingWords: 0,
    effect: "R(A)[K(B)] := RK(C)",
  },
  // Ops the alpha's chunks never use: what the compiler (compile.ts) emits for Lua the alpha scripts
  // never needed, in hks's numbering with vanilla Lua 5.1's semantics.
  {
    opcode: 27,
    name: "SETGLOBAL",
    mode: "iABx",
    a: "register",
    b: "constant",
    c: "constant",
    trailingWords: 0,
    effect: "_G[K(Bx)] := R(A)",
  },
  {
    opcode: 39,
    name: "SETUPVAL",
    mode: "iABC",
    a: "register",
    b: "upvalue",
    c: "unused",
    trailingWords: 0,
    effect: "U(B) := R(A)",
  },
  arithmeticRow(48, "MOD", "register", "%"),
  arithmeticRow(49, "MOD", "constant", "%"),
  arithmeticRow(51, "POW", "constant", "^"),
  {
    opcode: 55,
    name: "LEN",
    mode: "iABC",
    a: "register",
    b: "register",
    c: "unused",
    trailingWords: 0,
    writesA: true,
    effect: "R(A) := #R(B)",
  },
  {
    opcode: 60,
    name: "CONCAT",
    mode: "iABC",
    a: "register",
    b: "register",
    c: "register",
    trailingWords: 0,
    writesA: true,
    effect: "R(A) := R(B) .. ... .. R(C)",
  },
  {
    opcode: 61,
    name: "TESTSET",
    mode: "iABC",
    a: "register",
    b: "register",
    c: "value",
    trailingWords: 0,
    followedByJump: true,
    writesA: true,
    effect:
      "if isfalse(R(B)) == C then skip the following JMP else R(A) := R(B) " +
      "and take it",
  },
  {
    opcode: 64,
    name: "SETLIST",
    mode: "iABC",
    a: "register",
    b: "value",
    c: "value",
    trailingWords: 0,
    effect: "R(A)[(C-1)*50+i] := R(A+i), 1 <= i <= B (B=0: up to top)",
  },
  {
    opcode: 67,
    name: "VARARG",
    mode: "iABC",
    a: "register",
    b: "value",
    c: "unused",
    trailingWords: 0,
    writesA: true,
    effect: "R(A)..R(A+B-2) := vararg (B=0: all of them)",
  },
  {
    opcode: 68,
    name: "TAILCALL_I_R1",
    mode: "iABC",
    a: "register",
    b: "value",
    c: "unused",
    trailingWords: 0,
    effect: "return R(A)(R(A+1)..R(A+B-1)) -- callee just written",
  },
  {
    opcode: 70,
    name: "SETUPVAL_R1",
    mode: "iABC",
    a: "register",
    b: "upvalue",
    c: "unused",
    trailingWords: 0,
    effect: "U(B) := R(A) -- R(A) just written",
  },
  {
    opcode: 72,
    name: "NOT_R1",
    mode: "iABC",
    a: "register",
    b: "register",
    c: "unused",
    trailingWords: 0,
    writesA: true,
    effect: "R(A) := not R(B) -- R(B) just written",
  },
  // all-zero after ops 0/10/73, the cache slot (A=20, Bx a nil constant)
  // after GETGLOBAL, the captured register or upvalue after CLOSURE
  {
    opcode: TRAILING_WORD_OPCODE,
    name: "DATA",
    mode: "iABx",
    a: "value",
    b: "value",
    c: "value",
    trailingWords: 0,
    effect: "not an instruction - trailing argument word",
  },
  // hks's GETGLOBAL_MEM slot: one trailing cache word
  {
    opcode: 91,
    name: "GETGLOBAL",
    mode: "iABx",
    a: "register",
    b: "constant",
    c: "constant",
    trailingWords: 1,
    writesA: true,
    effect: "R(A) := _G[K(Bx)] -- then one cache word",
  },
];

export const LUA_OPCODES: ReadonlyMap<number, LuaOpcode> = new Map(
  ROWS.map((entry) => [
    entry.opcode,
    { followedByJump: false, writesA: false, ...entry },
  ])
);

// Mnemonic for a raw opcode number. Opcodes the corpus never shows, and the
// ones whose meaning is unproven, print as op_NN.
export function opcodeName(opcode: number): string {
  return (
    LUA_OPCODES.get(opcode)?.name ?? `op_${opcode.toString().padStart(2, "0")}`
  );
}

export function isTrailingWord(opcode: number): boolean {
  return opcode === TRAILING_WORD_OPCODE;
}

// How many trailing argument words this instruction owns. CLOSURE's count
// comes from the prototype it closes, so the parent has to be passed in.
export function trailingWordCount(
  instruction: LuaInstruction,
  prototype: LuaPrototype
): number {
  const entry = LUA_OPCODES.get(instruction.opcode);
  if (entry === undefined) {
    return 0;
  }
  if (entry.trailingWords === "nups") {
    return prototype.protos[instruction.bx]?.nups ?? 0;
  }
  return entry.trailingWords;
}

interface LuaDecodedInstruction {
  instruction: LuaInstruction;
  pc: number;
  trailing: readonly LuaInstruction[];
}

// Walks a prototype's code yielding only real instructions, each with the
// trailing words it owns.
export function* walkInstructions(
  prototype: LuaPrototype
): Generator<LuaDecodedInstruction> {
  const code = prototype.code;
  let pc = 0;
  while (pc < code.length) {
    const instruction = code[pc];
    if (isTrailingWord(instruction.opcode)) {
      // orphaned word - callers that care report it as a violation
      pc += 1;
      continue;
    }
    const count = trailingWordCount(instruction, prototype);
    yield { pc, instruction, trailing: code.slice(pc + 1, pc + 1 + count) };
    pc += 1 + count;
  }
}
