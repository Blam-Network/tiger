# es\venus\north_tides\enc_north_tides_m07.es
#
# Eye of a Gatelord's northern tides. The transition and bottom-hill squads
# and the snipers stand from the start; the mid and top hill come on as the
# player reaches the stairs, each wave out of a Vex cloud that lingers seven
# seconds. The big warpgate holds the Gatelord: mission 4 wakes sc_gatelord
# once the altar is charged. The Gatelord is invincible through its arrival
# (the hop-on's filter), then its adds come out of clouds beside it; when it
# dies the warpgate dies with it and the clouds go. From one retail capture:
# the arrival and add timings are that run's, and the later add waves
# (goblins04, the sniper squads, the harpies) never came. Most task names
# are uncracked (hashes).

@activity_bundle("enc_north_tides_m07")

objective obj_north_tides_m07
squad sq_boss
squad_member sq_boss__ultra_minotaur
@member_counts({goblins: 2})
squad sq_boss_goblins01
@member_counts({goblins: 2})
squad sq_boss_goblins02
@member_counts({goblins: 2})
squad sq_boss_goblins03
@member_counts({hobgoblin: 1})
squad sq_boss_hobgoblin_left
@member_counts({hobgoblin: 1})
squad sq_boss_hobgoblin_right01
@member_counts({hobgoblin: 1})
squad sq_boss_hobgoblin_right02
squad sq_cloud_left_hobgoblin
squad sq_cloud_right_hobgoblin01
squad sq_cloud_right_hobgoblin02
squad sq_cloud_adds
squad sq_cloud_mid_hill
squad sq_cloud_top_hill
@member_counts({goblins: 4})
squad sq_transition_front
@member_counts({goblins: 3, hobgoblins: 2})
squad sq_transition_back
@member_counts({goblins: 3, hobgoblins: 2})
squad sq_btm_hill
@member_counts({goblins: 4})
squad sq_mid_hill01
@member_counts({goblins: 4})
squad sq_mid_hill02
@member_counts({hobgoblins: 2})
squad sq_mid_hill_snipers
@member_counts({goblins: 4})
squad sq_top_hill01
@member_counts({goblins: 4})
squad sq_top_hill02
@member_counts({0x1F507240: 1, 0x1F507243: 1, 0xD2F2F789: 1, 0xD2F2F78A: 1, 0xD2F2F78B: 1})
squad sq_top_hill_snipers
hop_on ho_invincible
object_filter of_boss
object_filter of_clear
# the big warpgate's rows live under the vex_mega_warpgate encounter
squad sq_vex_warpgate_large
squad_member sq_vex_warpgate_large__gate
object warpgate_large_animated
trigger_volume tv_transition
player_trigger pt_transition bind(tv_transition)
trigger_volume tv_btm_stairs
player_trigger pt_btm_stairs bind(tv_btm_stairs)
trigger_volume tv_mid_stairs
player_trigger pt_mid_stairs bind(tv_mid_stairs)
trigger_volume tv_top_hill
player_trigger pt_top_hill bind(tv_top_hill)

@startup()
script ss_north_tides_m07():
    for sq in [sq_boss, sq_cloud_left_hobgoblin, sq_cloud_right_hobgoblin01, sq_cloud_right_hobgoblin02, sq_cloud_adds, sq_cloud_mid_hill, sq_cloud_top_hill, sq_boss_goblins01, sq_boss_goblins02, sq_boss_goblins03, sq_boss_hobgoblin_left, sq_boss_hobgoblin_right01, sq_boss_hobgoblin_right02, sq_transition_front, sq_transition_back, sq_btm_hill, sq_mid_hill01, sq_mid_hill02, sq_mid_hill_snipers, sq_top_hill01, sq_top_hill02, sq_top_hill_snipers]:
        sq.set_objective(obj_north_tides_m07)
    of_boss.add(sq_boss__ultra_minotaur)
    ho_invincible.set_filter(of_boss)
    sq_vex_warpgate_large.place()
    warpgate_large_animated.create()
    warpgate_large_animated.set_device_position(0)
    place_on_task(sq_transition_front, "0xEE54CB7F")
    place_on_task(sq_transition_back, "0xEE54CB7C")
    place_on_task(sq_btm_hill, "0x6F36B7F0")
    place_on_task(sq_mid_hill_snipers, "0xBCB44F96")
    place_on_task(sq_top_hill_snipers, "0x4A80488D")

@startup()
script sc_transition():
    sleep_until(pt_transition.is_triggered())
    sq_transition_front.set_task("0x2B6F7E13")

@startup()
script sc_mid_hill():
    sleep_until(pt_btm_stairs.is_triggered())
    place_on_task(sq_mid_hill01, "0x8B7E8CA0")
    place_on_task(sq_mid_hill02, "0x7665576E")
    vex_cloud(sq_cloud_mid_hill)

@startup()
# the top hill; what is left of it falls back to the mid hill once it is
# down to one
script sc_top_hill():
    sleep_until(pt_mid_stairs.is_triggered())
    place_on_task(sq_top_hill01, "0xA048BB8A")
    place_on_task(sq_top_hill02, "0xA048BB8A")
    vex_cloud(sq_cloud_top_hill)
    sleep_until(sq_top_hill01.alive_count() + sq_top_hill02.alive_count() <= 1)
    sq_top_hill01.set_task("mid_hill")
    sq_top_hill02.set_task("mid_hill")

# the Gatelord, woken by mission 4
script sc_gatelord():
    sq_boss.set_task("0xADF8425E")
    sq_vex_warpgate_large__gate.drop_squad(sq_boss)
    sleep(10)
    ho_invincible.set_filter(of_clear)
    sleep(4)
    for sq in [sq_boss_goblins01, sq_boss_goblins02, sq_boss_goblins03]:
        place_on_task(sq, "0x2E3AB9C8")
    sq_cloud_adds.place()
    sleep(1)
    place_on_task(sq_boss_hobgoblin_left, "0xF4E785B1")
    place_on_task(sq_boss_hobgoblin_right01, "0x15766666")
    place_on_task(sq_boss_hobgoblin_right02, "0xB342D187")
    for cloud in [sq_cloud_left_hobgoblin, sq_cloud_right_hobgoblin01, sq_cloud_right_hobgoblin02]:
        cloud.place()
    sleep_until(not sq_boss__ultra_minotaur.is_bound())
    sleep(2)
    warpgate_large_animated.set_device_position(1)
    for cloud in [sq_cloud_adds, sq_cloud_left_hobgoblin, sq_cloud_right_hobgoblin01, sq_cloud_right_hobgoblin02]:
        cloud.remove()

def place_on_task(sq, task):
    sq.set_task(task)
    sq.place()

# a Vex spawn cloud: it hangs for seven seconds, unless the fight has
# already taken it
def vex_cloud(cloud):
    cloud.place()
    sleep(7)
    if cloud.alive_count() > 0:
        cloud.remove()
