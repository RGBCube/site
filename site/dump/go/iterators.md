---
title: Go's iterators suit the moronic language
date: 2025-06-07
---

Just had to deal with Go iterators and I can say that they fit the language
well.

They're push iterators. It's as if you're just appending items to an array.
Actually much easier to explain.

They compile down to nonlocal returns to try to keep it fast, but of course it's
still slower than a state machine. The case for every single thing in Go really.

And when you know slightly more than a single lick of programming, the design
and implementation of them looks very obviously moronic and catered to
beginners.

Some people were arguing that this approach makes it more "functional" but
that's very far from the truth. Push iterators are very imperative, pull
iterators (`Iterator::next`, which returns `Option<T>`) are actual functional,
correct and fast way to do it.
