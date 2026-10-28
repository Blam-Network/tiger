// What the client and its simulation have reported about the world: one record
// per item, keyed by itemKey. A missing field means nothing reported yet.

export interface CapturableSense {
  locked: boolean;
  lockStamp: number;
  owner: number;
  progressTenths?: number;
  resetStamp: number;
}

export interface DeviceSense {
  position: number;
  positionStamp: number;
}

export interface ItemWorldRecord {
  // ActorSense flags 7/8 (Actor.is_bound).
  actorBound?: { flag7: boolean; flag8: boolean };
  actorCommandScript?: {
    cookieRunning?: number;
    heartbeat?: number;
    pcReached?: number;
  };
  actorDropAck?: { dropId?: number; inProgress: boolean };
  // The client's health fraction for the actor (2.3.1 ActorSense [8]).
  actorHealth?: number;
  // Where the build's sense says: the epoch the client's combatant last took
  // (ActorSense [0]) and whether it has had an actor since.
  actorStanding?: { epoch: number; standing: boolean };
  // Capturable sense 0x80802E50 per Object item.
  capturable?: CapturableSense;
  // SquadSense squad +452: live members with a real target.
  combatCount?: number;
  // Kills of a shared identifier credited to this squad (creditSharedKill).
  creditedKills?: number;
  // Deaths from alive-count drops; what a squad-scoped listener's get_count()
  // sums.
  deaths?: number;
  // An Object's device as the client holds it: its position and that
  // position's stamp.
  device?: DeviceSense;
  // ObjectFaction sense 0x80801620 per Object item.
  faction?: number;
  health?: { current: number; max: number };
  // Admission per squad (SquadAuth), pushed only when this moves.
  influencer?: number;
  // Mission-interactable sense 0x80802DA3: the used latch and its stamp.
  interactable?: { used: boolean; usedStamp: number };
  monitorCount?: number;
  objectAlive?: boolean;
  // Counts by objective slot.
  objectiveCounts?: Map<number, number>;
  safeZoneInside?: number;
  squadAlive?: number;
  // Per-cell failed-placement tally (SquadSense squad +0x110) for the current
  // epoch; cleared on an epoch bump.
  tally?: readonly number[];
  // Host time of the latest fire; nothing clears it but a script re-arm.
  triggerFiredAt?: number;
}

export class WorldState {
  private readonly records = new Map<string, ItemWorldRecord>();
  // Kills the incidents attribute, per victim import identifier: not an item.
  readonly identKills = new Map<number, number>();

  // Reads never create a record.
  at(key: string): ItemWorldRecord | undefined {
    return this.records.get(key);
  }

  // The record a report writes into.
  record(key: string): ItemWorldRecord {
    let record = this.records.get(key);
    if (!record) {
      record = {};
      this.records.set(key, record);
    }
    return record;
  }

  // Forgets what the client reported of an item the host has put back to an
  // earlier state. A player's standing in a volume is the client's, and
  // stays.
  forget(key: string): void {
    const record = this.records.get(key);
    if (record === undefined) {
      return;
    }
    const { monitorCount, safeZoneInside } = record;
    this.records.set(key, { monitorCount, safeZoneInside });
  }

  // Every item that has the field, by key: a debugger's view of one report.
  collect<T>(pick: (record: ItemWorldRecord) => T | undefined): [string, T][] {
    const found: [string, T][] = [];
    for (const [key, record] of this.records) {
      const value = pick(record);
      if (value !== undefined) {
        found.push([key, value]);
      }
    }
    return found;
  }
}
