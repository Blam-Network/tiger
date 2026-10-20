@activity_bundle("strike_1_activity")
@activity("venus_portal_1")
@start_slice("plaza", "engineering_phase")
@phase("engineering_phase", "plaza")
@phase("dig_site_phase", "dig_site")
@phase("ruins_phase", "vex_ruins")
@phase("end_phase", "vex_ruins")

@member_counts({sq_floor1_fallen01: {dreg: 3, vandal: 3}, sq_floor1_fallen02: {shank: 3, dreg: 3}, sq_floor1_fallen03: {shank: 2, dreg: 2, vandal: 2}, sq_floor1_fallen04: {vandal: 2, captain: 0, shank: 0, dreg: 4}, sq_floor1_fallen04a: {vandal: 2, captain: 0, shank: 0, dreg: 2}, sq_floor1_fallen05: {vandal: 3, captain: 0, shank: 0, dreg: 3}, sq_floor1_fallen06: {vandal: 3, captain: 0, shank: 3}, sq_floor1_fallen06a: {captain: 1, shank: 3}, sq_floor1_fallen07: {vandal: 0, shank: 2, dreg: 4}, sq_floor1_fallen08: {dreg: 3, vandal: 3}, sq_floor1_fallen08a: {dreg_1: 3, vandal_1: 1}, sq_objective01: {cell_1: 1}, sq_objective02: {cell_1: 1}, sq_objective03: {cell_1: 1}, sq_objective04: {cell_1: 1}, sq_objective05: {cell_1: 1}, sq_objective06: {cell_1: 1}, sq_objective07: {cell_1: 1}, sq_objective08: {cell_1: 1}})
venus_strike_1_mission1 engineering_phase
venus_strike_1_mission2 dig_site_phase
@member_counts({warpstorm01: {storm: 0}, warpstorm02: {storm: 0}, warpstorm03: {storm: 0}, sq_boss: {ultra_hydra: 0}, sq_boss_guard01: {cell_1: 1}, sq_boss_guard02: {cell_1: 1}, sq_boss_guard03: {cell_1: 1}, sq_boss_guard04: {cell_1: 1}, sq_boss_guard05: {cell_1: 1}, sq_boss_guard06: {cell_1: 1}, sq_strike01_4: {all: 4}, sq_strike01_6: {all: 6}, sq_strike01_8: {all: 8}, sq_strike02_4: {all: 8}, sq_strike02_6: {all: 6}, sq_strike02_8: {all: 8}, sq_strike03_4: {all: 4}, sq_strike03_6: {all: 6}, sq_strike03_8: {all: 8}})
venus_strike_1_mission3 ruins_phase
venus_strike_1_mission4_temp end_phase



@startup()
script ss_venus_strike1():
    print("script startup")

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 821B8018
