# es\moon\strike_vampire\unknown_9f24395b.es
#
# strike_vampire's bay (bundle 9F24395B, file name unknown; bubble 7, the
# activity's own), where the last six phases play. Every squad stands
# against its fight's objective from the bubble's start. Four fights, each
# woken by its mission:
#
# - The eye (mission 3, sc_eye): the baron waits at the eye. The first squads
#   go in as the player crosses pt_eye_start; the baron moves as the player
#   comes and goes at the final teleport, taunts and calls the second sword
#   vandal. A minute on he calls the shanks and the dagger dregs, and 39
#   seconds later he turns invincible and leaves, the exit dregs behind him.
# - The tank (missions 4 and 5, sc_tank and sc_tank_fight): the spider tank
#   comes off the Ketch under its shield with the left flank. Once the left
#   flank is down the right flank goes in and the shield drops, and the
#   tank's stages bring the suicide shanks, the balcony snipers and the rest.
#   Once the tank is dead the exit squads go in.
# - The chase (mission 6, sc_chase): the baron's tank, his taunt and the
#   chase squads; once the chase vandals are down he heads for the depot.
# - The last stand (mission 7, sc_boss): the baron in the depot, the right
#   side's waves and then the left side's.
#
# One retail 2.3.1 run, wiped at the eye and at the tank (each fight starts
# over with its phase): every wait is that run's, unconfirmed. The tank's
# stages and the baron's at the chase and the depot follow their health, in
# 28ths as their clients report it; the baron's moves at the eye and between
# his health stages are on the run's clock. Never placed in that run:
# sq_tank_drop, sq_maj_captain_left_flank, sq_front_left_vandals,
# sq_panic_vandal_front, sq_chase_shanks, sq_eye_shank_bait,
# sq_boss_left_sniper[6].

@activity_bundle(0x9F24395B)

object o_ketch_attach
object o_side_door
object o_bubble_shield
objective obj_moonbay_tank
objective obj_moonbay_boss
objective obj_moonbay_chase
objective obj_moonbay_eye
@objective(obj_moonbay_tank)
squad sq_tank
squad_member sq_tank__pilot
@objective(obj_moonbay_tank)
squad sq_front_left_dreg
@objective(obj_moonbay_tank)
squad sq_captain_left_flank
@objective(obj_moonbay_tank)
squad sq_mid_left_dreg
@objective(obj_moonbay_tank)
squad sq_far_left_vandals
@objective(obj_moonbay_tank)
squad sq_front_right_vandals
@objective(obj_moonbay_tank)
squad sq_far_right_dregs
@objective(obj_moonbay_tank)
squad sq_mid_right_vandals
@objective(obj_moonbay_tank)
squad sq_front_right_captain
@objective(obj_moonbay_tank)
squad sq_mid_right_captain
@objective(obj_moonbay_tank)
squad sq_far_suicide_shanks
@objective(obj_moonbay_tank)
squad sq_near_suicide_shanks
@objective(obj_moonbay_tank)
squad sq_far_balcony_sniper_left
@objective(obj_moonbay_tank)
squad sq_far_balcony_sniper_center
@objective(obj_moonbay_tank)
squad sq_far_balcony_sniper_right
@objective(obj_moonbay_tank)
squad sq_near_balcony_snipers
@objective(obj_moonbay_tank)
squad sq_left_flank_vandals
@objective(obj_moonbay_tank)
squad sq_front_left_captain
@objective(obj_moonbay_tank)
squad sq_panic_vandal_back
@objective(obj_moonbay_tank)
squad sq_exit_dregs
@objective(obj_moonbay_tank)
squad sq_exit_shanks
@objective(obj_moonbay_chase)
squad sq_boss_tank
squad_member sq_boss_tank__boss
@objective(obj_moonbay_chase)
squad sq_chase_dregs
@objective(obj_moonbay_chase)
squad sq_chase_vandals
@objective(obj_moonbay_boss)
squad sq_boss_final
squad_member sq_boss_final__boss
@objective(obj_moonbay_boss)
static_array<squad, 2> sq_boss_right_vandal
@objective(obj_moonbay_boss)
static_array<squad, 5> sq_boss_right_shank
@objective(obj_moonbay_boss)
static_array<squad, 2> sq_boss_right_capt
@objective(obj_moonbay_boss)
static_array<squad, 4> sq_boss_left_dreg
@objective(obj_moonbay_boss)
static_array<squad, 7> sq_boss_left_sniper
@objective(obj_moonbay_boss)
static_array<squad, 2> sq_boss_left_maj_shank
@objective(obj_moonbay_boss)
squad sq_boss_left_capt
@objective(obj_moonbay_boss)
static_array<squad, 4> sq_end_dregs
@objective(obj_moonbay_eye)
static_array<squad, 2> sq_eye_sword_vandal
@objective(obj_moonbay_eye)
squad sq_eye_capt_bouncer
@objective(obj_moonbay_eye)
squad sq_eye_snipers
@objective(obj_moonbay_eye)
squad sq_eye_shock_vandals
@objective(obj_moonbay_eye)
squad sq_eye_shanks
@objective(obj_moonbay_eye)
squad sq_eye_dagger_dregs
@objective(obj_moonbay_eye)
static_array<squad, 3> sq_eye_exit_dregs
@objective(obj_moonbay_eye)
squad sq_eye_boss
squad_member sq_eye_boss__boss
sequence seq_boss_taunt
hop_on ho_invulnerable
hop_on ho_boss_damage_spider_tank
hop_on ho_boss_damage_final
hop_on ho_boss_damage_chase
hop_on ho_invincibility
object_filter of_spider_tank_invulnerable
object_filter of_boss_tank
object_filter of_boss_final
object_filter of_boss_eye
trigger_volume hall_trigger_volume
player_trigger hall_player_trigger bind(hall_trigger_volume)
trigger_volume overlook_trigger_volume
player_trigger overlook_player_trigger bind(overlook_trigger_volume)
trigger_volume tv_eye_start
player_trigger pt_eye_start bind(tv_eye_start)
trigger_volume tv_eye_final_teleport
player_monitor pm_eye_final_teleport bind(tv_eye_final_teleport)
trigger_volume tv_boss_trigger
player_trigger pt_boss_trigger bind(tv_boss_trigger)
encounter_handle strike_vampire

bool b_eye_boss_fled = false
bool b_tank_in = false
bool b_left_flank_down = false
bool b_tank_dead = false
bool b_chase_done = false
bool b_boss_dead = false

@startup()
# the side door stands from the bubble's start, and every hop-on but the
# spider tank's damage one is open
script sc_bay():
    o_side_door.create()
    for ho in [ho_invulnerable, ho_boss_damage_chase, ho_boss_damage_final, ho_invincibility]:
        ho.clear_filter()

# Mission 3: the baron at the eye, under the spider tank's damage hop-on
# (his stand-in there, as later at the depot).
script sc_eye():
    ho_boss_damage_spider_tank.set_filter(of_boss_tank)
    place_squad(sq_eye_boss, "0x5681D7FD")
    sc_eye_squads.wake()
    sleep_until(pm_eye_final_teleport.test_any_inside())
    sleep(2)
    sq_eye_boss.set_task("0x5AF39931")
    sleep_until(not pm_eye_final_teleport.test_any_inside())
    sq_eye_boss.set_task("0x41511913")
    seq_boss_taunt.start()
    sleep(4)
    place_squad(sq_eye_sword_vandal[1], "0xEC79B383")
    sleep(56)
    sq_eye_boss.set_task("0x5AF39931")
    place_squad(sq_eye_shanks, "0xEC79B383")
    place_squad(sq_eye_dagger_dregs, "0xEC79B383")
    sleep(8)
    sq_eye_capt_bouncer.set_task("0x9A6949FC")
    sleep(31)
    ho_invincibility.set_filter(of_boss_eye)
    strike_vampire.cue(112)
    sleep(2)
    sq_eye_boss.set_task("0xBEBECABB")
    b_eye_boss_fled = true
    sleep(2)
    place_squad(sq_eye_exit_dregs[2], "0xEC79B383")
    sleep(2)
    place_squad(sq_eye_exit_dregs[0], "0xEC79B383")
    place_squad(sq_eye_exit_dregs[1], "0xEC79B383")

# the first of the eye's squads, a second after the player crosses its start
script sc_eye_squads():
    sleep_until(pt_eye_start.is_triggered())
    sleep(1)
    place_squad(sq_eye_sword_vandal[0], "0xEC79B383")
    place_squad(sq_eye_capt_bouncer, "0x3798DDE2")
    place_squad(sq_eye_snipers, "snipers")
    place_squad(sq_eye_shock_vandals, "0xC3774B55")

# Mission 4: the spider tank comes off the Ketch under its shield, with the
# left flank.
script sc_tank():
    tank_in()
    place_squad(sq_front_left_dreg, "0x126F70CB")
    place_squad(sq_captain_left_flank, "0xD79D48EE")
    place_squad(sq_mid_left_dreg, "0xE716488C")
    place_squad(sq_far_left_vandals, "0xADA5AA20")
    sleep(2)
    sleep_until(sq_captain_left_flank.alive_count() == 0 and sq_mid_left_dreg.alive_count() == 0 and sq_far_left_vandals.alive_count() == 0)
    b_left_flank_down = true

def tank_in():
    b_tank_in = true
    of_spider_tank_invulnerable.add(sq_tank)
    ho_invulnerable.set_filter(of_spider_tank_invulnerable)
    place_squad(sq_tank, "tank")
    o_ketch_attach.create()
    o_bubble_shield.create()

# Mission 5: the right flank goes in and the shield drops. After a wipe at
# the tank, the tank comes off the Ketch again with them (the left flank
# does not), and its shield holds four seconds.
script sc_tank_right():
    retry = not b_tank_in
    if retry:
        tank_in()
    place_squad(sq_front_right_vandals, "0xB504092D")
    place_squad(sq_far_right_dregs, "0x37080ABB")
    place_squad(sq_mid_right_vandals, "0x454B9FFE")
    place_squad(sq_front_right_captain, "0xDD5EE39C")
    place_squad(sq_mid_right_captain, "0xC6D2C217")
    if retry:
        sleep(4)
    ho_invulnerable.clear_filter()
    o_bubble_shield.delete_object()

# Mission 5, from the objective: the Ketch lets the tank go five seconds on.
# Its stages after that follow its health (both tries): the suicide shanks at
# 25, the balcony snipers at 13 (the second try's, all three at once), the
# left vandals and their captain at 11; then on the clock, the near snipers
# 156 seconds after the captain and the panic vandals 22 after them. From
# the captain on, the left flank's next squads go in as the balcony snipers
# above them die (on the first try the left sniper died before and none
# came). Five seconds
# after the tank dies the exit squads go in.
script sc_tank_fight():
    sleep(5)
    o_ketch_attach.delete_object()
    sc_tank_dead.wake()
    sleep_until(sq_tank__pilot.get_health_fraction() <= 0.9)
    place_squad(sq_far_suicide_shanks, "panic")
    sleep(3)
    place_squad(sq_near_suicide_shanks, "panic")
    sleep_until(sq_tank__pilot.get_health_fraction() <= 0.47)
    place_squad(sq_far_balcony_sniper_left, "0xCFAE654B")
    place_squad(sq_far_balcony_sniper_center, "0x00D43293")
    place_squad(sq_far_balcony_sniper_right, "0x04743646")
    sleep_until(sq_tank__pilot.get_health_fraction() <= 0.4)
    sq_far_left_vandals.set_task("0xADA5AA20")
    sleep(3)
    sq_captain_left_flank.set_task("0xD79D48EE")
    sc_tank_balcony.wake()
    sleep(156)
    place_squad(sq_near_balcony_snipers, "0x29AA3B13")
    sleep(22)
    place_squad(sq_panic_vandal_back, "panic")

script sc_tank_balcony():
    sleep_until_down(sq_far_balcony_sniper_left)
    sleep(1)
    place_squad(sq_left_flank_vandals, "0x232494F1")
    sleep_until_down(sq_far_balcony_sniper_right)
    sleep(1)
    place_squad(sq_front_left_captain, "0xBCDECAE3")

script sc_tank_dead():
    sleep_until_down(sq_tank)
    sleep(5)
    place_squad(sq_exit_dregs, "exit")
    place_squad(sq_exit_shanks, "exit")
    b_tank_dead = true

# Mission 6: the baron's tank at the depot. Three seconds on he taunts and
# the chase dregs go in; down to 15 he moves, and two seconds later the chase
# vandals come; once they are down he heads into the depot.
script sc_chase():
    ho_boss_damage_chase.set_filter(of_boss_tank)
    ho_boss_damage_final.set_filter(of_boss_final)
    place_squad(sq_boss_tank, "0x5681D7FD")
    sleep(3)
    seq_boss_taunt.start()
    sq_boss_tank.set_task("0x41511913")
    place_squad(sq_chase_dregs, "chase")
    sleep_until(sq_boss_tank__boss.get_health_fraction() <= 0.54)
    sleep(3)
    sq_boss_tank.set_task("0x5AF39931")
    sleep(2)
    sq_boss_tank.set_task("0xD8EE3E89")
    place_squad(sq_chase_vandals, "chase")
    sleep(4)
    ho_invincibility.set_filter(of_boss_tank)
    sleep_until_down(sq_chase_vandals)
    sq_boss_tank.set_task("0x5681D7FD")
    b_chase_done = true

# Mission 7: the baron's last stand. He takes the centre 17 seconds after he
# comes. Down to 7 the right side's waves come, a vandal pair five seconds
# apart, then a shank every eight seconds, then the two captains with the
# vandals falling back; 26 seconds on he moves again. Down to 3, the cue's
# last section and the left side's waves, a dreg and a sniper pair and then
# one of each on a clock. Once he is dead the end dregs come to his place.
script sc_boss():
    ho_boss_damage_spider_tank.set_filter(of_boss_final)
    sq_boss_final.place()
    sc_boss_dead.wake()
    sleep(4)
    sq_boss_final.set_task("0x4B90DACB")
    strike_vampire.cue(1920)
    sleep(13)
    sq_boss_final.set_task("center")
    sleep_until(sq_boss_final__boss.get_health_fraction() <= 0.26)
    sleep(1)
    place_squad(sq_boss_right_vandal[0], "right")
    sleep(5)
    place_squad(sq_boss_right_vandal[1], "right")
    sleep(5)
    for i in range(5):
        place_squad(sq_boss_right_shank[i], "0x74BDFEEB")
        sleep(8)
    place_squad(sq_boss_right_capt[0], "0x74BDFEEB")
    place_squad(sq_boss_right_capt[1], "0x74BDFEEB")
    sq_boss_right_vandal[0].set_task("left")
    sq_boss_right_vandal[1].set_task("left")
    sleep(26)
    sq_boss_final.set_task("0x4B90DACB")
    sleep(2)
    sq_boss_final.set_task("boss")
    sleep_until(sq_boss_final__boss.get_health_fraction() <= 0.11)
    strike_vampire.cue(3968)
    sleep(2)
    place_squad(sq_boss_left_dreg[0], "0x74BDFEEB")
    place_squad(sq_boss_left_sniper[0], "0x378AFF5C")
    place_squad(sq_boss_left_sniper[1], "0x378AFF5C")
    place_squad(sq_boss_left_capt, "boss")
    sleep(5)
    place_squad(sq_boss_left_dreg[1], "0x74BDFEEB")
    place_squad(sq_boss_left_sniper[2], "0x378AFF5C")
    sleep(8)
    place_squad(sq_boss_left_dreg[2], "0x74BDFEEB")
    place_squad(sq_boss_left_sniper[3], "0x378AFF5C")
    sleep(10)
    place_squad(sq_boss_left_dreg[3], "0x74BDFEEB")
    place_squad(sq_boss_left_sniper[4], "0x378AFF5C")
    sleep(5)
    place_squad(sq_boss_left_sniper[5], "0x378AFF5C")
    sleep(11)
    place_squad(sq_boss_left_maj_shank[0], "0x74BDFEEB")
    place_squad(sq_boss_left_maj_shank[1], "0x74BDFEEB")

# his death: the cue stops, his captain falls back and the end dregs come
# in, one every three seconds
script sc_boss_dead():
    sleep_until_down(sq_boss_final)
    b_boss_dead = true
    strike_vampire.cue_stop()
    sleep(1)
    sq_boss_left_capt.set_task("0x4B90DACB")
    for i in range(4):
        place_squad(sq_end_dregs[i], "snipers")
        sleep(3)

def place_squad(sq, task):
    sq.place()
    sq.set_task(task)

# Two seconds for the client to report a squad just placed, then until it is
# down.
def sleep_until_down(sq):
    sleep(2)
    sleep_until(sq.alive_count() == 0)
