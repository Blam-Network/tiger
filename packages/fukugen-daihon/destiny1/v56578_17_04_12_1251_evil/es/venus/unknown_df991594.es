# es\venus\unknown_df991594.es
#
# The baby ruins' ambient layer (bundle DF991594, file name unknown; bubble
# 2), loaded with Venus' ambient layer by the patrol, the story missions and
# the DLC quests: the loose candy, the doors and the nutblock doors.
#
# Pooled over the 28 segments that load it, it reached the wire once
# (quest_safari, 2026-10-27 22-28-10#1): the twenty candy objects standing
# from the bubble's start, the four doors made and gone again (incarnation 2,
# not present) before the player arrived. Who opens the doors is not on the
# wire, so they are left out.

@activity_bundle(0xDF991594)

static_array<object, 20> dynamic_object_candy

@startup()
script ss_main_thread():
    for candy in dynamic_object_candy:
        candy.create()
