# es\venus\thieves_den\enc_thieves_den_m06.es
#
# Scourge of Winter's Thieves' Den. The den's Fallen stand from the load:
# the caldera entrance, the floor, both ledges, the snipers' perch and the
# three major vandals (Draksis' lieutenants, one rifle and two blades). A
# player on the floor brings the bottom reserve on; the third ledge squad
# reinforces the ledges once they are down to four, takes the first ledge's
# post when it falls, and the ledges fall back together once the second is
# gone. Mission 1 waits on the den's load (the bubble entry) and on the
# majors.
#
# From one retail 2.3.1 capture: the squads' bodies (@member_counts) are the
# kill tallies, the bottom reserve's split is not known (it left alive), and
# never placed in that run were sq_vandal_shank_support, sq_ledge_sniper02
# and sq_den_top01. The second ledge squad's fall-back task is past the end
# of TU0's list, so it keeps its post.

@activity_bundle("enc_thieves_den_m06")

objective obj_thieves_den_m06
static_array<object, 5> candy_explosive_objects
@member_counts({dregs: 3, vandal: 1})
squad sq_caldera_ent01
@member_counts({dregs: 2, shanks: 3})
squad sq_den_bottom01
@member_counts({dregs: 3})
squad sq_den_bottom02
squad sq_den_bottom03
@member_counts({dregs: 3})
squad sq_den_ledge01
@member_counts({dregs: 3})
squad sq_den_ledge02
@member_counts({dregs: 3})
squad sq_den_ledge03
squad sq_major_vandals_rifle
squad_member sq_major_vandals_rifle__vandal_rifle
squad sq_major_vandals_blade
squad_member sq_major_vandals_blade__vandal_blades01
squad_member sq_major_vandals_blade__vandal_blades02
squad sq_vandal_shank_support
squad sq_ledge_sniper01
squad sq_ledge_sniper02
squad sq_den_top01
trigger_volume tv_bottom
player_trigger pt_bottom bind(tv_bottom)
bool den_entered = false
bool majors_dead = false

@startup()
script sc_den():
    den_entered = true
    for candy in candy_explosive_objects:
        candy.create()
    for sq in [sq_caldera_ent01, sq_den_bottom01, sq_den_bottom02, sq_den_bottom03, sq_den_ledge01, sq_den_ledge02, sq_den_ledge03, sq_major_vandals_rifle, sq_major_vandals_blade, sq_vandal_shank_support, sq_ledge_sniper01, sq_ledge_sniper02, sq_den_top01]:
        sq.set_objective(obj_thieves_den_m06)
    place_on_task(sq_caldera_ent01, "den_intro_start")
    place_on_task(sq_den_bottom01, "ledge_lower")
    place_on_task(sq_den_bottom02, "ledge_upper")
    place_on_task(sq_den_ledge01, "snipers_ledge")
    place_on_task(sq_den_ledge02, "snipers_ledge")
    place_on_task(sq_major_vandals_rifle, "vandals_front")
    place_on_task(sq_major_vandals_blade, "major_vandals")
    place_on_task(sq_ledge_sniper01, "vandals_back")
    sc_majors.wake()

@startup()
script sc_bottom():
    sleep_until(pt_bottom.is_triggered())
    place_on_task(sq_den_bottom03, "ledge_upper")

@startup()
script sc_ledges():
    sleep_until(ledges_alive() > 0)
    sleep_until(ledges_alive() <= 4)
    place_on_task(sq_den_ledge03, "ledge")
    sleep_until(sq_den_ledge01.alive_count() == 0)
    sq_den_ledge03.set_task("snipers_ledge")
    sleep_until(sq_den_ledge02.alive_count() == 0)
    sq_den_ledge01.set_task("ledge")
    sq_den_ledge03.set_task("ledge")

# the three majors, for mission 1
script sc_majors():
    sleep_until(sq_major_vandals_rifle__vandal_rifle.is_bound())
    sleep_until(not (sq_major_vandals_rifle__vandal_rifle.is_bound() or sq_major_vandals_blade__vandal_blades01.is_bound() or sq_major_vandals_blade__vandal_blades02.is_bound()))
    majors_dead = true

def ledges_alive():
    return sq_den_ledge01.alive_count() + sq_den_ledge02.alive_count()

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()
