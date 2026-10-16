import {
  encode_datamine_definition_v3,
  encode_datamine_occurrence_v3,
  type s_datamine_definition_v3,
} from "./blam/data_mining/data_mine_formats.ts";
import type { s_datamine_record } from "./blam/data_mining/data_mining.ts";
import type { t_byte_order } from "./byte_writer.ts";

export const k_maximum_registered_events = 0x20_00;

// Exact text Destiny reports when the table fills up.
export const k_datamine_registration_full_message =
  "reports: Event registration is full, no new events will be processed! Increase k_maximum_registered_events.";

export interface s_datamine_definition_registry_options {
  // Destiny hands every event site an id from one counter starting at 1, the first time the site
  // runs, so real files start around 50: earlier sites only logged text. Ids only need to be unique.
  first_definition_id?: number;
  maximum_registered_events?: number;
  on_error?: (message: string) => void;
}

function definition_key(record: s_datamine_record): string {
  return JSON.stringify([
    record.priority,
    record.event_name,
    record.parameter_signature,
    record.categories,
    record.parameters.map((parameter) => [parameter.name, parameter.type]),
  ]);
}

// Process-wide table of registered events. The same event shape always gets the same id.
export class c_datamine_definition_registry {
  private readonly m_ids = new Map<string, number>();
  private readonly m_definitions = new Map<number, s_datamine_definition_v3>();
  private readonly m_first_definition_id: number;
  private readonly m_maximum: number;
  private readonly m_on_error: ((message: string) => void) | undefined;
  private m_next_definition_id: number;
  private m_full_reported = false;

  constructor(options: s_datamine_definition_registry_options = {}) {
    this.m_first_definition_id = options.first_definition_id ?? 0;
    this.m_next_definition_id = this.m_first_definition_id;
    this.m_maximum =
      options.maximum_registered_events ?? k_maximum_registered_events;
    this.m_on_error = options.on_error;
  }

  get size(): number {
    return this.m_definitions.size;
  }

  get(definition_id: number): s_datamine_definition_v3 | undefined {
    return this.m_definitions.get(definition_id);
  }

  // Undefined once the table is full; the caller drops the record.
  register(record: s_datamine_record): s_datamine_definition_v3 | undefined {
    const key = definition_key(record);
    const existing_id = this.m_ids.get(key);
    if (existing_id !== undefined) {
      return this.m_definitions.get(existing_id);
    }

    if (this.m_next_definition_id >= this.m_maximum) {
      // Reported once, then silently dropped.
      if (!this.m_full_reported) {
        this.m_full_reported = true;
        this.m_on_error?.(k_datamine_registration_full_message);
      }
      return;
    }

    const definition: s_datamine_definition_v3 = {
      definition_id: this.m_next_definition_id++,
      priority: record.priority,
      event_name: record.event_name,
      parameter_signature: record.parameter_signature,
      categories: [...record.categories],
      parameters: record.parameters.map((parameter) => ({
        name: parameter.name,
        type: parameter.type,
      })),
    };
    this.m_ids.set(key, definition.definition_id);
    this.m_definitions.set(definition.definition_id, definition);
    return definition;
  }

  reset(): void {
    this.m_ids.clear();
    this.m_definitions.clear();
    this.m_next_definition_id = this.m_first_definition_id;
    this.m_full_reported = false;
  }
}

// Each file stands alone, so every definition is emitted again in each new file.
export class c_datamine_definition_file_state {
  private readonly m_emitted = new Set<number>();

  has_emitted(definition_id: number): boolean {
    return this.m_emitted.has(definition_id);
  }

  // [definition, occurrence] the first time an event shows up in the file, then just [occurrence].
  // Empty when the registry is full.
  encode_record_v3(
    record: s_datamine_record,
    registry: c_datamine_definition_registry,
    byte_order: t_byte_order
  ): Buffer[] {
    const definition = registry.register(record);
    if (!definition) {
      return [];
    }

    const buffers: Buffer[] = [];
    if (!this.m_emitted.has(definition.definition_id)) {
      this.m_emitted.add(definition.definition_id);
      buffers.push(encode_datamine_definition_v3(definition, byte_order));
    }
    buffers.push(
      encode_datamine_occurrence_v3(
        {
          event_index: record.event_index,
          definition_id: definition.definition_id,
          event_date: record.event_date,
          values: record.parameters,
        },
        byte_order
      )
    );
    return buffers;
  }

  // On file rotation.
  reset(): void {
    this.m_emitted.clear();
  }
}
