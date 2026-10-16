import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  filetime_from_date,
  type s_clock,
} from "../../../src/blam/cseries/cseries_time.ts";
import {
  c_datamine,
  data_mining_configure,
  data_mining_event_index_peek,
  data_mining_reset,
  e_datamine_parameter_type,
  k_datamine_event_buffer_length,
  type s_datamine_record,
} from "../../../src/blam/data_mining/data_mining.ts";

let records: s_datamine_record[] = [];
let errors: string[] = [];

beforeEach(() => {
  records = [];
  errors = [];
  data_mining_reset();
  data_mining_configure({
    commit: (record) => records.push(record),
    on_error: (message) => errors.push(message),
  });
});

afterEach(() => {
  data_mining_reset();
});

function commit_args(format: string, args: unknown[]): s_datamine_record {
  const dm = new c_datamine(2, "test", ["a"]);
  dm.add_args(format, args as never[]);
  dm.commit();
  return records.at(-1) as s_datamine_record;
}

describe("c_datamine builder", () => {
  it("collects categories, parameters and the signature", () => {
    const dm = new c_datamine(3, "networking:thing", ["root"]);
    dm.additional_category("extra");
    dm.add_long("a", -5);
    dm.add_int64("b", 2n ** 40n);
    dm.add_float("c", 0.1);
    dm.add_string("d", "hello");
    dm.commit();

    expect(records).toHaveLength(1);
    const [record] = records;
    expect(record.priority).toBe(3);
    expect(record.event_name).toBe("networking:thing");
    expect(record.categories).toEqual(["root", "extra"]);
    expect(record.parameter_signature).toBe("%d, %I64d, %f, %s");
    expect(record.parameters).toEqual([
      { name: "a", type: e_datamine_parameter_type.long, value: -5 },
      { name: "b", type: e_datamine_parameter_type.int64, value: 2n ** 40n },
      {
        name: "c",
        type: e_datamine_parameter_type.float,
        value: Math.fround(0.1),
      },
      { name: "d", type: e_datamine_parameter_type.string, value: "hello" },
    ]);
  });

  it("wraps longs to 32 bits and floats to single precision", () => {
    const dm = new c_datamine(0, "wrap");
    dm.add_long("big", 0x1_00_00_00_05);
    dm.add_double("d", 1 / 3);
    dm.commit();
    expect(records[0].parameters[0].value).toBe(5);
    expect(records[0].parameters[1]).toMatchObject({
      type: e_datamine_parameter_type.float,
      value: Math.fround(1 / 3),
    });
  });

  it("names the three components of a point", () => {
    const dm = new c_datamine(0, "pt");
    dm.add_point("pos", { x: 1, y: 2, z: 3 });
    dm.add_vector("dir", { x: 4, y: 5, z: 6 });
    dm.commit();
    expect(records[0].parameters.map((p) => p.name)).toEqual([
      "pos.x",
      "pos.y",
      "pos.z",
      "dir.x",
      "dir.y",
      "dir.z",
    ]);
  });

  it("cuts names to 31 bytes and strings to 511", () => {
    const dm = new c_datamine(0, "caps");
    dm.add_string("n".repeat(40), "s".repeat(600));
    dm.add_wchar_string("w", "héllo");
    dm.commit();
    expect(records[0].parameters[0].name).toHaveLength(31);
    expect((records[0].parameters[0].value as string).length).toBe(511);
    expect(records[0].parameters[1].value).toBe("h?llo");
  });

  it("only drops categories past the sixteenth", () => {
    const dm = new c_datamine(0, "cats");
    for (let index = 0; index < 17; index++) {
      dm.additional_category(`c${index}`);
    }
    dm.commit();
    expect(records[0].categories).toHaveLength(16);
    expect(errors).toHaveLength(1);
  });

  it("commit is a no-op after commit or cancel", () => {
    const first = new c_datamine(0, "one");
    first.commit();
    first.commit();
    const second = new c_datamine(0, "two");
    second.cancel_insert();
    second.commit();
    expect(records).toHaveLength(1);
  });

  it("commits when a using scope ends", () => {
    {
      using dm = new c_datamine(1, "scoped");
      dm.add_long("x", 1);
      expect(records).toHaveLength(0);
    }
    expect(records).toHaveLength(1);
  });

  it("stamps the clock, the game info and the event index", () => {
    const now = new Date(Date.UTC(2013, 11, 3, 12, 0, 0));
    const clock: s_clock = { now: () => now, milliseconds: () => 0 };
    data_mining_configure({
      clock,
      event_index_start: 7,
      game_info: () => ({ game_instance: 42n, map: "levels\\test" }),
    });
    new c_datamine(0, "a").commit();
    const dm = new c_datamine(0, "b");
    dm.add_external_game_info({ game_instance: 9n, map: "other" });
    dm.commit();

    expect(records.map((r) => r.event_index)).toEqual([7, 8]);
    expect(records[0].event_date).toBe(filetime_from_date(now));
    expect(records[0].game_info).toEqual({
      game_instance: 42n,
      map: "levels\\test",
    });
    expect(records[1].game_info).toEqual({ game_instance: 9n, map: "other" });
  });

  it("advances the event index even with no handler", () => {
    data_mining_configure({ commit: undefined, event_index_start: 0 });
    new c_datamine(0, "a").commit();
    new c_datamine(0, "b").commit();
    expect(data_mining_event_index_peek()).toBe(2);
    data_mining_configure({ commit: (record) => records.push(record) });
    new c_datamine(0, "c").commit();
    expect(records[0].event_index).toBe(2);
  });
});

describe("signature", () => {
  it("strips the trailing separator by default", () => {
    expect(commit_args("%d %s", [1, "x"]).parameter_signature).toBe("%d, %s");
  });

  it("keeps it for destiny style files", () => {
    data_mining_configure({
      format: { signature_strip_trailing_separator: false },
    });
    expect(commit_args("%d %d", [1, 2]).parameter_signature).toBe("%d, %d, ");
  });
});

describe("add_args", () => {
  it("maps the walker's specifiers", () => {
    const record = commit_args("%s %d %f %e %c %S %C %I64d %x", [
      "str",
      -3,
      1.5,
      2.5,
      65,
      "wide",
      66,
      2n ** 40n,
      255,
    ]);
    expect(record.parameters.map((p) => [p.type, p.value])).toEqual([
      [e_datamine_parameter_type.string, "str"],
      [e_datamine_parameter_type.long, -3],
      [e_datamine_parameter_type.float, 1.5],
      [e_datamine_parameter_type.float, 2.5],
      [e_datamine_parameter_type.string, "A"],
      [e_datamine_parameter_type.string, "wide"],
      [e_datamine_parameter_type.string, "B"],
      [e_datamine_parameter_type.int64, 2n ** 40n],
      [e_datamine_parameter_type.long, 255],
    ]);
    expect(record.parameters.every((p) => p.name === "")).toBe(true);
  });

  it("consumes the precision before the string in %.*s", () => {
    const record = commit_args("design:hs: %s: %.*s", ["a", 3, "bcdef"]);
    expect(record.parameters.map((p) => p.value)).toEqual(["a", "bcdef"]);
    expect(record.parameter_signature).toBe("%s, %s");
  });

  it("skips %% and digits and l", () => {
    const record = commit_args("100%% %5d %ld %08x", [1, 2, 3]);
    expect(record.parameters.map((p) => p.value)).toEqual([1, 2, 3]);
  });

  it("treats null strings as empty", () => {
    const record = commit_args("%s", [null]);
    expect(record.parameters[0].value).toBe("");
  });

  it("maps %lld to int64 when lenient and to a long when faithful", () => {
    expect(commit_args("%lld", [2n ** 40n]).parameters[0]).toMatchObject({
      type: e_datamine_parameter_type.int64,
      value: 2n ** 40n,
    });
    data_mining_configure({
      format: { args_mode: "faithful" },
    });
    expect(commit_args("%lld", [7]).parameters[0]).toMatchObject({
      type: e_datamine_parameter_type.long,
      value: 7,
    });
  });

  it("accepts flags and star widths when lenient", () => {
    const record = commit_args("%-5d %+d %*d %hd %zu", [1, 2, 9, 3, 4, 5]);
    expect(record.parameters.map((p) => p.value)).toEqual([1, 2, 3, 4, 5]);
  });

  it("cancels the record on flags when faithful", () => {
    data_mining_configure({
      format: { args_mode: "faithful" },
    });
    const dm = new c_datamine(0, "bad");
    dm.add_args("value %-5d", [1]);
    dm.commit();
    expect(records).toHaveLength(0);
    expect(dm.cancelled).toBe(true);
    expect(errors).toEqual([
      "datamine: unparsable format string: 'value %-5d'",
    ]);
  });

  it("cancels on a truncated specifier", () => {
    const dm = new c_datamine(0, "bad");
    dm.add_args("oops %5", [1]);
    expect(dm.cancelled).toBe(true);
    expect(errors).toHaveLength(1);
  });

  it("does not advance the event index for a cancelled record", () => {
    data_mining_configure({
      format: { args_mode: "faithful" },
    });
    const before = data_mining_event_index_peek();
    const dm = new c_datamine(0, "bad");
    dm.add_args("%#x", [1]);
    dm.commit();
    expect(data_mining_event_index_peek()).toBe(before);
  });
});

describe("record budget", () => {
  it("counts the header against the 16 KiB buffer and cancels on overflow", () => {
    const dm = new c_datamine(0, "big");
    for (let index = 0; index < 100; index++) {
      dm.add_string(`p${index}`, "x".repeat(500));
    }
    dm.commit();
    expect(dm.cancelled).toBe(true);
    expect(records).toHaveLength(0);
    expect(errors[0]).toContain("exceeds");
    expect(errors[0]).toContain(String(k_datamine_event_buffer_length));
  });

  it("fits exactly up to the limit", () => {
    // 1312 header + 8 counts leaves 15064; each empty long is 40 bytes.
    const dm = new c_datamine(0, "full");
    for (let index = 0; index < 376; index++) {
      dm.add_long(`p${index}`, index);
    }
    expect(dm.encoded_size).toBe(1320 + 376 * 40);
    dm.commit();
    expect(records).toHaveLength(1);
    expect(records[0].parameters).toHaveLength(376);

    const over = new c_datamine(0, "over");
    for (let index = 0; index < 377; index++) {
      over.add_long(`p${index}`, index);
    }
    expect(over.cancelled).toBe(true);
  });

  it("rechecks the budget when late categories push it over", () => {
    const dm = new c_datamine(0, "late");
    for (let index = 0; index < 376; index++) {
      dm.add_long(`p${index}`, index);
    }
    dm.additional_category("tips it over");
    dm.commit();
    expect(records).toHaveLength(0);
    expect(errors).toHaveLength(1);
  });
});
