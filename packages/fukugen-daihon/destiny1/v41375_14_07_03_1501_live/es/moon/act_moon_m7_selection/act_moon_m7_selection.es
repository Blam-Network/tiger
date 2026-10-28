# es\moon\act_moon_m7_selection\act_moon_m7_selection.es
#
# Now Come Salvation. The root puts the lifetime in pregame; the phases are
# the missions beside it, run in order. Mission file names are ours.
#
#   act_moon_m7_selection_mission1.esp  the accelerator: the players are in
#   act_moon_m7_selection_mission2.esp  through the launch tubes
#   act_moon_m7_selection_mission3.esp  the launch tubes floor: the control
#   act_moon_m7_selection_mission4.esp  on through Strength to Selection
#   act_moon_m7_selection_mission5.esp  the arena: kill the witches
#   act_moon_m7_selection_mission6.esp  the outro
#
# The launch tubes and Selection have encounters of their own
# (es\moon\launchtubes\enc_launchtubes_m7.es, es\moon\selection\enc_selection_m7.es);
# the intro music and the first lines are unknown_995fbd7f beside this file.
#
# Authored from one retail 2.3.1 capture (2026-10-27 18-32-12): every wait
# is that run's, unconfirmed. 2.3.1 rebuilt the mission: its phases are
# renamed (moon_m7_phase_*), the launch tubes control is gone, Selection
# gained a hall phase and the Oversoul fight, and Strength an encounter TU0
# never had. The phases here are TU0's; where 2.3.1 kept a step, its timing
# is the capture's.

@activity_bundle("act_moon_m7_selection")
# The accelerator (8, bubble 1) at the GAS's spawn 87875158; the launch
# tubes (24) and Selection (80) hold the phases. The region transitions are
# the ones the GAS named once the client had been there.
@activity("act_moon_m7_selection")
@start_slice("accelerator", "phase_accelerator")
@phase("phase_accelerator", "accelerator")
@phase("phase_launchtubes", "launchtubes")
@phase("phase_launchtubes_arena", "launchtubes")
@phase("phase_selection", "selection")
@phase("phase_selection_boss", "selection")
@phase("phase_selection_final", "selection")
@spawn_transition(0x87875158)
@region_spawn_transition(8, 0x87875158)
@region_spawn_transition(48, 0x1F69D387)
@region_spawn_transition(24, 0x520A0F48)
@region_spawn_transition(88, 0x5DA8690D)
@region_spawn_transition(80, 0xF47F841D)

act_moon_m7_selection_mission1 phase_accelerator
act_moon_m7_selection_mission2 phase_launchtubes
act_moon_m7_selection_mission3 phase_launchtubes_arena
act_moon_m7_selection_mission4 phase_selection
act_moon_m7_selection_mission5 phase_selection_boss
act_moon_m7_selection_mission6 phase_selection_final

@startup()
script ss_moon_m7_selection():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
