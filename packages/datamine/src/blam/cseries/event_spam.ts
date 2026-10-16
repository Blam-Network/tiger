// Event spam prevention: the per-category filter (event_update_spam_prevention and
// add_event_to_spamming_list) and the console line limiter (console_update_spam_prevention).
import { e_event_level } from "./event_levels.ts";
import {
  e_event_response,
  event_response_test,
  type t_event_response_flags,
} from "./event_response.ts";

// "console_only": suppression only clears the console bit, so logs and datamine still get the
// event. "faithful": the original, a suppressed event loses every response bit, including log
// and datamine. "disabled": nothing is suppressed.
export type t_event_spam_mode = "console_only" | "faithful" | "disabled";

// Size of the event text buffer; the spam table compares and stores 2047 characters.
export const k_error_message_buffer_maximum_size = 2048;

// Per-category filter. The original marks these "$todo constant"; the names are ours.
export const k_event_spam_window_ms = 10_000;
export const k_event_spam_count_threshold = 5;
// An event is dropped once its text has been hit more than this many times before.
export const k_event_spam_hit_count_threshold = 1;

export const k_maximum_spamming_events = 64;
export const k_spamming_event_display_timeout = 3000;
// The debug renderer lists an entry once it has been hit this many times.
export const k_spamming_event_display_hit_count = 2;

// Console limiter. Same story: literals in the original.
export const k_console_spam_threshold = 5;
export const k_console_spam_reset_ms = 10_000;
export const k_console_spam_decay_interval_ms = 2000;
export const k_console_spam_notice =
  "too many errors, only printing to debug.txt";
// status_printf text the original shows every time a line is suppressed.
export const k_console_spam_status = "suppressing events";

// The part of a category the filter reads and writes.
export interface s_event_spam_state {
  last_event_time: number;
  possible_spam_event_count: number;
}

export interface s_spamming_event {
  hit_count: number;
  last_spam_time: number;
  spam_text: string;
}

export interface s_event_spamming_list_add_result {
  // Hits before this one; 0 when the text was just added or the table is full.
  hit_count: number;
  last_spam_time: number;
}

export class c_event_spam_filter {
  private readonly m_spamming_events: (s_spamming_event | undefined)[] =
    new Array(k_maximum_spamming_events).fill(undefined);
  private m_mode: t_event_spam_mode;

  constructor(mode: t_event_spam_mode = "console_only") {
    this.m_mode = mode;
  }

  get mode(): t_event_spam_mode {
    return this.m_mode;
  }

  set_mode(mode: t_event_spam_mode): void {
    this.m_mode = mode;
  }

  reset(): void {
    this.m_spamming_events.fill(undefined);
  }

  // event_update_spam_prevention. Only events below critical that want the console and are
  // not forced to it are counted. After 5 such events in a category, with gaps under 10
  // seconds, identical text is dropped from its third hit on.
  update(
    category: s_event_spam_state,
    level: e_event_level,
    response: t_event_response_flags,
    text: string,
    now_ms: number
  ): t_event_response_flags {
    if (
      this.m_mode === "disabled" ||
      level === e_event_level.critical ||
      !event_response_test(response, e_event_response.console) ||
      event_response_test(response, e_event_response.console_force)
    ) {
      return response;
    }

    if (now_ms > category.last_event_time + k_event_spam_window_ms) {
      category.possible_spam_event_count = 0;
    }
    category.possible_spam_event_count++;
    category.last_event_time = now_ms;

    if (category.possible_spam_event_count < k_event_spam_count_threshold) {
      return response;
    }
    const result = this.add_event_to_spamming_list(text, now_ms);
    if (result.hit_count <= k_event_spam_hit_count_threshold) {
      return response;
    }
    return this.m_mode === "faithful"
      ? 0
      : response & ~e_event_response.console;
  }

  // add_event_to_spamming_list. The original only forgets a slot inside its debug
  // renderer, so on a build that never renders, spammed text stays suppressed forever.
  // Slots here expire on access instead, 3 seconds after their last hit.
  add_event_to_spamming_list(
    text: string,
    now_ms: number
  ): s_event_spamming_list_add_result {
    this.expire(now_ms);
    const key = text.slice(0, k_error_message_buffer_maximum_size - 1);
    const result: s_event_spamming_list_add_result = {
      last_spam_time: 0,
      hit_count: 0,
    };
    let first_empty_index = -1;
    let found = false;

    for (let index = 0; index < this.m_spamming_events.length; index++) {
      const entry = this.m_spamming_events[index];
      if (entry) {
        if (entry.spam_text === key) {
          found = true;
          result.hit_count = entry.hit_count;
          result.last_spam_time = entry.last_spam_time;
          entry.hit_count++;
          entry.last_spam_time = now_ms;
        }
      } else if (first_empty_index === -1) {
        first_empty_index = index;
      }
    }

    if (!found && first_empty_index !== -1) {
      this.m_spamming_events[first_empty_index] = {
        last_spam_time: now_ms,
        hit_count: 1,
        spam_text: key,
      };
    }
    return result;
  }

  // What the original debug renderer lists: live entries with enough hits.
  active_entries(now_ms: number): s_spamming_event[] {
    this.expire(now_ms);
    return this.m_spamming_events
      .filter(
        (entry): entry is s_spamming_event =>
          entry !== undefined &&
          entry.hit_count >= k_spamming_event_display_hit_count
      )
      .map((entry) => ({ ...entry }));
  }

  private expire(now_ms: number): void {
    for (let index = 0; index < this.m_spamming_events.length; index++) {
      const entry = this.m_spamming_events[index];
      if (
        entry &&
        now_ms - entry.last_spam_time > k_spamming_event_display_timeout
      ) {
        this.m_spamming_events[index] = undefined;
      }
    }
  }
}

export interface s_console_spam_result {
  // Set on the line that trips the limit; goes to the terminal in white.
  notice?: string;
  // False means the line is only written to debug output, not the on-screen console.
  print: boolean;
}

// console_update_spam_prevention. The caller skips it for critical events and when spam
// suppression is off.
export class c_console_spam_limiter {
  private m_old_time = 0;
  private m_count = 0;
  private m_old_line_check_time = 0;

  reset(): void {
    this.m_old_time = 0;
    this.m_count = 0;
    this.m_old_line_check_time = 0;
  }

  update(now_ms: number): s_console_spam_result {
    if (this.m_count === 0) {
      this.m_old_line_check_time = now_ms;
    }
    this.m_count++;

    if (
      this.m_count < k_console_spam_threshold &&
      now_ms > this.m_old_line_check_time + k_console_spam_decay_interval_ms
    ) {
      const count_delta = Math.trunc(
        (now_ms - this.m_old_line_check_time) / k_console_spam_decay_interval_ms
      );
      this.m_count = Math.max(0, this.m_count - count_delta);
      // Almost certainly meant to advance by count_delta * 2000. Kept as is: with the
      // check time barely moving, the next line decays the count again.
      this.m_old_line_check_time += 5 * count_delta;
    }

    if (now_ms > this.m_old_time + k_console_spam_reset_ms) {
      this.m_count = 0;
      this.m_old_time = now_ms;
    }

    const result: s_console_spam_result = {
      print: this.m_count < k_console_spam_threshold,
    };
    if (this.m_count === k_console_spam_threshold) {
      result.notice = k_console_spam_notice;
    }
    return result;
  }
}
