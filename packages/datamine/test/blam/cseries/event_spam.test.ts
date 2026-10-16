// biome-ignore-all lint/suspicious/noBitwiseOperators: response flags are bit masks
import { describe, expect, it } from "vitest";
import { e_event_level } from "../../../src/blam/cseries/event_levels.ts";
import { e_event_response } from "../../../src/blam/cseries/event_response.ts";
import {
  c_console_spam_limiter,
  c_event_spam_filter,
  k_console_spam_notice,
  k_maximum_spamming_events,
  type s_event_spam_state,
} from "../../../src/blam/cseries/event_spam.ts";

const k_all =
  e_event_response.console | e_event_response.log | e_event_response.remote_log;

function make_category(): s_event_spam_state {
  return { last_event_time: 0, possible_spam_event_count: 0 };
}

// Feeds the same text n times, 100 ms apart, and returns every result.
function feed(
  filter: c_event_spam_filter,
  category: s_event_spam_state,
  count: number,
  start_ms: number,
  text = "same",
  level: e_event_level = e_event_level.warning,
  response = k_all
) {
  const results: number[] = [];
  for (let i = 0; i < count; i++) {
    results.push(
      filter.update(category, level, response, text, start_ms + i * 100)
    );
  }
  return results;
}

describe("c_event_spam_filter", () => {
  it("lets the first events through, then suppresses repeats from the 7th", () => {
    const filter = new c_event_spam_filter();
    const category = make_category();
    // Counts 1-4 pass untouched; count 5 adds the text (hit 0), 6 is hit 1, 7 is hit 2.
    const results = feed(filter, category, 8, 100_000);
    const console_bit = e_event_response.console;
    expect(results.map((r) => (r & console_bit) !== 0)).toEqual([
      true,
      true,
      true,
      true,
      true,
      true,
      false,
      false,
    ]);
  });

  it("console_only keeps log and datamine, faithful clears everything", () => {
    const console_only = new c_event_spam_filter("console_only");
    const faithful = new c_event_spam_filter("faithful");
    const a = feed(console_only, make_category(), 7, 100_000);
    const b = feed(faithful, make_category(), 7, 100_000);
    expect(a[6]).toBe(e_event_response.log | e_event_response.remote_log);
    expect(b[6]).toBe(0);
  });

  it("disabled never touches the response", () => {
    const filter = new c_event_spam_filter("disabled");
    const results = feed(filter, make_category(), 20, 100_000);
    expect(new Set(results)).toEqual(new Set([k_all]));
    expect(filter.active_entries(100_000 + 2000)).toEqual([]);
  });

  it("skips critical, forced and non-console events without counting them", () => {
    const filter = new c_event_spam_filter();
    const category = make_category();
    const critical = feed(
      filter,
      category,
      10,
      100_000,
      "x",
      e_event_level.critical
    );
    expect(new Set(critical)).toEqual(new Set([k_all]));
    const forced = feed(
      filter,
      category,
      10,
      101_000,
      "x",
      e_event_level.warning,
      k_all | e_event_response.console_force
    );
    expect(forced.every((r) => (r & e_event_response.console) !== 0)).toBe(
      true
    );
    const log_only = feed(
      filter,
      category,
      10,
      102_000,
      "x",
      e_event_level.warning,
      e_event_response.log
    );
    expect(new Set(log_only)).toEqual(new Set([e_event_response.log]));
    expect(category.possible_spam_event_count).toBe(0);
  });

  it("restarts the category count after 10 seconds of quiet", () => {
    const filter = new c_event_spam_filter();
    const category = make_category();
    feed(filter, category, 4, 100_000);
    expect(category.possible_spam_event_count).toBe(4);
    // The first call is at 111_000, over 10000 ms after the last event at 100_300.
    const results = feed(filter, category, 1, 111_000);
    expect(category.possible_spam_event_count).toBe(1);
    expect(results[0]).toBe(k_all);
  });

  it("only suppresses identical text", () => {
    const filter = new c_event_spam_filter();
    const category = make_category();
    const results: number[] = [];
    for (let i = 0; i < 10; i++) {
      results.push(
        filter.update(
          category,
          e_event_level.warning,
          k_all,
          `line ${i}`,
          100_000 + i
        )
      );
    }
    expect(new Set(results)).toEqual(new Set([k_all]));
  });

  it("returns the hit count from before the hit", () => {
    const filter = new c_event_spam_filter();
    expect(filter.add_event_to_spamming_list("t", 1000).hit_count).toBe(0);
    expect(filter.add_event_to_spamming_list("t", 1100).hit_count).toBe(1);
    const third = filter.add_event_to_spamming_list("t", 1200);
    expect(third).toEqual({ last_spam_time: 1100, hit_count: 2 });
  });

  it("expires slots 3 seconds after the last hit, on access", () => {
    const filter = new c_event_spam_filter();
    filter.add_event_to_spamming_list("t", 1000);
    filter.add_event_to_spamming_list("t", 1100);
    expect(filter.active_entries(4100).map((e) => e.spam_text)).toEqual(["t"]);
    expect(filter.active_entries(4101)).toEqual([]);
    // Back to a fresh slot.
    expect(filter.add_event_to_spamming_list("t", 5000).hit_count).toBe(0);
  });

  it("lists active entries with their hit counts", () => {
    const filter = new c_event_spam_filter();
    filter.add_event_to_spamming_list("once", 1000);
    filter.add_event_to_spamming_list("twice", 1000);
    filter.add_event_to_spamming_list("twice", 1010);
    filter.add_event_to_spamming_list("twice", 1020);
    expect(filter.active_entries(1500)).toEqual([
      { spam_text: "twice", hit_count: 3, last_spam_time: 1020 },
    ]);
  });

  it("stops adding when the 64 slot table is full", () => {
    const filter = new c_event_spam_filter();
    for (let i = 0; i < k_maximum_spamming_events; i++) {
      filter.add_event_to_spamming_list(`text ${i}`, 1000);
    }
    const overflow = filter.add_event_to_spamming_list("extra", 1000);
    expect(overflow.hit_count).toBe(0);
    // Not stored, so it never builds up hits.
    expect(filter.add_event_to_spamming_list("extra", 1001).hit_count).toBe(0);
    // Existing text still counts.
    expect(filter.add_event_to_spamming_list("text 3", 1002).hit_count).toBe(1);
  });
});

describe("c_console_spam_limiter", () => {
  it("prints freely, then notices and suppresses at the 5th counted line", () => {
    const limiter = new c_console_spam_limiter();
    // The first call after startup is more than 10 seconds past old_time (0), so it
    // resets the count and is not counted.
    const start = 100_000;
    expect(limiter.update(start)).toEqual({ print: true });
    const results: { print: boolean; notice?: string }[] = [];
    for (let i = 1; i <= 7; i++) {
      results.push(limiter.update(start + i * 10));
    }
    expect(results).toEqual([
      { print: true },
      { print: true },
      { print: true },
      { print: true },
      { print: false, notice: k_console_spam_notice },
      { print: false },
      { print: false },
    ]);
    expect(k_console_spam_notice).toBe(
      "too many errors, only printing to debug.txt"
    );
  });

  it("recovers after more than 10 seconds", () => {
    const limiter = new c_console_spam_limiter();
    const start = 100_000;
    for (let i = 0; i < 10; i++) {
      limiter.update(start + i * 10);
    }
    expect(limiter.update(start + 5000).print).toBe(false);
    expect(limiter.update(start + 10_000).print).toBe(false);
    // old_time was set by the first call at 100_000.
    expect(limiter.update(start + 10_001)).toEqual({ print: true });
    expect(limiter.update(start + 10_002)).toEqual({ print: true });
  });

  it("decays the count slowly when lines are spread out", () => {
    const limiter = new c_console_spam_limiter();
    const start = 100_000;
    limiter.update(start);
    // One line every 2.5 seconds never reaches 5 inside the decay window.
    for (let i = 1; i <= 3; i++) {
      expect(limiter.update(start + i * 2500).print).toBe(true);
    }
    expect(limiter.update(start + 9000).print).toBe(true);
  });

  it("reset clears the state", () => {
    const limiter = new c_console_spam_limiter();
    for (let i = 0; i < 10; i++) {
      limiter.update(100_000 + i);
    }
    limiter.reset();
    expect(limiter.update(100_020)).toEqual({ print: true });
  });
});
