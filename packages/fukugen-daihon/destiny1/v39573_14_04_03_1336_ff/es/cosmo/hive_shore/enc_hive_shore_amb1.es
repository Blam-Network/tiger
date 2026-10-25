# es\cosmo\hive_shore\enc_hive_shore_amb1.es
#
# The hive shore's ambient layer: Hive on the surface and in the caves,
# each on its t_surface or t_cave task, and the ogre out exploring.
#
# This build adds a road pair (a Fallen and a Hive squad), a thrall in
# the caves that comes as a player reaches its ambush volume, and a
# small cave encounter under the encounter manager.
#
# Retail sent one row of this bundle in the captures and none of its
# squads; the rule is read off the rows and their task names.
#
# A private bubble's world is built again each time a player comes in
# (retail's hangar: both squads back on their first tasks when the
# player came back 340 s after leaving), so these squads are placed
# once, at the load, with no respawn of their own.

@activity_bundle("enc_hive_shore_amb1")

objective obj_hive_sea
squad sq_hive_sea_surface01
squad sq_hive_sea_surface02
squad sq_hive_sea_surface03
squad sq_hive_sea_cave01
squad sq_hive_sea_cave02
squad sq_hive_sea_cave03
squad sq_hive_sea_exploratory01
squad_group sg_hive_sea_surface
squad_group sg_hive_sea_cave
objective obj_fallen_hive_shore
squad sq_fallen_road01
squad sq_hive_road01
squad sq_hive_sea_cave04
trigger_volume tv_thrall_ambush_spawn
player_monitor pm_thrall_ambush_spawn bind(tv_thrall_ambush_spawn)
encounter_manager encounters
simple_encounter amb_hive_small_cave01

@startup()
script sc_hive_shore():
    for sq in [sq_hive_sea_surface01, sq_hive_sea_surface02, sq_hive_sea_surface03]:
        sg_hive_sea_surface.add_child(sq)
        hold(sq, obj_hive_sea, "t_surface")
    for sq in [sq_hive_sea_cave01, sq_hive_sea_cave02, sq_hive_sea_cave03]:
        sg_hive_sea_cave.add_child(sq)
        hold(sq, obj_hive_sea, "t_cave")
    hold(sq_hive_sea_exploratory01, obj_hive_sea, "t_exploratory")

@startup()
script sc_road():
    hold(sq_fallen_road01, obj_fallen_hive_shore, "task_1")
    hold(sq_hive_road01, obj_hive_sea, "task")

@startup()
script sc_thrall_ambush():
    sleep_until(pm_thrall_ambush_spawn.test_any_inside())
    hold(sq_hive_sea_cave04, obj_hive_sea, "t_cave")

@startup()
script ss_encounter_controller_thread():
    encounters.actor_budget = 1
    encounters.add_ambient_encounter(amb_hive_small_cave01, 1, 100, 20, 30, 0)

def hold(sq, obj, task):
    sq.set_objective(obj)
    sq.set_task(task)
    sq.place()
