@activity_bundle("enc_headlands_amb1")

u_globals utils
c_encounter_manager encounters  # true name unknown
u_event_world_controller event_controller
@member_counts({_squad: [{goblins: 6}], _dropship_squad: {pilot: 0}})
dropship_encounter vex_dropship_encounter01
@member_counts({_squad: [{goblins: 6}], _dropship_squad: {pilot: 0}})
dropship_encounter vex_dropship_encounter02
@member_counts({_squad: [{goblins: 6}], _dropship_squad: {pilot: 0}})
dropship_encounter vex_dropship_encounter03
@member_counts({_squad: [{cell_1: 4}], _dropship_squad: {pilot: 0}})
dropship_encounter fallen_dropship_encounter01
@member_counts({_squad: [{pilot: 4}], _dropship_squad: {pilot: 0}})
dropship_encounter fallen_dropship_encounter02
@member_counts({_squad: [{goblins: 4}]})
simple_encounter simple_encounter01
@member_counts({_squad: [{goblins: 4}]})
simple_encounter simple_encounter02
@member_counts({_squad: [{goblins: 2}]})
simple_encounter simple_encounter03
@member_counts({_squad: [{goblins: 1}]})
simple_encounter simple_encounter04
@member_counts([{sq_event_countdown_wave: [{cell_1: 1, cell_2: 3}, {cell_1: 2, cell_2: 2}, {cell_1: 1, cell_2: 2, cell_3: 1}, {cell_1: 2, cell_2: 1, cell_3: 1}, {cell_1: 1, cell_2: 1, cell_3: 2}, {cell_2: 1, cell_4: 1, cell_3: 2}, {cell_1: 1, cell_2: 2, cell_3: 1}, {cell_1: 2, cell_2: 1, cell_3: 1}]}])
static_array<u_event_countdown, 1> pf_event_countdown
@member_counts({cell_1: 1})
c_squad_sensor_host sq_turret01
@member_counts({cell_1: 1})
c_squad_sensor_host sq_turret02
@task(0x4AD5BC8F, squad: fallen_dropship_encounter01._squad_group)
@task(0x59275B23, squad: fallen_dropship_encounter02._squad_group)
@task("vex03", squad: vex_dropship_encounter03._squad_group)
@task("vex01", squad: vex_dropship_encounter01._squad_group)
@task("vex02", squad: vex_dropship_encounter02._squad_group)
c_objective_sensor_host obj_headlands_amb1  # true name unknown
loot_headlands loot_venus_headlands_1









startup thread sc_main_thread:
    print("script")
    sq_turret01.place()
    sq_turret02.place()

startup thread ss_encounter_controller_thread:
    encounters.actor_budget = 23
    encounters.add_ambient_encounter(vex_dropship_encounter01, 7, 120, 20, 300, 0)
    encounters.add_ambient_encounter(vex_dropship_encounter02, 7, 120, 20, 300, 0)
    encounters.add_ambient_encounter(vex_dropship_encounter03, 6, 80, 20, 300, 120)
    encounters.add_ambient_encounter(fallen_dropship_encounter01, 6, 75, 20, 300, 120)
    encounters.add_ambient_encounter(fallen_dropship_encounter02, 6, 75, 20, 300, 120)
    encounters.add_ambient_encounter(simple_encounter01, 4, 80, 20, 300, 120)
    encounters.add_ambient_encounter(simple_encounter02, 4, 80, 20, 300, 120)
    encounters.add_ambient_encounter(simple_encounter03, 2, 100, 20, 300, 120)
    encounters.add_ambient_encounter(simple_encounter04, 1, 100, 20, 300, 120)

    encounters.add_unmanaged_encounter(pf_event_countdown[0], 6)

    encounters.add_exclusion(pf_event_countdown[0], vex_dropship_encounter03)

    vex_dropship_encounter01.respawn_time = 20
    vex_dropship_encounter02.respawn_time = 20
    fallen_dropship_encounter01.respawn_time = 60
    fallen_dropship_encounter02.respawn_time = 60

    vex_dropship_encounter01.set_objective(obj_headlands_amb1)
    vex_dropship_encounter02.set_objective(obj_headlands_amb1)
    vex_dropship_encounter03.set_objective(obj_headlands_amb1)
    fallen_dropship_encounter01.set_objective(obj_headlands_amb1)
    fallen_dropship_encounter02.set_objective(obj_headlands_amb1)

startup thread ss_event_thread:

    sleep(mathlib.random_int_inclusive(40, 90))


    event_controller.set_event_frequency(200)
    event_controller.start_1(pf_event_countdown)

# Decompiled from 36735.13.12.02.1953.alpha script tags
# See tag 821B800B
