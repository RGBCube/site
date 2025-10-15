---
title: Media Key handling on Linux/BSD is inconsistent
description: And it's not that hard to fix, either.
draft: true

tags:
  - dbus
---

Media key handling on Linux/BSD is inconsistent.

Let me walk you through what happens between you triggering the "pause" action
on your wireless headphones, and your media player actually pausing playback.

First, the Bluetooth way:

# B1. The Signal

After you trigger the pause actions on your headphones, it emits a command
adhering to the
[AVRCP Bluetooth Profile](https://en.wikipedia.org/wiki/List_of_Bluetooth_profiles#Audio/Video_Remote_Control_Profile_(AVRCP))
via [unintelligable Bluetooth nonsense] targeting your device's Bluetooth
controller.[^I'm not a Bluetooth expert, so terminology may be off. You get the
idea.]

The controller connected to your device does its vendor-specific magic, and the
vendor-specific drivers inside the Linux/BSD kernel interact with the controller
and eventually expose a uniform interface that can be used by userspace
processes to react to Bluetooth messages.

# B2. The Blues

The userspace [BlueZ](https://www.bluez.org/) daemon is what handles raw
Bluetooth messages on Linux. It does this by using sockets[^Yes, those sockets
you use to write your hand-rolled HTTP server in C filled with hundreds of
RCEs.] and using the `AF_BLUETOOTH`
[address family.](https://man7.org/linux/man-pages/man7/address_families.7.html)

And as you do with sockets, it reads them, parses information, and processes
them.

BlueZ does a lot of stuff, but the only thing that concerns us right now is how
media controls (play/pause/next/prev) are handled.
