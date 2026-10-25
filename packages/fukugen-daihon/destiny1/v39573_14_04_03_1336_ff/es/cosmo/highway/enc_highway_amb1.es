# es\cosmo\highway\enc_highway_amb1.es
#
# The highway's ambient bundle holds the opening mission's dressing:
# the second player's ship and the skiff that leaves past it, their
# sequences and its exit path. Nothing of it runs in the patrol: no
# capture ever sent the bundle (act_cosmo_m0_highway runs its own
# enc_highway_m0).

@activity_bundle("enc_highway_amb1")

object o_player2_ship  # WARNING: unused - the opening mission's dressing; no capture sent this bundle
squad sq_fotc_dropship_1  # WARNING: unused - the opening mission's dressing; no capture sent this bundle
squad_member sq_fotc_dropship_1__pilot  # WARNING: unused - the opening mission's dressing; no capture sent this bundle
sequence seq_highway_time_machine  # WARNING: unused - the opening mission's dressing; no capture sent this bundle
sequence e3_player_radar_player2  # WARNING: unused - the opening mission's dressing; no capture sent this bundle
control_point_set cp_dropship_exit_1  # WARNING: unused - the opening mission's dressing; no capture sent this bundle
