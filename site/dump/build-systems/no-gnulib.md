---
title: Say NO to Gnulib
description: ...and Debian.
date: 2025-07-19
---

# Say NO to Gnulib

The commonly overlooked but also very important argument for dropping GNU
coreutils (or any other GNU tool that depends on Gnulib) for anything other than
the most core-level bootstrapping needs is that it depends on Gnulib.

Gnulib is a huge blob of C and 80 thousand lines of m4 that has crusted over 30+
years and is almost impossible to build correctly, has to be manually patched in
every single program that embeds it, [^Gnulib is not a library, but a collection
of source files that you are supposed to embed into your program, so you can
expect to be pulling your hair out as it is well-rooted into most programs that
embed it. Have fun packaging it all!] rewards bad OSes and makes good OSes
shrivel in pain & makes packagers go bald & makes issues hard to diagnose and
debug.

It's so ass. It's so incredibly easy to build it wrong and create a shitty
distro (and it is built _wrong_ by default). At least in Rust and the general
ecosystem of Rust, `Cargo.toml` is pretty well-defined and `build.rs` scripts
don't do anything that insane. (Hell, even the
[C compilation tools used inside crates](https://lib.rs/cc) are shared deps and
is well-defined).

I don't trust the average distro to build any toolchain made by GNU properly,
and I do not trust them to produce a proper set of system tools eiyher because
of Gnulib.

I do however trust the average distro (not Debian, they are lower than average
and suck at packaging [(Yes, really.)](#debian-sucks-at-packaging) to build
Uutils tools & any other Rust tool correctly, because it is pretty relatively
straightforward compared to hundreds of thounsands of lines of ancient m4. Much
easier to audit too & it doesn't misbehave or segfault.

I hope Uutils coreutils & Uutils findutils and so on achieves near perfect
compliance so I do not need to serve GNU tools to my users.

Read more about this on the
[Sortix wiki.](https://gitlab.com/sortix/sortix/-/wikis/Gnulib)

# Debian sucks at packaging

Yes, really.

From
[Phoronix, on bcachefs-tools being "impossible to maintain in a package collection":](https://www.phoronix.com/news/Debian-Orphans-Bcachefs-Tools)

> So, back in April the Rust dependencies for bcachefs-tools in Debian didn’t at
> all match the build requirements. I got some help from the Rust team who says
> that the common practice is to relax the dependencies of Rust software so that
> it builds in Debian. So errno, which needed the exact version 0.2, was relaxed
> so that it could build with version 0.4 in Debian, udev 0.7 was relaxed for
> 0.8 in Debian, memoffset from 0.8.5 to 0.6.5, paste from 1.0.11 to 1.08 and
> bindgen from 0.69.9 to 0.66.
>
> I found this a bit disturbing, but it seems that some Rust people have lots of
> confidence that if something builds, it will run fine. And at least it did
> build, and the resulting binaries did work, although I’m personally still not
> very comfortable or confident about this approach (perhaps that might change
> as I learn more about Rust).
>
> **With that in mind, at this point you may wonder how any distribution could
> sanely package this. The problem is that they can’t. Fedora and other
> distributions with stable releases take a similar approach to what we’ve done
> in Debian, while distributions with much more relaxed policies (like Arch)
> include all the dependencies as they are vendored upstream.**

Incredibly foolish. You are not supposed to package every single crate manually,
and you should not be anyway.

The way you should package any programming language that has a widely used and
generally well-defined and static build system is to generate package
definitions from packages using a script or tool (such as
`cargo metdata -> parse json -> puke out package manifests`), and only add extra
configuration to packages that depend on anything external (such as a C library,
or CMake, or perl, or Go for some godforsaken reason (Why, `aws-lc-sys`, why?)).

It's also not hard to use a dependency solver algoritm to try and deduplicate
all crates required in the whole package repository using a pre-made library,
such as [`lib.rs/pubgrub`](https://lib.rs/crates/pubgrub). You can have the best
of all worlds.

In general - Debian is a distro stuck in the 90s that assumes every language
ecosystem is as fragmented, differing and inconsistent as C's. That's not the
case anymore, Debian maintainers should wake up from their slumber and modernize
their tools, automating way more. The future is not C[^Nor is it Rust, but
that's the best we have right now & it is pretty damn good!], and a good distro
cannot assume that.

> And so, my adventure with bcachefs-tools comes to an end. I’d advise that if
> you consider using bcachefs for any kind of production use in the near future,
> you first consider how supportable it is long-term, and whether there’s really
> anyone at all that is succeeding in providing stable support for it.

It's trivial to support!
[Here is what Nixpkgs, the biggest Nix package
collection, Nixpkgs, does](^https://github.com/NixOS/nixpkgs/blob/6e987485eb2c77e5dcc5af4e3c70843711ef9251/pkgs/by-name/bc/bcachefs-tools/package.nix) -
look, it's all 140 lines of code!

## But it can be even better

Nixpkgs has `pkgs.buildRustCrate`, to build crates without Cargo, but currently
doesn't use it for most packages, so it doesn't have crate-level incremental
rebuilds. This may change in the future, and when it does, compiling Rust
programs will take a fraction of the time because you aren't building
dependencies over and over and over and over again, and can utilize
`cache.nixos.org`, or any other cache.

It will also decrease the amount of lines you'll have to write in Nixpkgs
package specifications, because you'll no longer have to specify all external
dependencies for a program. Why? Because external, non-Cargo managed
dependencies will be configured in a
[`per-crate basis,`](https://github.com/NixOS/nixpkgs/blob/f101cc2c243f0f3869f9a214d71b736c66b5317a/pkgs/build-support/rust/default-crate-overrides.nix)
so a top-level Rust program that uses a crate that requires `liburing` won't
actually see `liburing` when being compiled.

## Takeaway...?

**Package management and build systems aren't hard, your tools are just bad.**

That's why I'm working on a new system named "Cull", which will hopefully solve
a lot of these problems (and thus fix the mistakes of Nix). Stay tuned!

It will also be cross platform
(Linux/BSDs/Darwin/Windows/\<insert-your-favourite-os-that-has-rust-support-here>),
and cacheable at the expression level. No waiting for your system closure to
evaluate for 5 minutes.
