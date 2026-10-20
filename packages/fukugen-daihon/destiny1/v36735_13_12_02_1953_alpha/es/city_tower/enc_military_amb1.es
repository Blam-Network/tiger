@activity_bundle("enc_military_amb1")

bool debug_military
@member_counts({guard1: 1})
squad sq_military_droid_flight
@member_counts({0x74F6E782: 1, 0x74F6E781: 1, 0x74F6E780: 1})
squad sq_military_droid_floor1
@member_counts({cleaner1: 1})
squad sq_military_droid_floor2
@member_counts({0xCEBF1595: 1})
squad sq_military_droid_floor3
@member_counts({0xCEBF1595: 1, 0xCEBF1596: 1})
squad sq_military_droid_floor4
@member_counts({guard01: 1})
squad sq_military_droid_guard1
@member_counts({patrol1: 0})
squad sq_military_droid_guard2
@member_counts({talker1: 1, talker2: 1, talker3: 0})
squad sq_military_civ_talkers1
@member_counts({talker1: 1, talker2: 1})
squad sq_military_civ_talkers2
@member_counts({talker1: 1, talker2: 1, talker3: 0})
squad sq_military_civ_talkers3
@member_counts({leaner1: 0, sitter1: 0})
squad sq_military_civ_do1
@member_counts({leaner1: 0, sitter1: 0})
squad sq_military_civ_do2
@member_counts({talker1: 1, talker2: 1, talker3: 0})
squad sq_military_civ_fwc1
@member_counts({leaner1: 0})
squad sq_military_civ_fwc2
@member_counts({talker1: 1, talker2: 1, sitter1: 0})
squad sq_military_hunter_talkers1
@member_counts({talker1: 1, talker2: 1, sitter1: 0})
squad sq_military_hunter_talkers2
@member_counts({talker1: 0, sitter1: 0})
squad sq_military_hunter_talkers3
@member_counts({watcher1: 0, watcher2: 0})
squad sq_military_hunter_talkers4
@member_counts({ship: 1})
squad sq_military_vendor_ships
@member_counts({city_weapon: 1})
squad sq_military_vendor_weapons
@member_counts({hunter: 1})
squad sq_military_vendor_hunter_mentor
@member_counts({0x7733A5EE: 1})
squad sq_military_vendor_hunter_quartermaster
@member_counts({0x9D200C0C: 1})
squad sq_military_vendor_hunter_outfitter
@member_counts({dead_orbit: 1})
squad sq_military_vendor_do
@member_counts({fwc: 1})
squad sq_military_vendor_fwc
squad_member sq_military_civ_do1__leaner1
squad_member sq_military_civ_do1__sitter1
squad_member sq_military_civ_do2__leaner1
squad_member sq_military_civ_do2__sitter1
squad_member sq_military_civ_fwc1__talker1
squad_member sq_military_civ_fwc1__talker2
squad_member sq_military_civ_fwc1__talker3
squad_member sq_military_civ_fwc2__leaner1
squad_member sq_military_civ_talkers1__talker1
squad_member sq_military_civ_talkers1__talker2
squad_member sq_military_civ_talkers1__talker3
squad_member sq_military_civ_talkers2__talker1
squad_member sq_military_civ_talkers2__talker2
squad_member sq_military_civ_talkers3__talker1
squad_member sq_military_civ_talkers3__talker2
squad_member sq_military_civ_talkers3__talker3
squad_member sq_military_droid_guard2__patrol1
squad_member sq_military_hunter_talkers1__talker1
squad_member sq_military_hunter_talkers1__talker2
squad_member sq_military_hunter_talkers1__sitter1
squad_member sq_military_hunter_talkers2__talker1
squad_member sq_military_hunter_talkers2__talker2
squad_member sq_military_hunter_talkers2__sitter1
squad_member sq_military_hunter_talkers3__talker1
squad_member sq_military_hunter_talkers3__sitter1
squad_member sq_military_hunter_talkers4__watcher1
squad_member sq_military_hunter_talkers4__watcher2
control_point_set cps_military_droid_guard2_patrol
string_hash sh_player_joined = "player_joined"
string_hash sh_player_left = "player_left"
string_hash sh_all_players = "all_players"
incident_listener il_player_joined
incident_listener il_player_left
incident_player_iterator player_iterator














@startup()
script sc_main_military_thread():


    sc_military_npcs_flight.wake()
    sc_military_npcs_guards.wake()
    sc_military_npcs_hangar_floor.wake()
    sc_military_npcs_civ_talkers.wake()
    sc_military_npcs_hunter_talkers.wake()
    sc_military_npcs_do.wake()
    sc_military_npcs_fwc.wake()


    sc_military_vendors_hunter_mentor.wake()
    sc_military_vendors_hunter_outfitter.wake()
    sc_military_vendors_hunter_quartermaster.wake()
    sc_military_vendors_ships.wake()
    sc_military_vendors_weapons.wake()
    sc_military_vendors_fwc.wake()
    sc_military_vendors_do.wake()


    il_player_joined.bind_hash(sh_player_joined, sh_all_players)
    il_player_joined.set_handler(player_joined)


    il_player_left.bind_hash(sh_player_left, sh_all_players)
    il_player_left.set_handler(player_left)




script sc_military_npcs_flight():
    if debug_military:
        print("sc_military_npcs_flight")


    sq_military_droid_flight.place()
    sq_military_droid_flight.activate_temperament("temper_tower_guard")


script sc_military_npcs_guards():
    if debug_military:
        print("sc_military_npcs_guards")


    sq_military_droid_guard1.place()
    sq_military_droid_guard1.activate_temperament("temper_tower_guard")


    sq_military_droid_guard2.place()
    sq_military_droid_guard2.activate_temperament("temper_tower_guard")


    while true:
        sq_military_droid_guard2__patrol1.execute(cps_military_droid_guard2_patrol); sleep_until(sq_military_droid_guard2__patrol1.get_command_script_state() != e_command_script_state.executing)


script sc_military_npcs_hangar_floor():
    if debug_military:
        print("sc_military_npcs_floor")


    sq_military_droid_floor1.place()
    sq_military_droid_floor1.activate_temperament("temper_tower_pushbroom")


    sq_military_droid_floor2.place()
    sq_military_droid_floor2.activate_temperament("temper_tower_scrubbrush")


    if random_chance(1):
        sq_military_droid_floor3.place()
        sq_military_droid_floor3.activate_temperament("temper_tower_wrench")


    sq_military_droid_floor4.place()
    sq_military_droid_floor4.activate_temperament("temper_tower_weld_standing")


script sc_military_npcs_civ_talkers():
    if debug_military:
        print("sc_military_npcs_civ_talkers")


    if random_chance(0.4):


        sq_military_civ_talkers1__talker1.place()
        sq_military_civ_talkers1__talker1.activate_temperament("temper_tower_guard")
        sq_military_civ_talkers1__talker2.place()
        sq_military_civ_talkers1__talker2.activate_temperament("temper_tower_guard")


        if random_chance(0.25):
            sq_military_civ_talkers1__talker3.place()
            sq_military_civ_talkers1__talker3.activate_temperament("temper_tower_guard")



    else:
        sq_military_civ_talkers2__talker1.place()
        sq_military_civ_talkers2__talker1.activate_temperament("temper_tower_guard")
        sq_military_civ_talkers2__talker2.place()
        sq_military_civ_talkers2__talker2.activate_temperament("temper_tower_guard")


    if random_chance(0.65):

        sq_military_civ_talkers3__talker1.place()
        sq_military_civ_talkers3__talker1.activate_temperament("temper_tower_guard")
        sq_military_civ_talkers3__talker2.place()
        sq_military_civ_talkers3__talker2.activate_temperament("temper_tower_guard")


        if random_chance(0.25):
            sq_military_civ_talkers3__talker3.place()
            sq_military_civ_talkers3__talker3.activate_temperament("temper_tower_guard")


script sc_military_npcs_hunter_talkers():
    if debug_military:
        print("sc_military_npcs_hunter_talkers")


    if random_chance(1):

        sq_military_hunter_talkers1__talker1.place()
        sq_military_hunter_talkers1__talker1.activate_temperament("temper_tower_civ_ledgesit")
        sq_military_hunter_talkers1__talker2.place()
        sq_military_hunter_talkers1__talker2.activate_temperament("temper_tower_civ_ledgesit")


        if random_chance(0.33):
            sq_military_hunter_talkers1__sitter1.place()
            sq_military_hunter_talkers1__sitter1.activate_temperament("temper_tower_civ_ledgesit")



    else:
        sq_military_hunter_talkers2__talker1.place()
        sq_military_hunter_talkers2__talker1.activate_temperament("temper_tower_guard")
        sq_military_hunter_talkers2__talker2.place()
        sq_military_hunter_talkers2__talker2.activate_temperament("temper_tower_guard")


        if random_chance(0.33):
            sq_military_hunter_talkers2__sitter1.place()
            sq_military_hunter_talkers2__sitter1.activate_temperament("temper_tower_civ_ledgesit")


    if random_chance(0.5):

        sq_military_hunter_talkers3__talker1.place()
        sq_military_hunter_talkers3__talker1.activate_temperament("temper_tower_guard")


        sq_military_hunter_talkers3__sitter1.place()
        sq_military_hunter_talkers3__sitter1.activate_temperament("temper_tower_civ_ledgesit")


    if random_chance(0.5):

        sq_military_hunter_talkers4__watcher1.place()
        sq_military_hunter_talkers4__watcher1.activate_temperament("temper_tower_guard")


        if random_chance(0.2):
            sq_military_hunter_talkers4__watcher2.place()
            sq_military_hunter_talkers4__watcher2.activate_temperament("temper_tower_guard")


script sc_military_npcs_do():
    if debug_military:
        print("sc_military_npcs_do")


    sq_military_civ_do1.place()
    sq_military_civ_do1__sitter1.activate_temperament("temper_tower_civ_ledgesit")
    sq_military_civ_do1__leaner1.activate_temperament("temper_tower_civ_raillean")


    sq_military_civ_do2.place()
    sq_military_civ_do2__sitter1.activate_temperament("temper_tower_civ_ledgesit")
    sq_military_civ_do2__leaner1.activate_temperament("temper_tower_civ_raillean")


script sc_military_npcs_fwc():
    if debug_military:
        print("sc_military_npcs_fwc")


    sq_military_civ_fwc1__talker1.place()
    sq_military_civ_fwc1__talker1.activate_temperament("temper_tower_civ_ledgesit")
    sq_military_civ_fwc1__talker2.place()
    sq_military_civ_fwc1__talker2.activate_temperament("temper_tower_civ_ledgesit")


    if random_chance(1):
        sq_military_civ_fwc1__talker3.place()
        sq_military_civ_fwc1__talker3.activate_temperament("temper_tower_guard")


    if random_chance(1):
        sq_military_civ_fwc2__leaner1.place()
        sq_military_civ_fwc2__leaner1.activate_temperament("temper_tower_civ_raillean")



























script sc_military_vendors_hunter_mentor():
    sq_military_vendor_hunter_mentor.place()
    sq_military_vendor_hunter_mentor.activate_temperament("temper_tower_guard")

script sc_military_vendors_hunter_outfitter():
    sq_military_vendor_hunter_outfitter.place()
    sq_military_vendor_hunter_outfitter.activate_temperament("temper_tower_guard")

script sc_military_vendors_hunter_quartermaster():
    sq_military_vendor_hunter_quartermaster.place()
    sq_military_vendor_hunter_quartermaster.activate_temperament("temper_tower_vendor")

script sc_military_vendors_ships():
    sq_military_vendor_ships.place()
    sq_military_vendor_ships.activate_temperament("temper_tower_vendor")

script sc_military_vendors_weapons():
    sq_military_vendor_weapons.place()
    sq_military_vendor_weapons.activate_temperament("temper_tower_vendor")

script sc_military_vendors_fwc():
    sq_military_vendor_fwc.place()
    sq_military_vendor_fwc.activate_temperament("temper_tower_guard")

script sc_military_vendors_do():
    sq_military_vendor_do.place()
    sq_military_vendor_do.activate_temperament("temper_tower_guard")



def player_joined(incident_name, incident_metadata):
    player_iterator.begin(incident_name, sh_all_players, incident_metadata)
    while player_iterator.is_valid():
        print("Player joined")


def player_left(incident_name, incident_metadata):
    player_iterator.begin(incident_name, sh_all_players, incident_metadata)
    while player_iterator.is_valid():
        print("Player left")




def random_chance(chance):

    return mathlib.random_real(1) <= chance

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 821E2003
