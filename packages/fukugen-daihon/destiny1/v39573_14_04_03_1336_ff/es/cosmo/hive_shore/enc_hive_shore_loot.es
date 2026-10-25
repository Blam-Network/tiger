# es\cosmo\hive_shore\enc_hive_shore_loot.es
#
# The loose candy of the hive shore: crates, barrels and the like that the
# players break open. They are all out from the bubble's load and
# nothing moves them after: retail 2.3.1 creates its Cosmodrome
# bubbles' candy_dynamic_objects in the first world update and never
# touches them again (delta south and graveyard, the cosmo patrol
# capture). This build keeps them in a bundle of their own beside the
# ambient layer, as the 360 alpha's loot_<area> holders did.

@activity_bundle("enc_hive_shore_loot")

static_array<object, 4> candy_generic

@startup()
script ss_placement_thread():
    for o in candy_generic:
        o.create()
