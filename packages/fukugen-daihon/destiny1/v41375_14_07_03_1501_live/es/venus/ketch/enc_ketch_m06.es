# es\venus\ketch\enc_ketch_m06.es
#
# Scourge of Winter's ketch. The equipment room's first squad and the
# captain on his throne stand from the load. The first spawn trigger brings
# the rest of the equipment room and the hall on; as the room's squads
# fall the ones behind take their posts, and the last one falls back to the
# front once the room is lost. Mission 3 wakes the control deck;
# the hall's vandals push on the hall trigger and the right-hand deck squad
# comes on its own. The second spawn trigger brings the throne's guard out
# (and the root opens the throne room's door on it). When a player reaches
# the front of the throne the captain taunts and comes down behind his
# guard; he moves up as the front and then the back guard fall, and his
# shanks come when a player is at the throne itself.
#
# From one retail 2.3.1 capture: the squads' bodies (@member_counts) are the
# kill tallies, and never placed in that run were sq_control_left_mc, both
# dreg squads and the vandals of the captain's guard. The halls' first task,
# the throne's back guard's and the captain's first post are past the end
# of TU0's task list, so those squads are placed with no task. Some task
# names are uncracked (hashes).

@activity_bundle("enc_ketch_m06")

objective obj_ketch_m06
static_array<object, 5> candy_explosive_objects
@member_counts({shank: 2, vandal: 1})
squad sq_equipment01
@member_counts({dreg: 2, vandal: 1})
squad sq_equipment02
@member_counts({dreg: 3})
squad sq_equipment03
@member_counts({dreg: 2})
squad sq_hall_dregs
@member_counts({vandal: 2})
squad sq_hall_vandals
squad sq_control_anchor
@member_counts({dreg: 3})
squad sq_control01
@member_counts({vandals: 2})
squad sq_control02
@member_counts({dregs: 3})
squad sq_control03
squad sq_control_servitor
@member_counts({dregs: 2, vandals: 1})
squad sq_control_right_mc
squad sq_control_left_mc
@member_counts({dregs: 4})
squad sq_throne_front
@member_counts({vandals: 2})
squad sq_throne_back
squad sq_throne_captain
squad_member sq_throne_captain__captain
squad sq_captain_dreg01
squad sq_captain_dreg02
@member_counts({shanks: 2})
squad sq_captain_shanks01
@member_counts({shanks: 2})
squad sq_captain_shanks02
squad sq_captain_vandals
trigger_volume tv_spawn01
player_trigger pt_spawn01 bind(tv_spawn01)
trigger_volume tv_spawn02
player_trigger pt_spawn02 bind(tv_spawn02)
trigger_volume tv_hall
player_trigger pt_hall bind(tv_hall)
trigger_volume tv_right_mc
player_trigger pt_right_mc bind(tv_right_mc)
trigger_volume tv_front_throne
player_trigger pt_front_throne bind(tv_front_throne)
trigger_volume tv_throne
player_trigger pt_throne bind(tv_throne)
c_command_script __cs
bool ketch_entered = false
bool throne_alerted = false

@startup()
script sc_ketch():
    ketch_entered = true
    for candy in candy_explosive_objects:
        candy.create()
    for sq in [sq_equipment01, sq_equipment02, sq_equipment03, sq_hall_dregs, sq_hall_vandals, sq_control_anchor, sq_control01, sq_control02, sq_control03, sq_control_servitor, sq_control_right_mc, sq_control_left_mc]:
        sq.set_objective(obj_ketch_m06)
    for sq in [sq_throne_front, sq_throne_back, sq_throne_captain, sq_captain_dreg01, sq_captain_dreg02, sq_captain_shanks01, sq_captain_shanks02, sq_captain_vandals]:
        sq.set_objective(obj_ketch_m06)
    place_on_task(sq_equipment01, "equipment_room")
    sq_throne_captain.place()

@startup()
script sc_equipment():
    sleep_until(pt_spawn01.is_triggered())
    place_on_task(sq_equipment03, "equipment_front")
    sq_hall_dregs.place()
    sq_hall_vandals.place()
    sleep(2)
    place_on_task(sq_equipment02, "equipment_front")
    sleep_until(sq_equipment01.alive_count() == 0)
    sq_equipment03.set_task("equipment_room")
    sleep_until(sq_equipment03.alive_count() > 0)
    sleep_until(sq_equipment03.alive_count() <= 1)
    sq_equipment02.set_task("equipment_room")
    sleep_until(sq_equipment03.alive_count() == 0)
    sq_equipment02.set_task("equipment_front")

@startup()
script sc_hall():
    sleep_until(pt_hall.is_triggered())
    sq_hall_vandals.set_task("0x4679C177")

# the control deck, woken by mission 3
script sc_control():
    place_on_task(sq_control_anchor, "equipment_back")
    place_on_task(sq_control01, "control_room")
    place_on_task(sq_control02, "anchor")
    place_on_task(sq_control03, "control_right")
    place_on_task(sq_control_servitor, "control_ledge")

@startup()
script sc_right_mc():
    sleep_until(pt_right_mc.is_triggered())
    place_on_task(sq_control_right_mc, "control_platform")

@startup()
script sc_throne_guard():
    sleep_until(pt_spawn02.is_triggered())
    place_on_task(sq_throne_front, "advance")
    sq_throne_back.place()
    throne_alerted = true

@startup()
# the captain taunts from the throne and comes down behind his guard
script sc_captain():
    sleep_until(pt_front_throne.is_triggered())
    __cs.clear()
    __cs.scripted_sequence("ultra_taunt")
    sq_throne_captain__captain.execute(__cs)
    sleep(2)
    sq_throne_captain.set_task("0x430FE3D2")
    sq_throne_front.set_task("throne_back")
    sleep_until(sq_throne_front.alive_count() == 0)
    sq_throne_back.set_task("0xA5B8C907")
    sleep_until(sq_throne_back.alive_count() == 0)
    sq_throne_captain.set_task("control_servitor")

@startup()
script sc_captain_shanks():
    sleep_until(pt_throne.is_triggered())
    place_on_task(sq_captain_shanks01, "front")
    place_on_task(sq_captain_shanks02, "front")

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()
