---
title: Bypass HSTS (HTTP Strict Transport Security)
date: 2025-06-09
---

Got an annoying error, like this:

> `WEBSITE-YOU-ARE-ACCESSING` has a security policy called HTTP Strict Transport
> Security (HSTS), which means that Firefox can only connect to it securely. You
> can’t add an exception to visit this site.

And you really need to access the site, and don't really care that whatever you
are sending is encrypted?

Just `Ctrl-H` to go to history (`Command-Shift-H` if on MacOS), search for the
site, and right click and press `Forget About This Site`.

This will make your browser completely forget about that site and thus not be
able to recall the HSTS header, and let you connect insecurely.

These instrucitons are Firefox and Firefox-based browser specific, but the
process is same on other browsers.
