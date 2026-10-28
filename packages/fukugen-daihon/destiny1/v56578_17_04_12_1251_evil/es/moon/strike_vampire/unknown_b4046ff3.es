# es\moon\strike_vampire\unknown_b4046ff3.es
#
# strike_vampire's throne room (bundle B4046FF3, file name unknown; bubble
# 8, the activity's own). The baron's guards stand from the bubble's start;
# the rest come in through the teleporter, its light flaring for each:
#
# - Once the first guards are down to two squads, the left sword vandal,
#   five seconds later the right one; each draws its sword ten seconds after
#   it lands, and each one's death brings a dreg major on the other side.
# - Once a dreg major is down, the three snipers, two seconds apart.
# - Once the snipers are down, the baron, with his taunt and the cue's third
#   section two seconds later. He fights through his stages, then turns
#   invincible and flees through the teleporter: the baron who stays behind
#   to talk is placed, the Ghost speaks and the cue moves on.
#
# One retail 2.3.1 run, with a wipe before the dreg majors (the encounter
# starts over with the phase): every wait is that run's, unconfirmed. He
# flees as his health (in 28ths, as his client reports it) falls to 21; his
# moves before that are on the run's clock from his arrival. Never placed in
# that run: the ship squads.

@activity_bundle(0xB4046FF3)

object o_teleporter_destination
object o_teleporter_destination_1
object o_teleporter_destination_2
object o_teleporter_phantom
object o_teleporter_gravlift
object o_teleporter_illum
objective obj_moonthrone_portal1
objective obj_moonthrone_ketch
@objective(obj_moonthrone_portal1)
squad sq_boss
squad_member sq_boss__boss
@objective(obj_moonthrone_portal1)
squad sq_captain
@objective(obj_moonthrone_portal1)
squad sq_vandals_right
@objective(obj_moonthrone_portal1)
squad sq_sniper_rock
@objective(obj_moonthrone_portal1)
squad sq_sniper_back_left
@objective(obj_moonthrone_portal1)
squad sq_sniper_back_right
@objective(obj_moonthrone_portal1)
squad sq_sniper_teleporter_left
@objective(obj_moonthrone_portal1)
squad sq_sniper_teleporter_right
@objective(obj_moonthrone_portal1)
squad sq_sniper_far_right
@objective(obj_moonthrone_portal1)
squad sq_vandal_sword_left
@objective(obj_moonthrone_portal1)
squad sq_vandal_sword_right
@objective(obj_moonthrone_portal1)
squad sq_dreg_major_left
@objective(obj_moonthrone_portal1)
squad sq_dreg_major_right
squad sq_boss_noncombat
squad_member sq_boss_noncombat__boss
sequence seq_boss_taunt
hop_on ho_invincibility
object_filter of_boss
performance boss_flee_performance
trigger_volume tv_start
player_trigger pt_start bind(tv_start)
trigger_volume tv_ketch
player_trigger pt_ketch bind(tv_ketch)
encounter_handle strike_vampire

bool b_dreg_major_in = false

@startup()
# the teleporter's light and the first guards, at their posts from the
# bubble's start, the baron's hop-on open
script sc_guards():
    o_teleporter_illum.create()
    ho_invincibility.clear_filter()
    place_squad(sq_captain, "captain")
    place_squad(sq_vandals_right, "0xF8EE8255")
    place_squad(sq_sniper_rock, "0x054D9A58")
    place_squad(sq_sniper_back_right, "0x3A807F8D")
    place_squad(sq_sniper_teleporter_right, "0x3EE0AC24")

@startup()
script sc_swords():
    sleep(2)
    sleep_until(standing([sq_captain, sq_vandals_right, sq_sniper_rock, sq_sniper_back_right, sq_sniper_teleporter_right]) <= 2)
    sleep(1)
    teleport_in(sq_vandal_sword_left, "0x9C2B7A63")
    sc_sword_left.wake()
    sleep(5)
    teleport_in(sq_vandal_sword_right, "0x47EA739E")
    sc_sword_right.wake()

script sc_sword_left():
    sleep(10)
    sq_vandal_sword_left.set_task("melee")
    sleep_until_down(sq_vandal_sword_left)
    sleep(1)
    teleport_in(sq_dreg_major_right, "0xBF88ABAE")
    b_dreg_major_in = true

script sc_sword_right():
    sleep(10)
    sq_vandal_sword_right.set_task("melee")
    sleep_until_down(sq_vandal_sword_right)
    sleep(1)
    teleport_in(sq_dreg_major_left, "0x73888033")
    b_dreg_major_in = true

@startup()
script sc_snipers():
    sleep_until(b_dreg_major_in)
    sleep(2)
    sleep_until(sq_dreg_major_left.alive_count() == 0 or sq_dreg_major_right.alive_count() == 0)
    teleport_in(sq_sniper_back_left, "0xF9B0906E")
    sleep(2)
    teleport_in(sq_sniper_far_right, "0xB2216C59")
    sleep(2)
    teleport_in(sq_sniper_teleporter_left, "0x01D28F31")
    sleep(2)
    sleep_until(standing([sq_sniper_back_left, sq_sniper_far_right, sq_sniper_teleporter_left]) == 0)
    sc_boss.wake()

# Down to three quarters he turns invincible and heads for the teleporter,
# and eight seconds later he is through it.
script sc_boss():
    o_teleporter_illum.set_device_position(0.1)
    sq_boss.place()
    sleep(1)
    o_teleporter_illum.set_device_position(0)
    sleep(1)
    seq_boss_taunt.start()
    strike_vampire.cue(7)
    sc_boss_moves.wake()
    sleep_until(sq_boss__boss.get_health_fraction() <= 0.76)
    sc_boss_moves.kill()
    ho_invincibility.set_filter(of_boss)
    sq_boss.set_task("teleporter")
    sleep(8)
    for o in [o_teleporter_destination, o_teleporter_destination_1, o_teleporter_destination_2, o_teleporter_phantom, o_teleporter_gravlift]:
        o.create()
    o_teleporter_illum.set_device_position(0.2)
    sq_boss_noncombat.place()
    boss_flee_performance.start_performance("0xD5B8056C")
    strike_vampire.mns02_100_60.start()
    strike_vampire.cue(15)

# his moves at 4, 14, 25, 35, 47 and 57 seconds from his arrival
script sc_boss_moves():
    sleep(2)
    sq_boss.set_task("0x6D94D598")
    sleep(10)
    sq_boss.set_task("0x2D5AE861")
    sleep(11)
    sq_boss.set_task("0x6D94D598")
    sleep(10)
    sq_boss.set_task("0x2D5AE861")
    sleep(12)
    sq_boss.set_task("0x3FDEE0D4")
    sleep(10)
    sq_boss.set_task("0x2D5AE861")

def place_squad(sq, task):
    sq.place()
    sq.set_task(task)

# the teleporter's light flares for a second as a squad comes through
def teleport_in(sq, task):
    o_teleporter_illum.set_device_position(0.1)
    place_squad(sq, task)
    sleep(1)
    o_teleporter_illum.set_device_position(0)

# Two seconds for the client to report a squad just placed, then until it is
# down.
def sleep_until_down(sq):
    sleep(2)
    sleep_until(sq.alive_count() == 0)

def standing(squads):
    n = 0
    for sq in squads:
        if sq.alive_count() > 0:
            n = n + 1
    return n
