# es\cosmo\cosmo_patrols_1\cosmo_patrols_1.es
#
# Explore Cosmodrome: the destination's patrol. The players land in the
# delta south (the steppes) and roam the Cosmodrome; the destination's
# ambient layer, loot and public events run in their own bundles. This
# script hands out patrol missions from the beacons: while no mission runs,
# the controller's objective points the players at the beacons; a player
# using any beacon gets a mission picked at random, announced by its giver,
# and the next one is offered 13 s after it clears.
#
# From retail 2.3.1's Cosmodrome patrol (cosmo patrol capture, one run of
# 32 minutes, five missions: a Dead Orbit scan, two collects, two kills),
# mapped onto this build's rows, whose missions and announcers are named as
# retail's (patrol_kill_enemy, patrol_collect, patrol_scan, patrol_kill_vip,
# patrol_sighting). Captured: the start (delta south, the default spawn
# point), the intro music at the spawn, the beacon objective 11 s later,
# the mission 2 s after the beacon is used, the counts of the captured
# missions, the givers of the scans and of the captured kills and collects,
# and the four-minute refresh of the beacon objective (cleared and shown
# again 3 s later). Guessed: the pick (a kind at random, then a mission of
# it, never the one just run), the counts and givers of the missions no
# run took, and that a beacon used while a mission runs does nothing.

@activity_bundle("cosmo_patrols_1")
# retail's patrol world starts in the delta south (GAS initial slice 56, its
# bubble 7, at the default spawn point)
@activity("cosmo_patrols_1")
@start_slice("delta_s")

patrol_controller cosmo_patrols_controller

# kills anywhere; retail's counts
patrol_kill_enemy patrol_kill_enemy bind(18)
patrol_kill_enemy patrol_kill_enemy_1 bind(17)

# pickups from the destination's drops; retail's counts for multi_armor (7)
# and all_armor_a (10), the other all_ ones as all_armor_a, the rest 5
patrol_collect patrol_loot_fallen_all_armor_a bind(10)
patrol_collect patrol_loot_fallen_all_armor_b bind(10)
patrol_collect patrol_loot_fallen_all_weapon bind(10)
patrol_collect patrol_loot_fallen_dreg_armor bind(5)
patrol_collect patrol_loot_fallen_multi_armor bind(7)
patrol_collect patrol_loot_fallen_shank_armor bind(5)
patrol_collect patrol_loot_fallen_shank_weapon bind(5)
patrol_collect patrol_loot_fallen_vandal_weapon bind(5)
patrol_collect patrol_loot_hive_all_armor_a bind(10)
patrol_collect patrol_loot_hive_all_armor_b bind(10)

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

patrol_sighting patrol_sighting_delta_n
patrol_sighting patrol_sighting_delta_s
patrol_sighting patrol_sighting_array
patrol_sighting patrol_sighting_refinery
patrol_sighting patrol_sighting_dry_sea
patrol_sighting patrol_sighting_rocketyard
patrol_sighting patrol_sighting_graveyard
patrol_sighting patrol_sighting_blast
patrol_sighting patrol_sighting_dome_c

# the scans, one pair per giver, bound by their spots' import names
patrol_scan patrol_scan_nm bind("0x1E42FB91")
patrol_scan patrol_scan_nm_1 bind("0x1E42FB90")
patrol_scan patrol_scan_do bind("0xFC51D095")
patrol_scan patrol_scan_do_1 bind("0xFC51D094")
patrol_scan patrol_scan_fwc bind("0xFC188F58")
patrol_scan patrol_scan_fwc_1 bind("0xFC188F59")
patrol_scan patrol_scan_ship bind("0x960B8C16")
patrol_scan patrol_scan_ship_1 bind("0x960B8C17")
patrol_scan patrol_scan_weap bind("0xDA9317A5")
patrol_scan patrol_scan_weap_1 bind("0xDA9317A4")
patrol_scan patrol_scan_shader bind("0xB09C72CD")
patrol_scan patrol_scan_shader_1 bind("0xB09C72CC")
patrol_scan patrol_scan_crypt bind("0x99AABC80")
patrol_scan patrol_scan_crypt_1 bind("0x99AABC81")

location blast  # WARNING: unused - no script reads where the players are; retail never sent the patrol's locations
location dome_c  # WARNING: unused - as blast
location dome_a  # WARNING: unused - as blast
location hangar  # WARNING: unused - as blast
location graveyard  # WARNING: unused - as blast
location refinery  # WARNING: unused - as blast
location array  # WARNING: unused - as blast
location delta_n  # WARNING: unused - as blast
location delta_s  # WARNING: unused - as blast
location dry_sea  # WARNING: unused - as blast
location rocketyard  # WARNING: unused - as blast

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
    cosmo_patrols_controller._intro_music.start()
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
        mission = pick(i_kind, [patrol_kill_enemy, patrol_kill_enemy_1])
        givers = [c.announcer_hunter, c.announcer_titan, c.announcer_warlock]
    elif i_kind == 1:
        mission = pick(i_kind, [patrol_loot_fallen_all_armor_a, patrol_loot_fallen_all_armor_b, patrol_loot_fallen_all_weapon, patrol_loot_fallen_dreg_armor, patrol_loot_fallen_multi_armor, patrol_loot_fallen_shank_armor, patrol_loot_fallen_shank_weapon, patrol_loot_fallen_vandal_weapon, patrol_loot_hive_all_armor_a, patrol_loot_hive_all_armor_b])
        givers = [c.announcer_cryptarch, c.announcer_ship, c.announcer_weapons, c.announcer_do, c.announcer_fwc, c.announcer_nm, c.announcer_shader]
    elif i_kind == 2:
        mission = pick(i_kind, [patrol_kill_vip_shank, patrol_kill_vip_servitor1, patrol_kill_vip_servitor2, patrol_kill_vip_vandal_rifle, patrol_kill_vip_vandal_launcher, patrol_kill_vip_dreg_pistol, patrol_kill_vip_knight, patrol_kill_vip_wizard])
        givers = [c.announcer_hunter, c.announcer_titan, c.announcer_warlock]
    elif i_kind == 3:
        mission = pick(i_kind, [patrol_sighting_delta_n, patrol_sighting_delta_s, patrol_sighting_array, patrol_sighting_refinery, patrol_sighting_dry_sea, patrol_sighting_rocketyard, patrol_sighting_graveyard, patrol_sighting_blast, patrol_sighting_dome_c])
        givers = [c.announcer_ghost]
    else:
        i_scan = mathlib.random_int_never_highest_value(0, 7)
        if i_scan == 0:
            mission = pick(10 + i_scan, [patrol_scan_nm, patrol_scan_nm_1])
            givers = [c.announcer_nm]
        elif i_scan == 1:
            mission = pick(10 + i_scan, [patrol_scan_do, patrol_scan_do_1])
            givers = [c.announcer_do]
        elif i_scan == 2:
            mission = pick(10 + i_scan, [patrol_scan_fwc, patrol_scan_fwc_1])
            givers = [c.announcer_fwc]
        elif i_scan == 3:
            mission = pick(10 + i_scan, [patrol_scan_ship, patrol_scan_ship_1])
            givers = [c.announcer_ship]
        elif i_scan == 4:
            mission = pick(10 + i_scan, [patrol_scan_weap, patrol_scan_weap_1])
            givers = [c.announcer_weapons]
        elif i_scan == 5:
            mission = pick(10 + i_scan, [patrol_scan_shader, patrol_scan_shader_1])
            givers = [c.announcer_shader]
        else:
            mission = pick(10 + i_scan, [patrol_scan_crypt, patrol_scan_crypt_1])
            givers = [c.announcer_cryptarch]

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
