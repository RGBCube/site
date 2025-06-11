---
title: Disable MacOS doodoo garbage shinies with Nix Darwin
description: FIRE ALL OF THE DESIGNERS AT APPLE I WANT USABLE AND FAST USER INTERFACES NOT 15 MINUTES OF NOVELTY
date: 2025-06-11
---

Use this [Nix Darwin](https://github.com/nix-darwin/nix-darwin) module:

```nix
{
  system.defaults = {
    # Reduce window resize animation duration.
    NSGlobalDomain.NSWindowResizeTime = 0.001;

    # Reduce motion.
    CustomSystemPreferences."com.apple.Accessibility".ReduceMotionEnabled = 1;
    universalaccess.reduceMotion                                          = true;
  };
}
```
