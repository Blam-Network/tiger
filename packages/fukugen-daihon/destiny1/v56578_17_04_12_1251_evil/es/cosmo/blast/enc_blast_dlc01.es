# es\cosmo\blast\enc_blast_dlc01.es
#
# The blast in quest_bonzo_dlc01 (The Taken King): Omnigul and her Hive hold
# it against the Fallen as the bubble loads, a Fallen dropship already
# hovering. Omnigul laughs, the first Hive spawn opens, and the ship drops two
# squads and leaves; the start trigger brings a second ship with two more.
# Omnigul's leave trigger opens the three far spawns and is armed again; the
# second time it sends their spare squads, the third time Omnigul withdraws
# and turns invulnerable. Each ship flies the command scripts retail sent,
# atom for atom. Names that were never cracked are written as "0x" literals.
# From one retail capture, so every wait here is that run's (the second and
# third reactions came 22 and 20 s after their triggers).

@activity_bundle("enc_blast_dlc01")

objective obj_blast_dlc01
squad sq_bonzo_blast_hive01
squad sq_bonzo_blast_hive02
squad sq_bonzo_blast_hive03
squad sq_omnigul
squad_member sq_omnigul__wizard
squad sq_bonzo_blast_fallen01
squad sq_bonzo_blast_fallen02
squad sq_bonzo_blast_fallen03
squad sq_bonzo_blast_fallen04
squad sq_bonzo_blast_fallen05
squad sq_bonzo_blast_fallen06
squad dropship_squad01
squad_member dropship_squad01__pilot
control_point_set dropship01_entry_path
control_point_set dropship01_exit_path
squad dropship_squad02
squad_member dropship_squad02__pilot
control_point_set dropship02_entry_path
control_point_set dropship02_exit_path
hive_thrall_spawn hive_crota_thrall_spawn
hive_thrall_spawn hive_crota_thrall_spawn_1
hive_thrall_spawn hive_crota_thrall_spawn_2
hive_thrall_spawn hive_crota_thrall_spawn_3
sequence seq_sfx_omnigul_laugh
object_filter of_omnigul_invulnerable
hop_on ho_invulnerable
player_trigger pt_omnigul_start
player_trigger pt_omnigul_leave
c_command_script __cs

@startup()
script sc_blast_main():
    for sq in [sq_bonzo_blast_hive01, sq_bonzo_blast_hive02, sq_bonzo_blast_hive03, sq_omnigul, sq_bonzo_blast_fallen01, sq_bonzo_blast_fallen02, sq_bonzo_blast_fallen03, sq_bonzo_blast_fallen04, sq_bonzo_blast_fallen05, sq_bonzo_blast_fallen06]:
        sq.set_objective(obj_blast_dlc01)
    sq_bonzo_blast_hive01.set_task("0x66F9DE8D")
    sq_bonzo_blast_hive02.set_task("0x66F9DE8D")
    sq_bonzo_blast_hive03.set_task("0x66F9DE8D")
    sq_omnigul.set_task("0x12D2AD5E")
    sq_bonzo_blast_fallen05.set_task("0xFD50A13")
    sq_bonzo_blast_fallen06.set_task("0x71ABDC81")
    for sq in [sq_bonzo_blast_hive01, sq_bonzo_blast_fallen06, sq_bonzo_blast_fallen05, sq_bonzo_blast_hive02, sq_omnigul, sq_bonzo_blast_hive03]:
        sq.place()
    sc_dropship01.wake()
    sc_dropship02.wake()
    sc_omnigul.wake()

script sc_dropship01():
    dropship_enter(dropship_squad01__pilot, dropship01_entry_path)
    sleep(8)
    dropship_doors(dropship_squad01__pilot, 1)
    sleep(2)
    sq_bonzo_blast_fallen04.set_task("0x1ECF426B")
    dropship_squad01__pilot.drop_squad(sq_bonzo_blast_fallen04)
    sleep(5)
    sq_bonzo_blast_fallen03.set_task("0x8A24A104")
    dropship_squad01__pilot.drop_squad(sq_bonzo_blast_fallen03)
    sleep(4)
    dropship_doors(dropship_squad01__pilot, 0)
    sleep(1)
    dropship_leave(dropship_squad01__pilot, dropship01_exit_path)

script sc_dropship02():
    sleep_until(pt_omnigul_start.is_triggered())
    sleep(0.5)
    dropship_enter(dropship_squad02__pilot, dropship02_entry_path)
    sleep(14)
    dropship_doors(dropship_squad02__pilot, 1)
    sleep(2)
    sq_bonzo_blast_fallen01.set_task("0x1ECF426B")
    dropship_squad02__pilot.drop_squad(sq_bonzo_blast_fallen01)
    sleep(5)
    sq_bonzo_blast_fallen02.set_task("0x1ECF426B")
    dropship_squad02__pilot.drop_squad(sq_bonzo_blast_fallen02)
    sleep(5)
    dropship_doors(dropship_squad02__pilot, 0)
    sleep(1)
    dropship_leave(dropship_squad02__pilot, dropship02_exit_path)

script sc_omnigul():
    sleep(7.5)
    seq_sfx_omnigul_laugh.start()
    __cs.clear()
    __cs.scripted_sequence("0xC1D2964B")
    sq_omnigul__wizard.execute(__cs)
    sleep(2)
    hive_crota_thrall_spawn.spawn(2, obj_blast_dlc01, "")
    sleep_until(pt_omnigul_leave.is_triggered())
    sleep(3.3)
    sc_far_spawn_1.wake()
    sc_far_spawn_2.wake()
    sc_far_spawn_3.wake()
    pt_omnigul_leave.reset()
    sleep_until(pt_omnigul_leave.is_triggered())
    sleep(22)
    sc_far_extra_1.wake()
    sc_far_extra_2.wake()
    sc_far_extra_3.wake()
    pt_omnigul_leave.reset()
    sleep_until(pt_omnigul_leave.is_triggered())
    sleep(20)
    sq_omnigul.set_task("0x281ADF3F")
    sleep(9.3)
    of_omnigul_invulnerable.add(sq_omnigul__wizard)
    ho_invulnerable.set_filter(of_omnigul_invulnerable)

script sc_far_spawn_1():
    hive_crota_thrall_spawn_1.spawn(3, obj_blast_dlc01, "0x838B089")

script sc_far_spawn_2():
    hive_crota_thrall_spawn_2.spawn(3, obj_blast_dlc01, "0x838B089")

script sc_far_spawn_3():
    hive_crota_thrall_spawn_3.spawn(3, obj_blast_dlc01, "0x838B089")

script sc_far_extra_1():
    hive_crota_thrall_spawn_1.spawn_extra(obj_blast_dlc01, "0x838B089")

script sc_far_extra_2():
    hive_crota_thrall_spawn_2.spawn_extra(obj_blast_dlc01, "0x838B089")

script sc_far_extra_3():
    hive_crota_thrall_spawn_3.spawn_extra(obj_blast_dlc01, "0x838B089")

def dropship_enter(pilot, path):
    __cs.clear()
    __cs.move_to(path, 0, false)
    __cs.move_to(path, 1, false)
    __cs.move_to(path, 2, true)
    __cs.face(path, 2)
    __cs.set_channel_scalar("doors", 1)
    pilot.place()
    pilot.execute(__cs)

def dropship_doors(pilot, open):
    __cs.clear()
    __cs.set_channel_scalar("doors", open)
    pilot.execute(__cs)

def dropship_leave(pilot, path):
    __cs.clear()
    __cs.move_to(path, 0, false)
    __cs.face(path, 0)
    __cs.set_channel_scalar("doors", 0)
    __cs.move_to(path, 1, false)
    __cs.move_to(path, 2, false)
    __cs.ability("dropship", "0x7D0D39A9")
    pilot.execute(__cs)
