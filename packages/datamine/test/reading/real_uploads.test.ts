// Real Ares datamine uploads (layout 1.1, little endian), with the personal data swapped
// for fakes of the same length: machine name testbox, XUID 0x123456789ABC, public IP
// 192.0.2.70, made up player and machine identifiers. Two of them end in a partial record.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { date_from_filetime } from "../../src/blam/cseries/cseries_time.ts";
import { e_datamine_parameter_type } from "../../src/blam/data_mining/data_mining.ts";
import {
  encode_datamine_file,
  read_datamine_file,
  read_datamine_upload,
  type s_datamine_file,
  type s_datamine_file_event,
  type s_datamine_file_occurrence,
} from "../../src/data_mine_reader.ts";
import {
  datamine_record_format_text,
  log_entries_from_datamine,
} from "../../src/reading/log_datamine.ts";

const k_fixture_dir = join(import.meta.dirname, "../fixtures/ares");

function read_fixture(name: string): Buffer {
  return readFileSync(join(k_fixture_dir, name));
}

// Events and occurrences, skipping definitions, which carry no record.
function records_of(file: s_datamine_file) {
  return file.records.filter(
    (entry): entry is s_datamine_file_event | s_datamine_file_occurrence =>
      entry.kind !== "definition"
  );
}

function record_at(file: s_datamine_file, index: number) {
  const entry = records_of(file).at(index);
  if (!entry) {
    throw new Error(`no record ${index}`);
  }
  return entry.record;
}

function find_record(file: s_datamine_file, event_name_part: string) {
  const entry = records_of(file).find((candidate) =>
    candidate.record.event_name.includes(event_name_part)
  );
  if (!entry) {
    throw new Error(`no record matching ${event_name_part}`);
  }
  return entry.record;
}

interface s_fixture_expectation {
  first: {
    categories: string[];
    event_index: number;
    priority: number;
    text: string;
  };
  last_event_index: number;
  name: string;
  records: number;
  session_start: string;
  sessionid: string;
  size: number;
  truncated_at?: number;
}

const k_startup_text =
  "design:hs: this is not a valid function or script name.: %.*s";

const k_fixtures: s_fixture_expectation[] = [
  {
    name: "ares_session_a_startup.datamine",
    size: 101_816,
    sessionid: "Sat_10172026_053137@x64@pc@win@testbox",
    session_start: "2026-10-16T20:31:38.053Z",
    records: 58,
    last_event_index: 58,
    first: {
      priority: 5,
      categories: ["root", "design", "hs"],
      event_index: 1,
      text: k_startup_text,
    },
  },
  {
    name: "ares_session_a_lobby_truncated.datamine",
    size: 458_752,
    sessionid: "Sat_10172026_053137@x64@pc@win@testbox",
    session_start: "2026-10-16T20:31:38.053Z",
    records: 250,
    last_event_index: 308,
    truncated_at: 457_757,
    first: {
      priority: 2,
      categories: ["root", "networking", "logic", "session"],
      event_index: 59,
      text: "networking:logic:session: local user 0 set player identifier=6b:12:f0:3d:aa:57:94:c2",
    },
  },
  {
    name: "ares_session_b_campaign_truncated.datamine",
    size: 983_040,
    sessionid: "Sat_10172026_052919@x64@pc@win@testbox",
    session_start: "2026-10-16T20:29:20.728Z",
    records: 525,
    last_event_index: 585,
    truncated_at: 982_331,
    first: {
      priority: 2,
      categories: ["root", "networking", "logic", "session"],
      event_index: 61,
      text: "networking:logic:session: local user 0 set player identifier=5a:3c:11:7e:0b:42:d8:61",
    },
  },
  {
    name: "ares_session_c_startup.datamine",
    size: 105_272,
    sessionid: "Sat_10172026_055509@x64@pc@win@testbox",
    session_start: "2026-10-16T20:55:10.811Z",
    records: 60,
    last_event_index: 60,
    first: {
      priority: 5,
      categories: ["root", "design", "hs"],
      event_index: 1,
      text: k_startup_text,
    },
  },
  {
    name: "ares_session_c_lobby.datamine",
    size: 287_286,
    sessionid: "Sat_10172026_055509@x64@pc@win@testbox",
    session_start: "2026-10-16T20:55:10.811Z",
    records: 158,
    last_event_index: 218,
    first: {
      priority: 2,
      categories: ["root", "networking", "logic", "session"],
      event_index: 61,
      text: "networking:logic:session: local user 0 set player identifier=7d:e4:08:9b:31:c6:52:a0",
    },
  },
  {
    name: "ares_session_d_startup.datamine",
    size: 113_812,
    sessionid: "Mon_10192026_153149@x64@pc@win@testbox",
    session_start: "2026-10-19T06:31:50.204Z",
    records: 65,
    last_event_index: 65,
    first: {
      priority: 5,
      categories: ["root", "design", "hs"],
      event_index: 1,
      text: k_startup_text,
    },
  },
];

describe("real ares uploads", () => {
  for (const fixture of k_fixtures) {
    describe(fixture.name, () => {
      const bytes = read_fixture(fixture.name);
      const file = read_datamine_file(bytes);

      it("reads the 1.1 little endian header", () => {
        expect(bytes.length).toBe(fixture.size);
        expect(file.header).toMatchObject({
          layout: "1.1",
          byte_order: "little",
          version_major: 1,
          version_minor: 1,
          sessionid: fixture.sessionid,
          build_string: "untracked version",
          build_number: -1,
          systemid: "x64@pc@win@testbox",
          title: "ares",
        });
        expect(
          date_from_filetime(file.header.session_start_date).toISOString()
        ).toBe(fixture.session_start);
      });

      it("reads every record", () => {
        expect(file.records).toHaveLength(fixture.records);
        expect(file.records.every((entry) => entry.kind === "event")).toBe(
          true
        );
        expect(file.truncated_at).toBe(fixture.truncated_at);
        expect(record_at(file, -1).event_index).toBe(fixture.last_event_index);
      });

      it("decodes the first record", () => {
        const first = record_at(file, 0);
        expect(first.priority).toBe(fixture.first.priority);
        expect(first.categories).toEqual(fixture.first.categories);
        expect(first.event_index).toBe(fixture.first.event_index);
        expect(datamine_record_format_text(first)).toBe(fixture.first.text);
        expect(first.event_date).toBeGreaterThan(
          file.header.session_start_date
        );
      });

      it("re-encodes to the same bytes", () => {
        const encoded = encode_datamine_file(file);
        const end = fixture.truncated_at ?? bytes.length;
        expect(encoded.length).toBe(end);
        expect(encoded.equals(bytes.subarray(0, end))).toBe(true);
      });

      it("turns into log entries", () => {
        const entries = log_entries_from_datamine(file);
        // The session row, then one per record.
        expect(entries).toHaveLength(fixture.records + 1);
      });
    });
  }

  it("keeps the partial record past truncated_at", () => {
    const bytes = read_fixture("ares_session_b_campaign_truncated.datamine");
    const file = read_datamine_file(bytes);
    const tail = bytes.subarray(file.truncated_at);
    // The size field claims more than is left.
    expect(tail.readUInt32LE(0)).toBeGreaterThan(tail.length);
    expect(tail.subarray(4, 30).toString("latin1")).toBe(
      "networking:observer:stream"
    );
  });

  it("decodes int64 and string parameters", () => {
    const file = read_datamine_file(
      read_fixture("ares_session_b_campaign_truncated.datamine")
    );
    const xuid = find_record(file, "set player xuid");
    expect(datamine_record_format_text(xuid)).toBe(
      "networking:logic:session: local user 0 set player xuid=123456789ABC, live=1, online=1, free=0, user_content=1, friend_content=1"
    );
    expect(xuid.parameters[8]).toEqual({
      name: "",
      type: e_datamine_parameter_type.int64,
      value: 0x12_34_56_78_9a_bcn,
    });

    const game_start = find_record(file, "game start");
    expect(game_start.event_name).toBe("game start");
    expect(game_start.categories).toEqual(["main"]);
    expect(game_start.game_info.map).toBe("maps\\005_intro");
    expect(game_start.parameters.map((parameter) => parameter.name)).toEqual([
      "camera.x",
      "camera.y",
      "camera.z",
      "mission segment",
      "user experience",
    ]);
    expect(game_start.parameters[3]?.value).toBe("mission_start");
  });

  it("decodes the resolved public address", () => {
    const file = read_datamine_file(
      read_fixture("ares_session_a_startup.datamine")
    );
    expect(datamine_record_format_text(find_record(file, "public ip"))).toBe(
      "networking: resolved public ip address -> 0000.0000.0000.0000.0000.FFFF.C000.0246"
    );
  });

  it("reads the zipped upload", () => {
    const raw = read_fixture("ares_session_a_startup.datamine");
    const upload = read_datamine_upload(
      read_fixture("ares_session_a_startup.zip")
    );
    expect(upload).toEqual(read_datamine_file(raw));
    expect(upload.header.sessionid).toBe(
      "Sat_10172026_053137@x64@pc@win@testbox"
    );
    expect(upload.records).toHaveLength(58);
    expect(upload.truncated_at).toBeUndefined();
    expect(encode_datamine_file(upload).equals(raw)).toBe(true);
  });
});
