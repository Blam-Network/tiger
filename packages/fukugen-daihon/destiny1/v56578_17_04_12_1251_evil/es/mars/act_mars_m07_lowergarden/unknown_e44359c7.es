# es\mars\act_mars_m07_lowergarden\unknown_e44359c7.es
#
# The Black Garden's music and Ghost lines (bundle E44359C7; file name
# unknown). The lines tied to an objective are their mission's; this script
# plays the ones that follow the fights: the catacombs music off the hall
# trigger, the garden music's next section off the gulch, the glyph scans
# off the Ghost's cages, the kiosk's line, and the heart's music as each
# Sol Progeny wakes and dies. From one retail capture, so the short gaps
# are that run's.

@activity_bundle(0xE44359C7)
c_sequence_host seq_music_garden
c_sequence_host seq_music_catacombs
c_sequence_host seq_music_lowergarden
c_sequence_host seq_dialog_catacombs_statues
c_sequence_host seq_dialog_lowergarden_arena
c_sequence_host seq_dialog_lowergarden_glyph_a_scan
c_sequence_host seq_dialog_lowergarden_glyph_a_surge
c_sequence_host seq_dialog_lowergarden_spire
c_sequence_host seq_dialog_lowergarden_glyph_b_scan
c_sequence_host seq_dialog_lowergarden_glyph_b_surge
c_sequence_host seq_dialog_lowergarden_kiosk_complete
c_sequence_host seq_dialog_lowergarden_kill_progress
c_encounter_handle enc_catacombs_m07
c_encounter_handle enc_uppergarden_m07
c_encounter_handle enc_lowergarden_m07

# the catacombs: the music starts in the hall
startup thread sc_catacombs:
    sleep_until(enc_catacombs_m07.pt_hall.is_triggered())
    sleep(1)
    seq_music_catacombs.start()
    seq_music_catacombs.set_switch_mask(1)
    seq_dialog_catacombs_statues.stop()

# the upper garden: the gulch
startup thread sc_gulch:
    sleep_until(enc_uppergarden_m07.pt_gulch.is_triggered())
    sleep(1)
    seq_music_garden.set_switch_mask(15)

# the glyph scans: the Ghost's cage, the glyph's surge, the spire between
startup thread sc_glyphs:
    enc = enc_lowergarden_m07
    sleep_until(enc.o_west_ghost_cage.is_alive())
    seq_dialog_lowergarden_arena.stop()
    seq_dialog_lowergarden_glyph_a_scan.start()
    sleep_until(enc.o_glyph_a.is_alive())
    seq_dialog_lowergarden_glyph_a_surge.start()
    sleep_until(not enc.o_west_ghost_cage.is_alive())
    sleep(2)
    seq_dialog_lowergarden_spire.start()
    sleep_until(enc.o_east_ghost_cage.is_alive())
    seq_dialog_lowergarden_spire.stop()
    seq_dialog_lowergarden_glyph_b_scan.start()
    sleep_until(enc.o_glyph_b.is_alive())
    seq_dialog_lowergarden_glyph_b_surge.start()

# the kiosk scan
startup thread sc_kiosk:
    kiosk = enc_lowergarden_m07.sp_placement_kiosk._object
    sleep_until(kiosk.is_active())
    sleep(4)
    seq_dialog_lowergarden_kiosk_complete.start()

# the heart's music follows the Sol Progeny
startup thread sc_heart:
    heart = enc_lowergarden_m07.sp_specops_heart
    sleep_until(heart.o_statue_a.get_device_position() > 0)
    seq_music_lowergarden.set_switch_mask(2)
    sleep_until_dead(heart.sq_bg_mino_a)
    sleep(1)
    seq_music_lowergarden.set_switch_mask(16)
    sleep(3)
    seq_dialog_lowergarden_kill_progress.start()
    sleep_until(heart.o_statue_c.get_device_position() > 0)
    seq_music_lowergarden.set_switch_mask(4)

def sleep_until_dead(sq):
    sleep_until(sq.alive_count() > 0)
    sleep_until(sq.alive_count() == 0)
