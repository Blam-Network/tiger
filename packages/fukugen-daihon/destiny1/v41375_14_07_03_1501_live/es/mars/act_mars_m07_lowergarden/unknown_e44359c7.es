# es\mars\act_mars_m07_lowergarden\unknown_e44359c7.es
#
# The Black Garden's music and Ghost lines (bundle E44359C7; file name
# unknown). The lines tied to an objective are their mission's; this script
# plays the ones that follow the fights: the catacombs music off the hall
# trigger, the garden music's next section off the gulch, the glyph scans
# off the Ghost's cages, the kiosk's line, and the heart's music as each
# Sol Progeny wakes. The short gaps are the 2026-10-26 run's.

@activity_bundle(0xE44359C7)

sequence seq_music_garden
sequence seq_music_catacombs
sequence seq_music_lowergarden
sequence seq_dialog_catacombs_statues
sequence seq_dialog_lowergarden_arena
sequence seq_dialog_lowergarden_glyph_a_scan
sequence seq_dialog_lowergarden_glyph_a_surge
sequence seq_dialog_lowergarden_spire
sequence seq_dialog_lowergarden_glyph_b_scan
sequence seq_dialog_lowergarden_glyph_b_surge
sequence seq_dialog_lowergarden_kiosk_complete
encounter_handle enc_catacombs_m07
encounter_handle enc_uppergarden_m07
encounter_handle enc_lowergarden_m07

@startup()
# the catacombs: the music starts in the hall
script sc_catacombs():
    sleep_until(enc_catacombs_m07.pt_hall.is_triggered())
    sleep(1)
    seq_music_catacombs.start()
    seq_music_catacombs.set_switch_mask(1)
    seq_dialog_catacombs_statues.stop()

@startup()
# the upper garden: the gulch
script sc_gulch():
    sleep_until(enc_uppergarden_m07.pt_gulch.is_triggered())
    sleep(1)
    seq_music_garden.set_switch_mask(15)

@startup()
# the glyph scans, in the order the player takes them (the 2026-10-26 run
# scanned east first, an earlier one west, and the lines kept their order):
# the Ghost's cage, the glyph's surge, the spire between
script sc_glyphs():
    sleep_until(cage_up())
    seq_dialog_lowergarden_arena.stop()
    seq_dialog_lowergarden_glyph_a_scan.start()
    sleep_until(surge_up())
    seq_dialog_lowergarden_glyph_a_surge.start()
    sleep_until(not cage_up())
    sleep(2)
    seq_dialog_lowergarden_spire.start()
    sleep_until(cage_up())
    seq_dialog_lowergarden_spire.stop()
    seq_dialog_lowergarden_glyph_b_scan.start()
    sleep_until(surge_up())
    seq_dialog_lowergarden_glyph_b_surge.start()

@startup()
# the kiosk scan
script sc_kiosk():
    kiosk = enc_lowergarden_m07.sp_placement_kiosk._object
    sleep_until(kiosk.is_active())
    sleep(4)
    seq_dialog_lowergarden_kiosk_complete.start()

@startup()
# the heart's music follows the Sol Progeny as they stir; the darkness
# mission moves it on as the first one falls
script sc_heart():
    heart = enc_lowergarden_m07.sp_specops_heart
    sleep_until(heart.o_statue_a.get_device_position() > 0)
    seq_music_lowergarden.set_switch_mask(2)
    sleep_until(heart.o_statue_c.get_device_position() > 0)
    seq_music_lowergarden.set_switch_mask(4)

def cage_up():
    enc = enc_lowergarden_m07
    return enc.o_west_ghost_cage.is_alive() or enc.o_east_ghost_cage.is_alive()

def surge_up():
    enc = enc_lowergarden_m07
    return enc.o_glyph_a.is_alive() or enc.o_glyph_b.is_alive()
