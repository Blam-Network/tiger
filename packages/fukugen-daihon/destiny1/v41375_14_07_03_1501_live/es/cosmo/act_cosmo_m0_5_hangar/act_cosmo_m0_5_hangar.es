# es\cosmo\act_cosmo_m0_5_hangar\act_cosmo_m0_5_hangar.es
#
# The hangar mission, after A Guardian Rises: the Ghost looks over a crashed
# ship in delta_s (the flare, then the next thing to use), then back to the
# hangar, where its Fallen go down, the ultra lands with its Vandals and
# drops what the Ghost wants. The root starts nothing; the phases are the
# missions beside it, run in order. Mission file names are ours.
#
#   act_cosmo_m0_5_hangar_mission1.esp  delta_s: the flare and the ship
#   act_cosmo_m0_5_hangar_mission2.esp  back to the hangar, the ultra's loot
#   act_cosmo_m0_5_hangar_mission3.esp  clear out the Vandals, the ascent
#
# The hangar's own encounter is es\cosmo\hangar\enc_hangar_m0_5.es; the music
# and the Ghost's lines are unknown_0de80b0d. From four retail 2.3.1 runs
# (tiger-packet-analysis docs/missions/act_cosmo_m0_5_hangar.md).

@activity_bundle("act_cosmo_m0_5_hangar")
# All four runs start in delta_s (56, bubble 7 state 0) at the spawn the client
# names beside that region in its own transition (class 21), and the lifetime
# runs the three phases in this order, the last two in the hangar (13).
@activity("act_cosmo_m0_5_hangar")
@start_slice("delta_s", "cosmo_m0_5_phase00_delta_s")
@phase("cosmo_m0_5_phase00_delta_s", "delta_s")
@phase("cosmo_m0_5_phase01_hangar", "hangar")
@phase("cosmo_m0_5_phase02_hangar", "hangar")
@spawn_transition(0x2EA8FB98)
# The transitions the client reports beside delta_s and the hangar.
@region_spawn_transition(56, 0x2EA8FB98)
@region_spawn_transition(104, 0xD2FC7DB9)

act_cosmo_m0_5_hangar_mission1 cosmo_m0_5_phase00_delta_s
act_cosmo_m0_5_hangar_mission2 cosmo_m0_5_phase01_hangar
act_cosmo_m0_5_hangar_mission3 cosmo_m0_5_phase02_hangar

@startup()
script ss_cosmo_m0_5_hangar():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
