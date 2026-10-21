# es\venus\act_venus_m09_tower\unknown_190a6857.es
#
# The Terminus's music and Ghost lines (bundle 190A6857; file name unknown).
# The mission's one music cue starts once the players are in and the phases
# step it through its sections; the Ghost's briefing follows it. The other
# lines are their phases', started off the objectives: release ships their
# volumes without the triggers that would have played them, all but the one
# on the tower's ledge.

@activity_bundle(0x190A6857)

sequence venus_m09_intro_music
sequence md_vn09_010_10
sequence md_vn09_020_30
trigger_volume tv_vn09_010_40
trigger_volume tv_vn09_010_50
trigger_volume tv_vn09_010_60
trigger_volume tv_vn09_010_90
trigger_volume tv_vn09_020_10
trigger_volume tv_vn09_020_20
trigger_volume tv_vn09_020_30
player_trigger pt_vn09_020_30 bind(tv_vn09_020_30)

@startup()
script sc_intro():
    sleep_until(c_player_script_utilities.all_players_are_ready())
    venus_m09_intro_music.start()
    venus_m09_intro_music.set_switch_mask(1)
    sleep(3)
    md_vn09_010_10.start()

@startup()
# the ledge on the way up the tower
script sc_tower_ledge():
    sleep_until(pt_vn09_020_30.is_triggered())
    md_vn09_020_30.start()
