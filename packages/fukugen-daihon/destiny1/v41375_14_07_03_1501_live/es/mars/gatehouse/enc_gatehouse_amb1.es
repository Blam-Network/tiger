# es\mars\gatehouse\enc_gatehouse_amb1.es
#
# The Cabal at the gatehouse (Mars' bubble 9): the entry, right, flank, hill
# and exit squads, the gatehouse lights and doors, and the dynamic props.
# Loaded by the Mars story missions and strikes that do not bring their own
# gatehouse (act_mars_m05_warbase has enc_gatehouse_m05).
#
# On the wire in two sessions, both from their start and neither ever in the
# bubble: act_mars_m03_penthouse's (2026-11-01 00-52-56#1, 788 s) and
# act_mars_m06_subway's (01-07-32#1, 946 s):
# - Every squad is on the gatehouse objective from the first snapshot, none
#   placed and none given a task (both).
# - Nothing else moved: the doors, the lights and the props stayed out and
#   both triggers stayed armed for the whole run (both).
# TU0's rows match 2.3.1's. What a player arriving brings (pt_bubble,
# pt_lights, which squads go in) is not on the wire yet.

@activity_bundle("enc_gatehouse_amb1")

objective obj_gatehouse_amb1
squad sq_amb_entry
squad sq_amb_right
squad sq_amb_flank
squad sq_amb_hill
squad sq_amb_exit

@startup()
script sc_main_thread():
    for sq in [sq_amb_entry, sq_amb_right, sq_amb_flank, sq_amb_hill, sq_amb_exit]:
        sq.set_objective(obj_gatehouse_amb1)
