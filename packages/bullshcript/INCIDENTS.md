# Incidents

An incident is a named event in Destiny's activity system. The game client reports what players do (kills, deaths, pickups, interactions, joins) to the activity host as incidents, and host scripts listen for them through incident listeners, kill listeners and iterators. Scripts also submit incidents of their own, for example `c_incident_utilities.submit_incident_hash("pvp_game_over")`, and the PvP and scoreboard events work the same way. An incident that comes from the client is a report of something that already happened; one that a script submits is usually an announcement or a score event for other scripts and the scoreboard.

On the wire an incident name is an FNV-1 hash, so scripts usually hold the name as a `string_hash` field. The names below come from the game's incident name tables. Audiences such as `all_players` or `killing_player` are separate names: they pick which players an incident applies to, they are not incidents, and they do not appear here. The explanations are ours. Many are inferred from the name alone, and those are phrased with "Likely".

## Kills and combat

Kill-type incidents carry a killer, a victim and any assisting players. One kill usually reports several names at once: the base name plus more specific ones, such as `any_kill` and `special_kill`. A listener bound to `any_kill` therefore sees every kill.

| Incident | What it reports |
|---|---|
| `ability_talent` | A kill made with an ability or talent; reported as a more specific name alongside `kill`. |
| `ambient_kill` | Likely a kill of an ambient enemy, one that is not part of an encounter. |
| `ambush_kill` | A kill made by ambushing the victim, reported alongside `flanked_kill`. |
| `any_kill` | Catch-all name that every kill also carries, so a listener bound to it counts every kill. |
| `architect_kill` | A death caused by the world itself rather than by a combatant, such as an environmental kill. |
| `assist_buff` | Likely credit for buffing a teammate who then got a kill. |
| `assist_damage` | Credit for damaging a victim that someone else killed. |
| `assist_proximity_killer` | Assist credit for a player who was near the killer when the kill happened. |
| `assist_proximity_target` | Assist credit for a player who was near the victim when the kill happened. |
| `axion_kill` | A kill made with Axion Bolts, the Warlock grenade. |
| `axion_multi_kill` | Several kills made with one throw of Axion Bolts. |
| `behind_kill` | A kill made from behind the victim. |
| `buffed_kill` | A kill made while the killer was buffed by other players; the report lists who gave the buffs. |
| `close_call_talent` | Likely a talent that triggers when a player survives a close call. |
| `destructible_kill` | A destructible object was destroyed. |
| `enemy_vehicle_kill` | A kill involving a vehicle that belongs to the enemy faction. |
| `engaged` | Likely a player starting to fight an enemy or object. |
| `escape_talent` | Likely a talent that triggers when a player escapes a dangerous situation. |
| `flanked_kill` | A kill made from the victim's side. |
| `friendly_vehicle_kill` | A kill involving a vehicle that belongs to the player's own faction. |
| `from_the_grave_talent` | Likely a talent that triggers on a kill made after the player has died. |
| `gather_orb_talent` | Likely a talent that triggers when a player picks up an orb. |
| `grenade_kill` | A kill made with a grenade. |
| `hazard_kill` | Likely a kill caused by an environmental hazard. |
| `heavy_kill` | A kill made with a heavy weapon. |
| `inc_raider_shock_rifle_kill` | Likely a story trigger for a kill made with a Fallen raider's shock rifle. |
| `kill` | The basic kill; every other kill name is a more specific version of it. |
| `kill_player_to_ai` | A player killed an AI combatant; the report carries the victim's character definition and squad slot. |
| `kill_player_to_ai_moonbase` | Likely a player-kills-AI incident specific to the Moon base area. |
| `kill_player_to_ai_transit` | Likely a player-kills-AI incident specific to the transit area. |
| `melee_kill` | A kill made with a melee attack. |
| `minotaur_kill_raid` | Likely a Minotaur killed during the raid. |
| `multi_kill` | Several kills made in quick succession. |
| `neutral_vehicle_kill` | A kill involving a vehicle that belongs to no faction. |
| `overpenetration` | Likely a shot passed through one target and hit another. |
| `perk` | Likely a perk triggered. |
| `precision_kill` | A kill made with a precision hit. |
| `primary_kill` | A kill made with a primary weapon. |
| `rescue_talent` | Likely a talent that triggers when a player rescues a teammate. |
| `shotgun_kill` | A kill made with a shotgun. |
| `special_kill` | A kill made with a special weapon. |
| `super_kill` | A kill made with a super ability. |
| `worldserver_kill` | Likely a kill made by the world server, similar to `architect_kill`. |

## Deaths, revives and players

Players coming, going, dying and coming back.

| Incident | What it reports |
|---|---|
| `ability_resurrection` | Likely a revive made with an ability. |
| `activity_join` | Likely a player joined the activity. |
| `betrayal` | A player killed a teammate. |
| `buddy_resurrection` | Likely a revive of a fireteam buddy. |
| `emote` | A player performed an emote. |
| `enter_orbit` | Likely a player entered orbit. |
| `hard_wipe` | Likely the whole fireteam was wiped out. |
| `heat_maximized` | Likely a player's heat meter reached its maximum; reported with just the player. |
| `inspection` | Likely a player inspected something or someone; reported with no extra data. |
| `player_died` | A player died. |
| `player_joined` | A player joined the activity. |
| `player_left` | A player left the activity. |
| `player_rejoined` | Likely a player rejoined the activity. |
| `player_resurrected` | A player was revived by another player. |
| `player_spawned` | A player spawned into the world; the report says why they spawned. |
| `player_spawned_initial` | Likely a player's first spawn into the activity. |
| `recover` | Likely a player recovering something or someone; the report lists the involved objects. |
| `rescue` | Likely a player rescuing a teammate; the report lists the objects involved. |
| `resurrection` | A revive took place. |
| `resurrection_ally` | Likely a revive of an ally. |
| `resurrection_multi` | Likely several revives made in quick succession. |
| `self_resurrection` | A player brought themselves back. |
| `suicide` | A player killed themselves. |

## PvP and game types

Most of these are submitted by the PvP game-type scripts themselves (`pvp_game_over`, scoreboard events, announcer cues) or derived from kill data. Names that mention a spree usually fire when a streak reaches a threshold.

### Game flow

| Incident | What it reports |
|---|---|
| `lockdown_winners` | Likely the winners of a Lockdown match were decided. |
| `pvp_five_minutes_remaining` | Five minutes remain in the match. |
| `pvp_game_over` | The match has ended. |
| `pvp_game_start` | The match has started. |
| `pvp_game_start_deathmatch` | A deathmatch match has started. |
| `pvp_game_start_dominion` | A Dominion match has started. |
| `pvp_game_start_ffa` | A free-for-all match has started. |
| `pvp_game_start_salvage` | A Salvage match has started. |
| `pvp_game_type_deathmatch` | Announces that the match is a deathmatch. |
| `pvp_game_type_dominion` | Announces that the match is Dominion. |
| `pvp_game_type_ffa` | Announces that the match is free-for-all. |
| `pvp_game_type_salvage` | Announces that the match is Salvage. |
| `pvp_heavy_ammo_spawn` | Heavy ammo has spawned on the map. |
| `pvp_one_minute_remaining` | One minute remains in the match. |
| `pvp_sudden_death` | The match has gone into sudden death. |
| `pvp_team_gained_the_lead` | A team took the lead. |
| `pvp_team_lost_the_lead` | A team lost the lead. |
| `pvp_ten_seconds_remaining` | Ten seconds remain in the match. |
| `pvp_thirty_seconds_remaining` | Thirty seconds remain in the match. |
| `pvp_victory_imminent` | A team is about to win. |
| `pvp_winning_score` | A player reached the winning score. |

### Scoring

| Incident | What it reports |
|---|---|
| `pvp_score_assist` | Score awarded for an assist. |
| `pvp_score_capture` | Score awarded for capturing a zone. |
| `pvp_score_control_bonus` | Score awarded as a bonus for holding control. |
| `pvp_score_kill` | Score awarded for a kill. |
| `pvp_score_precision_kill` | Score awarded for a precision kill. |
| `pvp_score_revive` | Score awarded for a revive. |
| `pvp_score_salvage_bonus` | Score awarded as a Salvage bonus. |

### Kills, sprees and class kills

| Incident | What it reports |
|---|---|
| `pvp_ambush_kill_spree` | A player got a streak of ambush kills. |
| `pvp_architect_death` | A player died to the world rather than another combatant. |
| `pvp_assist_spree` | A player got a streak of assists. |
| `pvp_behind_kill_multi` | Several kills from behind in quick succession. |
| `pvp_domination_kill` | A kill made while a team is dominating. |
| `pvp_first_blood` | The first kill of the match. |
| `pvp_grenade_kill` | A player killed another player with a grenade. |
| `pvp_grenade_kill_stick` | Likely a kill made with a sticky grenade. |
| `pvp_heavy_kill` | A player killed another player with a heavy weapon. |
| `pvp_hunter_kill` | Likely a kill of a Hunter. |
| `pvp_kill` | A player killed another player. |
| `pvp_kill_headshot` | A player killed another player with a headshot. |
| `pvp_kill_multi_2` | A player made two kills in quick succession. |
| `pvp_kill_multi_3` | A player made three kills in quick succession. |
| `pvp_kill_multi_4` | A player made four kills in quick succession. |
| `pvp_kill_multi_5` | A player made five kills in quick succession. |
| `pvp_kill_multi_6` | A player made six kills in quick succession. |
| `pvp_kill_postmortem` | A player got a kill after dying. |
| `pvp_kill_spree_1` | A player reached the first kill-streak level. |
| `pvp_kill_spree_2` | A player reached the second kill-streak level. |
| `pvp_kill_spree_3` | A player reached the third kill-streak level. |
| `pvp_kill_spree_absurd` | A player reached the highest kill-streak level. |
| `pvp_melee_kill` | A player killed another player with a melee attack. |
| `pvp_melee_kill_hunter` | Likely a melee kill of a Hunter. |
| `pvp_melee_kill_multi` | Several melee kills in quick succession. |
| `pvp_melee_kill_titan` | Likely a melee kill of a Titan. |
| `pvp_melee_kill_warlock` | Likely a melee kill of a Warlock. |
| `pvp_suicide` | A player killed themselves in a match. |
| `pvp_super_kill` | A player killed another player with a super ability. |
| `pvp_super_kill_multi_6` | A super ability killed six players at once. |
| `pvp_team_kill_spree` | A team got a streak of kills. |
| `pvp_titan_kill` | Likely a kill of a Titan. |
| `pvp_warlock_kill` | Likely a kill of a Warlock. |

### Ability kills

| Incident | What it reports |
|---|---|
| `pvp_ability_ghost_gun_kill` | A kill made with the Ghost Gun super. |
| `pvp_ability_ghost_gun_kill_multi` | Several kills made with the Ghost Gun super. |
| `pvp_ability_havoc_kill` | A kill made with the Havoc super. |
| `pvp_ability_havoc_kill_multi` | Several kills made with the Havoc super. |
| `pvp_ability_nova_bomb_kill` | A kill made with the Nova Bomb super. |
| `pvp_ability_nova_bomb_kill_multi` | Several kills made with the Nova Bomb super. |
| `pvp_ability_shadow_strike_kill` | A kill made with the Shadow Strike super. |
| `pvp_ability_shadow_strike_kill_multi` | Several kills made with the Shadow Strike super. |

### Weapon kills

| Incident | What it reports |
|---|---|
| `pvp_weapon_auto_rifle_kill` | A kill made with an auto rifle. |
| `pvp_weapon_blaster_kill` | A kill made with a blaster. |
| `pvp_weapon_blaster_kill_spree` | A streak of kills made with a blaster. |
| `pvp_weapon_hand_cannon_kill` | A kill made with a hand cannon. |
| `pvp_weapon_hand_cannon_kill_spree` | A streak of kills made with a hand cannon. |
| `pvp_weapon_machine_gun_kill` | A kill made with a machine gun. |
| `pvp_weapon_machine_gun_kill_spree` | A streak of kills made with a machine gun. |
| `pvp_weapon_pulse_rifle_kill` | A kill made with a pulse rifle. |
| `pvp_weapon_rocket_launcher_kill` | A kill made with a rocket launcher. |
| `pvp_weapon_rocket_launcher_kill_spree` | A streak of kills made with a rocket launcher. |
| `pvp_weapon_scout_rifle_kill` | A kill made with a scout rifle. |
| `pvp_weapon_shotgun_kill` | A kill made with a shotgun. |
| `pvp_weapon_shotgun_kill_spree` | A streak of kills made with a shotgun. |
| `pvp_weapon_sniper_rifle_kill` | A kill made with a sniper rifle. |
| `pvp_weapon_sniper_rifle_kill_overpenetrate` | A sniper rifle shot that passed through one target and killed another. |
| `pvp_weapon_sniper_rifle_kill_spree` | A streak of kills made with a sniper rifle. |

### Vehicle kills

| Incident | What it reports |
|---|---|
| `pvp_vehicle_fotc_turret_kill` | A kill made with a Future War Cult turret. |
| `pvp_vehicle_fotc_turret_kill_spree` | A streak of kills made with a Future War Cult turret. |
| `pvp_vehicle_interceptor_kill` | A kill made with an Interceptor. |
| `pvp_vehicle_interceptor_kill_spree` | A streak of kills made with an Interceptor. |
| `pvp_vehicle_pike_kill` | A kill made with a Pike. |
| `pvp_vehicle_pike_kill_spree` | A streak of kills made with a Pike. |
| `pvp_vehicle_splatter_kill` | A kill made by running someone over. |
| `pvp_vehicle_splatter_kill_spree_1` | A player reached the first level of run-over kill streak. |
| `pvp_vehicle_splatter_kill_spree_2` | A player reached the second level of run-over kill streak. |
| `pvp_vehicle_splatter_kill_spree_3` | A player reached the third level of run-over kill streak. |
| `pvp_vehicle_tiger_kill` | A kill made with the Tiger vehicle. |
| `pvp_vehicle_tiger_kill_spree` | A streak of kills made with the Tiger vehicle. |

### Zones and objectives

| Incident | What it reports |
|---|---|
| `capture` | A player took part in capturing a capture point; used by the Dominion and Salvage scripts. |
| `pvp_dominion_zone_captured` | A Dominion zone was captured. |
| `pvp_dominion_zone_captured_spree` | A player captured several Dominion zones in a row. |
| `pvp_lockdown_zone_captured` | A Lockdown zone was captured. |
| `pvp_lockdown_zone_despawned` | A Lockdown zone went away. |
| `pvp_lockdown_zone_locked` | A Lockdown zone was locked by a team. |
| `pvp_lockdown_zone_spawned` | A Lockdown zone appeared. |
| `pvp_salvage_probe_canceled` | A Salvage probe was canceled before it finished. |
| `pvp_salvage_probe_complete` | A Salvage probe finished. |
| `pvp_salvage_probe_complete_spree` | A player finished several Salvage probes in a row. |
| `pvp_salvage_relics_gone` | All the Salvage relics have been taken. |
| `pvp_salvage_zone_captured` | A Salvage zone was captured. |
| `pvp_salvage_zone_captured_spree` | A player captured several Salvage zones in a row. |
| `pvp_team_domination_begin` | Likely a team began dominating, for example by holding every zone. |
| `pvp_team_domination_begin_spree1` | Likely a team began dominating again, first streak level. |
| `pvp_team_domination_begin_spree2` | Likely a team began dominating again, second streak level. |
| `pvp_team_domination_end` | Likely a team's domination ended. |
| `pvp_team_domination_end_spree1` | Likely a team's domination ended, first streak level. |
| `pvp_team_domination_end_spree2` | Likely a team's domination ended, second streak level. |
| `pvp_zone_captured_a` | Zone A was captured. |
| `pvp_zone_captured_b` | Zone B was captured. |
| `pvp_zone_captured_c` | Zone C was captured. |
| `relic_create` | Likely a Salvage relic was created. |
| `relic_teleport` | Likely a Salvage relic was teleported to a new spot. |

## Objectives, events and activities

Mission, strike, raid and public event beats. Incidents with a destination in the name (`in_mars_...`, `inc_venus_...`) are likely the incident names that the interactables in that area submit when a player uses them.

### Activities, public events and raids

| Incident | What it reports |
|---|---|
| `action_mock_partial_complete25` | The test activity `action_mock` is a quarter of the way done. |
| `action_mock_partial_complete50` | The test activity `action_mock` is half done. |
| `action_mock_partial_complete75` | The test activity `action_mock` is three quarters done. |
| `activity_complete` | The activity has been completed. |
| `activity_failed` | Likely the activity was failed. |
| `activity_generic` | A generic activity incident; the report carries just a number. |
| `event_completion_reward0` | Likely the first reward tier of an event was earned. |
| `event_completion_reward1` | Likely the second reward tier of an event was earned. |
| `event_completion_reward2` | Likely the third reward tier of an event was earned. |
| `event_completion_reward3` | Likely the fourth reward tier of an event was earned. |
| `event_completion_reward4` | Likely the fifth reward tier of an event was earned. |
| `incident_r1_s1_activities_raid_encounter0` | Likely raid 1 encounter 0 reached a beat. |
| `incident_r1_s1_activities_raid_encounter1` | Likely raid 1 encounter 1 reached a beat. |
| `incident_r1_s1_activities_raid_encounter2` | Likely raid 1 encounter 2 reached a beat. |
| `incident_r1_s1_activities_raid_encounter3` | Likely raid 1 encounter 3 reached a beat. |
| `incident_r1_s1_activities_raid_encounter4` | Likely raid 1 encounter 4 reached a beat. |
| `incident_r1_s1_activities_raid_encounter5` | Likely raid 1 encounter 5 reached a beat. |
| `insertion_point` | A player picked or arrived at an insertion point. |
| `node_expired` | Likely a sequence node timed out. |
| `patrol_complete` | Likely a patrol was completed. |
| `phase_end` | Likely a phase of the activity ended. |
| `phase00_raid_end` | The first phase of the raid has ended. |
| `player_trigger` | A player entered a trigger volume. |
| `player_trigger_tv_phase01_pit` | Likely a player entered the pit trigger volume in raid phase 1. |
| `public_event_complete` | A public event was completed. |
| `public_event_complete_gold_tier` | A public event was completed at the gold tier. |
| `public_event_engaged` | A player joined in a public event. |
| `r1_s1_props_story_fallen_device_create` | Likely a Fallen device prop was created in raid 1. |
| `r1_s1_props_story_fallen_device_delete` | Likely a Fallen device prop was removed in raid 1. |
| `strike_complete` | A strike was completed. |
| `treasure_map_complete` | Likely a treasure map was completed. |
| `vex_block_sacrifice` | A Vex block was sacrificed; the block script submits it and the event script counts it. |

### Story and encounter beats

| Incident | What it reports |
|---|---|
| `ch1_hellmouth_obj_1` | Likely the first objective of the Hellmouth chapter 1 mission was reached. |
| `ch1_hellmouth_obj_2_a` | Likely objective 2, branch A, of the Hellmouth chapter 1 mission was reached. |
| `ch1_hellmouth_obj_2_b` | Likely objective 2, branch B, of the Hellmouth chapter 1 mission was reached. |
| `ch1m1a_complete` | Likely chapter 1 mission 1a was completed. |
| `ch2m1_boss_death` | Likely the boss of chapter 2 mission 1 died. |
| `chamber1_button_fail` | Likely a chamber 1 button puzzle step failed. |
| `chamber1_button_warning` | Likely a warning was raised in the chamber 1 button puzzle. |
| `chamber1_flair` | Likely a flavor beat in chamber 1. |
| `chamber1_hunters_spawned` | Likely hunters spawned in chamber 1. |
| `chamber2_boss_a_guard_spawn` | Likely boss A's guards spawned in chamber 2. |
| `chamber2_boss_b_guard_spawn` | Likely boss B's guards spawned in chamber 2. |
| `chamber2_boss_c_guard_spawn` | Likely boss C's guards spawned in chamber 2. |
| `chamber2_boss_kill` | Likely a chamber 2 boss was killed. |
| `chamber2_chain_fail` | Likely a chain puzzle step failed in chamber 2. |
| `chamber2_chain_pass` | Likely a chain puzzle step succeeded in chamber 2. |
| `chamber2_flair` | Likely a flavor beat in chamber 2. |
| `cof_crystal_bomb_create` | Likely a crystal bomb was created in the `cof` encounter (abbreviation unknown). |
| `cof_dark_procession_knight_cast` | Likely a Hive Knight cast its spell during the dark procession. |
| `cof_dark_procession_warn` | Likely a warning that a dark procession is about to start. |
| `cq_venus_chapter_2_outro` | Likely the Venus chapter 2 outro was reached. |
| `hive_knight_death` | A Hive Knight died. |
| `hive_knight_spawn` | A Hive Knight spawned. |
| `in_ch01_m08_incident` | Likely a story beat in chapter 1 mission 8. |
| `in_ch2_m1_incident` | Likely a story beat in chapter 2 mission 1. |
| `in_ch2_m1b_incident` | Likely a story beat in chapter 2 mission 1b. |
| `in_ch3_m04_incident1` | Likely the first story beat in chapter 3 mission 4. |
| `in_ch3_m04_incident2` | Likely the second story beat in chapter 3 mission 4. |
| `inc_entrance_ch2m1` | Likely a story beat at the entrance in chapter 2 mission 1. |
| `inc_headlands_ch2m2` | Likely a story beat in the headlands in chapter 2 mission 2. |
| `inc_shattered_vehicle` | Likely a story beat involving the vehicle at the shattered coast. |
| `wizard_death` | A Hive Wizard died. |
| `wizard_silence_activate` | Likely a Hive Wizard activated its silence ability. |
| `wizard_silence_warn` | Likely a warning that a Hive Wizard is about to silence players. |

### Interactables and area triggers

| Incident | What it reports |
|---|---|
| `in_mars_battleground_key` | Likely a player picked up or used the key in the Mars battleground. |
| `in_mars_battleground_terminal` | Likely a player used the terminal in the Mars battleground. |
| `in_mars_downtown_overlook` | Likely a player reached the overlook in downtown Mars. |
| `in_mars_transit_button` | Likely a player pressed the button in Mars transit. |
| `in_mars_transit_ch4_wave_off` | Likely the chapter 4 enemy wave in Mars transit was switched off. |
| `in_mars_transit_ch4_wave_on` | Likely the chapter 4 enemy wave in Mars transit was switched on. |
| `in_mars_uppergarden_button` | Likely a player pressed the button in the Mars upper garden. |
| `in_mars_uppergarden_core` | Likely a player used the core in the Mars upper garden. |
| `in_mars_uppergarden_vista` | Likely a player reached the vista in the Mars upper garden. |
| `in_moon_hellmouth_henge_button` | Likely a player pressed the button at the Hellmouth henge on the Moon. |
| `in_moon_lowercitadel_heart` | Likely a player used the heart in the lower citadel on the Moon. |
| `in_moon_moonbase_data_stream` | Likely a player used the data stream in the Moon base. |
| `inc_venus_engineering_terminal` | Likely a player used the terminal in Venus engineering. |
| `inc_venus_shattered_terminal` | Likely a player used the terminal in the Venus shattered coast. |
| `inc_venus_vault_door` | Likely a player opened the Venus vault door. |
| `interaction` | A player interacted with an object; the report names the object. |
| `look_trigger` | Likely a player looked at a spot that fires a trigger. |
| `progression_terminal` | Likely a player used a progression terminal. |

### Destination terminals

| Incident | What it reports |
|---|---|
| `terminal_cosmo_array0` | Likely a player used the array terminal (Cosmodrome). |
| `terminal_cosmo_blast0` | Likely a player used the blast terminal (Cosmodrome). |
| `terminal_cosmo_breach0` | Likely a player used the breach terminal (Cosmodrome). |
| `terminal_cosmo_command0` | Likely a player used the command terminal (Cosmodrome). |
| `terminal_cosmo_delta_n0` | Likely a player used the delta n terminal (Cosmodrome). |
| `terminal_cosmo_delta_s0` | Likely a player used the delta s terminal (Cosmodrome). |
| `terminal_cosmo_dome_a0` | Likely a player used the dome a terminal (Cosmodrome). |
| `terminal_cosmo_dome_c0` | Likely a player used the dome c terminal (Cosmodrome). |
| `terminal_cosmo_dry_sea0` | Likely a player used the dry sea terminal (Cosmodrome). |
| `terminal_cosmo_graveyard0` | Likely a player used the graveyard terminal (Cosmodrome). |
| `terminal_cosmo_highway0` | Likely a player used the highway terminal (Cosmodrome). |
| `terminal_cosmo_hive_shore0` | Likely a player used the hive shore terminal (Cosmodrome). |
| `terminal_cosmo_rasputin0` | Likely a player used the rasputin terminal (Cosmodrome). |
| `terminal_cosmo_refinery0` | Likely a player used the refinery terminal (Cosmodrome). |
| `terminal_cosmo_rocketyard0` | Likely a player used the rocketyard terminal (Cosmodrome). |
| `terminal_hiveship_block0` | Likely a player used the block terminal (Hive ship). |
| `terminal_hiveship_breech0` | Likely a player used the breech terminal (Hive ship). |
| `terminal_hiveship_cell0` | Likely a player used the cell terminal (Hive ship). |
| `terminal_hiveship_core0` | Likely a player used the core terminal (Hive ship). |
| `terminal_hiveship_deck0` | Likely a player used the deck terminal (Hive ship). |
| `terminal_hiveship_hold0` | Likely a player used the hold terminal (Hive ship). |
| `terminal_hiveship_shroud0` | Likely a player used the shroud terminal (Hive ship). |
| `terminal_hiveship_tower0` | Likely a player used the tower terminal (Hive ship). |
| `terminal_hiveship_wall0` | Likely a player used the wall terminal (Hive ship). |
| `terminal_mars_atrium0` | Likely a player used the atrium terminal (Mars). |
| `terminal_mars_battleground0` | Likely a player used the battleground terminal (Mars). |
| `terminal_mars_bg_ruin0` | Likely a player used the bg ruin terminal (Mars). |
| `terminal_mars_cabal_checkpoint0` | Likely a player used the cabal checkpoint terminal (Mars). |
| `terminal_mars_catacombs0` | Likely a player used the catacombs terminal (Mars). |
| `terminal_mars_downtown0` | Likely a player used the downtown terminal (Mars). |
| `terminal_mars_gatehouse0` | Likely a player used the gatehouse terminal (Mars). |
| `terminal_mars_gatehouse_outer0` | Likely a player used the gatehouse outer terminal (Mars). |
| `terminal_mars_lobby0` | Likely a player used the lobby terminal (Mars). |
| `terminal_mars_lowergarden0` | Likely a player used the lowergarden terminal (Mars). |
| `terminal_mars_mesa0` | Likely a player used the mesa terminal (Mars). |
| `terminal_mars_penthouse0` | Likely a player used the penthouse terminal (Mars). |
| `terminal_mars_plains0` | Likely a player used the plains terminal (Mars). |
| `terminal_mars_rubicon0` | Likely a player used the rubicon terminal (Mars). |
| `terminal_mars_subway0` | Likely a player used the subway terminal (Mars). |
| `terminal_mars_transit0` | Likely a player used the transit terminal (Mars). |
| `terminal_mars_uppergarden0` | Likely a player used the uppergarden terminal (Mars). |
| `terminal_mars_valley0` | Likely a player used the valley terminal (Mars). |
| `terminal_mars_warbase0` | Likely a player used the warbase terminal (Mars). |
| `terminal_moon_accelerator0` | Likely a player used the accelerator terminal (Moon). |
| `terminal_moon_hellmouth0` | Likely a player used the hellmouth terminal (Moon). |
| `terminal_moon_launchtubes0` | Likely a player used the launchtubes terminal (Moon). |
| `terminal_moon_lowercitadel0` | Likely a player used the lowercitadel terminal (Moon). |
| `terminal_moon_moonbase0` | Likely a player used the moonbase terminal (Moon). |
| `terminal_moon_reactor0` | Likely a player used the reactor terminal (Moon). |
| `terminal_moon_selection0` | Likely a player used the selection terminal (Moon). |
| `terminal_moon_strength0` | Likely a player used the strength terminal (Moon). |
| `terminal_moon_uppercitadel0` | Likely a player used the uppercitadel terminal (Moon). |
| `terminal_moon_wisdom0` | Likely a player used the wisdom terminal (Moon). |
| `terminal_venus_archive0` | Likely a player used the archive terminal (Venus). |
| `terminal_venus_caldera0` | Likely a player used the caldera terminal (Venus). |
| `terminal_venus_complex0` | Likely a player used the complex terminal (Venus). |
| `terminal_venus_dig_site0` | Likely a player used the dig site terminal (Venus). |
| `terminal_venus_dock0` | Likely a player used the dock terminal (Venus). |
| `terminal_venus_engineering0` | Likely a player used the engineering terminal (Venus). |
| `terminal_venus_entrance0` | Likely a player used the entrance terminal (Venus). |
| `terminal_venus_headlands0` | Likely a player used the headlands terminal (Venus). |
| `terminal_venus_ketch0` | Likely a player used the ketch terminal (Venus). |
| `terminal_venus_northern_tides0` | Likely a player used the northern tides terminal (Venus). |
| `terminal_venus_plaza0` | Likely a player used the plaza terminal (Venus). |
| `terminal_venus_shattered_coast0` | Likely a player used the shattered coast terminal (Venus). |
| `terminal_venus_southern_tides0` | Likely a player used the southern tides terminal (Venus). |
| `terminal_venus_thieves_den0` | Likely a player used the thieves den terminal (Venus). |
| `terminal_venus_tower0` | Likely a player used the tower terminal (Venus). |
| `terminal_venus_vault0` | Likely a player used the vault terminal (Venus). |
| `terminal_venus_warp_ruins0` | Likely a player used the warp ruins terminal (Venus). |

## Bounties

| Incident | What it reports |
|---|---|
| `bounty_complete` | A bounty was completed. |
| `bounty_objective_complete_cosmo` | A bounty objective was completed in the Cosmodrome. |
| `bounty_objective_complete_hiveship` | A bounty objective was completed on the Hive ship. |
| `bounty_objective_complete_mars` | A bounty objective was completed on Mars. |
| `bounty_objective_complete_moon` | A bounty objective was completed on the Moon. |
| `bounty_objective_complete_venus` | A bounty objective was completed on Venus. |
| `in_mars_bounty_1_loot_a` | Likely a player picked up the loot for Mars bounty 1. |
| `in_mars_bounty_2_loot_a` | Likely a player picked up the loot for Mars bounty 2. |
| `in_mars_bounty_3_loot_a` | Likely a player picked up the loot for Mars bounty 3. |
| `in_mars_bounty_4_loot_a` | Likely a player picked up the loot for Mars bounty 4. |
| `in_mars_bounty_5_loot_a` | Likely a player picked up the loot for Mars bounty 5. |
| `in_moon_bounty_1_loot_a` | Likely a player picked up the loot for Moon bounty 1. |
| `in_moon_bounty_2_loot_a` | Likely a player picked up the loot for Moon bounty 2. |
| `in_moon_bounty_3_loot_a` | Likely a player picked up the loot for Moon bounty 3. |

## Achievements

Progress toward achievements. Names say what is counted; the tracking itself is data-driven.

| Incident | What it reports |
|---|---|
| `achievement` | A generic achievement progress event. |
| `achievement_acquire_artifact` | Likely counts artifacts a player has picked up. |
| `achievement_bounty_completion` | Counts bounties a player has completed. |
| `achievement_build_starship` | Likely counts starships a player has built. |
| `achievement_decrypt_engrams` | Counts engrams a player has decrypted. |
| `achievement_dismantle_items` | Counts items a player has dismantled. |
| `achievement_equip_exotic_gear_arms` | A player equipped exotic arm armor. |
| `achievement_equip_exotic_gear_chest` | A player equipped exotic chest armor. |
| `achievement_equip_exotic_gear_class` | A player equipped an exotic class item. |
| `achievement_equip_exotic_gear_head` | A player equipped exotic helmet armor. |
| `achievement_equip_exotic_gear_legs` | A player equipped exotic leg armor. |
| `achievement_equip_exotic_gear_weapon_heavy` | A player equipped an exotic heavy weapon. |
| `achievement_equip_exotic_gear_weapon_primary` | A player equipped an exotic primary weapon. |
| `achievement_equip_exotic_gear_weapon_special` | A player equipped an exotic special weapon. |
| `achievement_equip_new_vehicle` | A player equipped a new vehicle. |
| `achievement_public_event_completion` | Counts public events a player has completed. |
| `achievement_pvp_capture_points` | Counts capture points a player has taken in PvP. |
| `achievement_pvp_class_kills_hunter` | Counts PvP kills made as, or against, a Hunter. |
| `achievement_pvp_class_kills_titan` | Counts PvP kills made as, or against, a Titan. |
| `achievement_pvp_class_kills_warlock` | Counts PvP kills made as, or against, a Warlock. |
| `achievement_pvp_completion` | Counts PvP matches a player has finished. |
| `achievement_pvp_completion_matches` | Counts PvP matches a player has finished, by match. |
| `achievement_pvp_heavy_weapon_kills` | Counts PvP kills made with heavy weapons. |
| `achievement_raid_completion` | Counts raids a player has completed. |
| `achievement_reputation_class_guardian` | Likely tracks reputation rank for the Guardian class. |
| `achievement_reputation_class_hunter` | Likely tracks reputation rank for the Hunter class. |
| `achievement_reputation_class_warlock` | Likely tracks reputation rank for the Warlock class. |
| `achievement_reputation_fotc_vanguard` | Likely tracks reputation rank with the Vanguard and Future War Cult. |
| `achievement_reputation_pvp_dead_orbit` | Likely tracks PvP reputation rank with Dead Orbit. |
| `achievement_reputation_pvp_future_war_cult` | Likely tracks PvP reputation rank with the Future War Cult. |
| `achievement_reputation_pvp_new_monarchy` | Likely tracks PvP reputation rank with New Monarchy. |
| `achievement_resurrection` | Counts revives a player has performed. |
| `achievement_strike_completion` | Counts strikes a player has completed. |
| `achievement_strike_completion_multiple` | Counts strikes completed together with other players. |
| `achievement_test` | A test achievement incident. |
| `achievement_upgrade_build_hunter` | Likely a Hunter build was upgraded. |
| `achievement_upgrade_build_titan` | Likely a Titan build was upgraded. |
| `achievement_upgrade_build_warlock` | Likely a Warlock build was upgraded. |
| `achievement_upgrade_weapon_exotic` | A player upgraded an exotic weapon. |
| `achievement_upgrade_weapon_superior` | A player upgraded a superior weapon. |
| `achievement_vendor_bender` | Likely progress tied to a vendor named bender (true name unknown). |

## Loot, items and vendors

Pickups, equipping and the loot types a drop can belong to. The `loot_bucket_*` and `loot_tier_*` names classify a drop rather than describe an event.

| Incident | What it reports |
|---|---|
| `equipped_gear_superior_plus` | A player equipped gear of superior quality or better. |
| `gather_artifacts_cabal` | Likely a player collected a Cabal artifact. |
| `gather_artifacts_fallen` | Likely a player collected a Fallen artifact. |
| `gather_artifacts_golden_age` | Likely a player collected a Golden Age artifact. |
| `gather_artifacts_hive` | Likely a player collected a Hive artifact. |
| `gather_artifacts_vex` | Likely a player collected a Vex artifact. |
| `gather_gear_lootbox` | Likely a player collected gear from a loot box. |
| `gather_gear_lootchest` | Likely a player collected gear from a loot chest. |
| `gather_golden_age_artifacts` | Likely a player collected Golden Age artifacts. |
| `gather_material` | A player gathered a material; the report carries where it was picked up. |
| `gather_materials_destination` | Likely a player gathered a destination-specific material. |
| `gather_materials_glimmer_guaranteed` | Likely a player gathered a guaranteed glimmer drop. |
| `gather_materials_glimmer_random` | Likely a player gathered a random glimmer drop. |
| `gather_venus_materials_guaranteed` | Likely a player gathered a guaranteed Venus material. |
| `gather_venus_materials_random` | Likely a player gathered a random Venus material. |
| `in_quest_item_generic` | Likely a player picked up a generic quest item. |
| `item_acquired` | A player acquired an item. |
| `item_action` | A player did something with an item. |
| `item_action_decrypt` | A player decrypted an item. |
| `item_action_shard` | A player broke an item down into shards. |
| `item_equipped` | A player equipped an item. |
| `loot` | A player received loot. |
| `loot_bucket_artifact` | Marks a loot drop as an artifact. |
| `loot_bucket_consumable` | Marks a loot drop as a consumable. |
| `loot_bucket_material` | Marks a loot drop as a material. |
| `loot_bucket_shader` | Marks a loot drop as a shader. |
| `loot_bucket_ship` | Marks a loot drop as a ship. |
| `loot_bucket_ticket` | Marks a loot drop as a ticket. |
| `loot_bucket_ward` | Marks a loot drop as a ward. |
| `loot_bucket_weapon_heavy` | Marks a loot drop as a heavy weapon. |
| `loot_bucket_weapon_primary` | Marks a loot drop as a primary weapon. |
| `loot_materials_engrams_cryptarch` | Likely a loot drop of materials or engrams for the Cryptarch. |
| `loot_tier_exotic` | Marks a loot drop as exotic. |
| `loot_tier_superior` | Marks a loot drop as superior. |
| `progression` | A progression change, such as experience or rank; the report carries a number. |
| `reputation_vanguard` | Likely reputation with the Vanguard changed. |
| `shotgun_acquire` | Likely a player picked up a shotgun. |
| `talent_grid_binary_swap` | A talent grid choice between two options was swapped. |
| `talent_grid_complete` | A talent grid was completed. |
| `vendor_pvp_invitation` | Likely a vendor invited the player to PvP. |

## Dialogue, sequences and cinematics

| Incident | What it reports |
|---|---|
| `cinematic_finished` | A cinematic finished playing. |
| `cinematic_skip` | Likely a player skipped a cinematic. |
| `cinematic_started` | A cinematic started playing. |
| `sequence` | A step of a sequence was reached; the report names the sequence node. |

## Tutorials

Prompts that teach the player something the first time it matters.

| Incident | What it reports |
|---|---|
| `incident_tutorial_weapon_heavy` | Likely the heavy weapon tutorial prompt fired. |
| `tutorial_character_level` | Likely the character level tutorial prompt fired. |
| `tutorial_mentor` | Likely the mentor tutorial prompt fired. |
| `tutorial_ship` | Likely the ship tutorial prompt fired. |
| `tutorial_vehicle` | Likely the vehicle tutorial prompt fired. |
| `tutorial_weapon` | Likely a weapon tutorial prompt fired. |
| `tutorial_weapon_heavy` | Likely the heavy weapon tutorial prompt fired. |
| `tutorial_weapon_machinegun` | Likely the machine gun tutorial prompt fired. |
| `tutorial_weapon_primary` | Likely the primary weapon tutorial prompt fired. |
| `tutorial_weapon_rocket_launcher` | Likely the rocket launcher tutorial prompt fired. |
| `tutorial_weapon_sniper_rifle` | Likely the sniper rifle tutorial prompt fired. |
| `tutorial_weapon_special` | Likely the special weapon tutorial prompt fired. |

## Other

Names we cannot place with confidence.

| Incident | What it reports |
|---|---|
| `cosmo_test` | Likely a test incident for the Cosmodrome. |
| `debug` | A debug incident. |
| `do_not_use` | A placeholder name; by its name it is not meant to be used. |
| `edz_test` | Likely a test incident for the EDZ. |
| `expulsion` | Likely a player was expelled from something. |
| `hiveship_test` | Likely a test incident for the Hive ship. |
| `hop_on_clear` | Likely something happens once an area is cleared; meaning unclear. |
| `none` | An incident with no meaning of its own and no extra data. |
| `venus_test` | Likely a test incident for Venus. |
