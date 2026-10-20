@activity_bundle("enc_dig_site_amb1")

encounter_manager encounters
@member_counts({_squad: [{cell: 3, cell_1: 3}, {cell: 3}]})
ambush_encounter dig_site_ambush_encounter01
@member_counts({_squad: [{cell: 3, cell_1: 2}, {cell: 2}]})
ambush_encounter dig_site_ambush_encounter02
@member_counts({_squad: [{cell: 2}]})
simple_encounter dig_site_simple_encounter01
loot_dig_site loot_venus_dig_site_1






@startup()
script ss_main_thread():

    print("---------------------------------------------------------")
    print("ACADEMY DIG SITE ENCOUNTER AMBIENT")
    print("---------------------------------------------------------")

@startup()
script ss_encounter_controller_thread():
    encounters.actor_budget = 11
    encounters.add_ambient_encounter(dig_site_ambush_encounter01, 9, 100, 20, 120, 0)
    encounters.add_ambient_encounter(dig_site_ambush_encounter02, 7, 100, 20, 120, 0)
    encounters.add_ambient_encounter(dig_site_simple_encounter01, 2, 120, 20, 120, 0)

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 821B8006
