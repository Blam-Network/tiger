@activity_bundle("enc_dig_site_amb1")
c_encounter_manager encounters  # true name unknown
ambush_encounter dig_site_ambush_encounter01
ambush_encounter dig_site_ambush_encounter02
simple_encounter dig_site_simple_encounter01
loot_dig_site loot_venus_dig_site_1






startup thread ss_main_thread:

    print("---------------------------------------------------------")
    print("ACADEMY DIG SITE ENCOUNTER AMBIENT")
    print("---------------------------------------------------------")

startup thread ss_encounter_controller_thread:
    encounters.actor_budget = 11
    encounters.add_ambient_encounter(dig_site_ambush_encounter01, 9, 100, 20, 120, 0)
    encounters.add_ambient_encounter(dig_site_ambush_encounter02, 7, 100, 20, 120, 0)
    encounters.add_ambient_encounter(dig_site_simple_encounter01, 2, 120, 20, 120, 0)

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 821B8006
