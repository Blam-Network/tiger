# es\cosmo\dome_c\enc_dome_c_amb1.es
#
# Dome C's ambient layer: Fallen in the dome, its halls, the lower
# floor and the corridor, all on obj_fallen_dome_c from the load. The
# objective's tasks never cracked, so the squads take whichever its
# tree gives them.
#
# No capture has the patrol in dome C (retail never sent this bundle;
# the basement door is the story missions'). The skiff
# (sq_ds_fallen_dome_c02) stays out: its points are action points, not
# the control point sets the other skiffs fly.
#
# A private bubble's world is built again each time a player comes in
# (retail's hangar: both squads back on their first tasks when the
# player came back 340 s after leaving), so these squads are placed
# once, at the load, with no respawn of their own.

@activity_bundle("enc_dome_c_amb1")

object o_basement_door01  # WARNING: unused - the story missions' door, no capture
objective obj_fallen_dome_c
squad sq_fallen_dome_c01
squad sq_fallen_dome_c02
squad sq_fallen_dome_c_hall01
squad sq_fallen_dome_c_hall02
squad sq_fallen_dome_c_lower01
squad sq_fallen_dome_c_lower02a
squad sq_fallen_dome_c_lower02b
squad sq_fallen_dome_c_corridor01
squad sq_ds_fallen_dome_c02  # WARNING: unused - the skiff and its point sets; no capture shows it fly
squad_member sq_ds_fallen_dome_c02__dropship  # WARNING: unused - the skiff and its point sets; no capture shows it fly
action_point ps_ds_fallen_dome_c02_enter  # WARNING: unused - the skiff and its point sets; no capture shows it fly
action_point ps_ds_fallen_dome_c02_exit  # WARNING: unused - the skiff and its point sets; no capture shows it fly
squad_group sqg_fallen_dome_c_hall
squad_group sqg_fallen_dome_c_lower

@startup()
script sc_dome_c():
    sqg_fallen_dome_c_hall.add_child(sq_fallen_dome_c_hall01)
    sqg_fallen_dome_c_hall.add_child(sq_fallen_dome_c_hall02)
    for sq in [sq_fallen_dome_c_lower01, sq_fallen_dome_c_lower02a, sq_fallen_dome_c_lower02b]:
        sqg_fallen_dome_c_lower.add_child(sq)
    for sq in [sq_fallen_dome_c01, sq_fallen_dome_c02, sq_fallen_dome_c_corridor01]:
        sq.set_objective(obj_fallen_dome_c)
        sq.place()
    for sg in [sqg_fallen_dome_c_hall, sqg_fallen_dome_c_lower]:
        obj_fallen_dome_c.add_squad(sg)
        sg.place()
