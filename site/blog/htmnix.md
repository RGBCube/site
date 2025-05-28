---
title: HTMNIX
description: How the absolutely cursed HTMNIX project works.

date: 2024-03-04

tags:
- html
- nix
---

So, you may have seen the [HTMNIX](https://github.com/RGBCube/HTMNIX) project
I've been working on the last few weeks. If not, no worries. Here is a Nix
snippet that uses it:

```nix
<html>
  <head>
    <title>"Hello, Internet!"<.title>
  <.head>
  <body>
      <p>"Yep, this is 100% Nix!"<.p>

      <img.>{src="/foo.png"; alt="Attributes also work!";}
  <.body>
<.html>
```

> (hightlight.js shits the bed while highlighting this abomination - just ignore
> it)

You are probably thinking furiously right now, maybe you've noticed something:

> Aha! In Nix, `<foo>` is used to find stuff from the Nix path like so:
>
> ```nix
> import <nixpkgs> {}
> ```
>
> That means you have to add hundreds of elements to your Nix Path to make this
> work?

You are somewhat correct. But not quite.

Nix `<foo>` expressions actually boil down to a call of the builtin
`__findFile`, like so:

```shell
❯ nix-instantiate --parse --expr "<foo>"

(__findFile __nixPath "foo")
```

> In case you didn't know,
> [`nix-instantiate`](https://nixos.org/manual/nix/stable/command-ref/nix-instantiate.html)
> is a nice tool to see what your Nix code is desugared and un-precedence'd
> into.

Aha! So this means we can override the builtin `__findFile` and put whatever we
would like in its place. So this will work:

```nix
let
  __findFile = nixPath: name: {
    content = "<${name}>";
  };
in
<foo>
```

Evaluating this (by running `nix eval -f test.nix`), we get
`{ content = "<foo>"; }`

So, then. How do we make it work for multiple tags, all coming after one another
(and attribute sets, strings, etc.)?

Another hack! We need to set the
[magic `__functor` attribute](https://noogle.dev/md/tutorials/functors) of the
attrset we return, so we can call our set and have it store the tags inside it
(while also preserving its callability!).

We can do that like so:

```nix
let
  __findFile = nixPath: name: {
    content = "<${name}>";
    __functor = self: next: self // {
      content = self.content + next;
    };
  };
in
<foo>
"bar"
"baz"
```

Great news! When we evaluate this, we get
`{ __functor = <LAMBDA>; content = "<foo>barbaz"; }`.

We can also add a case to check if the next element is a tag, and use its
content if it is:

```nix
let
  __findFile = nixPath: name: {
    content = "<${name}>";
    __functor = self: next: self // {
      content = self.content + (if next ? content then next.content else next);
    };
  };
in
<foo>
"bar"
"baz"
<endfoo>
```

Enter another hack! We can utilize the `outPath` property that exists on
derivations and gets returned whenever you call `toString` with an attrset that
has the property to make our code a little simpler:

```nix
let
  __findFile = nixPath: name: {
    outPath = "<${name}>";
    __functor = self: next: self // {
      outPath = self.outPath + toString next;
    };
  };
in
<foo>
"bar"
"baz"
123
<endfoo>
```

We also got support for other types for free, as well!

These are all the hidden builtins that
[HTMNIX](https://github.com/RGBCube/HTMNIX) depends on and extends upon, making
HTML in Nix an actually usable reality. It also has extra logic like turning
attribute sets into HTML tags, which is fairly trivial compared to actaully
discovering these hidden builtins in the first place.

You can read more about it in the project's README and see
[an example site using it](https://github.com/RGBCube/NixSite).

I might even try to port this site to HTMNIX to ensure it is usable with more
complex setups :-)

Soon, maybe...

---

Thanks for reading my first ever proper blog post! :-)
