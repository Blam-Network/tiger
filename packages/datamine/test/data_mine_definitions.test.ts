import { describe, expect, it } from "vitest";
import {
  e_datamine_parameter_type,
  type s_datamine_record,
} from "../src/blam/data_mining/data_mining.ts";
import {
  c_datamine_definition_file_state,
  c_datamine_definition_registry,
  k_datamine_registration_full_message,
} from "../src/data_mine_definitions.ts";

function make_record(
  event_name: string,
  event_index = 0,
  value = 1
): s_datamine_record {
  return {
    priority: 2,
    event_name,
    parameter_signature: "%d, ",
    event_index,
    game_info: { game_instance: 0n, map: "" },
    event_date: 1n,
    categories: ["a"],
    parameters: [{ name: "", type: e_datamine_parameter_type.long, value }],
  };
}

describe("c_datamine_definition_registry", () => {
  it("hands out sequential ids from the configured start, 0 by default", () => {
    const registry = new c_datamine_definition_registry({
      first_definition_id: 50,
    });
    expect(registry.register(make_record("one"))?.definition_id).toBe(50);
    expect(registry.register(make_record("two"))?.definition_id).toBe(51);
    expect(registry.size).toBe(2);
    expect(
      new c_datamine_definition_registry().register(make_record("one"))
        ?.definition_id
    ).toBe(0);
  });

  it("dedupes on the whole event shape, not the values", () => {
    const registry = new c_datamine_definition_registry();
    const first = registry.register(make_record("one", 1, 5));
    const again = registry.register(make_record("one", 2, 9));
    expect(again).toBe(first);

    const other_type = make_record("one");
    other_type.parameters[0].type = e_datamine_parameter_type.float;
    expect(registry.register(other_type)?.definition_id).not.toBe(
      first?.definition_id
    );

    const other_category = make_record("one");
    other_category.categories = ["b"];
    expect(registry.register(other_category)?.definition_id).not.toBe(
      first?.definition_id
    );

    const other_priority = make_record("one");
    other_priority.priority = 4;
    expect(registry.register(other_priority)).not.toBe(first);
  });

  it("reports a full table once and drops new events", () => {
    const messages: string[] = [];
    const registry = new c_datamine_definition_registry({
      maximum_registered_events: 2,
      on_error: (message) => messages.push(message),
    });
    expect(registry.register(make_record("one"))).toBeDefined();
    expect(registry.register(make_record("two"))).toBeDefined();
    expect(registry.register(make_record("three"))).toBeUndefined();
    expect(registry.register(make_record("four"))).toBeUndefined();
    // Known events still resolve.
    expect(registry.register(make_record("one"))).toBeDefined();

    expect(messages).toEqual([k_datamine_registration_full_message]);
    expect(k_datamine_registration_full_message).toBe(
      "reports: Event registration is full, no new events will be processed! Increase k_maximum_registered_events."
    );
  });

  it("counts the pre-registered ids against the capacity", () => {
    const registry = new c_datamine_definition_registry({
      first_definition_id: 50,
      maximum_registered_events: 51,
    });
    expect(registry.register(make_record("one"))).toBeDefined();
    expect(registry.register(make_record("two"))).toBeUndefined();
  });
});

describe("c_datamine_definition_file_state", () => {
  it("emits a definition before the first use in each file only", () => {
    const registry = new c_datamine_definition_registry();
    const state = new c_datamine_definition_file_state();

    const first = state.encode_record_v3(
      make_record("one", 1),
      registry,
      "big"
    );
    const second = state.encode_record_v3(
      make_record("one", 2),
      registry,
      "big"
    );
    expect(first).toHaveLength(2);
    expect(first[0][4]).toBe(1);
    expect(first[1][4]).toBe(2);
    expect(second).toHaveLength(1);
    expect(second[0][4]).toBe(2);
  });

  it("re-emits definitions after a reset, keeping the same id", () => {
    const registry = new c_datamine_definition_registry({
      first_definition_id: 50,
    });
    const state = new c_datamine_definition_file_state();
    const before = state.encode_record_v3(make_record("one"), registry, "big");
    state.reset();
    const after = state.encode_record_v3(make_record("one"), registry, "big");
    expect(after).toHaveLength(2);
    expect(after[0].equals(before[0])).toBe(true);
    // Definition id sits after the two strings.
    expect(after[0].readUInt32BE(0x406)).toBe(50);
  });

  it("writes nothing when the registry is full", () => {
    const registry = new c_datamine_definition_registry({
      maximum_registered_events: 0,
    });
    const state = new c_datamine_definition_file_state();
    expect(state.encode_record_v3(make_record("one"), registry, "big")).toEqual(
      []
    );
  });
});
