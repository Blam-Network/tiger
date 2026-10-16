// biome-ignore-all lint/suspicious/noBitwiseOperators: response flags are bit masks
import { describe, expect, it } from "vitest";
import {
  c_event_category_table,
  event_category_dump_rows,
  event_parse_categories,
  event_query,
  k_event_category_none,
  k_maximum_event_categories,
  type s_event_global_levels,
} from "../../../src/blam/cseries/event_categories.ts";
import {
  e_event_level,
  k_event_level_none,
} from "../../../src/blam/cseries/event_levels.ts";
import { e_event_response } from "../../../src/blam/cseries/event_response.ts";
import { k_test_category_defaults } from "../../fixtures/category_defaults.ts";

const k_no_globals: s_event_global_levels = {
  display: k_event_level_none,
  log: k_event_level_none,
  remote_log: k_event_level_none,
};

function make_table() {
  return new c_event_category_table([]);
}

describe("event_parse_categories", () => {
  it("keeps segments that are closed by a colon", () => {
    expect(event_parse_categories("networking:session: hi").names).toEqual([
      "networking",
      "session",
    ]);
    expect(event_parse_categories("networking:session").names).toEqual([
      "networking",
    ]);
  });

  it("gives the root for text without a leading category", () => {
    expect(event_parse_categories("foo bar").names).toEqual([]);
    expect(event_parse_categories("%s: x").names).toEqual([]);
    expect(event_parse_categories(":").names).toEqual([]);
    expect(event_parse_categories("").names).toEqual([]);
  });

  it("lowercases and allows dash and underscore", () => {
    expect(event_parse_categories("Net-Work:Sess_ion:x").names).toEqual([
      "net-work",
      "sess_ion",
    ]);
  });

  it("stops at any other character", () => {
    expect(event_parse_categories("a:b c:d").names).toEqual(["a"]);
    expect(event_parse_categories("a:b.c:d").names).toEqual(["a"]);
  });

  it("reports a segment that fills its buffer", () => {
    const ok = "x".repeat(63);
    expect(event_parse_categories(`${ok}:`).names).toEqual([ok]);
    const too_long = "x".repeat(64);
    const result = event_parse_categories(`a:${too_long}: tail`);
    expect(result.names).toEqual(["a"]);
    expect(result.errors).toEqual([
      `network event category substring #1 '${too_long}: tail' exceeded 64 characters`,
    ]);
    expect(result.warning).toBe(
      `failed to parse network event 'a:${too_long}: tail'`
    );
  });

  it("allows 8 levels and reports the ninth", () => {
    expect(event_parse_categories("a:b:c:d:e:f:g:h: x").names).toHaveLength(8);
    const result = event_parse_categories("a:b:c:d:e:f:g:h:i: x");
    expect(result.names).toHaveLength(8);
    expect(result.errors).toEqual([
      "network event category #8 ' x' exceeded 8 category substrings",
    ]);
  });
});

describe("c_event_category_table", () => {
  it("starts with only the root", () => {
    const table = make_table();
    expect(table.count).toBe(1);
    expect(table.category_path(0)).toBe("");
    expect(table.category_index_from_format("no category here", true)).toBe(0);
  });

  it("creates unknown categories on first use only when asked", () => {
    const table = make_table();
    expect(table.category_index_from_format("a:b: hi", false)).toBe(
      k_event_category_none
    );
    expect(table.count).toBe(1);
    const index = table.category_index_from_format("a:b: hi", true);
    expect(table.category_path(index)).toBe("a:b");
    expect(table.count).toBe(3);
    expect(table.category_index_from_format("a:b: other", true)).toBe(index);
    expect(table.count).toBe(3);
  });

  it("finds categories with or without the trailing colon", () => {
    const table = make_table();
    const index = table.category_index_from_format("a:b: hi", true);
    expect(table.find_category("a:b")).toBe(index);
    expect(table.find_category("a:b:")).toBe(index);
    expect(table.find_category("a:c")).toBe(k_event_category_none);
    expect(table.find_category("")).toBe(0);
  });

  it("copies the parent into a new child, later parent changes do not follow", () => {
    const table = make_table();
    const parent = table.category_index_from_format("a: x", true);
    const parent_category = table.get(parent);
    parent_category.log_level = e_event_level.warning;
    parent_category.log_name = "a.txt";
    parent_category.log_format = "netbuf";
    parent_category.display_color = { red: 0.1, green: 0.2, blue: 0.3 };
    parent_category.listener_mask = 0b101;

    const child = table.get(table.category_index_from_format("a:b: x", true));
    expect(child.log_level).toBe(e_event_level.warning);
    expect(child.log_name).toBe("a.txt");
    expect(child.log_format).toBe("netbuf");
    expect(child.display_color).toEqual({ red: 0.1, green: 0.2, blue: 0.3 });
    expect(child.listener_mask).toBe(0b101);
    expect(child.depth).toBe(2);

    parent_category.log_level = e_event_level.error;
    expect(child.log_level).toBe(e_event_level.warning);
  });

  it("sets a property by name on the node and its descendants, not siblings", () => {
    const table = make_table();
    const a = table.category_index_from_format("a: x", true);
    const ab = table.category_index_from_format("a:b: x", true);
    const abc = table.category_index_from_format("a:b:c: x", true);
    const ad = table.category_index_from_format("a:d: x", true);

    expect(table.set_property_by_name("a:b", "log", 1)).toBe(true);
    expect(table.get(ab).log_level).toBe(1);
    expect(table.get(abc).log_level).toBe(1);
    expect(table.get(a).log_level).toBe(k_event_level_none);
    expect(table.get(ad).log_level).toBe(k_event_level_none);
  });

  it("creates the category in a by-name setter, and an empty name is the root", () => {
    const table = make_table();
    table.set_property_by_name("new", "halt", 5);
    expect(table.get(table.find_category("new")).halt_level).toBe(5);
    table.set_property_by_name("", "debugger_break", 4);
    expect(table.get(0).debugger_break_level).toBe(4);
    expect(table.get(table.find_category("new")).debugger_break_level).toBe(4);
  });

  it("sets every property", () => {
    const table = make_table();
    const index = table.category_index_from_format("p: x", true);
    for (const property of [
      "display",
      "force_display",
      "log",
      "remote_log",
      "debugger_break",
      "halt",
    ] as const) {
      table.set_property_by_name("p:", property, 2);
    }
    const category = table.get(index);
    expect([
      category.display_level,
      category.force_display_level,
      category.log_level,
      category.remote_log_level,
      category.debugger_break_level,
      category.halt_level,
    ]).toEqual([2, 2, 2, 2, 2, 2]);
  });

  it("sets listener bits on the subtree", () => {
    const table = make_table();
    const child = table.category_index_from_format("l:m: x", true);
    table.set_listener_by_name("l", 1);
    table.set_listener_by_name("l", 3);
    expect(table.get(child).listener_mask).toBe(0b1010);
    table.set_listener_by_name("l", undefined);
    expect(table.get(child).listener_mask).toBe(0);
  });

  it("reports parse errors and a full table through the handler", () => {
    const messages: string[] = [];
    const table = new c_event_category_table([], (kind, text) => {
      messages.push(`${kind}:${text}`);
    });
    table.category_index_from_format(`${"x".repeat(64)}: hi`, true);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toContain("error:network event category substring #0");
    expect(messages[1]).toContain("warning:failed to parse network event");

    messages.length = 0;
    for (let i = 1; i < k_maximum_event_categories; i++) {
      table.category_index_from_format(`c${i}: x`, true);
    }
    expect(table.count).toBe(k_maximum_event_categories);
    expect(table.category_index_from_format("overflow: x", true)).toBe(
      k_event_category_none
    );
    expect(messages).toEqual([
      "console:event_find_category_recursive: ran out of categories creating 'overflow'",
    ]);
    expect(table.category_index_from_format("c1: x", true)).not.toBe(
      k_event_category_none
    );
  });

  it("includes every per-category level in minimum_level", () => {
    const table = make_table();
    expect(table.minimum_level()).toBe(e_event_level.critical);
    table.set_property_by_name("a", "remote_log", 1);
    expect(table.minimum_level()).toBe(1);
    table.set_property_by_name("a", "remote_log", k_event_level_none);
    expect(table.minimum_level()).toBe(e_event_level.critical);
    for (const [property, level] of [
      ["display", 4],
      ["force_display", 3],
      ["debugger_break", 2],
      ["halt", 0],
    ] as const) {
      table.set_property_by_name("a", property, level);
      expect(table.minimum_level()).toBe(level);
    }
  });

  it("walks a subtree newest child first", () => {
    const table = make_table();
    const a = table.category_index_from_format("a: x", true);
    const ab = table.category_index_from_format("a:b: x", true);
    const ac = table.category_index_from_format("a:c: x", true);
    expect(table.walk(a)).toEqual([a, ac, ab]);
  });
});

describe("event_query", () => {
  it("uses the global levels when the category has none", () => {
    const table = make_table();
    const globals: s_event_global_levels = {
      display: e_event_level.error,
      log: e_event_level.warning,
      remote_log: e_event_level.message,
    };
    expect(event_query(table, 0, e_event_level.warning, globals)).toBe(
      e_event_response.log | e_event_response.remote_log
    );
    expect(event_query(table, 0, e_event_level.error, globals)).toBe(
      e_event_response.console |
        e_event_response.log |
        e_event_response.remote_log
    );
    expect(event_query(table, 0, e_event_level.verbose, globals)).toBe(0);
  });

  it("sets the break bit from the global debugger break level", () => {
    const table = make_table();
    const globals: s_event_global_levels = {
      ...k_no_globals,
      debugger_break: e_event_level.error,
    };
    expect(event_query(table, 0, e_event_level.warning, globals)).toBe(0);
    expect(event_query(table, 0, e_event_level.error, globals)).toBe(
      e_event_response.break_into_debugger
    );
  });

  it("lets a category level override the global one in both directions", () => {
    const table = make_table();
    const index = table.category_index_from_format("a: x", true);
    const globals: s_event_global_levels = {
      display: e_event_level.error,
      log: e_event_level.error,
      remote_log: k_event_level_none,
    };
    const category = table.get(index);
    category.display_level = e_event_level.verbose;
    category.log_level = e_event_level.critical;
    expect(event_query(table, index, e_event_level.status, globals)).toBe(
      e_event_response.console
    );
    // The category raised the log bar above the global one.
    expect(event_query(table, index, e_event_level.error, globals)).toBe(
      e_event_response.console
    );
  });

  it("only applies break, halt and force display per category", () => {
    const table = make_table();
    const index = table.category_index_from_format("a: x", true);
    const category = table.get(index);
    category.debugger_break_level = e_event_level.error;
    category.halt_level = e_event_level.critical;
    category.force_display_level = e_event_level.warning;
    expect(event_query(table, index, e_event_level.warning, k_no_globals)).toBe(
      e_event_response.console_force
    );
    expect(event_query(table, index, e_event_level.error, k_no_globals)).toBe(
      e_event_response.console_force | e_event_response.break_into_debugger
    );
    expect(
      event_query(table, index, e_event_level.critical, k_no_globals)
    ).toBe(
      e_event_response.console_force |
        e_event_response.break_into_debugger |
        e_event_response.halt
    );
    expect(
      event_query(
        table,
        k_event_category_none,
        e_event_level.critical,
        k_no_globals
      )
    ).toBe(0);
  });
});

describe("default configurations", () => {
  it("loads every halo-style default", () => {
    const table = new c_event_category_table(k_test_category_defaults);
    for (const configuration of k_test_category_defaults) {
      expect(table.find_category(configuration.name)).not.toBe(
        k_event_category_none
      );
    }

    const networking = table.get(table.find_category("networking:"));
    expect(networking.log_name).toBe("networking_debug.txt");
    expect(networking.log_format).toBe("netbuf");
    expect(networking.log_level).toBe(e_event_level.message);
    expect(networking.remote_log_level).toBe(e_event_level.message);
    expect(networking.display_color).toEqual({ red: 1, green: 0.4, blue: 0.7 });

    const hs = table.get(table.find_category("hs:"));
    expect(hs.display_level).toBe(e_event_level.warning);
    expect(hs.log_name).toBe("hs_log.txt");
    expect(hs.debugger_break_level).toBe(k_event_level_none);
  });

  it("inherits the parent log file when the default has none", () => {
    const table = new c_event_category_table(k_test_category_defaults);
    // networking:spawning: has no log_name, but networking: was configured before it.
    const spawning = table.get(table.find_category("networking:spawning:"));
    expect(spawning.log_name).toBe("networking_debug.txt");
    // Its format is set explicitly, and remote logging is off.
    expect(spawning.log_format).toBe("netbuf");
    expect(spawning.remote_log_level).toBe(k_event_level_none);
    // Its own file wins over the parent's.
    expect(
      table.get(table.find_category("networking:leaderboards:")).log_name
    ).toBe("leaderboard_debug.txt");
    // No parent file, no file.
    expect(
      table.get(table.find_category("xoverlapped:")).log_name
    ).toBeUndefined();
    // A child made at runtime copies the parent with its format.
    const runtime = table.get(
      table.category_index_from_format("networking:session: hi", true)
    );
    expect(runtime.log_name).toBe("networking_debug.txt");
    expect(runtime.log_format).toBe("netbuf");
  });

  it("applies a default to its node only", () => {
    const table = new c_event_category_table(k_test_category_defaults);
    // ui:profile: was created implicitly for ui:profile:campaign: and copies ui: as it
    // was; ui:window_manager: has its own entry.
    const profile = table.get(table.find_category("ui:profile:"));
    expect(profile.log_name).toBe("ui_debug.txt");
    expect(profile.log_level).toBe(k_event_level_none);
    expect(
      table.get(table.find_category("ui:profile:campaign:")).log_level
    ).toBe(e_event_level.message);
  });
});

describe("event_category_dump_rows", () => {
  it("lists a subtree with paths and levels", () => {
    const table = make_table();
    table.category_index_from_format("a:b: x", true);
    table.category_index_from_format("a:c: x", true);
    table.category_index_from_format("z: x", true);
    table.set_property_by_name("a:b", "log", 2);

    const all = event_category_dump_rows(table);
    expect(all?.map((row) => row.path)).toEqual(["", "z", "a", "a:c", "a:b"]);

    const rows = event_category_dump_rows(table, "a:");
    expect(rows?.map((row) => row.path)).toEqual(["a", "a:c", "a:b"]);
    expect(rows?.[2]).toMatchObject({
      name: "b",
      depth: 2,
      log_level: 2,
      parent_index: table.find_category("a"),
    });
    expect(event_category_dump_rows(table, "missing:")).toBeUndefined();
  });
});
