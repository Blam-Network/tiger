# es\moon\act_moon_m4_uppercitadel\unknown_861cc3e2.es
#
# Music and Ghost lines for The Sword of Crota. The intro music starts as the
# players are in; every other line and the climax music's sections are
# started by the missions and the upper citadel encounter, off the objective
# they belong to. Its trigger volumes (tv_hellmouth_henge, tv_upperc_*) never
# reach the wire. One 2.3.1 run (2026-10-25). Never on the wire:
# seq_d_upperc_sword_equip_s02.

@activity_bundle(0x861CC3E2)

sequence seq_m_intro_s01

@startup()
script sc_main_thread():
    sleep_until(c_player_script_utilities.all_players_are_ready())
    seq_m_intro_s01.start()
