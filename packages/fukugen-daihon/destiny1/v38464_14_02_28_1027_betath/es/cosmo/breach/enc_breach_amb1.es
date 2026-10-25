# es\cosmo\breach\enc_breach_amb1.es
#
# The breach's ambient layer: one Fallen squad of five, in from the
# bubble's load.
#
# From the Cosmodrome captures (retail placed squad_1 with 5 bodies in
# its one cell; act_cosmo_m0_highway, cosmo_portal_1 and the patrol all
# load the bundle).
#
# A private bubble's world is built again each time a player comes in
# (retail's hangar: both squads back on their first tasks when the
# player came back 340 s after leaving), so these squads are placed
# once, at the load, with no respawn of their own.

@activity_bundle("enc_breach_amb1")

@member_counts({cell_1: 5})
squad squad_1

@startup()
script sc_breach():
    squad_1.place()
