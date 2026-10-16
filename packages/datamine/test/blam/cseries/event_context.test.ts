import { afterEach, describe, expect, it } from "vitest";
import {
  event_context_depth,
  event_context_get,
  event_context_run,
  event_context_set_overflow_handler,
  k_event_context_stack_maximum_depth,
} from "../../../src/blam/cseries/event_context.ts";

afterEach(() => {
  event_context_set_overflow_handler(undefined);
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe("event_context", () => {
  it("is empty outside a context", () => {
    expect(event_context_depth()).toBe(0);
    expect(event_context_get("console")).toBe("");
    expect(event_context_get("log")).toBe("");
    expect(event_context_get("remote_log")).toBe("");
  });

  it("nests and pops when the callback returns", () => {
    const result = event_context_run("session", "squad", () => {
      expect(event_context_depth()).toBe(1);
      return event_context_run("tag", "weapon", () => {
        expect(event_context_depth()).toBe(2);
        return 42;
      });
    });
    expect(result).toBe(42);
    expect(event_context_depth()).toBe(0);
  });

  it("formats the log form innermost first", () => {
    event_context_run("session", "squad", () => {
      expect(event_context_get("log")).toBe("[(session)squad]");
      event_context_run("tag", "weapon", () => {
        expect(event_context_get("log")).toBe("[(tag)weapon:(session)squad]");
        expect(event_context_get("remote_log")).toBe(
          "[(tag)weapon:(session)squad]"
        );
      });
    });
  });

  it("formats the console form outermost first, only for shown contexts", () => {
    event_context_run(
      "a",
      "first",
      () => {
        event_context_run(
          "b",
          "second",
          () => {
            event_context_run(
              "c",
              "third",
              () => {
                expect(event_context_get("console")).toBe("first:second:third");
              },
              { display_to_console: true }
            );
          },
          { display_to_console: true }
        );
      },
      { display_to_console: true }
    );

    event_context_run("a", "hidden", () => {
      event_context_run(
        "b",
        "shown",
        () => {
          expect(event_context_get("console")).toBe("shown");
          event_context_run("c", "hidden too", () => {
            // A shown context below the innermost one keeps its separator.
            expect(event_context_get("console")).toBe("shown:");
          });
        },
        { display_to_console: true }
      );
    });
  });

  it("keeps concurrent async flows apart", async () => {
    const seen: string[] = [];
    const flow = (name: string, delay: number) =>
      event_context_run("flow", name, async () => {
        await sleep(delay);
        seen.push(event_context_get("log"));
        await event_context_run("inner", `${name}-inner`, async () => {
          await sleep(delay);
          seen.push(event_context_get("log"));
        });
        seen.push(event_context_get("log"));
      });

    await Promise.all([flow("a", 10), flow("b", 3)]);

    expect(seen.filter((text) => text.includes("a"))).toEqual([
      "[(flow)a]",
      "[(inner)a-inner:(flow)a]",
      "[(flow)a]",
    ]);
    expect(seen.filter((text) => text.includes("b"))).toEqual([
      "[(flow)b]",
      "[(inner)b-inner:(flow)b]",
      "[(flow)b]",
    ]);
    expect(event_context_depth()).toBe(0);
  });

  it("runs without pushing and calls the handler on overflow", () => {
    let overflows = 0;
    event_context_set_overflow_handler(() => {
      overflows++;
    });
    const nest = (depth: number): number => {
      if (depth === k_event_context_stack_maximum_depth + 2) {
        return event_context_depth();
      }
      return event_context_run("t", `d${depth}`, () => nest(depth + 1));
    };
    expect(nest(0)).toBe(k_event_context_stack_maximum_depth);
    expect(overflows).toBe(2);
    expect(event_context_depth()).toBe(0);
  });

  it("truncates type and description to size - 1", () => {
    event_context_run("t".repeat(100), "d".repeat(200), () => {
      const text = event_context_get("log");
      expect(text).toBe(`[(${"t".repeat(63)})${"d".repeat(127)}]`);
    });
  });
});
