# es\venus\south_tides\enc_south_tides_m07.es
#
# Eye of a Gatelord's southern tides. The snipers, the goblins at the hollow
# and the look-ahead squads on the north tides stand from the start; the
# warpgates each drop their squad as the player reaches the pocket and the
# three gates, the way the alpha's chapter 2 did. From one retail capture:
# the gates' reinforcement squads never came, so they are not scripted.
# Most task names are uncracked (hashes).

@activity_bundle("enc_south_tides_m07")

objective obj_south_tides_m07
@member_counts({goblins: 4})
squad sq_hco_goblins
@member_counts({hobgoblins: 2})
squad sq_pocket_snipers
@member_counts({goblins: 3})
squad sq_pocket_goblins01
@member_counts({hobgoblins: 1})
squad sq_gate01_sniper01
@member_counts({hobgoblins: 1})
squad sq_gate01_sniper02
@member_counts({goblins: 4})
squad sq_gate01_goblins
@member_counts({hobgoblins: 1})
squad sq_gate02_sniper01
@member_counts({hobgoblins: 1})
squad sq_gate02_sniper02
@member_counts({hobgoblins: 1})
squad sq_gate02_sniper03
@member_counts({harpies: 3})
squad sq_gate02_harpies
@member_counts({goblins: 3})
squad sq_gate03_goblins
@member_counts({minotaur: 1, goblins: 2})
squad sq_gate05_anchor
@member_counts({goblins: 3})
squad sq_gate05_goblins
@member_counts({harpies: 3})
squad sq_gate06_harpies
@member_counts({hobgoblins: 1})
squad sq_north_tides_snipers
@member_counts({hydra: 1})
squad sq_north_tides_hydra
vex_warp_gate vex_warp_gate_pocket
vex_warp_gate vex_warp_gate01
vex_warp_gate vex_warp_gate02
vex_warp_gate vex_warp_gate03
vex_warp_gate vex_warp_gate05
vex_warp_gate vex_warp_gate06
trigger_volume tv_pocket
player_trigger pt_pocket bind(tv_pocket)
player_monitor pm_pocket bind(tv_pocket)
trigger_volume tv_gate01
player_trigger pt_gate01 bind(tv_gate01)
trigger_volume tv_gate02
player_trigger pt_gate02 bind(tv_gate02)
trigger_volume tv_gate03
player_trigger pt_gate03 bind(tv_gate03)
sequence md_vn07_020_50

@startup()
script ss_south_tides_m07():
    for sq in [sq_hco_goblins, sq_pocket_snipers, sq_pocket_goblins01, sq_gate01_sniper01, sq_gate01_sniper02, sq_gate01_goblins, sq_gate02_sniper01, sq_gate02_sniper02, sq_gate02_sniper03, sq_gate02_harpies, sq_gate03_goblins, sq_gate05_anchor, sq_gate05_goblins, sq_gate06_harpies, sq_north_tides_snipers, sq_north_tides_hydra]:
        sq.set_objective(obj_south_tides_m07)
    for gate in [vex_warp_gate_pocket, vex_warp_gate01, vex_warp_gate02, vex_warp_gate03, vex_warp_gate05, vex_warp_gate06]:
        gate._squad.place()
    place_on_task(sq_north_tides_hydra, "0x1693318D")
    place_on_task(sq_north_tides_snipers, "0xF0DDFC53")
    place_on_task(sq_hco_goblins, "hco_goblins")
    place_on_task(sq_pocket_snipers, "0x25A347AE")
    place_on_task(sq_gate01_sniper01, "0xE0AEFA67")
    place_on_task(sq_gate01_sniper02, "0x771AA672")
    place_on_task(sq_gate02_sniper01, "0x9375DEA0")
    place_on_task(sq_gate02_sniper02, "0xEF2A3799")
    place_on_task(sq_gate02_sniper03, "0xEF2A379A")

@startup()
# the pocket: its gate drops the goblins, who go to their second task once
# down; the Ghost speaks when the gate is destroyed
script sc_pocket():
    sleep_until(pt_pocket.is_triggered())
    sq_pocket_goblins01.set_task("0xD5908456")
    vex_warp_gate_pocket.drop_begin(sq_pocket_goblins01)
    sq_pocket_goblins01.set_task("0x3F699BEB")
    sleep_until(vex_warp_gate_pocket._squad.alive_count() == 0)
    md_vn07_020_50.start()

@startup()
script sc_gate01():
    sleep_until(pt_gate01.is_triggered())
    sq_gate01_goblins.set_task("0xD0A6019F")
    vex_warp_gate01.drop_begin(sq_gate01_goblins)

@startup()
# the second trigger wakes gates 2 and 3 together
script sc_gate02():
    sleep_until(pt_gate02.is_triggered())
    sq_gate02_harpies.set_task("0xEF2A379B")
    vex_warp_gate02.drop_begin(sq_gate02_harpies)

@startup()
script sc_gate03():
    sleep_until(pt_gate02.is_triggered())
    sq_gate03_goblins.set_task("0xE2D4FE1F")
    vex_warp_gate03.drop_begin(sq_gate03_goblins)

@startup()
# the third wakes gates 5 and 6; gate 5 sends its anchor after the goblins
script sc_gate05():
    sleep_until(pt_gate03.is_triggered())
    sq_gate05_goblins.set_task("0x0A71D303")
    vex_warp_gate05.drop_begin(sq_gate05_goblins)
    sleep(6)
    sq_gate05_anchor.set_task("0x4065352A")
    vex_warp_gate05.drop_begin(sq_gate05_anchor)

@startup()
script sc_gate06():
    sleep_until(pt_gate03.is_triggered())
    sq_gate06_harpies.set_task("0x2B6B76AC")
    vex_warp_gate06.drop_begin(sq_gate06_harpies)

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()
