# es\moon\act_moon_m4_uppercitadel\act_moon_m4_uppercitadel.es
#
# The Sword of Crota. The root starts nothing; the phases are the missions
# beside it, run in order. Mission file names are ours.
#
#   act_moon_m4_uppercitadel_mission1.esp  from the accelerator to the Hellmouth
#   act_moon_m4_uppercitadel_mission2.esp  the henge: get there, kill its Hive
#   act_moon_m4_uppercitadel_mission3.esp  on to the upper citadel
#   act_moon_m4_uppercitadel_mission4.esp  the chain room, clear it, take the sword
#   act_moon_m4_uppercitadel_mission5.esp  the darkness: the Swordbearers' waves
#   act_moon_m4_uppercitadel_mission6.esp  the sword shatters; the mission ends
#
# The upper citadel's own encounter is es\moon\uppercitadel\enc_uppercitadel_m4.es
# (the room, the waves, the sword); the music and the Ghost's lines are
# unknown_861cc3e2's rows, started by the missions. The accelerator (1) and
# the Hellmouth (2) are public bubbles: the spawn is on the accelerator's
# public host and the Hellmouth's triggers and kills on the Hellmouth's.
# From one retail 2.3.1 run (2026-10-25, one player): every rule here is
# that run's and unconfirmed.

@activity_bundle("act_moon_m4_uppercitadel")
# The run starts in the accelerator (slice 8) at the spawn its GAS names; the
# lifetime runs the six phases in this order, the first two in the Hellmouth
# (2), the rest in the upper citadel (12).
@activity("act_moon_m4_uppercitadel")
@start_slice("accelerator")
@phase("phase_m4_hellmouth_goto", "hellmouth")
@phase("phase_m4_hellmouth", "hellmouth")
@phase("phase_m4_uppercitadel_goto", "uppercitadel")
@phase("phase_m4_uppercitadel", "uppercitadel")
@phase("phase_m4_uppercitadel_darkness", "uppercitadel")
@phase("phase_m4_uppercitadel_close", "uppercitadel")
@spawn_transition(0x87875158)
# The transitions the client reports beside the accelerator, the Hellmouth
# and the upper citadel; the GAS moved its spawn to each as the run got there.
@region_spawn_transition(8, 0x87875158)
@region_spawn_transition(16, 0xFF20D587)
@region_spawn_transition(96, 0x767553F6)

act_moon_m4_uppercitadel_mission1 phase_m4_hellmouth_goto
act_moon_m4_uppercitadel_mission2 phase_m4_hellmouth
act_moon_m4_uppercitadel_mission3 phase_m4_uppercitadel_goto
act_moon_m4_uppercitadel_mission4 phase_m4_uppercitadel
act_moon_m4_uppercitadel_mission5 phase_m4_uppercitadel_darkness
act_moon_m4_uppercitadel_mission6 phase_m4_uppercitadel_close

@startup()
script ss_moon_m4_uppercitadel():
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
