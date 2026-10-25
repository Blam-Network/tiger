// Destiny PS4 Alpha Trial, 2014-05-19 (CUSA00942). Between the 360 dev alpha
// and the live build, with the live build's class hashes, and the PS4's
// packages and tag layer: patch 01.29's reader opens them as they are.
// Little endian and 64-bit: tag blocks are {u64 count, i64 offset} and
// pointers i64, so most structs widen as 01.29's do. Some differ outright
// from the live build's (the item definition, the activity definition, the
// stat curves); each file says where.
export const k_build_string = "40662.14.05.19.1414.pubalpha";

export * from "./v40662_14_05_19_1414_pubalpha/definitions/ability.ts";
export * from "./v40662_14_05_19_1414_pubalpha/definitions/activity_bundle.ts";
export * from "./v40662_14_05_19_1414_pubalpha/definitions/activity_definition.ts";
export * from "./v40662_14_05_19_1414_pubalpha/definitions/activity_lookup.ts";
export * from "./v40662_14_05_19_1414_pubalpha/definitions/character.ts";
export * from "./v40662_14_05_19_1414_pubalpha/definitions/client_destination.ts";
export * from "./v40662_14_05_19_1414_pubalpha/definitions/director.ts";
export * from "./v40662_14_05_19_1414_pubalpha/definitions/incident_registry.ts";
export * from "./v40662_14_05_19_1414_pubalpha/definitions/inventory_buckets.ts";
export * from "./v40662_14_05_19_1414_pubalpha/definitions/investment.ts";
export * from "./v40662_14_05_19_1414_pubalpha/definitions/investment_client_globals.ts";
export * from "./v40662_14_05_19_1414_pubalpha/definitions/investment_globals.ts";
export * from "./v40662_14_05_19_1414_pubalpha/definitions/investment_rewards.ts";
export * from "./v40662_14_05_19_1414_pubalpha/definitions/item_display.ts";
export * from "./v40662_14_05_19_1414_pubalpha/definitions/manifest.ts";
export * from "./v40662_14_05_19_1414_pubalpha/definitions/object_blueprint.ts";
export * from "./v40662_14_05_19_1414_pubalpha/definitions/scenario_client.ts";
export * from "./v40662_14_05_19_1414_pubalpha/definitions/schema.ts";
export * from "./v40662_14_05_19_1414_pubalpha/definitions/schema_fast_init.ts";
export * from "./v40662_14_05_19_1414_pubalpha/definitions/scoreboard_definition.ts";
export * from "./v40662_14_05_19_1414_pubalpha/definitions/sensor_slot.ts";
export * from "./v40662_14_05_19_1414_pubalpha/definitions/server_message.ts";
export * from "./v40662_14_05_19_1414_pubalpha/definitions/spawn_point.ts";
export * from "./v40662_14_05_19_1414_pubalpha/definitions/squad_definition.ts";
export * from "./v40662_14_05_19_1414_pubalpha/definitions/unlock_flags.ts";
export * from "./v40662_14_05_19_1414_pubalpha/definitions/world_binding.ts";
export * from "./v40662_14_05_19_1414_pubalpha/tag/tag_variant.ts";
export * from "./v52553_16_09_28_1551_evil/pkg/block_cache.ts";
export * from "./v52553_16_09_28_1551_evil/pkg/byte_source.ts";
export * from "./v52553_16_09_28_1551_evil/pkg/package_block.ts";
export * from "./v52553_16_09_28_1551_evil/pkg/package_entry.ts";
export * from "./v52553_16_09_28_1551_evil/pkg/package_file.ts";
export * from "./v52553_16_09_28_1551_evil/pkg/package_header.ts";
export * from "./v52553_16_09_28_1551_evil/pkg/package_named_tag.ts";
export * from "./v52553_16_09_28_1551_evil/pkg/package_set.ts";
export * from "./v52553_16_09_28_1551_evil/pkg/tag_hash.ts";
export * from "./v52553_16_09_28_1551_evil/tag/tag_block.ts";
export * from "./v52553_16_09_28_1551_evil/tag/tag_string.ts";
