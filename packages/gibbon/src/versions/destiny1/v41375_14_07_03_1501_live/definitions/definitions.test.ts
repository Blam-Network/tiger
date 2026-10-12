import { describe, expect, it } from "vitest";
import {
  evaluate_unlock_expression,
  evaluate_unlock_expressions,
  k_unlock_flag_count,
} from "./unlock_flags.ts";

const token = (op: number, operand = 0xffff) => ({ op, operand });

describe("unlock expressions", () => {
  const flags = new Uint8Array(k_unlock_flag_count);
  flags[248] = 2;
  flags[1745] = 2;
  flags[70] = 1;

  it("pushes set flags and combines them", () => {
    const set = { tokens: [token(1, 248)] };
    expect(evaluate_unlock_expression(set, flags)).toBe(true);
    // 1 is not set; only 2 is.
    expect(evaluate_unlock_expression({ tokens: [token(1, 70)] }, flags)).toBe(
      false
    );
    // 248 && 1745, !217 && 70.
    expect(
      evaluate_unlock_expression(
        { tokens: [token(1, 248), token(1, 1745), token(4)] },
        flags
      )
    ).toBe(true);
    expect(
      evaluate_unlock_expression(
        { tokens: [token(1, 217), token(2), token(1, 70), token(4)] },
        flags
      )
    ).toBe(false);
    // xnor, nor, nand.
    expect(
      evaluate_unlock_expression(
        { tokens: [token(1, 70), token(1, 217), token(8)] },
        flags
      )
    ).toBe(true);
    expect(
      evaluate_unlock_expression(
        { tokens: [token(1, 70), token(1, 217), token(5)] },
        flags
      )
    ).toBe(true);
    expect(
      evaluate_unlock_expression(
        { tokens: [token(1, 248), token(1, 1745), token(7)] },
        flags
      )
    ).toBe(false);
  });

  it("fails empty and malformed expressions, but not empty lists", () => {
    expect(evaluate_unlock_expression({ tokens: [] }, flags)).toBe(false);
    expect(evaluate_unlock_expression({ tokens: [token(4)] }, flags)).toBe(
      false
    );
    expect(
      evaluate_unlock_expression(
        { tokens: [token(1, 248), token(1, 248)] },
        flags
      )
    ).toBe(false);
    expect(evaluate_unlock_expressions([], flags)).toBe(true);
  });
});
