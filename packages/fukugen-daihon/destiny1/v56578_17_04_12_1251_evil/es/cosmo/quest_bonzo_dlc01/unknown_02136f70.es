# es\cosmo\quest_bonzo_dlc01\unknown_02136f70.es
#
# The grotto and its knight in quest_bonzo_dlc01. The wizard's spawn stands
# charged as the hive shore loads. The intro trigger opens the grotto's
# teleporters and lays the cloud traps; the spawn charges up and the knight
# steps out of it. The Thrall in the hall, the boomers and the shooters, then
# the lake's Thrall follow on the fight's clock; once the knight is dead the
# traps go. Names that were never cracked are written as "0x" literals. From
# one retail capture with a wipe: both tries opened the same way, and the
# waves came 23 to 26 s after the knight (the shorter waits are the second
# try's).

@activity_bundle(0x02136F70)

objective obj_bonzo
squad sq_knight_boss
squad_member sq_knight_boss__boss
squad sq_boomer1
squad sq_boomer2
squad sq_hall_thrall
squad sq_lake_thrall
squad sq_shooters
object o_wizard_spawn
object grotto_tp_source
object grotto_tp_dest01
object grotto_tp_dest02
object grotto_tp_dest03
static_array<object, 28> cloud_trap_on_players_placement
object_filter of_grounded
hop_on ho_grounded
player_trigger pt_intro
bool knight_placed = false

@startup()
script sc_grotto_main():
    for sq in [sq_knight_boss, sq_boomer1, sq_boomer2, sq_hall_thrall, sq_lake_thrall, sq_shooters]:
        sq.set_objective(obj_bonzo)
    ho_grounded.set_filter(of_grounded)
    o_wizard_spawn.create()
    o_wizard_spawn.set_device_position(0.1)
    sleep_until(pt_intro.is_triggered())
    grotto_tp_source.create()
    grotto_tp_dest01.create()
    grotto_tp_dest02.create()
    grotto_tp_dest03.create()
    sleep(0.8)
    for trap in cloud_trap_on_players_placement:
        trap.create()
    sleep(2.9)
    o_wizard_spawn.set_device_position(1)
    sleep(1.1)
    sq_knight_boss.set_task("0x37B852BD")
    sq_knight_boss.place()
    knight_placed = true
    sleep(0.5)
    o_wizard_spawn.delete_object()
    sc_waves.wake()
    sleep_until(knight_is_dead())
    for trap in cloud_trap_on_players_placement:
        trap.delete_object()

script sc_waves():
    sleep(23)
    sq_hall_thrall.set_task("0x4E97284A")
    sq_hall_thrall.place()
    sleep(1)
    sq_boomer1.set_task("0xF2722D2A")
    sq_boomer2.set_task("0x7F5496CC")
    sq_shooters.set_task("0x3EED2415")
    sq_boomer1.place()
    sq_boomer2.place()
    sq_shooters.place()
    sleep(2)
    sq_lake_thrall.set_task("0x4E97284A")
    sq_lake_thrall.place()

def fight_started():
    return pt_intro.is_triggered()

def knight_is_dead():
    return knight_placed and not sq_knight_boss__boss.is_alive()
