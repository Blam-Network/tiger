import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  e_event_level,
  k_event_level_none,
} from "../../src/blam/cseries/event_levels.ts";
import { e_event_response } from "../../src/blam/cseries/event_response.ts";
import {
  event_log_definitions,
  event_log_directory,
  event_log_route_matches,
  event_log_session_folder_name,
  event_log_snapshot_directory,
  events_config_resolve,
  type s_routed_event,
} from "../../src/config/event_options.ts";

const k_started = new Date(2026, 9, 16, 12, 0, 5);

describe("events_config_resolve", () => {
  it("fills in the defaults", () => {
    const config = events_config_resolve({ root: "r" });
    expect(config).toEqual({
      root: "r",
      name: undefined,
      version_string: "blamnet events",
      categories: [],
      initial_levels: {
        display: e_event_level.error,
        log: e_event_level.error,
        remote_log: e_event_level.error,
      },
      spam_mode: "console_only",
      text_encoding: "utf8",
      layout: "3.1",
      date_utc: false,
      write_files: true,
      separate_session_reports: false,
      session_suffix: undefined,
      debug_log_includes_unfiled: false,
      full_log: true,
      datamine_log: false,
      uncategorized_log: false,
      root_debug_log: false,
      append: true,
      trim_bytes: 0,
    });
  });

  it("takes each option on its own", () => {
    const config = events_config_resolve({
      root: "r",
      name: "mine",
      version_string: "v 1",
      initial_levels: { log: k_event_level_none },
      layout: "1.1",
      full_log: false,
      trim_bytes: 5,
    });
    expect(config.name).toBe("mine");
    expect(config.version_string).toBe("v 1");
    expect(config.initial_levels).toEqual({
      display: e_event_level.error,
      log: k_event_level_none,
      remote_log: e_event_level.error,
    });
    expect(config.layout).toBe("1.1");
    expect(config.full_log).toBe(false);
    expect(config.trim_bytes).toBe(5);
    expect(config.append).toBe(true);
  });
});

describe("event_log_definitions", () => {
  const names = (options: Parameters<typeof events_config_resolve>[0]) =>
    event_log_definitions(events_config_resolve(options)).map(
      (definition) =>
        `${definition.place_in_root ? "root:" : ""}${definition.name}`
    );

  it("is debug.txt and debug_full.txt by default", () => {
    expect(names({ root: "r" })).toEqual(["debug.txt", "debug_full.txt"]);
  });

  it("adds the optional files", () => {
    expect(
      names({
        root: "r",
        root_debug_log: true,
        datamine_log: true,
        uncategorized_log: true,
        full_log: false,
      })
    ).toEqual([
      "root:debug.txt",
      "debug.txt",
      "debug_datamine.txt",
      "debug_spam.txt",
    ]);
  });

  it("is empty without files", () => {
    expect(names({ root: "r", write_files: false })).toEqual([]);
  });

  it("routes debug.txt by level alone unless unfiled lines are included", () => {
    const route = (include: boolean) =>
      event_log_definitions(
        events_config_resolve({
          root: "r",
          debug_log_includes_unfiled: include,
        })
      )[0].route;
    expect(route(false)).toBe("primary");
    expect(route(true)).toBe("primary_or_unfiled");
  });

  it("appends the report files unless told not to", () => {
    for (const append of [true, false]) {
      const definitions = event_log_definitions(
        events_config_resolve({ root: "r", root_debug_log: true, append })
      );
      expect(
        definitions.map((definition) => definition.append_to_file)
      ).toEqual([undefined, append, append]);
    }
  });
});

describe("event_log_directory", () => {
  it("puts everything in reports, and the extra debug.txt in the root", () => {
    const config = events_config_resolve({ root: "r" });
    expect(event_log_directory(config, { name: "a" }, k_started)).toBe(
      join("r", "reports")
    );
    expect(
      event_log_directory(config, { name: "a", place_in_root: true }, k_started)
    ).toBe("r");
    expect(event_log_snapshot_directory(config)).toBe(
      join("r", "error_snapshot")
    );
  });

  it("makes a folder per run, named for its start and suffix", () => {
    const plain = events_config_resolve({
      root: "r",
      separate_session_reports: true,
    });
    expect(event_log_session_folder_name(plain, k_started)).toBe(
      "20261016_120005"
    );
    expect(event_log_directory(plain, { name: "a" }, k_started)).toBe(
      join("r", "reports", "20261016_120005")
    );
    const suffixed = events_config_resolve({
      root: "r",
      separate_session_reports: true,
      session_suffix: "pc_web-tiger",
    });
    expect(event_log_session_folder_name(suffixed, k_started)).toBe(
      "20261016_120005_pc_web-tiger"
    );
    expect(
      event_log_directory(
        suffixed,
        { name: "a", place_in_root: true },
        k_started
      )
    ).toBe("r");
  });
});

describe("event_log_route_matches", () => {
  function routed(overrides: Partial<s_routed_event> = {}): s_routed_event {
    return {
      level: e_event_level.warning,
      response: e_event_response.log,
      category_index: 3,
      category_has_log: true,
      global_log_level: e_event_level.error,
      ...overrides,
    };
  }

  it("primary needs the log bit and the global level", () => {
    const route = "primary";
    expect(event_log_route_matches(route, routed())).toBe(false);
    expect(
      event_log_route_matches(route, routed({ level: e_event_level.error }))
    ).toBe(true);
    expect(
      event_log_route_matches(
        route,
        routed({
          level: e_event_level.error,
          response: e_event_response.console,
        })
      )
    ).toBe(false);
  });

  it("primary_or_unfiled also takes categories with no file", () => {
    const route = "primary_or_unfiled";
    expect(event_log_route_matches(route, routed())).toBe(false);
    expect(
      event_log_route_matches(route, routed({ category_has_log: false }))
    ).toBe(true);
  });

  it("full, remote and uncategorized", () => {
    expect(event_log_route_matches("full", routed())).toBe(true);
    expect(
      event_log_route_matches(
        "full",
        routed({ response: e_event_response.console })
      )
    ).toBe(false);
    expect(event_log_route_matches("remote", routed())).toBe(false);
    expect(
      event_log_route_matches(
        "remote",
        routed({ response: e_event_response.remote_log })
      )
    ).toBe(true);
    expect(event_log_route_matches("uncategorized", routed())).toBe(false);
    expect(
      event_log_route_matches("uncategorized", routed({ category_index: 0 }))
    ).toBe(true);
    expect(
      event_log_route_matches(
        "uncategorized",
        routed({ category_index: 0, response: 0 })
      )
    ).toBe(false);
  });
});
