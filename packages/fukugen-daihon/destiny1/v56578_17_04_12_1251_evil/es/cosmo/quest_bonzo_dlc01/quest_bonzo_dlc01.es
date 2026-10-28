# es\cosmo\quest_bonzo_dlc01\quest_bonzo_dlc01.es
#
# The Cosmodrome's Taken King quest after the Hive knight in the grotto: from
# the blast, where Omnigul and the Fallen fight, through the refinery's Hive
# ritual to the hive shore's grotto and the knight. The root starts nothing;
# the phases are the missions beside it, run in order. Mission file names are
# ours. From two retail captures, each with a wipe in the knight's fight.
#
#   quest_bonzo_dlc01_mission1.esp  goto_bonzo_phase00: on to the grotto
#   quest_bonzo_dlc01_mission2.esp  kill_bonzo_phase01: the knight
#
# The blast is enc_blast_dlc01's, the refinery unknown_478ee338's, the grotto
# and the knight unknown_02136f70's; unknown_da7309d3 holds the Ghost's lines
# and the music.

@activity_bundle("quest_bonzo_dlc01")
# The 2.3.1 capture starts it in the blast (bubble 2) at spawn point
# 0xF6349284; its lifetime runs goto_bonzo_phase00 (bubble 11) and
# kill_bonzo_phase01 (15). The region spawns are the ones the GAS named as
# the player reached the refinery and the hive shore.
@activity("quest_bonzo_dlc01")
@start_slice("blast")
@phase("goto_bonzo_phase00", "dry_sea")
@phase("kill_bonzo_phase01", "hive_shore")
@spawn_transition(0xF6349284)
@region_spawn_transition(152, "refinery_to_blast")
@region_spawn_transition(120, "refinery_to_hive_shore")

quest_bonzo_dlc01_mission1 goto_bonzo_phase00
quest_bonzo_dlc01_mission2 kill_bonzo_phase01

@startup()
script ss_quest_bonzo_dlc01():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
