# es\cosmo\cosmo_patrols_1\cosmo_patrols_1.es
#
# Explore Cosmodrome: the destination's patrol. The players land in the
# delta south (the steppes) and roam the Cosmodrome; the destination's
# ambient layer, loot and public events run in their own bundles. This
# script hands out patrol missions from the beacons: while no mission runs,
# the controller's objective points the players at the beacons; a player
# using any beacon gets a mission picked at random, announced by a giver of
# its kind, and the next one is offered 13 s after it clears.
#
# From retail 2.3.1's Cosmodrome patrol (cosmo patrol capture, one run of
# 32 minutes, five missions: a Dead Orbit scan, two collects, two kills),
# mapped onto this build's older rows: kill missions per enemy kind and per
# faction where retail has one kind-blind pair, a scan per spot named for
# its zone where retail names them for the giver, no sighting missions,
# announcers per kind (coll_, kill_, scan_) and no intro music. Captured:
# the start (delta south, the default spawn point), the beacon objective
# 11 s in, the mission 2 s after the beacon is used, the four-minute
# refresh of the beacon objective (cleared and shown again 3 s later), and
# the counts of the missions retail ran (its kill pair 18 and 17 for the
# Fallen pair, its multi_armor 7, its all_armor_a 10). Guessed: the pick (a
# kind at random, then a mission of it, never the one just run), the other
# counts, the givers within a kind, and that a beacon used while a mission
# runs does nothing.

@activity_bundle("cosmo_patrols_1")
# retail's patrol world starts in the delta south (GAS initial slice 56, its
# bubble 7, at the default spawn point)
@activity("cosmo_patrols_1")
@start_slice("delta_s")

patrol_controller cosmo_patrols_controller

# kills anywhere: of a faction (retail's counts on the Fallen pair), or of
# one kind of enemy, named as its squads' members are
patrol_kill_faction patrol_kill_fallen bind(18)
patrol_kill_faction patrol_kill_fallen_1 bind(17)
patrol_kill_faction patrol_kill_hive bind(18)
patrol_kill_combatant patrol_kill_dreg bind("dreg", 10)
patrol_kill_combatant patrol_kill_dreg_1 bind("dreg", 10)
patrol_kill_combatant patrol_kill_vandal bind("vandal", 10)
patrol_kill_combatant patrol_kill_shank bind("shank", 10)
patrol_kill_combatant patrol_kill_servitor bind("servitor", 3)
patrol_kill_combatant patrol_kill_trooper bind("trooper", 10)

# pickups from the destination's drops; retail's counts for multi_armor (7)
# and all_armor_a (10), the other all_ ones as all_armor_a, the rest 5
patrol_collect patrol_loot_fallen_all_armor_a bind(10)
patrol_collect patrol_loot_fallen_all_armor_b bind(10)
patrol_collect patrol_loot_fallen_all_weapon bind(10)
patrol_collect patrol_loot_fallen_dreg_armor bind(5)
patrol_collect patrol_loot_fallen_dreg_armor_1 bind(5)
patrol_collect patrol_loot_fallen_multi_armor bind(7)
patrol_collect patrol_loot_fallen_multi_armor_1 bind(7)
patrol_collect patrol_loot_fallen_servitor_armor_a bind(5)
patrol_collect patrol_loot_fallen_servitor_armor_b bind(5)
patrol_collect patrol_loot_fallen_shank_armor bind(5)
patrol_collect patrol_loot_fallen_shank_weapon bind(5)
patrol_collect patrol_loot_fallen_vandal_weapon bind(5)
patrol_collect patrol_loot_hive_all_armor_a bind(10)
patrol_collect patrol_loot_hive_all_armor_b bind(10)

# the scans, one a spot, bound by their spots' import names
patrol_scan patrol_scan_graveyard bind("0x14269DB1")
patrol_scan patrol_scan_graveyard_1 bind("0x14269DB0")
patrol_scan patrol_scan_delta_n bind("0x80EA36A3")
patrol_scan patrol_scan_delta_n_1 bind("0x80EA36A2")
patrol_scan patrol_scan_delta_n_2 bind("0x80EA36A1")
patrol_scan patrol_scan_delta_s bind("0x9BEA6124")
patrol_scan patrol_scan_delta_s_1 bind("0x9BEA6125")
patrol_scan patrol_scan_rocketyard bind("0xE42D7DBC")
patrol_scan patrol_scan_array bind("0x77955081")
patrol_scan patrol_scan_dry_sea bind("0x67A21065")

# the named targets, bound by their squads' import names (the zones'
# enc_<zone>_patrols1 bundles)
patrol_kill_vip patrol_kill_vip_shank bind("0x5DA6DAC4")
patrol_kill_vip patrol_kill_vip_servitor1 bind("sq_patrol_vip_servitor1")
patrol_kill_vip patrol_kill_vip_servitor2 bind("sq_patrol_vip_servitor2")
patrol_kill_vip patrol_kill_vip_vandal_rifle bind("0xABC4F9A8")
patrol_kill_vip patrol_kill_vip_vandal_launcher bind("0xE2D679D6")
patrol_kill_vip patrol_kill_vip_dreg_pistol bind("0x10EF13FF")
patrol_kill_vip patrol_kill_vip_knight bind("0x8A46AD1A")
patrol_kill_vip patrol_kill_vip_wizard bind("0x5847521C")

location graveyard  # WARNING: unused - no script reads where the players are; retail never sent the patrol's locations
location rocketyard  # WARNING: unused - as graveyard
location delta_n  # WARNING: unused - as graveyard
location delta_s  # WARNING: unused - as graveyard
location array  # WARNING: unused - as graveyard
location dry_sea  # WARNING: unused - as graveyard

# the beacons, two or three a patrol zone
encounter_handle enc_array_patrols1
encounter_handle enc_delta_n_patrols1
encounter_handle enc_delta_s_patrols1
encounter_handle enc_dry_sea_patrols1
encounter_handle enc_graveyard_patrols1
encounter_handle enc_rocketyard_patrols1

int i_last_kind = -1
int i_last_mission = -1

@startup()
script main():
    sleep(11)
    while true:
        cosmo_patrols_controller.show_beacons(first_beacons())
        terminal = wait_for_beacon()
        terminal.reset()
        cosmo_patrols_controller.hide_beacons()
        run_mission()
        sleep(13)

def beacons():
    return [enc_array_patrols1.patrol_terminal, enc_array_patrols1.patrol_terminal_1, enc_delta_n_patrols1.patrol_terminal, enc_delta_n_patrols1.patrol_terminal_1, enc_delta_n_patrols1.patrol_terminal_2, enc_delta_s_patrols1.patrol_terminal, enc_delta_s_patrols1.patrol_terminal_1, enc_delta_s_patrols1.patrol_terminal_2, enc_dry_sea_patrols1.patrol_terminal, enc_dry_sea_patrols1.patrol_terminal_1, enc_graveyard_patrols1.patrol_terminal, enc_graveyard_patrols1.patrol_terminal_1, enc_rocketyard_patrols1.patrol_terminal, enc_rocketyard_patrols1.patrol_terminal_1, enc_rocketyard_patrols1.patrol_terminal_2]

# retail's beacon objective carries one waypoint per patrol zone, on the
# zone's first beacon
def first_beacons():
    return [enc_array_patrols1.patrol_terminal._terminal_hotspot, enc_delta_n_patrols1.patrol_terminal._terminal_hotspot, enc_delta_s_patrols1.patrol_terminal._terminal_hotspot, enc_dry_sea_patrols1.patrol_terminal._terminal_hotspot, enc_graveyard_patrols1.patrol_terminal._terminal_hotspot, enc_rocketyard_patrols1.patrol_terminal._terminal_hotspot]

# the beacon a player uses; the objective is put out again every 240 s
# while nobody does (retail: cleared 239.4 s after it went up, back 3 s
# later, three times in a row)
def wait_for_beacon():
    while true:
        i_shown = 0
        while i_shown < 240:
            for terminal in beacons():
                if terminal.is_used():
                    return terminal
            sleep(1)
            i_shown = i_shown + 1
        cosmo_patrols_controller.hide_beacons()
        sleep(3)
        cosmo_patrols_controller.show_beacons(first_beacons())

def run_mission():
    i_kind = mathlib.random_int_never_highest_value(0, 5)
    c = cosmo_patrols_controller
    mission = nil
    givers = []
    if i_kind == 0:
        mission = pick(i_kind, [patrol_kill_fallen, patrol_kill_fallen_1, patrol_kill_hive])
        givers = [c.announcer_kill_hunter, c.announcer_kill_titan, c.announcer_kill_warlock]
    elif i_kind == 1:
        mission = pick(i_kind, [patrol_kill_dreg, patrol_kill_dreg_1, patrol_kill_vandal, patrol_kill_shank, patrol_kill_servitor, patrol_kill_trooper])
        givers = [c.announcer_kill_hunter, c.announcer_kill_titan, c.announcer_kill_warlock]
    elif i_kind == 2:
        mission = pick(i_kind, [patrol_loot_fallen_all_armor_a, patrol_loot_fallen_all_armor_b, patrol_loot_fallen_all_weapon, patrol_loot_fallen_dreg_armor, patrol_loot_fallen_dreg_armor_1, patrol_loot_fallen_multi_armor, patrol_loot_fallen_multi_armor_1, patrol_loot_fallen_servitor_armor_a, patrol_loot_fallen_servitor_armor_b, patrol_loot_fallen_shank_armor, patrol_loot_fallen_shank_weapon, patrol_loot_fallen_vandal_weapon, patrol_loot_hive_all_armor_a, patrol_loot_hive_all_armor_b])
        givers = [c.announcer_coll_cryptarch, c.announcer_coll_ship, c.announcer_coll_weapons]
    elif i_kind == 3:
        mission = pick(i_kind, [patrol_scan_graveyard, patrol_scan_graveyard_1, patrol_scan_delta_n, patrol_scan_delta_n_1, patrol_scan_delta_n_2, patrol_scan_delta_s, patrol_scan_delta_s_1, patrol_scan_rocketyard, patrol_scan_array, patrol_scan_dry_sea])
        givers = [c.announcer_scan_do, c.announcer_scan_fwc, c.announcer_scan_nm]
    else:
        mission = pick(i_kind, [patrol_kill_vip_shank, patrol_kill_vip_servitor1, patrol_kill_vip_servitor2, patrol_kill_vip_vandal_rifle, patrol_kill_vip_vandal_launcher, patrol_kill_vip_dreg_pistol, patrol_kill_vip_knight, patrol_kill_vip_wizard])
        givers = [c.announcer_kill_hunter, c.announcer_kill_titan, c.announcer_kill_warlock]

    # the giver comes in the update the beacon objective goes, the mission
    # 2 s later; every announcer goes as it completes
    cosmo_patrols_controller.announce(givers)
    sleep(2)
    mission.objective_begin()
    sleep_until(mission.is_complete())
    cosmo_patrols_controller.silence()
    mission.objective_end()

# one of the kind's missions at random, never the one just run (retail's
# five missions had no repeat)
def pick(i_kind, missions):
    i = mathlib.random_int_never_highest_value(0, len(missions))
    if i_kind == i_last_kind and i == i_last_mission and len(missions) > 1:
        i = (i + 1) % len(missions)
    i_last_kind = i_kind
    i_last_mission = i
    return missions[i]
