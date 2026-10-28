# es\impactsite\mission_darksnow\unknown_c07cc82c.es
#
# The Coming War, the Taken King's first mission (bundle C07CC82C, file name
# unknown): the Cabal stronghold at the impact site on Phobos, into their
# base, where the Taken show themselves, and on to the airfield to be picked
# up. The root puts the lifetime in pregame; the phases are the missions
# beside it, run in order. Mission file names are ours.
#
#   unknown_c07cc82c_mission1.esp  intro_cine_stronghold_phase: the arrival cinematic
#   unknown_c07cc82c_mission2.esp  kill_cabal_stronghold_phase: through the stronghold to the base
#   unknown_c07cc82c_mission3.esp  enter_base_phase: investigate the base
#   unknown_c07cc82c_mission4.esp  taken_reveal_base_phase: the Taken arrive, kill them
#   unknown_c07cc82c_mission5.esp  goto_airfield_phase: through the hall to the airfield
#   unknown_c07cc82c_mission6.esp  exfil_airfield_phase: hold out on the airfield for the ship
#   unknown_c07cc82c_mission7.esp  outro_cine_airfield_phase: the outro cinematic
#
# Each area's encounter is a script of its own beside this one:
# unknown_b38f4748 (the stronghold), unknown_0e747941 (the base) and
# unknown_15823806 (the airfield). unknown_1702136e holds the Ghost's lines
# and the alarm, which the missions play. Authored from one retail 2.3.1
# capture for the PS4 1.33 build (tiger-packet-analysis
# docs/missions/mission_darksnow.md): every wait is that run's, unconfirmed.

@activity_bundle(0xC07CC82C)
# The 2.3.1 capture starts it in the stronghold's cinematic state (25,
# bubble 3 state 1) at the default spawn; the lifetime runs the cinematic
# and the stronghold in the stronghold (3), the two base phases in the base
# (1) and the rest at the airfield (0). The region transitions are the ones
# the GAS named once the client had been there: the stronghold (24), the
# base (8), the airfield (0) and its outro state (1).
@activity("mission_darksnow")
@start_slice("stronghold", "intro_cine_stronghold_phase")
@phase("intro_cine_stronghold_phase", "stronghold")
@phase("kill_cabal_stronghold_phase", "stronghold")
@phase("enter_base_phase", "base")
@phase("taken_reveal_base_phase", "base")
@phase("goto_airfield_phase", "airfield")
@phase("exfil_airfield_phase", "airfield")
@phase("outro_cine_airfield_phase", "airfield")
@region_spawn_transition(24, 0x60ED6561)
@region_spawn_transition(8, 0x9CE8FECB)
@region_spawn_transition(0, 0xAD82CD01)
@region_spawn_transition(1, "")

unknown_c07cc82c_mission1 intro_cine_stronghold_phase
unknown_c07cc82c_mission2 kill_cabal_stronghold_phase
unknown_c07cc82c_mission3 enter_base_phase
unknown_c07cc82c_mission4 taken_reveal_base_phase
unknown_c07cc82c_mission5 goto_airfield_phase
unknown_c07cc82c_mission6 exfil_airfield_phase
unknown_c07cc82c_mission7 outro_cine_airfield_phase

@startup()
script ss_mission_darksnow():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
