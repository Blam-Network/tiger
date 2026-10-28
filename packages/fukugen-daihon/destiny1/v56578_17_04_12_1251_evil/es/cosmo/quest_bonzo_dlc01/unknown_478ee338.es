# es\cosmo\quest_bonzo_dlc01\unknown_478ee338.es
#
# The refinery in quest_bonzo_dlc01: the Hive's ritual summons a Spawn of
# Crota as the player comes up its first trigger, and the Hive waves come
# down at the railyard and at the knights. Names that were never cracked are
# written as "0x" literals. From one retail capture: the waves came 3 s after
# the railyard trigger and 5 s after the knights'.

@activity_bundle(0x478EE338)

objective oj_main
ritual_spawn_of_crota ritual_spawn_of_crota_prefab
squad sq_wave01
squad sq_wave02
squad sq_wave03
squad sq_wave04
squad sq_wave05
player_trigger pt_init
player_trigger pt_railyard
player_trigger pt_knights

@startup()
script sc_refinery_main():
    for sq in [sq_wave01, sq_wave02, sq_wave03, sq_wave04, sq_wave05]:
        sq.set_objective(oj_main)
    sc_ritual.wake()
    sc_railyard.wake()
    sc_knights.wake()

script sc_ritual():
    sleep_until(pt_init.is_triggered())
    sleep(1)
    ritual_spawn_of_crota_prefab.begin()

script sc_railyard():
    sleep_until(pt_railyard.is_triggered())
    sleep(3)
    sq_wave01.set_task("0x879A5787")
    sq_wave02.set_task("0x879A5787")
    sq_wave03.set_task("0x6AF34E63")
    sq_wave04.set_task("0xE15BF17B")
    for sq in [sq_wave01, sq_wave02, sq_wave03, sq_wave04]:
        sq.place()

script sc_knights():
    sleep_until(pt_knights.is_triggered())
    sleep(5)
    sq_wave05.set_task("0x879A5787")
    sq_wave05.place()
