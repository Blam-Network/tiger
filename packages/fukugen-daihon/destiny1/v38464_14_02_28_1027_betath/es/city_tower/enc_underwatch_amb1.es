# es\city_tower\enc_underwatch_amb1.es
#
# The underwatch (bubble 4): places the three class mentors and the wolves.
# The pre-alpha's mentors are one squad per class (Titan, Hunter, Warlock),
# each with a pose per spot (at the table, casual, at the railing or the
# window); only the table pose goes in, as one mentor per class. Temperaments
# are the 360 alpha's for its underwatch. Not placed: the workers, walkers
# and the greeter droid.

@activity_bundle("enc_underwatch_amb1")

bool debug_underwatch
squad_member sq_underwatch_vendor_guardian_mentor__vendor_table1
squad_member sq_underwatch_vendor_hunter_mentor__vendor_table1
squad_member sq_underwatch_vendor_warlock_mentor__vendor_table1
squad_member sq_underwatch_wolves1__wolf1
squad_member sq_underwatch_wolves1__wolf2

@startup()
script sc_main_underwatch_thread():
    sc_underwatch_vendor_guardian_mentor.wake()
    sc_underwatch_vendor_hunter_mentor.wake()
    sc_underwatch_vendor_warlock_mentor.wake()
    sc_underwatch_wolves.wake()

script sc_underwatch_vendor_guardian_mentor():
    if debug_underwatch:
        print("Guardian Mentor: Spawn")
    place_mentor(sq_underwatch_vendor_guardian_mentor__vendor_table1)

script sc_underwatch_vendor_hunter_mentor():
    if debug_underwatch:
        print("Hunter Mentor: Spawn")
    place_mentor(sq_underwatch_vendor_hunter_mentor__vendor_table1)

script sc_underwatch_vendor_warlock_mentor():
    if debug_underwatch:
        print("Warlock Mentor: Spawn")
    place_mentor(sq_underwatch_vendor_warlock_mentor__vendor_table1)

script sc_underwatch_wolves():
    sq_underwatch_wolves1__wolf1.place()
    sq_underwatch_wolves1__wolf1.activate_temperament("temper_wolf_idle")
    sq_underwatch_wolves1__wolf2.place()
    sq_underwatch_wolves1__wolf2.activate_temperament("temper_wolf_laying")

def place_mentor(mentor):
    mentor.place()
    mentor.activate_temperament("temper_tower_guard")
