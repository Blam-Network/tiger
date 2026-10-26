# es\moon\uppercitadel\enc_uppercitadel_m4.es
#
# The upper citadel in The Sword of Crota: the overlook and the chain room's
# Hive, the Wizard, the waves of the darkness and the sword. A private
# bubble (12), so all of it runs only while the players are here.
#
# The room's Hive take their posts as the players arrive and the overlook's
# Knight comes in five seconds later; its melee squads move up when a player
# comes into the chain room. Mission 4 wakes the Wizard (sc_chainroom_wizard)
# and mission 5 the darkness (sc_darkness): four waves, each a second after
# the one before is dead, the last three led by a Swordbearer, then the sword
# shatters when the third falls. Within a wave its squads come a few seconds
# apart; the climax music moves up a section with the first, second and
# fourth wave. One 2.3.1 run (2026-10-25): every wait in here is that run's
# and unconfirmed. Left out: the squads' later task changes (the AI's), and
# sq_overlook_support4, which never took a task. The squads' body counts are
# the kills tallied against them in the run.

@activity_bundle("enc_uppercitadel_m4")

objective obj_uppercitadel_m4
objective obj_uppercitadel_m4_w0
objective obj_uppercitadel_m4_w1
objective obj_uppercitadel_m4_w2
objective obj_uppercitadel_m4_w3
squad sq_overlook_anchor1
squad_member sq_overlook_anchor1__knight_boomer
@member_counts({trooper: 3})
squad sq_overlook_support1
@member_counts({trooper: 3})
squad sq_overlook_support3
squad sq_overlook_support4
squad sq_chainroom_anchor1
squad_member sq_chainroom_anchor1__wizard
performance sq_chainroom_anchor1_spawn_performance
@member_counts({thrall: 3, 0x8B5EA686: 1})
squad sq_chainroom_melee1
@member_counts({thrall: 3, 0x8B5EA686: 1})
squad sq_chainroom_melee2
@member_counts({trooper: 3})
squad sq_chainroom_support1
@member_counts({trooper: 3})
squad sq_chainroom_support2
@member_counts({trooper: 2})
squad sq_chainroom_support3
@member_counts({trooper: 2})
squad sq_chainroom_support4
@member_counts({thrall: 2})
squad sq_chainroom_wave0_melee1
@member_counts({thrall: 2})
squad sq_chainroom_wave0_melee2
squad sq_chainroom_wave0_melee3
@member_counts({thrall: 2})
squad sq_chainroom_wave0_melee4
@member_counts({thrall: 2})
squad sq_chainroom_wave0_melee5
@member_counts({trooper: 2})
squad sq_chainroom_wave0_support1
squad sq_chainroom_wave0_support2
@member_counts({trooper: 2})
squad sq_chainroom_wave0_support3
@member_counts({trooper: 2})
squad sq_chainroom_wave0_support4
squad sq_chainroom_wave1_major1
squad_member sq_chainroom_wave1_major1__major_knight_cleaver
squad sq_chainroom_wave1_melee1
@member_counts({thrall: 2})
squad sq_chainroom_wave1_melee2
@member_counts({thrall: 2})
squad sq_chainroom_wave1_melee3
squad sq_chainroom_wave2_major1
squad_member sq_chainroom_wave2_major1__major_knight_cleaver
@member_counts({trooper: 2})
squad sq_chainroom_wave2_support1
@member_counts({trooper: 2})
squad sq_chainroom_wave2_support2
squad sq_chainroom_wave2_support3
squad sq_chainroom_wave3_major1
squad_member sq_chainroom_wave3_major1__major_knight_cleaver
@member_counts({thrall: 2})
squad sq_chainroom_wave3_melee1
@member_counts({thrall: 2})
squad sq_chainroom_wave3_melee2
squad sq_chainroom_wave3_melee3
@member_counts({trooper: 2})
squad sq_chainroom_wave3_support1
@member_counts({trooper: 2})
squad sq_chainroom_wave3_support2
@member_counts({trooper: 2})
squad sq_chainroom_wave3_support3
trigger_volume tv_chainroom_enter
player_trigger pt_chainroom_enter bind(tv_chainroom_enter)
encounter_handle pf_sword_relic
sequence seq_m_climax_s01
sequence seq_d_upperc_climax_wave
sequence seq_d_upperc_prince_arrive_s01

@startup()
script sc_uppercitadel_main():
    sq_overlook_anchor1.set_objective(obj_uppercitadel_m4)
    sq_overlook_support1.set_objective(obj_uppercitadel_m4)
    sq_overlook_support3.set_objective(obj_uppercitadel_m4)
    sq_overlook_support4.set_objective(obj_uppercitadel_m4)
    sq_chainroom_anchor1.set_objective(obj_uppercitadel_m4)
    sq_chainroom_melee1.set_objective(obj_uppercitadel_m4)
    sq_chainroom_melee2.set_objective(obj_uppercitadel_m4)
    sq_chainroom_support1.set_objective(obj_uppercitadel_m4)
    sq_chainroom_support2.set_objective(obj_uppercitadel_m4)
    sq_chainroom_support3.set_objective(obj_uppercitadel_m4)
    sq_chainroom_support4.set_objective(obj_uppercitadel_m4)
    sq_chainroom_wave0_melee1.set_objective(obj_uppercitadel_m4_w0)
    sq_chainroom_wave0_melee2.set_objective(obj_uppercitadel_m4_w0)
    sq_chainroom_wave0_melee3.set_objective(obj_uppercitadel_m4_w0)
    sq_chainroom_wave0_melee4.set_objective(obj_uppercitadel_m4_w0)
    sq_chainroom_wave0_melee5.set_objective(obj_uppercitadel_m4_w0)
    sq_chainroom_wave0_support1.set_objective(obj_uppercitadel_m4_w0)
    sq_chainroom_wave0_support2.set_objective(obj_uppercitadel_m4_w0)
    sq_chainroom_wave0_support3.set_objective(obj_uppercitadel_m4_w0)
    sq_chainroom_wave0_support4.set_objective(obj_uppercitadel_m4_w0)
    sq_chainroom_wave1_major1.set_objective(obj_uppercitadel_m4_w1)
    sq_chainroom_wave1_melee1.set_objective(obj_uppercitadel_m4_w1)
    sq_chainroom_wave1_melee2.set_objective(obj_uppercitadel_m4_w1)
    sq_chainroom_wave1_melee3.set_objective(obj_uppercitadel_m4_w1)
    sq_chainroom_wave2_major1.set_objective(obj_uppercitadel_m4_w2)
    sq_chainroom_wave2_support1.set_objective(obj_uppercitadel_m4_w2)
    sq_chainroom_wave2_support2.set_objective(obj_uppercitadel_m4_w2)
    sq_chainroom_wave2_support3.set_objective(obj_uppercitadel_m4_w2)
    sq_chainroom_wave3_major1.set_objective(obj_uppercitadel_m4_w3)
    sq_chainroom_wave3_melee1.set_objective(obj_uppercitadel_m4_w3)
    sq_chainroom_wave3_melee2.set_objective(obj_uppercitadel_m4_w3)
    sq_chainroom_wave3_melee3.set_objective(obj_uppercitadel_m4_w3)
    sq_chainroom_wave3_support1.set_objective(obj_uppercitadel_m4_w3)
    sq_chainroom_wave3_support2.set_objective(obj_uppercitadel_m4_w3)
    sq_chainroom_wave3_support3.set_objective(obj_uppercitadel_m4_w3)
    sq_overlook_support1.set_task("0xA5A04008")
    sq_overlook_support1.place()
    sq_overlook_support3.set_task("0xA5A0400A")
    sq_overlook_support3.place()
    sq_chainroom_melee1.set_task("0x25436735")
    sq_chainroom_melee1.place()
    sq_chainroom_melee2.set_task("0x25436735")
    sq_chainroom_melee2.place()
    sq_chainroom_support1.set_task("0xCC745A08")
    sq_chainroom_support1.place()
    sq_chainroom_support2.set_task("0x7D237AE7")
    sq_chainroom_support2.place()
    sq_chainroom_support3.set_task("0xFA914CCB")
    sq_chainroom_support3.place()
    sq_chainroom_support4.set_task("0x4AA815B4")
    sq_chainroom_support4.place()
    sleep(5)
    sq_overlook_anchor1.set_task("0xA6DEBB1A")
    sq_overlook_anchor1.place()

@startup()
# Into the chain room: its melee squads move up.
script sc_pt_chainroom_enter():
    sleep_until(pt_chainroom_enter.is_triggered())
    sq_chainroom_melee1.set_task("0x6744E7F4")
    sq_chainroom_melee2.set_task("0x6744E7F4")

# The Wizard comes in three seconds after "clear the room" goes up.
script sc_chainroom_wizard():
    sleep(3)
    sq_chainroom_anchor1.set_task("0x0832341E")
    sq_chainroom_anchor1.place()
    sq_chainroom_anchor1_spawn_performance.start_performance("0x567ACCC7")

# The darkness, from mission 5's start: the first wave five seconds in, in
# three parts, then the three Swordbearers' waves. A wave is down once it has
# stood and its last member has fallen.
script sc_darkness():
    sleep(5)
    sq_chainroom_wave0_melee1.set_task("0x94721D5B")
    sq_chainroom_wave0_melee1.place()
    sq_chainroom_wave0_melee2.set_task("0x94721D5B")
    sq_chainroom_wave0_melee2.place()
    sq_chainroom_wave0_melee3.set_task("0x94721D5B")
    sq_chainroom_wave0_melee3.place()
    sleep(1)
    seq_m_climax_s01.set_switch_mask(7)
    sleep_until(wave0_a_alive_count() > 0)
    sleep_until(wave0_a_alive_count() == 0)
    sleep(1)
    sq_chainroom_wave0_support1.set_task("0x8B260D77")
    sq_chainroom_wave0_support1.place()
    sq_chainroom_wave0_support2.set_task("0x8B260D77")
    sq_chainroom_wave0_support2.place()
    sleep_until(wave0_b_alive_count() > 0)
    sleep_until(wave0_b_alive_count() == 0)
    sleep(1)
    sq_chainroom_wave0_melee4.set_task("0xA0A802A4")
    sq_chainroom_wave0_melee4.place()
    sq_chainroom_wave0_melee5.set_task("0xA0A802A4")
    sq_chainroom_wave0_melee5.place()
    sq_chainroom_wave0_support3.set_task("0x8B260D75")
    sq_chainroom_wave0_support3.place()
    sq_chainroom_wave0_support4.set_task("0x8B260D72")
    sq_chainroom_wave0_support4.place()
    sleep_until(wave0_c_alive_count() > 0)
    sleep_until(wave0_c_alive_count() == 0)
    sleep(1)
    seq_d_upperc_climax_wave.start()
    seq_m_climax_s01.set_switch_mask(15)
    sq_chainroom_wave1_melee2.set_task("0xF269C0B9")
    sq_chainroom_wave1_melee2.place()
    sq_chainroom_wave1_melee3.set_task("0xF269C0B9")
    sq_chainroom_wave1_melee3.place()
    sleep(2)
    sq_chainroom_wave1_melee1.set_task("0xF269C0B9")
    sq_chainroom_wave1_melee1.place()
    sleep(1)
    seq_d_upperc_prince_arrive_s01.start()
    sleep(2)
    sq_chainroom_wave1_major1.set_task("0x88745F06")
    sq_chainroom_wave1_major1.place()
    sleep_until(wave1_alive_count() == 0)
    sleep(1)
    sq_chainroom_wave2_support1.set_task("0x6EA47128")
    sq_chainroom_wave2_support1.place()
    sq_chainroom_wave2_support2.set_task("0x6EA47128")
    sq_chainroom_wave2_support2.place()
    sleep(2)
    sq_chainroom_wave2_support3.set_task("0x6EA47128")
    sq_chainroom_wave2_support3.place()
    sleep(2)
    sq_chainroom_wave2_major1.set_task("0x06E8163B")
    sq_chainroom_wave2_major1.place()
    sleep_until(wave2_alive_count() == 0)
    sleep(1)
    seq_m_climax_s01.set_switch_mask(31)
    sq_chainroom_wave3_support1.set_task("0x28DB7ABD")
    sq_chainroom_wave3_support1.place()
    sq_chainroom_wave3_support2.set_task("0x28DB7ABD")
    sq_chainroom_wave3_support2.place()
    sq_chainroom_wave3_support3.set_task("0x28DB7ABD")
    sq_chainroom_wave3_support3.place()
    sleep(3)
    sq_chainroom_wave3_melee1.set_task("0x104C355F")
    sq_chainroom_wave3_melee1.place()
    sq_chainroom_wave3_melee2.set_task("0x104C355F")
    sq_chainroom_wave3_melee2.place()
    sleep(2)
    sq_chainroom_wave3_melee3.set_task("0x104C355F")
    sq_chainroom_wave3_melee3.place()
    sleep(3)
    sq_chainroom_wave3_major1.set_task("0x42BC5A30")
    sq_chainroom_wave3_major1.place()
    # The third Swordbearer is down (the rest of his wave fell before him):
    # the sword shatters.
    sleep_until(not sq_chainroom_wave3_major1__major_knight_cleaver.is_alive())
    sleep(1)
    pf_sword_relic.of_relic.add(pf_sword_relic.o_sword)
    pf_sword_relic.ho_shatter_artifact.set_filter(pf_sword_relic.of_relic)
    sleep(2)
    pf_sword_relic.o_sword.delete_object()

# The room the players clear in mission 4, the Wizard included.
def chainroom_alive_count():
    return sq_overlook_anchor1.alive_count() + sq_overlook_support1.alive_count() + sq_overlook_support3.alive_count() + sq_chainroom_anchor1.alive_count() + sq_chainroom_melee1.alive_count() + sq_chainroom_melee2.alive_count() + sq_chainroom_support1.alive_count() + sq_chainroom_support2.alive_count() + sq_chainroom_support3.alive_count() + sq_chainroom_support4.alive_count()

def wave0_a_alive_count():
    return sq_chainroom_wave0_melee1.alive_count() + sq_chainroom_wave0_melee2.alive_count() + sq_chainroom_wave0_melee3.alive_count()

def wave0_b_alive_count():
    return sq_chainroom_wave0_support1.alive_count() + sq_chainroom_wave0_support2.alive_count()

def wave0_c_alive_count():
    return sq_chainroom_wave0_melee4.alive_count() + sq_chainroom_wave0_melee5.alive_count() + sq_chainroom_wave0_support3.alive_count() + sq_chainroom_wave0_support4.alive_count()

def wave1_alive_count():
    return sq_chainroom_wave1_melee1.alive_count() + sq_chainroom_wave1_melee2.alive_count() + sq_chainroom_wave1_melee3.alive_count() + sq_chainroom_wave1_major1.alive_count()

def wave2_alive_count():
    return sq_chainroom_wave2_support1.alive_count() + sq_chainroom_wave2_support2.alive_count() + sq_chainroom_wave2_support3.alive_count() + sq_chainroom_wave2_major1.alive_count()
