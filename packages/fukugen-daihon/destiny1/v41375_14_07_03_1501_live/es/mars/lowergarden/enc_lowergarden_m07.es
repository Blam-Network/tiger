# es\mars\lowergarden\enc_lowergarden_m07.es
#
# The Black Garden's lower garden: the foyer and the arena's Vex come on at
# their triggers, the hydra warps into the centre, and the anchor minotaurs
# step in as the glyph squads fall. The glyphs and the kiosk are placed
# here and only answer to players carrying their activity flag, which the
# mission's objectives raise. Scanning a glyph brings the Ghost's cage, the
# glyph's surge and a piece of the spire; with both scanned and the hydra
# dead the block rises in front of the kiosk, the kiosk's scan clears it
# and the key appears, and the door to the heart opens twenty-six seconds
# later. The heart prefab's objects are made here with their devices at
# rest; the missions at the heart move them. From one retail capture:
# where a step has no trigger on the wire, the wait is that run's. Task
# names are uncracked and written as hashes.

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
squad sq_foyer_goblin_a
squad sq_foyer_goblin_b
squad sq_foyer_hobgoblin
squad sq_center_hydra
squad sq_glyph_a_hobgoblin
squad sq_glyph_a_goblin_a
squad sq_glyph_a_goblin_b
squad sq_glyph_a_anchor
squad sq_glyph_b_harpy_a
squad sq_glyph_b_harpy_b
squad sq_glyph_b_harpy_c
squad sq_glyph_b_harpy_d
squad sq_glyph_b_anchor
squad sq_nexus_a
squad sq_nexus_b
squad sq_minions_init_goblin_a
squad sq_minions_init_goblin_b
squad sq_minions_init_goblin_c
squad sq_minions_init_goblin_d
squad sq_minions_init_goblin_e
squad sq_minions_init_goblin_f
squad sq_minions_init_goblin_g
squad sq_minions_init_goblin_h
squad sq_minions_init_goblin_i
squad sq_minions_init_hobgoblin_a
squad sq_minions_init_hobgoblin_b
squad sq_minions_init_hobgoblin_c
squad sq_cloud_minions
squad_member sq_cloud_minions__pilot
squad sq_minions_a_harpy_a
squad sq_minions_a_harpy_b
squad sq_minions_a_harpy_c
squad sq_minions_a_harpy_d
squad sq_minions_a_harpy_e
squad sq_minions_a_harpy_f
squad sq_minions_b_hobgoblin_a
squad sq_minions_b_hobgoblin_b
squad sq_minions_b_goblin_a
squad sq_minions_b_goblin_b
squad sq_minions_c_minotaur_a
squad sq_minions_c_minotaur_b
squad sq_minions_c_goblin_a
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

@startup()
script sc_lowergarden():
    for o in [o_device_control_east, o_device_control_west]:
        o.create()
        o.set_device_position(0)
    sp_specops_door.o_door.create()
    heart = sp_specops_heart
    for o in [heart.o_spectacle, heart.o_heart, heart.o_statue_a, heart.o_statue_b, heart.o_statue_c, heart.o_dumpling_control, heart.o_dumpling_control_notrans, heart.o_collar_illum]:
        o.create()
        o.set_device_position(0)
    for i in range(0, 2):
        glyph = sp_placement_glyphs._objects[i]
        sp_placement_glyphs._object_filters[i].add_players_with_activity_flag(glyph.import_identifier())
        glyph.set_enabled_player_filter(sp_placement_glyphs._object_filters[i])
        glyph.create()
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
    sc_glyph_a.wake()
    sc_glyph_b.wake()
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
    sleep(5)
    sq_foyer_hobgoblin.set_task("0x335DCDB0")

# the arena: the hydra warps into the centre, the glyph squads come on,
# and each glyph's anchor minotaur steps in as its squad falls
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
    sc_glyph_b_anchor.wake()
    sc_glyph_a_anchor.wake()

script sc_glyph_b_anchor():
    sleep_until(sq_glyph_b_harpy_d.alive_count() > 0)
    sleep_until(sq_glyph_b_harpy_d.alive_count() == 0)
    sleep(2)
    place_on_task(sq_glyph_b_anchor, "0xD94C4288")
    sleep(10)
    sq_glyph_b_anchor.set_task("0xBB43AC26")

script sc_glyph_a_anchor():
    sleep_until(sq_glyph_a_hobgoblin.alive_count() > 0)
    sleep_until(sq_glyph_a_hobgoblin.alive_count() <= 1)
    sleep(1)
    sq_center_hydra.set_task("0x4BD9F0FA")
    sleep_until(sq_glyph_a_hobgoblin.alive_count() == 0)
    sleep(1)
    place_on_task(sq_glyph_a_anchor, "0x22A5B7BC")

# the west glyph: the Ghost scans it, the control lights, the glyph surges,
# and the spire's scaffolding and eye appear
script sc_glyph_a():
    glyph = sp_placement_glyphs._objects[0]
    sleep_until(glyph.is_active())
    sleep(1)
    o_west_ghost_cage.create()
    sleep(4)
    o_device_control_west.set_device_position(1)
    sleep(1)
    glyph.set_device_position(1)
    o_glyph_a.create()
    sleep(1)
    sp_specops_door.o_scaffolding.create()
    sp_specops_door.o_scaffolding.set_device_position(1)
    sp_specops_door.o_tower_eye.create()
    o_west_ghost_cage.set_device_position(1)
    sleep(1)
    o_west_ghost_cage.delete_object()
    sleep(4)
    o_glyph_a.delete_object()

# the east glyph: the same, the tower rises, the arena's Vex close on the
# nexus, and once the hydra is dead the block comes up at the kiosk
script sc_glyph_b():
    glyph = sp_placement_glyphs._objects[1]
    sleep_until(glyph.is_active())
    sleep(1)
    o_east_ghost_cage.create()
    sq_glyph_a_goblin_a.set_task("0x4BD9F0F9")
    sq_glyph_a_anchor.set_task("0x4BD9F0F9")
    sq_nexus_a.set_task("0x4BD9F0F9")
    sleep(2)
    o_device_control_east.set_device_position(1)
    sleep(1)
    glyph.set_device_position(1)
    o_glyph_b.create()
    sleep(1)
    sp_specops_door.o_tower.create()
    o_east_ghost_cage.set_device_position(1)
    sleep(1)
    o_east_ghost_cage.delete_object()
    sleep(4)
    o_glyph_b.delete_object()
    sleep(3)
    sq_center_hydra.set_task("0x4BD9F0F9")
    sleep_until(sq_center_hydra.alive_count() == 0)
    sleep(3)
    sp_specops_door.o_scaffolding.set_device_position(0)
    o_block.create()
    sleep(1)
    o_block.set_device_position(1)

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
