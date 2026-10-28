# es\venus\mission_pursuit\unknown_a4930efa.es
#
# The Thieves' Den in mission_pursuit. The mesa's spear captain and dregs
# stand from the den's load. As a player comes in over the ledge Skolas
# shows himself with the ledge's dregs and the ledge skiff; three seconds on
# he flees in his performance, and the skiff leaves five seconds after that.
# Once the mesa's captain is dead the wave announcement plays and the pit's
# Fallen come in three waves: once a wave is down to its last four the
# squads still standing push in, and the next wave comes two seconds after
# the last one is dead. The pit is clear once the third wave is.
#
# From two retail 2.3.1 captures (2026-10-27 20-30-51, 2026-10-29 02-33-01);
# the pit's pushes hold in both, every other wait is one run's. Rosters
# (@member_counts) are the wire's squad rosters: the pit's dregs, anchors
# and servitor come back to full strength (respawn) in each later wave they
# fight in, as their rosters grow on the wire. The ledge skiff's command
# scripts are retail's atom for atom, its exit ability and Skolas'
# performance uncracked. Each push (0x517E93DC) came 0.6-1.0 s after the
# kill that left four of the wave (17 of 21, 14 of 18, 18 of 22 bodies, all
# three waves of both runs) and took exactly the squads with members left.

@activity_bundle(0xA4930EFA)

objective main_objective
squad skolas_squad
squad_member skolas_squad__skolas
squad ledge_skiff_squad
squad_member ledge_skiff_squad__pilot
@member_counts([{skolas: 3}])
static_array<squad, 1> ledge_dreg_squads
@member_counts({captain_spear: 1})
squad mesa_captain_spear_squad
@member_counts([{dreg: 2}, {dreg: 2}])
static_array<squad, 2> mesa_dreg_squads
@member_counts([{shank_sniper: 3}, {shank_sniper: 3}])
static_array<squad, 2> pit_shank_sniper_squads
@member_counts([{shank_exploder: 3}, {shank_exploder: 3}])
static_array<squad, 2> pit_shank_exploder_squads
@member_counts([{shank_turret: 3}, {shank_turret: 3}])
static_array<squad, 2> pit_shank_turret_squads
@member_counts([{dreg: 3}, {dreg: 3}])
static_array<squad, 2> pit_dreg_squads
@member_counts([{vandal: 3}, {vandal: 3}])
static_array<squad, 2> pit_vandal_squads
@member_counts([{vandal_stealth: 3}])
static_array<squad, 1> pit_vandal_stealth_squads
@member_counts([{vandal_major: 3}, {vandal_major: 3}])
static_array<squad, 2> pit_vandal_major_squads
@member_counts([{captain_blade: 1}])
static_array<squad, 1> pit_captain_blade_squads
@member_counts([{servitor_major: 1}])
static_array<squad, 1> pit_servitor_major_squads
@member_counts([{captain_major: 1}, {captain_major: 1}])
static_array<squad, 2> pit_captain_major_squads
@member_counts([{captain_spear: 1}])
static_array<squad, 1> pit_captain_spear_squads
sequence pit_fallen_wave_announce_audio
player_trigger intro_spawn_player_trigger
performance skolas_flee_performance
control_point_set ledge_skiff_enter_point_sequence
control_point_set ledge_skiff_exit_point_sequence
bool skolas_fled = false
bool pit_clear = false

@startup()
# every squad is against the den's objective, and the mesa holds from the
# den's load
script sc_thieves_den():
    for sq in [skolas_squad, ledge_dreg_squads[0], mesa_captain_spear_squad, mesa_dreg_squads[0], mesa_dreg_squads[1], pit_shank_sniper_squads[0], pit_shank_sniper_squads[1], pit_shank_exploder_squads[0], pit_shank_exploder_squads[1]]:
        sq.set_objective(main_objective)
    for sq in [pit_shank_turret_squads[0], pit_shank_turret_squads[1], pit_dreg_squads[0], pit_dreg_squads[1], pit_vandal_squads[0], pit_vandal_squads[1], pit_vandal_stealth_squads[0], pit_vandal_major_squads[0], pit_vandal_major_squads[1]]:
        sq.set_objective(main_objective)
    for sq in [pit_captain_blade_squads[0], pit_servitor_major_squads[0], pit_captain_major_squads[0], pit_captain_major_squads[1], pit_captain_spear_squads[0]]:
        sq.set_objective(main_objective)
    place_on_task(mesa_captain_spear_squad, "mesa_captain_spear_task")
    for sq in mesa_dreg_squads:
        place_on_task(sq, "mesa_dreg_task")

@startup()
# Skolas on the ledge, as a player comes in over it
script sc_ledge():
    sleep_until(intro_spawn_player_trigger.is_triggered())
    place_on_task(skolas_squad, "skolas_task")
    ship = ledge_skiff_squad__pilot
    ship.place()
    ship.execute(cs_skiff_hold(ledge_skiff_enter_point_sequence))
    place_on_task(ledge_dreg_squads[0], "ledge_dreg_task")
    sleep(3)
    skolas_flee_performance.start_performance("0x840C5BBA")
    skolas_fled = true
    sleep(5)
    ship.execute(cs_skiff_exit(ledge_skiff_exit_point_sequence, "0x820E5E4B"))

@startup()
# the pit, once the mesa's captain is dead
script sc_pit():
    sleep_until(mesa_captain_spear_squad.alive_count() > 0)
    sleep_until(mesa_captain_spear_squad.alive_count() == 0)
    pit_fallen_wave_announce_audio.start()
    sleep(2)
    # wave 1: snipers, dregs and vandals, the blade captain and two majors
    for sq in [pit_shank_sniper_squads[0], pit_shank_sniper_squads[1], pit_dreg_squads[0], pit_dreg_squads[1], pit_vandal_squads[0], pit_vandal_squads[1]]:
        place_on_task(sq, "pit_fodder_task")
    place_on_task(pit_captain_blade_squads[0], "pit_melee_task")
    for sq in pit_captain_major_squads:
        place_on_task(sq, "pit_anchor_task")
    wave = [pit_shank_sniper_squads[0], pit_shank_sniper_squads[1], pit_dreg_squads[0], pit_dreg_squads[1], pit_vandal_squads[0], pit_vandal_squads[1], pit_captain_blade_squads[0], pit_captain_major_squads[0], pit_captain_major_squads[1]]
    sleep_until(wave_alive(wave) <= 4)
    push(wave)
    sleep_until(wave_alive(wave) == 0)
    sleep(2)
    # wave 2: exploders and the stealth vandals, the dregs, the servitor and
    # the majors again
    for sq in pit_shank_exploder_squads:
        place_on_task(sq, "pit_melee_task")
    for sq in pit_dreg_squads:
        respawn_on_task(sq, "pit_fodder_task")
    place_on_task(pit_vandal_stealth_squads[0], "pit_melee_task")
    place_on_task(pit_servitor_major_squads[0], "pit_anchor_task")
    for sq in pit_captain_major_squads:
        respawn_on_task(sq, "pit_anchor_task")
    wave = [pit_shank_exploder_squads[0], pit_shank_exploder_squads[1], pit_dreg_squads[0], pit_dreg_squads[1], pit_vandal_stealth_squads[0], pit_servitor_major_squads[0], pit_captain_major_squads[0], pit_captain_major_squads[1]]
    sleep_until(wave_alive(wave) <= 4)
    push(wave)
    sleep_until(wave_alive(wave) == 0)
    sleep(2)
    # wave 3: the turret shanks, dregs and major vandals, the servitor, the
    # majors and a spear captain
    for sq in [pit_shank_turret_squads[0], pit_shank_turret_squads[1], pit_vandal_major_squads[0], pit_vandal_major_squads[1]]:
        place_on_task(sq, "pit_fodder_task")
    for sq in pit_dreg_squads:
        respawn_on_task(sq, "pit_fodder_task")
    for sq in [pit_servitor_major_squads[0], pit_captain_major_squads[0], pit_captain_major_squads[1]]:
        respawn_on_task(sq, "pit_anchor_task")
    place_on_task(pit_captain_spear_squads[0], "pit_anchor_task")
    wave = [pit_shank_turret_squads[0], pit_shank_turret_squads[1], pit_dreg_squads[0], pit_dreg_squads[1], pit_vandal_major_squads[0], pit_vandal_major_squads[1], pit_servitor_major_squads[0], pit_captain_major_squads[0], pit_captain_major_squads[1], pit_captain_spear_squads[0]]
    sleep_until(wave_alive(wave) <= 4)
    push(wave)
    sleep_until(wave_alive(wave) == 0)
    pit_clear = true

def wave_alive(wave):
    n = 0
    for sq in wave:
        n = n + sq.alive_count()
    return n

# the wave's squads that still stand push in
def push(wave):
    for sq in wave:
        if sq.alive_count() > 0:
            sq.set_task("0x517E93DC")

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()

# a squad that fought an earlier wave comes back to full strength
def respawn_on_task(sq, task):
    sq.set_task(task)
    sq.respawn()

# the ledge skiff holds at its path's start
command_script cs_skiff_hold(path):
    snap_to(path, 0)
    set_flag(3, 3)

command_script cs_skiff_exit(path, exit):
    move_to(path, 0, false)
    ability("dropship", exit)
