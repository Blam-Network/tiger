# es\cosmo\act_cosmo_m2_dome_c\act_cosmo_m2_dome_c.es
#
# Dome C, the second Cosmodrome story mission: use the thing in delta_n,
# ride the new Sparrow across the Dry Sea and use the two objects there,
# fight through the dome's pipe room and guards' hall to the console, hold
# off the Fallen waves, then destroy the beacon. The root starts nothing;
# the phases are the missions beside it, run in order. Mission file names
# are ours. From one retail run (2026-10-24_22-20-53, with the public host
# sessions of delta_n and the Dry Sea), so every rule and wait is
# unconfirmed.
#
#   act_cosmo_m2_dome_c_mission1.esp  delta_n: the opening lines, use obj_m2_o1
#   act_cosmo_m2_dome_c_mission2.esp  dry_sea: reach the sea, use its two objects
#   act_cosmo_m2_dome_c_mission3.esp  dome_c: use the console
#   act_cosmo_m2_dome_c_mission4.esp  dome_c: the Fallen waves
#   act_cosmo_m2_dome_c_mission5.esp  dome_c: destroy the beacon, the activity ends
#
# The dome's Fallen, console and beacon are es\cosmo\dome_c\enc_dome_c_m2.es.
# unknown_82945a01 holds the music and the Ghost's lines; the missions start
# the lines tied to their objectives.

@activity_bundle("act_cosmo_m2_dome_c")
# The 2.3.1 run starts in delta_s (bubble 7, slice 56); the lifetime runs
# delta_n's phase (bubble 6), the Dry Sea's (11), then the three dome_c
# phases (9).
@activity("act_cosmo_m2_dome_c")
@start_slice("delta_s")
@phase("cosmo_m2_phase00_delta_n", "delta_n")
@phase("cosmo_m2_phase01_dry_sea", "dry_sea")
@phase("cosmo_m2_phase02_dome_c", "dome_c")
@phase("cosmo_m2_phase03_dome_c", "dome_c")
@phase("cosmo_m2_phase04_dome_c", "dome_c")

act_cosmo_m2_dome_c_mission1 cosmo_m2_phase00_delta_n
act_cosmo_m2_dome_c_mission2 cosmo_m2_phase01_dry_sea
act_cosmo_m2_dome_c_mission3 cosmo_m2_phase02_dome_c
act_cosmo_m2_dome_c_mission4 cosmo_m2_phase03_dome_c
act_cosmo_m2_dome_c_mission5 cosmo_m2_phase04_dome_c

@startup()
script ss_cosmo_m2_dome_c():
    print("script startup")
    c_lifetime_script_utilities.get_lifetime_sensor().set_state(e_activity_lifetime_state.pregame)
