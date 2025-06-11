---
title: Disable MacOS doodoo garbage shinies with Nix Darwin
date: 2025-06-11
---

Use this [Nix Darwin](https://github.com/nix-darwin/nix-darwin) module:

```nix
{
  system.defaults = {
    # Reduce window resize animation duration.
    NSWindowResizeTime = 0.001;

    # Reduce motion.
    CustomSystemPreferences."com.apple.Accessibility".ReduceMotionEnabled = 1;
    universalaccess.reduceMotion                                          = true;
  };
}
```
