---
title: Cosmic Drift
description: Or how I missed the school bus because of a cosmic ray.

tags:
- time
- unix-timestamps
---

So, every day I wake up at 6:55, get dressed by 7, walk to the bus stop by 7:13
and board the bus around 7:17. Today was different.

My alarm that I have set for 6:55 rang at 7:12 and as a result, I missed the
bus.

> No, I didn't sleep in. There was no note in the UI saying this was a repeat
> alarm, which there is if you snooze it or let it expire.

Surely something was happening. Machines don't break whenever they want, they're
mostly deterministic. And I doubt Samsung engineers wrote code to delay the
alarm by 12 minutes on the date after April 1st.

So, _what_ was happening? I entered the Python repl to test out a theory:

```py
>>> alarm_time = 6*60*60 + 55*60
>>> alarm_time_real = 7*60*60 + 12*60
>>> alarm_time_real - alarm_time
1020
```

The total time was off by about 1020 seconds. Give or take 60, as my phone
doesn't display the seconds of the time.

> Since I'm using a Samsung SM-B310E, I assumed it uses seconds to store the
> time. You can't even see seconds noted anywhere so I feel this is a normal
> assumption. Even if it is false, the math still adds up for milliseconds.

Wow, I thought. That's really close to 1024 (which is 2 to the power of 10).
Maybe the 11th bit got flipped, making it increment 1024?

```py
>>> bin(alarm_time)
'0b110000101000100'
>>> alarm_time |= 1 << 10
>>> bin(alarm_time)
'0b110010101000100'
>>> alarm_time - alarm_time_real
-4
```

Aha! So the 11th bit got flipped by something. And that something was probably a
cosmic ray.

> **EDIT:** It was not a cosmic ray. As pointed out by
> [@BenjaminRi's comment on lobste.rs](https://lobste.rs/s/jb1o6q/cosmic_drift#c_1ztluj)
> it most likely was either a bug or storage corruption as the alarm ran late
> the next day. You should still create more than one alarm just in case if you
> are using a phone prone to this, however.

My main takeaway from this event is to create more than one alarm, for extra
redundancy. Who knew being prone to sleeping in could save you from your alarm
getting shifted 12 minutes into the future :^).
