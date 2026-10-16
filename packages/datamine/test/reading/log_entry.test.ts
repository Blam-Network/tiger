import { describe, expect, it } from "vitest";
import { event_parse_categories } from "../../src/blam/cseries/event_categories.ts";
import { e_event_level } from "../../src/blam/cseries/event_levels.ts";
import {
  log_category_split,
  log_level_from_text,
} from "../../src/reading/log_entry.ts";

describe("log_category_split", () => {
  it("splits the prefix and the message", () => {
    expect(log_category_split("networking:session: join failed")).toEqual({
      categories: ["networking", "session"],
      category_path: "networking:session",
      message: "join failed",
    });
  });

  it("lowercases and keeps text with no prefix whole", () => {
    expect(log_category_split("Hs:Evaluate: go").categories).toEqual([
      "hs",
      "evaluate",
    ]);
    expect(log_category_split("no prefix here")).toEqual({
      categories: [],
      category_path: "",
      message: "no prefix here",
    });
  });

  it("stops at the first thing that is not a segment", () => {
    expect(log_category_split("http://x").categories).toEqual(["http"]);
    expect(log_category_split("a:b c:d").categories).toEqual(["a"]);
    expect(log_category_split("a:b: c:d").categories).toEqual(["a", "b"]);
    expect(log_category_split("a:b:").message).toBe("");
  });

  it("agrees with event_parse_categories", () => {
    const texts = [
      "networking:session: hi",
      "design:hs: not a function",
      "hello world",
      "a-b_c:d1: x",
      "a:b:c:d:e:f:g:h:i:j: deep",
      "x: y: z",
    ];
    for (const text of texts) {
      expect(log_category_split(text).categories).toEqual(
        event_parse_categories(text).names
      );
    }
  });
});

describe("log_level_from_text", () => {
  it("reads every severity column", () => {
    expect(log_level_from_text("verbose")).toBe(e_event_level.verbose);
    expect(log_level_from_text("status ")).toBe(e_event_level.status);
    expect(log_level_from_text("WARNING")).toBe(e_event_level.warning);
    expect(log_level_from_text("-ERROR-")).toBe(e_event_level.error);
    expect(log_level_from_text("-FATAL-")).toBe(e_event_level.critical);
    expect(log_level_from_text("-CRITICAL-")).toBe(e_event_level.critical);
    expect(log_level_from_text("critical")).toBe(e_event_level.critical);
    expect(log_level_from_text("Unknown (63)")).toBeUndefined();
    expect(log_level_from_text("")).toBeUndefined();
  });
});
