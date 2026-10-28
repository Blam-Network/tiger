# es\mars\lowergarden\enc_lowergarden_m07.es
#
# The Black Garden's lower garden: the foyer and the arena's Vex come on at
# their triggers, the hydra warps into the centre, and each glyph's anchor
# minotaur steps in when a player reaches that glyph. The glyphs and the
# kiosk are placed here and only answer to players carrying their activity
# flag, which the mission's objectives raise. The glyphs go in the order
# the player scans them: either one brings its own Ghost cage, control and
# surge, but the first scan raises the spire's scaffolding and eye and the
# second the tower, sends the nexus Vex in and, with the hydra dead, brings
# the block up in front of the kiosk (two runs, one scanning west first and
# one east). The kiosk's scan clears the block and the key appears, and the
# door to the heart opens twenty-six seconds later. The heart prefab's
# objects are made here with their devices at rest; the missions at the
# heart move them. Where a step has no trigger on the wire, the wait is the
# 2026-10-26 run's. Task names are uncracked and written as hashes.

@activity_bundle("enc_lowergarden_m07")

object o_glyph_a
object o_glyph_b
object o_block
object o_door_back
object o_east_ghost_cage
object o_west_ghost_cage
object o_device_control_east
object o_device_control_west
objective obj_lowergarden_m07
@member_counts({goblin: 2})
squad sq_foyer_goblin_a
@member_counts({goblin: 2})
squad sq_foyer_goblin_b
@member_counts({hobgoblin: 2})
squad sq_foyer_hobgoblin
@member_counts({hydra: 1})
squad sq_center_hydra
@member_counts({hobgoblin: 2})
squad sq_glyph_a_hobgoblin
@member_counts({goblin: 3})
squad sq_glyph_a_goblin_a
@member_counts({goblin: 3})
squad sq_glyph_a_goblin_b
squad sq_glyph_a_anchor
squad_member sq_glyph_a_anchor__minotaur
@member_counts({harpy: 2})
squad sq_glyph_b_harpy_a
@member_counts({harpy: 2})
squad sq_glyph_b_harpy_b
@member_counts({harpy: 2})
squad sq_glyph_b_harpy_c
@member_counts({harpy: 2})
squad sq_glyph_b_harpy_d
squad sq_glyph_b_anchor
squad_member sq_glyph_b_anchor__minotaur
@member_counts({goblin: 3})
squad sq_nexus_a
@member_counts({goblin: 3})
squad sq_nexus_b
@member_counts({goblin: 2})
squad sq_minions_init_goblin_a
@member_counts({goblin: 2})
squad sq_minions_init_goblin_b
@member_counts({goblin: 2})
squad sq_minions_init_goblin_c
@member_counts({goblin: 2})
squad sq_minions_init_goblin_d
@member_counts({goblin: 2})
squad sq_minions_init_goblin_e
@member_counts({goblin: 2})
squad sq_minions_init_goblin_f
@member_counts({goblin: 2})
squad sq_minions_init_goblin_g
squad sq_minions_init_goblin_h
squad sq_minions_init_goblin_i
squad sq_minions_init_hobgoblin_a
squad sq_minions_init_hobgoblin_b
squad sq_minions_init_hobgoblin_c
squad sq_cloud_minions
squad_member sq_cloud_minions__pilot
@member_counts({harpy: 1})
squad sq_minions_a_harpy_a
@member_counts({harpy: 1})
squad sq_minions_a_harpy_b
@member_counts({harpy: 1})
squad sq_minions_a_harpy_c
squad sq_minions_a_harpy_d
squad sq_minions_a_harpy_e
squad sq_minions_a_harpy_f
@member_counts({hobgoblin: 1})
squad sq_minions_b_hobgoblin_a
squad sq_minions_b_hobgoblin_b
@member_counts({goblin: 2})
squad sq_minions_b_goblin_a
@member_counts({goblin: 2})
squad sq_minions_b_goblin_b
@member_counts({minotaur: 1})
squad sq_minions_c_minotaur_a
squad sq_minions_c_minotaur_b
@member_counts({goblin: 1})
squad sq_minions_c_goblin_a
@member_counts({goblin: 1})
squad sq_minions_c_goblin_b
sequence seq_vex_announce
encounter_handle sp_placement_glyphs
interactable_placement sp_placement_kiosk bind("0xE2E80144")
encounter_handle sp_specops_door
encounter_handle sp_specops_heart
player_trigger pt_foyer
player_trigger pt_glyph_a
player_trigger pt_glyph_b
player_trigger pt_center
player_monitor pm_ledge
bool first_scanned_west = false

@startup()
script sc_lowergarden():
    # the wire rests the east control and the first glyph only
    o_device_control_east.create()
    o_device_control_west.create()
    o_device_control_east.set_device_position(0)
    sp_specops_door.o_door.create()
    heart = sp_specops_heart
    for o in [heart.o_spectacle, heart.o_heart, heart.o_statue_a, heart.o_statue_b, heart.o_statue_c, heart.o_dumpling_control, heart.o_dumpling_control_notrans, heart.o_collar_illum]:
        o.create()
        o.set_device_position(0)
    for i in range(0, 2):
        glyph = sp_placement_glyphs._objects[i]
        glyph.create()
        sp_placement_glyphs._object_filters[i].add_players_with_activity_flag(glyph.import_identifier())
        glyph.set_enabled_player_filter(sp_placement_glyphs._object_filters[i])
    sp_placement_glyphs._objects[0].set_device_position(0)
    for sq in [sq_foyer_goblin_a, sq_foyer_goblin_b, sq_foyer_hobgoblin, sq_center_hydra, sq_glyph_a_hobgoblin, sq_glyph_a_goblin_a, sq_glyph_a_goblin_b, sq_glyph_a_anchor, sq_glyph_b_harpy_a, sq_glyph_b_harpy_b, sq_glyph_b_harpy_c, sq_glyph_b_harpy_d, sq_glyph_b_anchor, sq_nexus_a, sq_nexus_b]:
        sq.set_objective(obj_lowergarden_m07)
    for sq in [sq_minions_init_goblin_a, sq_minions_init_goblin_b, sq_minions_init_goblin_c, sq_minions_init_goblin_d, sq_minions_init_goblin_e, sq_minions_init_goblin_f, sq_minions_init_goblin_g, sq_minions_init_goblin_h, sq_minions_init_goblin_i, sq_minions_init_hobgoblin_a, sq_minions_init_hobgoblin_b, sq_minions_init_hobgoblin_c]:
        sq.set_objective(obj_lowergarden_m07)
    for sq in [sq_minions_a_harpy_a, sq_minions_a_harpy_b, sq_minions_a_harpy_c, sq_minions_a_harpy_d, sq_minions_a_harpy_e, sq_minions_a_harpy_f, sq_minions_b_hobgoblin_a, sq_minions_b_hobgoblin_b, sq_minions_b_goblin_a, sq_minions_b_goblin_b, sq_minions_c_minotaur_a, sq_minions_c_minotaur_b, sq_minions_c_goblin_a, sq_minions_c_goblin_b]:
        sq.set_objective(obj_lowergarden_m07)
    for sq in [heart.sq_bg_mino_a, heart.sq_bg_mino_b, heart.sq_bg_mino_c]:
        sq.set_objective(obj_lowergarden_m07)
    sc_foyer.wake()
    sc_center.wake()
    sc_glyphs.wake()
    sc_kiosk.wake()

script sc_foyer():
    sleep_until(pt_foyer.is_triggered())
    sleep(1)
    place_on_task(sq_foyer_goblin_a, "0x335DCDB0")
    place_on_task(sq_foyer_goblin_b, "0x335DCDB0")
    place_on_task(sq_foyer_hobgoblin, "0x5304FE85")
    place_on_task(sq_glyph_a_hobgoblin, "0x4CE48FF3")
    place_on_task(sq_glyph_b_harpy_a, "0x826C3B62")
    place_on_task(sq_glyph_b_harpy_b, "0x826C3B62")
    seq_vex_announce.start()
    sleep_until_first_loss(sq_foyer_hobgoblin)
    sq_foyer_hobgoblin.set_task("0x335DCDB0")

# the arena: the hydra warps into the centre and the glyph squads come on
script sc_center():
    sleep_until(pt_center.is_triggered())
    sleep(0.4)
    sq_center_hydra.place()
    sleep(1.2)
    place_on_task(sq_glyph_a_goblin_a, "0x4BD9F0F8")
    place_on_task(sq_glyph_a_goblin_b, "0x4BD9F0F8")
    place_on_task(sq_glyph_b_harpy_c, "0x826C3B62")
    place_on_task(sq_glyph_b_harpy_d, "0x826C3B62")
    pt_glyph_a.reset()
    pt_glyph_b.reset()
    sc_hydra.wake()
    sc_glyph_a_anchor.wake()
    sc_glyph_b_anchor.wake()

# the hydra moves up as the west glyph's hobgoblins thin out (the
# 2026-10-26 run killed it before they did)
script sc_hydra():
    sleep_until(sq_glyph_a_hobgoblin.alive_count() > 0)
    sleep_until(sq_glyph_a_hobgoblin.alive_count() <= 1)
    sleep(1)
    sq_center_hydra.set_task("0x4BD9F0FA")

# each glyph's anchor comes on when a player reaches the glyph (its
# minotaur is a named member beside the goblins, placed on its own), and
# the squad pushes on once the first of it falls
script sc_glyph_a_anchor():
    sleep_until(pt_glyph_a.is_triggered())
    place_on_task(sq_glyph_a_anchor, "0x22A5B7BC")
    sq_glyph_a_anchor__minotaur.place()
    sleep_until_first_loss(sq_glyph_a_anchor)
    sq_glyph_a_anchor.set_task("0x7E7FF6EF")

script sc_glyph_b_anchor():
    sleep_until(pt_glyph_b.is_triggered())
    place_on_task(sq_glyph_b_anchor, "0xD94C4288")
    sq_glyph_b_anchor__minotaur.place()
    sleep_until_first_loss(sq_glyph_b_anchor)
    sq_glyph_b_anchor.set_task("0xBB43AC26")

# the glyphs in the order they are scanned
script sc_glyphs():
    west = sp_placement_glyphs._objects[0]
    east = sp_placement_glyphs._objects[1]
    sleep_until(west.is_active() or east.is_active())
    sleep(1)
    if west.is_active():
        first_scanned_west = true
        glyph_scan_first(west, o_west_ghost_cage, o_device_control_west, o_glyph_a)
    else:
        glyph_scan_first(east, o_east_ghost_cage, o_device_control_east, o_glyph_b)
    sleep_until(west.is_active() and east.is_active())
    sleep(0.5)
    if first_scanned_west:
        glyph_scan_second(east, o_east_ghost_cage, o_device_control_east, o_glyph_b)
    else:
        glyph_scan_second(west, o_west_ghost_cage, o_device_control_west, o_glyph_a)
    sleep(3)
    if sq_center_hydra.alive_count() > 0:
        sq_center_hydra.set_task("0x4BD9F0F9")
    sleep_until(sq_center_hydra.alive_count() == 0)
    sleep(3)
    sp_specops_door.o_scaffolding.set_device_position(0)
    o_block.create()
    sleep(1)
    o_block.set_device_position(1)

# the first glyph: the Ghost scans it, the control lights, the glyph surges,
# and the spire's scaffolding and eye appear
def glyph_scan_first(glyph, cage, control, surge):
    cage.create()
    sleep(4)
    control.set_device_position(1)
    sleep(1)
    glyph.set_device_position(1)
    surge.create()
    sleep(1)
    sp_specops_door.o_scaffolding.create()
    sp_specops_door.o_scaffolding.set_device_position(1)
    sp_specops_door.o_tower_eye.create()
    cage.set_device_position(1)
    sleep(1)
    cage.delete_object()
    sleep(4)
    surge.delete_object()

# the second: the same, quicker, with the tower rising and the arena's Vex
# closing on the nexus
def glyph_scan_second(glyph, cage, control, surge):
    cage.create()
    for sq in [sq_glyph_a_goblin_a, sq_glyph_a_anchor]:
        if sq.alive_count() > 0:
            sq.set_task("0x4BD9F0F9")
    place_on_task(sq_nexus_a, "0x4BD9F0F9")
    place_on_task(sq_nexus_b, "0x4BD9F0F9")
    sleep(2)
    control.set_device_position(1)
    sleep(1)
    glyph.set_device_position(1)
    surge.create()
    sleep(1)
    sp_specops_door.o_tower.create()
    cage.set_device_position(1)
    sleep(1)
    cage.delete_object()
    sleep(4)
    surge.delete_object()

# the kiosk: the Ghost's scan clears the block and the key appears; the
# door to the heart opens later, and the key is gone once the player is
# through
script sc_kiosk():
    kiosk = sp_placement_kiosk._object
    sleep_until(kiosk.is_active())
    sleep(1)
    kiosk.set_device_position(0.1)
    sleep(5)
    kiosk.set_device_position(1)
    o_block.set_device_position(0)
    sleep(3)
    sp_specops_door.o_key.create()
    sp_specops_door.o_key_lasers.create()
    o_block.delete_object()
    sleep(27)
    sp_specops_door.o_door.set_device_position(1)
    sp_specops_heart.o_dumpling_control.set_device_position(1)
    sleep(4)
    sp_specops_door.o_key_lasers.delete_object()
    sleep_until(pm_ledge.test_any_inside())
    sleep(3)
    sp_specops_heart.o_dumpling_control.set_device_position(0)
    sp_specops_heart.o_dumpling_control_notrans.set_device_position(1)
    sleep(3)
    sp_specops_door.o_key.delete_object()

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()

def sleep_until_first_loss(sq):
    full = sq.alive_count()
    sleep_until(sq.alive_count() < full)
