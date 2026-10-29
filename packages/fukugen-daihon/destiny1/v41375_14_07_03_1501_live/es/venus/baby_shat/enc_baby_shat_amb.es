# es\venus\baby_shat\enc_baby_shat_amb.es
#
# Baby shat's ambient layer (Venus' private bubble 3, the way from the
# shattered coast into the academy), loaded by the Venus story missions and
# patrol: the patrol beacon and the loose candy.
#
# Pooled over the three 2.3.1 story missions that crossed the bubble
# (act_venus_m07_northern_tides, act_venus_m01_engineering,
# act_venus_m02_southern_tides): the beacon was out from the snapshot, and
# all twenty pieces of candy went in together with the player's first spawn,
# when the activity's scripts start. The patrol's run (Patrol Venus#1) had
# beacon and candy out from its snapshot, the player's spawn.

@activity_bundle("enc_baby_shat_amb")

static_array<object, 1> patrol_beacons
loot_baby_shat loot_venus_baby_shat_1

@startup()
script ss_main_thread():
    for beacon in patrol_beacons:
        beacon.create()
    for candy in loot_venus_baby_shat_1.dynamic_object_candy:
        candy.create()
