# es\mars\ruin\enc_ruin_amb1.es
#
# The ruin's Vex (Mars' bubble 2, the ruin between the battleground and
# the Cabal lines), loaded by the Mars story missions and the patrol: two
# Vex clouds that bring a Goblin squad each around the corner.
#
# From one run through the bubble, the Mars patrol's (2026-10-29 Patrol
# Mars#1, the bundle on the wire 1238-1290 s), so every rule here is a
# single run's:
# - pt_corner sent both clouds in 0.7 s later; each dropped its Goblins at
#   once (two each, their task set as the clouds came in).
# - Both clouds were still up 50 s on, when the player left: nothing here
#   takes them away.
# - All four squads are on the ruin objective from the first snapshot,
#   the clouds already on its task.
# - Bodies are the cells the server placed; the task is the ruin
#   objective's one.

@activity_bundle("enc_ruin_amb1")

objective obj_ruin_amb1
trigger_volume tv_corner
player_trigger pt_corner bind(tv_corner)
squad sq_corner_cloud_a
squad_member sq_corner_cloud_a__pilot
@member_counts({goblin: 2})
squad sq_corner_goblin_a
squad sq_corner_cloud_b
squad_member sq_corner_cloud_b__pilot
@member_counts({goblin: 2})
squad sq_corner_goblin_b

@startup()
script sc_corner():
    for sq in [sq_corner_cloud_a, sq_corner_goblin_a, sq_corner_cloud_b, sq_corner_goblin_b]:
        sq.set_objective(obj_ruin_amb1)
    sq_corner_cloud_a.set_task("0x23805AF7")
    sq_corner_cloud_b.set_task("0x23805AF7")
    sleep_until(pt_corner.is_triggered())
    cloud_drop(sq_corner_cloud_a, sq_corner_cloud_a__pilot, sq_corner_goblin_a)
    cloud_drop(sq_corner_cloud_b, sq_corner_cloud_b__pilot, sq_corner_goblin_b)

def cloud_drop(cloud, pilot, goblins):
    cloud.place()
    goblins.set_task("0x23805AF7")
    pilot.drop_squad(goblins)
