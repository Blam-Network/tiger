import { describe, expect, it } from "vitest";
import { c_bit_reader } from "./bit_reader.js";
import { PoodleError } from "./poodle_error.js";

describe("c_bit_reader", () => {
  it("reads MSB first across bytes", () => {
    const reader = new c_bit_reader(
      Uint8Array.of(0b1011_0110, 0b0101_1100),
      0,
      2
    );
    expect(reader.read(1)).toBe(1);
    expect(reader.read(3)).toBe(0b011);
    expect(reader.read(7)).toBe(0b011_0010);
    expect(reader.read(5)).toBe(0b1_1100);
    expect(reader.consumed_bits()).toBe(16);
  });

  it("reads zeros past the end and still counts them", () => {
    const reader = new c_bit_reader(Uint8Array.of(0xff, 0xab, 0xff), 1, 2);
    expect(reader.read(8)).toBe(0xab);
    expect(reader.read(24)).toBe(0);
    expect(reader.consumed_bytes()).toBe(4);
  });

  it("rounds a partly read byte up", () => {
    const reader = new c_bit_reader(Uint8Array.of(0, 0, 0), 0, 3);
    reader.read(9);
    expect(reader.consumed_bytes()).toBe(2);
  });

  it("counts unary zeros over refills", () => {
    const data = Uint8Array.of(0, 0, 0, 0, 0b0001_0000);
    const reader = new c_bit_reader(data, 0, data.length);
    expect(reader.unary()).toBe(35);
    expect(reader.consumed_bits()).toBe(36);
  });

  it("gives up on a unary code that never ends", () => {
    const reader = new c_bit_reader(new Uint8Array(4), 0, 4);
    expect(() => reader.unary()).toThrow(PoodleError);
  });
});
