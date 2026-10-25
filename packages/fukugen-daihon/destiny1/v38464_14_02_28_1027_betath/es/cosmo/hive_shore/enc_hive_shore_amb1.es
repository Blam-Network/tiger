# es\cosmo\hive_shore\enc_hive_shore_amb1.es
#
# The hive shore's ambient layer: Hive on the surface and in the caves,
# each on its t_surface or t_cave task, and the ogre out exploring.
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

@startup()
script sc_hive_shore():
    for sq in [sq_hive_sea_surface01, sq_hive_sea_surface02, sq_hive_sea_surface03]:
        sg_hive_sea_surface.add_child(sq)
        hold(sq, obj_hive_sea, "t_surface")
    for sq in [sq_hive_sea_cave01, sq_hive_sea_cave02, sq_hive_sea_cave03]:
        sg_hive_sea_cave.add_child(sq)
        hold(sq, obj_hive_sea, "t_cave")
    hold(sq_hive_sea_exploratory01, obj_hive_sea, "t_exploratory")

def hold(sq, obj, task):
    sq.set_objective(obj)
    sq.set_task(task)
    sq.place()
