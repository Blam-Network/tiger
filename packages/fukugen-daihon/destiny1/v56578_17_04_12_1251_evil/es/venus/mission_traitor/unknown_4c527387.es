# es\venus\mission_traitor\unknown_4c527387.es
#
# The chasm at the Shattered Coast tower's top in mission_traitor: two rows
# of five timed blocks the players jump across (mission 3's "cross the
# chasm"). Both rows run in step, block by block: each block comes up,
# rises, holds, sinks and is gone a while, then comes back, 25 seconds a
# cycle, and the next block runs five seconds behind the last, so they
# come up in turn. A wipe restarts the cycle with the first block, as
# retail did. From one retail 2.3.1 capture (2026-10-27 22-53-09,
# unconfirmed): a block sinks 11 seconds after it rises and the client has
# it gone a couple of seconds into the sink; the host deletes it 3 seconds
# in and brings it back 10 seconds later.

@activity_bundle(0x4C527387)

static_array<timed_block, 5> timed_blocks_1
static_array<timed_block, 5> timed_blocks_2

@startup()
script sc_blocks_1():
    cycle(0)

@startup()
script sc_blocks_2():
    sleep(5)
    cycle(1)

@startup()
script sc_blocks_3():
    sleep(10)
    cycle(2)

@startup()
script sc_blocks_4():
    sleep(15)
    cycle(3)

@startup()
script sc_blocks_5():
    sleep(20)
    cycle(4)

def cycle(i):
    while true:
        timed_blocks_1[i].o_block.create()
        timed_blocks_2[i].o_block.create()
        sleep(0.5)
        timed_blocks_1[i].o_block.set_device_position(1)
        timed_blocks_2[i].o_block.set_device_position(1)
        sleep(11)
        timed_blocks_1[i].o_block.set_device_position(0)
        timed_blocks_2[i].o_block.set_device_position(0)
        sleep(3)
        timed_blocks_1[i].o_block.delete_object()
        timed_blocks_2[i].o_block.delete_object()
        sleep(10)
