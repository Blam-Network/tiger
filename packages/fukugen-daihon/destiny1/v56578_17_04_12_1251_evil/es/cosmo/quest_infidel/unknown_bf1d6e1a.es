# es\cosmo\quest_infidel\unknown_bf1d6e1a.es
#
# The breach's Fallen in Fang of Ir Yut: the bridge, its snipers, the landing
# and the corridors are all standing when the player comes down, each squad on
# its own task. Once the bridge's lead squad is down, the one behind it falls
# back. Names that were never cracked are written as "0x" literals. From one
# retail capture.

@activity_bundle(0xBF1D6E1A)

objective main_objective
squad sq_intro_bridge
squad sq_bridge_fb
squad sq_bridge_mid
squad sq_bridge_snipe_end
squad sq_bridge_snipe_a
squad sq_bridge_snipe_b
squad wanted_main_squad
squad sq_landing
squad sq_landing_rear
squad sq_corridor_a
squad sq_corridor_b
squad sq_corridor_c

@startup()
script sc_breach_main():
    for sq in [sq_intro_bridge, sq_bridge_fb, sq_bridge_mid, sq_bridge_snipe_end, sq_bridge_snipe_a, sq_bridge_snipe_b, wanted_main_squad, sq_landing, sq_landing_rear, sq_corridor_a, sq_corridor_b, sq_corridor_c]:
        sq.set_objective(main_objective)
    sq_intro_bridge.set_task("task")
    sq_bridge_fb.set_task("task_2")
    sq_bridge_snipe_end.set_task("task_6")
    sq_bridge_snipe_a.set_task("task_4")
    wanted_main_squad.set_task("task_9")
    sq_landing.set_task("task_7")
    sq_landing_rear.set_task("task_8")
    sq_corridor_a.set_task("0x8F0587DD")
    sq_corridor_b.set_task("0x8F0587DA")
    sq_corridor_c.set_task("0x8F0587DB")
    for sq in [sq_intro_bridge, sq_bridge_fb, sq_bridge_mid, sq_bridge_snipe_end, sq_bridge_snipe_a, sq_bridge_snipe_b, wanted_main_squad, sq_landing, sq_landing_rear, sq_corridor_a, sq_corridor_b, sq_corridor_c]:
        sq.place()
    sc_bridge_fallback.wake()

script sc_bridge_fallback():
    sleep_until(sq_intro_bridge.alive_count() > 0)
    sleep_until(sq_intro_bridge.alive_count() == 0)
    sq_bridge_fb.set_task("task_1")
