# es\cosmo\act_cosmo_m6_rasputin\act_cosmo_m6_rasputin.es
#
# Rasputin's bunker: from delta_n across the dry sea to the vendor bunker,
# through its door, down the hall to Rasputin's core and its controls, the
# Hive fight for the core, then the lights coming back. The root starts
# nothing; the phases are the missions beside it, run in order. Mission file
# names are ours.
#
#   act_cosmo_m6_rasputin_mission1.esp  to the vendor bunker, its door
#   act_cosmo_m6_rasputin_mission2.esp  down the hall to the core's controls
#   act_cosmo_m6_rasputin_mission3.esp  the fight for the core
#   act_cosmo_m6_rasputin_mission4.esp  the lights, the outro
#
# The core's encounter is es\cosmo\rasputin\enc_rasputin_m6.es. From one
# retail 2.3.1 run with two wipes in the core (tiger-packet-analysis
# docs/missions/act_cosmo_m6_rasputin.md): every wait is that run's.
#
# TU0 has a phase 2.3.1 cut (phase_delta_s_main: a goto and a cable in
# delta_s) and objectives it no longer shows (the vendor door, the intro's
# kill, the final console). The lifetime of the 2.3.1 run ran the four
# phases below and nothing else, so those are not written.

@activity_bundle("act_cosmo_m6_rasputin")
# The 2.3.1 run starts in delta_n (48, bubble 6 state 0, no phase there) at
# the spawn its GAS names; the lifetime runs the vendor phase in
# rasputin_vendor (18), then three phases in rasputin (17).
@activity("act_cosmo_m6_rasputin")
@start_slice("delta_n")
@phase("phase_rasputin_vendor_main", "rasputin_vendor")
@phase("phase_rasputin_intro", "rasputin")
@phase("phase_rasputin_boss", "rasputin")
@phase("phase_rasputin_final", "rasputin")
@spawn_transition(0x2EA8FB98)
# The transitions the GAS names as the client reaches delta_n, the dry sea,
# the vendor bunker and the core.
@region_spawn_transition(48, 0x2EA8FB98)
@region_spawn_transition(88, 0x86308FE4)
@region_spawn_transition(144, 0x8D1B5700)
@region_spawn_transition(136, 0x0CDE83B1)

act_cosmo_m6_rasputin_mission1 phase_rasputin_vendor_main
act_cosmo_m6_rasputin_mission2 phase_rasputin_intro
act_cosmo_m6_rasputin_mission3 phase_rasputin_boss
act_cosmo_m6_rasputin_mission4 phase_rasputin_final

@startup()
script ss_cosmo_m6_rasputin():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
