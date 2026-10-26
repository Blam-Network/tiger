# es\moon\act_moon_m3_lowercitadel\act_moon_m3_lowercitadel.es
#
# The World's Grave. Down from the wisdom hall through the Lower Citadel's
# arena to the Hive library in the strength chamber, where the Ghost reads
# the Grave while the Hive come for it. The root starts nothing; the phases
# are the missions beside it, run in order. Mission file names are ours.
# Written from two 2.3.1 runs (2026-10-03 and 2026-10-25, one player each,
# no wipe): every wait in these files held in both, nothing is confirmed past
# that. The accelerator (1) is a public bubble: the player spawns there, on
# the Moon's public host (checksum 4776B394), and walks down.
#
#   act_moon_m3_lowercitadel_mission1.esp  phase_wisdom: reach the Lower Citadel
#   act_moon_m3_lowercitadel_mission2.esp  phase_lowercitadel: the arena, take the key
#   act_moon_m3_lowercitadel_mission3.esp  phase_strength: the chamber, kill the guards
#   act_moon_m3_lowercitadel_mission4.esp  phase_strength_b: the scan, defend the Ghost
#   act_moon_m3_lowercitadel_mission5.esp  phase_strength_complete: the end
#
# The chamber's Hive are enc_strength_m3's (es\moon\strength); the arena's
# are the Lower Citadel's ambient. unknown_e2388efa holds the music and
# Ghost lines. The Grave's console is placed here so it is in the world from
# the start; it only works for players holding the scan objective's flag
# (pf_obj_strength_interact, mission 4, binds the same identifier).

@activity_bundle("act_moon_m3_lowercitadel")
# The accelerator (1) at the same spawn, the wisdom and citadel phases in 5, the
# strength phases in 11. Both 2.3.1 runs.
@activity("act_moon_m3_lowercitadel")
@start_slice("accelerator")
@phase("phase_wisdom", "lowercitadel")
@phase("phase_lowercitadel", "lowercitadel")
@phase("phase_strength", "strength")
@phase("phase_strength_b", "strength")
@phase("phase_strength_complete", "strength")
@spawn_transition(0x87875158)

act_moon_m3_lowercitadel_mission1 phase_wisdom
act_moon_m3_lowercitadel_mission2 phase_lowercitadel
act_moon_m3_lowercitadel_mission3 phase_strength
act_moon_m3_lowercitadel_mission4 phase_strength_b
act_moon_m3_lowercitadel_mission5 phase_strength_complete

interactable_placement pf_obj_strength_interact_place bind("0x9D0AD7E7")

@startup()
script ss_moon_m3_lowercitadel():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
