# es\cosmo\rasputin_vendor\enc_rasputin_vendor_m6.es
#
# The vendor bunker's door in act_cosmo_m6_rasputin: the door and its panel
# stand from the bubble's start, shut. The vendor phase opens it.
#
# One retail 2.3.1 run. Nobody used the panel there (TU0's vendor door
# objective is the one bound to it, and 2.3.1 no longer shows it).

@activity_bundle("enc_rasputin_vendor_m6")

object o_door
interactable_placement sp_placement_door bind("0x85C53DB7")

@startup()
script sc_door():
    o_door.create()
