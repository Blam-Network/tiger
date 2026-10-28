# es\venus\mission_pursuit\unknown_6d57825c.es
#
# The baby dock in mission_pursuit. The tunnel dregs, the deck's servitor
# and shock turret shanks and the spider tank at the pool stand from the
# dock's load. Mission 1 wakes sc_pool as a player reaches the pool: the
# skiff comes in on its path, drops two dreg packs a few seconds apart and
# leaves, then comes back as a new ship with the vandals and the captain.
# The tank's death is mission 1's to wait on. The deck fights back as the
# players come through it.
#
# From one retail 2.3.1 capture (2026-10-27 20-30-51, unconfirmed). Rosters
# (@member_counts) are the wire's squad rosters; the skiff's command scripts
# are retail's atom for atom, its abilities uncracked. Never placed in that
# run: pool_wave2_shank_squads and pool_wave3_captain_squads[0]. The deck's
# new tasks came a moment after a client incident with no name (423AEBDE)
# and the first shank's death; the death is what sc_deck waits on.

@activity_bundle(0x6D57825C)

objective main_objective
@member_counts([{dreg: 3}, {dreg: 3}])
static_array<squad, 2> tunnel_dreg_squads
squad pool_spider_tank_squad
squad_member pool_spider_tank_squad__spider_tank
@member_counts([{dreg: 3}, {dreg: 3}, {dreg: 3}, {dreg: 3}])
static_array<squad, 4> pool_wave1_dreg_squads
static_array<squad, 4> pool_wave2_shank_squads
@member_counts([{servitor: 1}])
static_array<squad, 1> deck_servitor_major_squads
@member_counts([{shank_shock_turret: 2}, {shank_shock_turret: 2}])
static_array<squad, 2> deck_shank_shock_turret_squads
squad pool_skiff_squad
squad_member pool_skiff_squad__pilot
@member_counts([{vandal: 3}, {vandal: 3}, {vandal: 3}])
static_array<squad, 3> pool_wave3_vandal_squads
@member_counts([{captain: 1}, {captain: 1}])
static_array<squad, 2> pool_wave3_captain_squads
control_point_set pool_skiff_enter_point_sequence
control_point_set pool_skiff_exit_point_sequence
bool tank_dead = false

@startup()
# every squad is against the dock's objective, and the dock's Fallen stand
# from its load
script sc_baby_dock():
    for sq in [tunnel_dreg_squads[0], tunnel_dreg_squads[1], pool_spider_tank_squad, deck_servitor_major_squads[0], deck_shank_shock_turret_squads[0], deck_shank_shock_turret_squads[1]]:
        sq.set_objective(main_objective)
    for sq in [pool_wave1_dreg_squads[0], pool_wave1_dreg_squads[1], pool_wave1_dreg_squads[2], pool_wave1_dreg_squads[3], pool_wave2_shank_squads[0], pool_wave2_shank_squads[1], pool_wave2_shank_squads[2], pool_wave2_shank_squads[3]]:
        sq.set_objective(main_objective)
    for sq in [pool_wave3_vandal_squads[0], pool_wave3_vandal_squads[1], pool_wave3_vandal_squads[2], pool_wave3_captain_squads[0], pool_wave3_captain_squads[1]]:
        sq.set_objective(main_objective)
    for sq in tunnel_dreg_squads:
        place_on_task(sq, "tunnel_dreg_task")
    place_on_task(pool_spider_tank_squad, "pool_spider_tank_task")
    place_on_task(deck_servitor_major_squads[0], "0xE94F0FDF")
    for sq in deck_shank_shock_turret_squads:
        place_on_task(sq, "deck_shank_shock_turret_task")
    sc_deck.wake()
    sleep_until(pool_spider_tank_squad.alive_count() > 0)
    sleep_until(pool_spider_tank_squad.alive_count() == 0)
    tank_dead = true

# the deck fights back once a shock turret pack loses a shank: that pack
# and the servitor take their fight tasks, and the other pack follows two
# seconds after the first is dead
script sc_deck():
    turrets = deck_shank_shock_turret_squads
    sleep_until(turrets[1].alive_count() == 2)
    sleep_until(turrets[1].alive_count() < 2)
    turrets[1].set_task("0x2DBBDAAC")
    deck_servitor_major_squads[0].set_task("deck_servitor_major_task")
    sleep_until(turrets[1].alive_count() == 0)
    sleep(2)
    turrets[0].set_task("0x2DBBDAAC")

# mission 1: a player is at the pool; the skiff comes in ten seconds on
script sc_pool():
    sleep(9)
    ship = pool_skiff_squad__pilot
    ship.place()
    ship.execute(cs_skiff_enter(pool_skiff_enter_point_sequence, "0x5C0A6A4A"))
    sleep(6)
    drop_on_task(ship, pool_wave1_dreg_squads[0], "pool_wave1_dreg_task")
    drop_on_task(ship, pool_wave1_dreg_squads[1], "pool_wave1_dreg_task")
    sleep(5)
    drop_on_task(ship, pool_wave1_dreg_squads[2], "pool_wave1_dreg_task")
    drop_on_task(ship, pool_wave1_dreg_squads[3], "pool_wave1_dreg_task")
    sleep(5)
    ship.execute(cs_skiff_exit(pool_skiff_exit_point_sequence, "0x1E35BA11"))
    sleep(5.6)
    # the second run is a new ship
    ship.place()
    ship.execute(cs_skiff_enter(pool_skiff_enter_point_sequence, "0x5C0A6A4A"))
    sleep(6.3)
    drop_on_task(ship, pool_wave3_vandal_squads[0], "pool_wave3_vandal_task")
    drop_on_task(ship, pool_wave3_vandal_squads[1], "pool_wave3_vandal_task")
    sleep(3.9)
    drop_on_task(ship, pool_wave3_vandal_squads[2], "pool_wave3_vandal_task")
    sleep(4.3)
    drop_on_task(ship, pool_wave3_captain_squads[1], "pool_wave3_captain_task")
    sleep(4.1)
    ship.execute(cs_skiff_exit(pool_skiff_exit_point_sequence, "0x1E35BA11"))

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()

def drop_on_task(ship, sq, task):
    sq.set_task(task)
    ship.drop_squad(sq)

# the skiff snaps to its path's start and flies in
command_script cs_skiff_enter(path, entrance):
    snap_to(path, 0)
    set_flag(3, 3)
    ability("dropship", entrance)

command_script cs_skiff_exit(path, exit):
    move_to(path, 0, false)
    ability("dropship", exit)
