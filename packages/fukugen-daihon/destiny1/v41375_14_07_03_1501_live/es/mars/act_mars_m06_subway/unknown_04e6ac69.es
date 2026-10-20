# es\mars\act_mars_m06_subway\unknown_04e6ac69.es
#
# Music and Ghost lines for A Rising Tide. True name unknown. The intro and
# the travel music start with the player; each Ghost line plays off a step
# the script can see (a bubble, a trigger, a squad, the scans), and the
# climax music steps its switch as the warp gates fall. From one retail
# capture: every wait is that run's. The trigger volumes and locations are
# declared for their rows; nothing on the wire moved them.

@activity_bundle(0x04E6AC69)

sequence seq_m_intro_s01
sequence seq_m_climax_s01
sequence seq_m_ascent_s01
sequence seq_d_plains_lz_s01
sequence seq_plains_to_bg_s01
sequence seq_d_bg_travel_s01
sequence seq_d_bg_obj_s01
sequence seq_d_bg_to_transit_s01
sequence seq_d_lobby_dark_s01
sequence seq_d_lobby_to_subway_s01
sequence seq_d_subway_gate_s01
sequence seq_d_subway_clear_s01
sequence seq_d_subway_clear_s02
sequence seq_d_subway_obj_s01
trigger_volume tv_plains_to_bg
trigger_volume tv_bg_obj_near
trigger_volume tv_bg_to_ruin_or_downtown
trigger_volume tv_lobby_to_subway
trigger_volume tv_subway_warpgate_area_all
trigger_volume tv_subway_warpgate_area_end
location downtown
location bg_ruin
location lobby
location subway
# bound to the two scan objects, so only their own interaction counts
incident_listener il_scan_battleground bind("0x1A58BFCD")
incident_listener il_scan_subway bind("0xB0327A81")

# the mission's and the encounters' rows the lines play off
location battleground
trigger_bubble_objective pf_objective_battleground_goto bind(battleground)
trigger_bubble_objective pf_objective_lobby_goto bind(lobby)
trigger_volume_objective pf_objective_lobby_n_trigger
player_trigger pt_n_plat_spawn
player_trigger pt_warpgate1
player_trigger pt_warpgate3and4and5
encounter_handle enc_subway_m06
squad sq_warpgate3_support1
squad sq_warpgate3_support2
squad sq_warpgate4_major_anchor1
squad sq_warpgate4_support1
squad sq_warpgate5_support1
squad sq_warpgate5_support2

@startup()
script sc_audio_main():
    sleep_until(c_player_script_utilities.all_players_are_ready())
    seq_m_intro_s01.start()
    seq_plains_to_bg_s01.start()
    sleep(3)
    seq_d_plains_lz_s01.start()

@startup()
script sc_battleground():
    sleep_until(pf_objective_battleground_goto._player_trigger.is_triggered())
    sleep(1)
    seq_plains_to_bg_s01.stop()
    sleep(2)
    seq_d_bg_travel_s01.start()
    sleep_until(il_scan_battleground.get_count() > 0)
    seq_d_bg_travel_s01.stop()
    sleep(1)
    seq_d_bg_obj_s01.start()

@startup()
script sc_lobby():
    sleep_until(pf_objective_lobby_goto._player_trigger.is_triggered())
    sleep(3)
    seq_d_lobby_dark_s01.start()
    sleep_until(pt_n_plat_spawn.is_triggered())
    seq_d_lobby_dark_s01.stop()
    sleep_until(pf_objective_lobby_n_trigger._player_trigger.is_triggered())
    sleep(3)
    seq_d_bg_to_transit_s01.start()
    seq_d_lobby_to_subway_s01.start()
    sleep_until(pt_warpgate1.is_triggered())
    sleep(2)
    seq_d_bg_to_transit_s01.stop()
    seq_d_lobby_to_subway_s01.stop()

@startup()
# the climax music hits when the gates stand and steps up as they fall
script sc_subway_music():
    sleep_until(gates_alive_count() > 0)
    seq_m_climax_s01.start()
    seq_m_climax_s01.set_switch_mask(1)
    sleep_until(pt_warpgate1.is_triggered())
    sleep(4)
    seq_m_climax_s01.set_switch_mask(3)
    sleep_until(pt_warpgate3and4and5.is_triggered())
    sleep(1)
    seq_m_climax_s01.set_switch_mask(7)
    sleep_until(gates_alive_count() == 0)
    sleep(1)
    seq_m_climax_s01.stop()
    seq_m_climax_s01.set_switch_mask(15)

@startup()
script sc_subway_lines():
    sleep_until(gates_alive_count() > 0)
    sleep_until(gates_alive_count() <= 3)
    sleep(7)
    seq_d_subway_gate_s01.start()
    sleep_until(gates_alive_count() == 0)
    sleep_until(maint_alive_count() > 0)
    sleep_until(maint_alive_count() == 0)
    sleep(5)
    seq_d_subway_clear_s01.start()
    sleep(6)
    seq_d_subway_clear_s02.start()
    sleep_until(il_scan_subway.get_count() > 0)
    seq_m_ascent_s01.start()
    seq_d_subway_obj_s01.start()

def gates_alive_count():
    enc = enc_subway_m06
    return enc.pf_warp_gate1._squad.alive_count() + enc.pf_warp_gate2._squad.alive_count() + enc.pf_warp_gate3._squad.alive_count() + enc.pf_warp_gate4._squad.alive_count() + enc.pf_warp_gate5._squad.alive_count()

def maint_alive_count():
    return sq_warpgate3_support1.alive_count() + sq_warpgate3_support2.alive_count() + sq_warpgate4_major_anchor1.alive_count() + sq_warpgate4_support1.alive_count() + sq_warpgate5_support1.alive_count() + sq_warpgate5_support2.alive_count()
