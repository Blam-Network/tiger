# es\mars\act_mars_m03_penthouse\act_mars_m03_penthouse.es
#
# The Buried City, the Mars story mission into the buried towers: from the
# landing zone to the downtown console, through the office and the atrium
# where the Vex and Cabal fight, up to the penthouse rooms, and the
# Rasputin node at the top. The root puts the lifetime in pregame; the
# phases are the missions beside it, run in order. Mission file names are
# ours.
#
#   act_mars_m03_penthouse_mission1.esp  to downtown
#   act_mars_m03_penthouse_mission2.esp  downtown: the overlook, the console
#   act_mars_m03_penthouse_mission3.esp  to the atrium
#   act_mars_m03_penthouse_mission4.esp  the office and the atrium
#   act_mars_m03_penthouse_mission5.esp  to the penthouse
#   act_mars_m03_penthouse_mission6.esp  the penthouse, rooms 0 and 1
#   act_mars_m03_penthouse_mission7.esp  the darkness: rooms 2 and 3, the major
#   act_mars_m03_penthouse_mission8.esp  the node, the end
#
# The atrium and penthouse encounters are scripts of their own
# (es\mars\atrium\enc_atrium_m03.es, es\mars\penthouse\enc_penthouse_m03.es);
# unknown_c588d132 beside this file holds the music and the Ghost's lines.
# Authored from one retail 2.3.1 capture (tiger-packet-analysis
# docs/missions/act_mars_m03_penthouse.md): every wait is that run's,
# unconfirmed.

@activity_bundle("act_mars_m03_penthouse")
# The Mars landing zone (144, bubble 18 state 0) at landing_zone; the
# lifetime runs the first two phases downtown (48), the next two in the
# atrium (0) and the rest in the penthouse (136). The region transitions are
# the ones the GAS named once the client had been there. One 2.3.1 capture.
@activity("act_mars_m03_penthouse")
@start_slice("plains")
@phase("phase_m03_downtown_goto", "downtown")
@phase("phase_m03_downtown", "downtown")
@phase("phase_m03_atrium_goto", "atrium")
@phase("phase_m03_atrium", "atrium")
@phase("phase_m03_penthouse_goto", "penthouse")
@phase("phase_m03_penthouse", "penthouse")
@phase("phase_m03_penthouse_darkness", "penthouse")
@phase("phase_m03_penthouse_close", "penthouse")
@spawn_transition("landing_zone")
@region_spawn_transition(144, "landing_zone")
@region_spawn_transition(48, 0xF7459AB9)
@region_spawn_transition(0, 0xE0F85F4C)
@region_spawn_transition(136, 0x0B1EE125)

act_mars_m03_penthouse_mission1 phase_m03_downtown_goto
act_mars_m03_penthouse_mission2 phase_m03_downtown
act_mars_m03_penthouse_mission3 phase_m03_atrium_goto
act_mars_m03_penthouse_mission4 phase_m03_atrium
act_mars_m03_penthouse_mission5 phase_m03_penthouse_goto
act_mars_m03_penthouse_mission6 phase_m03_penthouse
act_mars_m03_penthouse_mission7 phase_m03_penthouse_darkness
act_mars_m03_penthouse_mission8 phase_m03_penthouse_close

@startup()
script ss_mars_m03_penthouse():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
