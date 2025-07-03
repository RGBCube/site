---
title: UTF-8 Bypass
date: 2025-07-03
---

Did you know that you used to be able to encode the "/" (solidus, also known as
slash) character in UTF-8 in 3 different ways?

These were `0x2F`, or `0xC0 0xAF`, or `0xE0 0x80 0xAF`.

This led to [security issues](https://capec.mitre.org/data/definitions/80.html)
and let attackers bypass validation logic.

The Unicode specification later was revised to say that a UTF-8 encoder must
produce the shortest possible sequence that can represent a codepoint, and a
decoder must reject any byte sequence that’s longer than it needs to be to fix
this issue.

More reading:

- Corrected UTF-8: <https://www.owlfolio.org/development/corrected-utf-8/>
- CAPEC-80: Using UTF-8 Encoding to Bypass Validation Logic:
  <https://capec.mitre.org/data/definitions/80.html>
