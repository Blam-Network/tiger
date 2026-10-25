# es\cosmo\refinery\enc_refinery_amb1.es
#
# The refinery's ambient layer: Hive at the front, the centre and the
# rear, Fallen at the rear, on their two objectives from the load.
# Their tasks never cracked but the fallbacks (fallback_hive_front01,
# fallback_hive_central01, fallback_fallen_rear01), so the squads take
# whichever the objectives' trees give them.
#
# Retail's refinery ambient is another bundle (ff's simple encounters
# and wave); no capture has these rows. The Devils' Lair runs
# enc_refinery_portal1 in this bubble instead.
#
# A private bubble's world is built again each time a player comes in
# (retail's hangar: both squads back on their first tasks when the
# player came back 340 s after leaving), so these squads are placed
# once, at the load, with no respawn of their own.

@activity_bundle("enc_refinery_amb1")

objective obj_refinery_hive
objective obj_refinery_fallen
squad sq_hive_front01
squad sq_hive_front02
squad sq_hive_central01
squad sq_hive_rear01
squad sq_fallen_rear01

@startup()
script sc_refinery():
    for sq in [sq_hive_front01, sq_hive_front02, sq_hive_central01, sq_hive_rear01]:
        sq.set_objective(obj_refinery_hive)
        sq.place()
    sq_fallen_rear01.set_objective(obj_refinery_fallen)
    sq_fallen_rear01.place()
