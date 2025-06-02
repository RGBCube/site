---
layout: text.vto
title: about:telecommunication
---

You can contact me via:

- Matrix (preferred):
  [`@rgbcube:rgbcu.be`](https://matrix.to/#/@rgbcube:rgbcu.be)
- Discord: [`rgbcube`](https://discord.com/users/512640455834337290)
- E-Mail: <a id="bot-block">`contact[at][this-web-site]`</a>

Here are some other useful links as well:

- [GitHub](https://github.com/RGBCube)
- [Twitch](https://www.twitch.tv/rgbcube)
- [X](https://x.com/HSVSphere)

<script>
  const real = [
    [20, 22], // ma
    [18, 20], // il
    [16, 18], // to
    [22, 23], // :
    [12, 15], // con
    [8,  12], // tact
    [15, 16], // @
    [4,   7], // rgb
    [12, 13], // c
    [1,   2], // u
    [0,   1], // .
    [2,   4], // be
  ].map(([start, end]) => ".ubergbetactcon@toilma:".substring(start, end))
   .join("");

  const element = document.getElementById("bot-block");
  element.href = real;
  element.children[0].textContent = real.substring(7);
</script>
