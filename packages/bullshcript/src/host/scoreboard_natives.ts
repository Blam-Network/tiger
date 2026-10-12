// Scoreboard (row type 15) verbs and the rule engine that feeds it - the
// receiver-side split of natives.ts's LuaBoundObject.

import { isTruthy, type LuaValue, toNumber } from "../hks/values.ts";
import type { ScoreboardRule, ScoreboardStatEntry } from "./items.ts";
import { FNV1_EMPTY, fnv1 } from "./name_hash.ts";
import { type LuaBoundObject, resolveStringHash, rowKind } from "./natives.ts";

// The scoreboard "score" column, shared by name_hash between a team's and a
// player's block - add_player_score/get_team_score's target.
const SCOREBOARD_SCORE_HASH = fnv1("score");
// Scope mask bits on a ScoreboardRule (byte offset +0xD).
const SCOREBOARD_SCOPE_PLAYER = 1;
const SCOREBOARD_SCOPE_TEAM = 2;
const SCOREBOARD_SCOPE_GLOBAL = 4;

// Built on first write, keyed per player or team.
function mapDefault<K>(
  map: Map<K, Map<number, number>>,
  key: K
): Map<number, number> {
  let value = map.get(key);
  if (!value) {
    value = new Map();
    map.set(key, value);
  }
  return value;
}

// Stack bytecode: 3C n push var, 34 n push const, 01 add, 02 sub, 3E end;
// 09/04 read as max/divide (true ops unknown); anything else stops the run.
function runScoreboardBytecode(
  bytecode: readonly number[],
  consts: readonly number[],
  readVar: (index: number) => number
): number {
  const stack: number[] = [];
  const pop2 = (): [number, number] => {
    const b = stack.pop() ?? 0;
    const a = stack.pop() ?? 0;
    return [a, b];
  };
  for (let i = 0; i < bytecode.length; ) {
    const op = bytecode[i++];
    switch (op) {
      case 0x3c:
        stack.push(readVar(bytecode[i++] ?? 0));
        break;
      case 0x34:
        stack.push(consts[bytecode[i++] ?? 0] ?? 0);
        break;
      case 0x01: {
        const [a, b] = pop2();
        stack.push(a + b);
        break;
      }
      case 0x02: {
        const [a, b] = pop2();
        stack.push(a - b);
        break;
      }
      case 0x09: {
        const [a, b] = pop2();
        stack.push(Math.max(a, b));
        break;
      }
      case 0x04: {
        const [a, b] = pop2();
        stack.push(b === 0 ? 0 : a / b);
        break;
      }
      case 0x3e:
        return stack.at(-1) ?? 0;
      default:
        return stack.at(-1) ?? 0;
    }
  }
  return stack.at(-1) ?? 0;
}

// Scoreboard (row type 15, dispatched ahead of the generic switch like Lifetime
// above): c_scoreboard_script_utilities' get_scoreboard() answer's own 8 verbs.
export function scoreboardVerb(
  self: LuaBoundObject,
  method: string,
  args: readonly LuaValue[]
): LuaValue | undefined {
  switch (method) {
    case "add_player_score":
      return addPlayerScore(
        self,
        typeof args[0] === "string" ? args[0] : undefined,
        toNumber(args[1]) ?? 0,
        isTruthy(args[2])
      );
    case "get_team_score":
      return getScoreboardTeamStat(
        self,
        SCOREBOARD_SCORE_HASH,
        toNumber(args[0]) ?? -1
      );
    case "get_team_stat":
      return getScoreboardTeamStat(
        self,
        resolveStringHash(args[0]) ?? FNV1_EMPTY,
        toNumber(args[1]) ?? -1
      );
    case "get_leading_team_score":
      return leadingScoreboardTeam(self)?.score ?? 0;
    case "get_leading_team_index":
      return leadingScoreboardTeam(self)?.team ?? -1;
    case "is_tied":
      return scoreboardIsTied(self);
    case "activate_notification_for_team":
      return activateScoreboardNotification(
        self,
        resolveStringHash(args[0]),
        toNumber(args[1]) ?? -1
      );
    case "clear_notifications":
      self.scoreboardNotifications = [];
      return pushScoreboard(self, "clear_notifications()");
    default:
      return;
  }
}

// Every dominion rule named `incidentName`; an unresolved audience skips it.
export function applyScoreboardIncident(
  self: LuaBoundObject,
  incidentName: number,
  resolvePlayers: (audienceHash: number) => readonly string[] | undefined
): void {
  for (const rule of self.context.scoreboardDefinition?.rules ?? []) {
    if (rule.incidentName !== incidentName) {
      continue;
    }
    const players = resolvePlayers(rule.audience);
    if (players && players.length > 0) {
      applyScoreboardRule(self, rule, players, undefined);
    }
  }
}

// Synthetic one-team metadata: every rule named `incidentName` applies.
export function applyScoreboardTeamIncident(
  self: LuaBoundObject,
  incidentName: number,
  team: number
): void {
  for (const rule of self.context.scoreboardDefinition?.rules ?? []) {
    if (rule.incidentName === incidentName) {
      applyScoreboardRule(self, rule, [], team);
    }
  }
}

// Runs `rule`'s bytecode against every column scope its flags name (1 player, 2
// team, 4 global, ORed).
export function applyScoreboardRule(
  self: LuaBoundObject,
  rule: ScoreboardRule,
  players: readonly string[],
  team: number | undefined
): void {
  let changed = false;
  const run = (current: number) =>
    runScoreboardBytecode(rule.bytecode, rule.consts, () => current);
  if (rule.flags & SCOREBOARD_SCOPE_GLOBAL) {
    const value = run(self.scoreboardGlobal.get(rule.statName) ?? 0);
    self.scoreboardGlobal.set(rule.statName, value);
    changed = true;
  }
  if (rule.flags & SCOREBOARD_SCOPE_PLAYER) {
    for (const key of players) {
      const stats = mapDefault(self.scoreboardPlayers, key);
      stats.set(rule.statName, run(stats.get(rule.statName) ?? 0));
    }
    changed ||= players.length > 0;
  }
  if (rule.flags & SCOREBOARD_SCOPE_TEAM) {
    const teams = new Set<number>();
    if (team !== undefined) {
      teams.add(team);
    }
    for (const key of players) {
      const playerTeam = self.context
        .players()
        .find((player) => player.characterKey === key)?.team;
      if (playerTeam !== undefined) {
        teams.add(playerTeam);
      }
    }
    for (const t of teams) {
      const stats = mapDefault(self.scoreboardTeams, t);
      stats.set(rule.statName, run(stats.get(rule.statName) ?? 0));
    }
    changed ||= teams.size > 0;
  }
  if (changed) {
    pushScoreboard(
      self,
      `rule 0x${rule.incidentName.toString(16)}/0x${rule.audience.toString(16)} -> 0x${rule.statName.toString(16)}`
    );
  }
}

function getScoreboardTeamStat(
  self: LuaBoundObject,
  nameHash: number,
  team: number
): number {
  return self.scoreboardTeams.get(team)?.get(nameHash) ?? 0;
}

function addPlayerScore(
  self: LuaBoundObject,
  characterKey: string | undefined,
  amount: number,
  alsoTeam: boolean
): boolean {
  if (characterKey === undefined) {
    self.writer.note(
      `${self.path}:add_player_score(nil) (no character to credit)`
    );
    return true;
  }
  const stats = mapDefault(self.scoreboardPlayers, characterKey);
  stats.set(
    SCOREBOARD_SCORE_HASH,
    (stats.get(SCOREBOARD_SCORE_HASH) ?? 0) + amount
  );
  if (alsoTeam) {
    const team = self.context
      .players()
      .find((player) => player.characterKey === characterKey)?.team;
    if (team !== undefined) {
      const teamStats = mapDefault(self.scoreboardTeams, team);
      teamStats.set(
        SCOREBOARD_SCORE_HASH,
        (teamStats.get(SCOREBOARD_SCORE_HASH) ?? 0) + amount
      );
    }
  }
  return pushScoreboard(
    self,
    `add_player_score(${characterKey}, ${amount}, ${alsoTeam})`
  );
}

// Highest score first; empty when no team has a stat row yet.
function rankedScoreboardTeamScores(self: LuaBoundObject): number[] {
  return [...self.scoreboardTeams.values()]
    .map((stats) => stats.get(SCOREBOARD_SCORE_HASH) ?? 0)
    .sort((a, b) => b - a);
}

// Top two team scores equal, 0-0 included (an expired timer at 0-0 goes to
// sudden death).
function scoreboardIsTied(self: LuaBoundObject): boolean {
  const scores = rankedScoreboardTeamScores(self);
  return scores.length < 2 || scores[0] === scores[1];
}

// -1/0 (no leader) when tied - the client computes the lead itself, this
// is only the host's own bookkeeping read.
function leadingScoreboardTeam(
  self: LuaBoundObject
): { score: number; team: number } | undefined {
  if (scoreboardIsTied(self)) {
    return;
  }
  let best: { score: number; team: number } | undefined;
  for (const [team, stats] of self.scoreboardTeams) {
    const score = stats.get(SCOREBOARD_SCORE_HASH) ?? 0;
    if (!best || score > best.score) {
      best = { score, team };
    }
  }
  return best;
}

// Only "domination" exists in this build's defs; the client keeps at
// most 2 notifications, so a third drops the oldest.
function activateScoreboardNotification(
  self: LuaBoundObject,
  nameHash: number | undefined,
  team: number
): boolean {
  if (nameHash === undefined) {
    self.writer.note(
      `${self.path}:activate_notification_for_team(nil) (unresolved name)`
    );
    return true;
  }
  if (self.scoreboardNotifications.length >= 2) {
    self.scoreboardNotifications.shift();
  }
  self.scoreboardNotifications.push({ nameHash, team });
  return pushScoreboard(
    self,
    `activate_notification_for_team(0x${nameHash.toString(16)}, ${team})`
  );
}

function pushScoreboard(self: LuaBoundObject, label: string): boolean {
  if (self.row?.typeId !== self.types.Scoreboard) {
    self.writer.note(`${self.path} scoreboard ${label} (${rowKind(self.row)})`);
    return true;
  }
  const players = self.context.players();
  const statEntries = (stats: Map<number, number>): ScoreboardStatEntry[] =>
    [...stats].map(([nameHash, value]) => ({ nameHash, value }));
  self.writer.set(
    self.row,
    {
      kind: "scoreboard",
      state: {
        global: statEntries(self.scoreboardGlobal),
        notifications: [...self.scoreboardNotifications],
        players: [...self.scoreboardPlayers].map(([characterKey, stats]) => ({
          characterKey,
          team: players.find((player) => player.characterKey === characterKey)
            ?.team,
          stats: statEntries(stats),
        })),
        teams: [...self.scoreboardTeams].map(([team, stats]) => ({
          team,
          stats: statEntries(stats),
        })),
      },
    },
    `scoreboard ${label}`
  );
  return true;
}
