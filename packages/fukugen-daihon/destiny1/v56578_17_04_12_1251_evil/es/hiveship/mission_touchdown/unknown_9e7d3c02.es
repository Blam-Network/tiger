# es\hiveship\mission_touchdown\unknown_9e7d3c02.es
#
# Touchdown's core (bundle 9E7D3C02, file name unknown; bubble 9, the
# activity's own). The Taken haze and the ring of blood's floor are up as
# the bubble starts, with a Taken minion squad at the way in. Mission 3
# wakes the threads below as the players reach each node:
#
#   sc_intro            the way-in minions fall back as the core comes into view
#   sc_passage_node     the passage node: wall minions, the breech wizard and its
#                       summons, then the four transepts' minions
#   sc_breech_node      the breech node: the core gateway opens, the gateway's
#                       knight, the major wizard and the breech minions
#   sc_core_destroyed   the core goes; the gateway squads move up
#
# and mission 4 wakes sc_retreat as the players head for the breech. The
# transepts' Taken come in as a player walks into each transept.
#
# One retail 2.3.1 run: every hold is that run's gap from the node's trigger.
# The ring of blood's volume toggles (VolumeToggle rows, no native type) and
# the fences' second incarnation are left out. No placement of an anonymous
# squad is on the wire: each squad is placed with its first task.

@activity_bundle(0x9E7D3C02)

objective defend_objective
objective transept_objective
@objective(defend_objective)
squad intro_minion1_squad
@objective(defend_objective)
squad wall_minion1_squad
@objective(defend_objective)
squad wall_minion2_squad
@objective(defend_objective)
squad breech_minion1_squad
@objective(defend_objective)
squad breech_minion3_squad
@objective(defend_objective)
squad breech_anchor1_squad
@objective(defend_objective)
squad breech_anchor2_squad
@objective(defend_objective)
squad breech_summon1_squad
@objective(defend_objective)
squad breech_summon2_squad
@objective(transept_objective)
squad shroud_transept_minion0_squad
@objective(transept_objective)
squad shroud_transept_taken1_squad
@objective(transept_objective)
squad wall_transept_minion0_squad
@objective(transept_objective)
squad wall_transept_taken1_squad
@objective(transept_objective)
squad breech_transept_minion0_squad
@objective(transept_objective)
squad breech_transept_taken1_squad
@objective(transept_objective)
squad null_transept_minion0_squad
@objective(transept_objective)
squad null_transept_taken1_squad
@objective(transept_objective)
squad gateway_minion1_squad
@objective(transept_objective)
squad gateway_anchor1_squad
@objective(transept_objective)
squad transept_h1_squad
sequence tch0083_ghost_dialogue
sequence tch0085_ghost_dialogue
sequence core_destroyed_sequence
taken_fx_controller taken_fx
encounter_handle core_gateway
encounter_handle ring_of_blood_aod_floor
player_trigger defend_kickoff_trigger
player_trigger breech_arena_trigger
player_trigger wall_arena_trigger
player_trigger passage_arena_trigger
player_trigger gateway_trigger
player_trigger breech_ai_trigger
player_trigger shroud_trigger
player_trigger null_trigger
player_trigger wall_trigger
player_trigger breech_trigger

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()

@startup()
script sc_core():
    taken_fx.create(0)
    ring_of_blood_aod_floor.aod_floor_base_object.create()
    for floor in ring_of_blood_aod_floor.aod_floor_object:
        floor.create()
    for trigger in [defend_kickoff_trigger, breech_arena_trigger, wall_arena_trigger, passage_arena_trigger, gateway_trigger]:
        trigger.reset()
    place_on_task(intro_minion1_squad, "0xF5B47242")

script sc_intro():
    sleep(1)
    intro_minion1_squad.set_task("0x87B3B833")

script sc_passage_node():
    sleep(15)
    place_on_task(wall_minion1_squad, "0x8035DEA7")
    place_on_task(wall_minion2_squad, "0x8035DEA7")
    taken_fx.set_intensity(0.9)
    sleep(1)
    place_on_task(breech_anchor1_squad, "0xEE61A05E")
    place_on_task(breech_summon1_squad, "0x5C19FE06")
    sleep(8)
    place_on_task(shroud_transept_minion0_squad, "0x1ACD0C25")
    place_on_task(wall_transept_minion0_squad, "0x71FFF76C")
    place_on_task(breech_transept_minion0_squad, "0x9CAB2474")
    place_on_task(null_transept_minion0_squad, "0x27AD6437")
    for trigger in [null_trigger, breech_trigger, shroud_trigger, wall_trigger]:
        trigger.reset()
    sc_null_transept.wake()
    sc_wall_transept.wake()
    sc_breech_transept.wake()

script sc_null_transept():
    sleep_until(null_trigger.is_triggered())
    sleep(1)
    place_on_task(null_transept_taken1_squad, "0x01C718D9")
    sleep(3)
    null_transept_minion0_squad.set_task("0x01C718D9")

script sc_wall_transept():
    sleep_until(wall_trigger.is_triggered())
    sleep(1)
    place_on_task(wall_transept_taken1_squad, "0x2C13E609")
    sleep(3)
    breech_anchor1_squad.set_task("0x23E66702")

script sc_breech_transept():
    sleep_until(breech_trigger.is_triggered())
    sleep(1)
    place_on_task(breech_transept_taken1_squad, "0xC7CF30D1")

script sc_breech_node():
    core_gateway.o_core_gateway.create()
    core_gateway.o_core_gateway.set_device_position(0)
    sleep(3)
    tch0083_ghost_dialogue.start()
    place_on_task(shroud_transept_taken1_squad, "0x802903C0")
    sleep(3)
    place_on_task(gateway_anchor1_squad, "0x3FD4E60E")
    ring_of_blood_aod_floor.aod_floor_base_object.delete_object()
    for floor in ring_of_blood_aod_floor.aod_floor_object:
        floor.delete_object()
    sleep(2)
    place_on_task(gateway_minion1_squad, "0x3FD4E60E")
    sleep(3)
    core_gateway.o_core_gateway.set_device_position(1)
    sleep(1)
    tch0085_ghost_dialogue.start()
    sleep(2)
    core_gateway.o_core_gateway.delete_object()
    sleep(1)
    place_on_task(breech_anchor2_squad, "0xEE61A05E")
    place_on_task(breech_summon2_squad, "0x5C19FE06")
    sleep(2)
    breech_anchor2_squad.set_task("0x23E66702")
    sleep(6)
    breech_anchor1_squad.set_task("0xEE61A05E")
    breech_anchor2_squad.set_task("0xEE61A05E")
    sleep(2)
    place_on_task(breech_minion1_squad, "0x31570B4C")
    sleep(2)
    place_on_task(breech_minion3_squad, "0x31570B4C")

script sc_core_destroyed():
    core_destroyed_sequence.start()
    sleep(2)
    gateway_minion1_squad.set_task("0x5A26612F")
    gateway_anchor1_squad.set_task("0x5A26612F")

# the transepts' Taken fall back to the gateway as the players leave the core
script sc_retreat():
    sleep(1)
    breech_ai_trigger.reset()
    sleep(5)
    place_on_task(transept_h1_squad, "0xC1615B2C")
    sleep(4)
    for sq in [wall_transept_minion0_squad, wall_transept_taken1_squad, breech_transept_minion0_squad, breech_transept_taken1_squad, null_transept_minion0_squad]:
        sq.set_task("0x1AA01489")
    taken_fx.set_intensity(0)
