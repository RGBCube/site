---
title: Explaining the Nix iceberg
description: And revealing how cursed Nix is.

unlisted: true

tags:
- nix
---

Everyone who has ever interacted with Nix tooling knows that it keeps some
secrets. It even keeps some so well hidden that it hinders its adoption, giving
it a reputation of being arcane and hard to use.

I'll be explaining the contents of the following iceberg chart, which includes
some truly arcane examples of Nix code.

Some knowledge of Nix is required, you may get confused with the terminology if
you've never used Nix.

[![The Nix Iceberg](/assets/images/nix-iceberg.webp)](https://cohost.org/leftpaddotpy/post/3885451-the-nix-iceberg)

Let's start:

# Tier 1: `btw I use NixOS`

## IFD blocks evaluation

IFD (**I**mport-**F**rom-**D**erivation) is when you import a Nix expression
from a derivation in the Nix store.

For example:

```nix
let
  pkgs = import <nixpkgs> {};

  myNixExprDeriv = pkgs.runCommand "my-file" {} ''
    echo '{ a = "b"; }' > $out
  '';

  myAttributes = import myNixExprDeriv;
in myAttributes.a
```

This will evaluate to `"b"`.

So, what are we doing in this snippet?

1. Importing `<nixpkgs>` and getting the packages out of it.
2. Creating a derivation that runs an echo command, which writes a Nix
   expression to the output file.
3. Then we import the output file, forcing the derivation to be realized as we
   just accessed the contents of it.

> Wait, what does _realization_ mean?

It means to actually build a derivation, using the builder, arguments and inputs
described within.

Nix does not realize derivations until you access the contents of them or force
them to be evaluated using the `:b` command in the Nix REPL, see these two
examples:

```nix
nix-repl> pkgs = import <nixpkgs> {}

nix-repl> pkgs.runCommand "foo" {} "echo 'bar' > $out"
«derivation /nix/store/h27fzbivcxw0cc1bxyyyqyivpw9rsz6k-foo.drv»
```

Here, it created a `.drv` file, which is how derivations are represented. But
that's it. There is no `/nix/store/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA-foo` with
contents `bar` to be seen.

```nix
nix-repl> :b pkgs.runCommand "foo" {} "echo 'bar' > $out"

This derivation produced the following outputs:
  out -> /nix/store/rxz2bswgx6wlkdxnrcbsb503r9a67wc2-foo
```

And here we force the derivation to be realized, which produces the output.

Where were we again? Right, the 3rd point:
`Then we import the expression, forcing the derivation to
be realized as we accessed the contents of it.`

The 3rd point is the important part. A typical Nix expression does not depend on
the output of any derivation, which in turn makes evaluating a Nix expression
not require realizing _any_ derivations whatsoever.

But with IFD, you have to realize a derivation to even finish the evaluation of
your Nix expression. This will block Nix evaluation for a long time, as Nix is
evaluated on a single thread and realizing any derivation takes a non-trivial
amount of time.

### TL;DR: IFD blocks evaluation because:

1. Evaluation is single threaded, so naturally everything blocks it.
2. You're trying to access a derivation _output_, so obviously you need to
   realize (build) it first.

## `nix-shell` and `nix shell` are completely different

`nix-shell` is the legacy version of `nix develop`, which enters a devshell
created by a Nix expression. It was (and still is) very useful.

People then realized getting a devshell by passing in the packages you wanted as
command line arguments was really convenient, which resulted in the creation of
the `--packages/-p` argument for `nix-shell`

`nix-shell -p` is similar to `nix shell`. But they are not the same.

`nix-shell -p` creates a shell using the nixpkgs stdenv (and thus depends on
nixpkgs) by calling `pkgs.mkShell`, which includes all packages in the nixpkgs
stdenv plus the ones you specified.

`nix shell` only appends the packages you passed in to the `PATH` environment
variable. It is much lighter, as a natural result of not using nixpkgs or its
stdenv. It also doesn't have as much of a questionable implementation, as it is
in C++ and in Nix natively instead of being a Perl script that uses string
interpolation to produce Nix expressions.

## hydra is 17 000 lines of perl

[Hydra](http://github.com/NixOS/hydra), the Nix-based continuous build system is
almost 17,000 lines of Perl.

Here is the `tokei` output for its GitHub repository:

| Language   | Files | Lines                                       | Code  | Comments | Blanks |
| ---------- | ----- | ------------------------------------------- | ----- | -------- | ------ |
| Autoconf   | 2     | 38                                          | 37    | 0        | 1      |
| C++        | 8     | 4140                                        | 3068  | 360      | 712    |
| C++ Header | 5     | 768                                         | 492   | 75       | 201    |
| CSS        | 3     | 505                                         | 388   | 35       | 82     |
| JavaScript | 6     | 343                                         | 270   | 37       | 36     |
| JSON       | 1     | 24                                          | 24    | 0        | 0      |
| Meson      | 10    | 328                                         | 293   | 9        | 26     |
| Nix        | 48    | 2266                                        | 1948  | 84       | 234    |
| Perl       | 127   | [**17023**](#hydra-is-17-000-lines-of-perl) | 12258 | 663      | 4102   |
| Python     | 1     | 35                                          | 25    | 1        | 9      |
| Shell      | 24    | 371                                         | 279   | 35       | 57     |
| SQL        | 85    | 1406                                        | 989   | 202      | 215    |
| SVG        | 6     | 6                                           | 6     | 0        | 0      |
| Plain Text | 4     | 164                                         | 0     | 102      | 62     |
| YAML       | 1     | 1137                                        | 1094  | 0        | 43     |
| Total      | 349   | 30927                                       | 21210 | 3358     | 6359   |

## nix pills

From <https://nixos.org/guides/nix-pills/>:

> This is a ported version of the Nix Pills, a series of blog posts written by
> Luca Bruno (aka Lethalman) and originally published in 2014 and 2015. It
> provides a tutorial introduction into the Nix package manager and Nixpkgs
> package collection, in the form of short chapters called 'pills'.
>
> Since the Nix Pills are considered a classic introduction to Nix, an effort to
> port them to the current format was led by Graham Christensen (aka grahamc /
> gchristensen) and other contributors in 2017.

## `inherit`

`inherit` is a keyword in the Nix language that brings a variable into an keyed
expression, such as an attribute set or `let in`.

Check out the
[Nix reference page](https://nix.dev/tutorials/nix-language.html#inherit) that
explains the keyword in depth.

## `nix-tree`

[`nix-tree`](https://github.com/utdemir/nix-tree) is a tool to interactively
browse dependency graphs of derivations.

## `nix-diff`

[`nix-diff`](https://github.com/Gabriella439/nix-diff) is a tool to see how two
derivations differ with colored output.

## `nix-shell -p` gives you a compiler

[As mentioned before](#nix-shell-and-nix-shell-are-completely-different)
`nix-shell -p` is the nixpkgs stdenv plus the specified packages.

And since the stdenv includes a C compiler, so does the shell you enter after
calling `nix-shell -p hello`.

## `nix-output-monitor`

[`nix-output-monitor`](https://github.com/maralorn/nix-output-monitor), also
known as `NOM` is a neat visualizer for Nix builds. See it in action:

<script src="https://asciinema.org/a/604200.js" id="asciicast-604200" async="true"></script>

## `nix-top`

[`nix-top`](https://app.radicle.xyz/nodes/seed.radicle.garden/rad:z35T5UvM72Y41aJCAUuQj1cjbaVaL)
is a simple Ruby script to help people see what is building in the local Nix
daemon.

The original source was deleted, so I've seeded it on radicle.

## `--debugger`

The `--debugger` flag is used to halt evaluation and enter the Nix REPL when
evaluating a Nix expression.

You set breakpoints using the `builtins.break` function:

```nix
let
  foo = 123;
  bar = "baz";

  # Nix will stop right here, just before
  # evaluating the attrset passed into
  # `builtins.break`. We are able to access
  # `foo` and `bar`.
in builtins.break {
  inherit foo bar;
}
```

Evaluate this expression with `nix eval --debugger --expr/--file` and see.

## `tvix`

[Tvix](https://tvix.dev/) is an alternate implementation of Nix written in Rust.

It aims to have a modular implementation while also reusing already-written Nix
crates in the Rust ecosystem. It is licensed under the GPLv3 license.

It has since slowed down in development, but the [Snix](https://snix.dev/), a
fork of Tvix, still goes on.

## eelco's thesis

Eelco's thesis is about _The Purely Functional Software Deployment Model_. Which
also happens to be about Nix.

You can read the thesis [here](https://edolstra.github.io/pubs/phd-thesis.pdf).

## fixed-output derivations not rebuilt with changed URL

Fixed output derivations (also called FODs) do not get rebuilt even if you
change any inputs passed to them (a URL string is also an input). The reason for
this is simple.

Nix will see that the output is the same, and since there already is a
derivation with the same output in the Nix store, it will assume it is cached
and will use that derivation.

Try changing the URL in the following expression and building it:

```nix
let
  pkgs = import <nixpkgs> {};;
in pkgs.fetchurl {
  url = "https://raw.githubusercontent.com/NixOS/nixpkgs/56d6bf5daced702e0099e3a15f0b743363ae429d/README.md";
  hash = "sha256-/Lrhot+ejBBfXsPEyWtzScROLkCmdRjb4LBRcHHn+IE=";
}
```

# Tier 2: `package maintainer`

## `github:boolean-option/true`

The [`boolean-option` GitHub organization](https://github.com/boolean-option)
allows flakes to be configured. Let's say you have a flake that provides a
binary. Let's also assume you can run it with the following Nix CLI invocation:

```sh
nix run github:me/hello-world
```

This is great, you are able to run the binary. But, there is no way for a flake
to accept any configuration arguments. If you wanted to run your program in
debug mode, you have to create another output (like
`packages.x86_64-linux.{release,debug}`). Same for compiling without support for
X/Y/Z. This results in two to the N power of outputs, N being the feature toggle
count.

A dumb flake input like `github:boolean-option/true` fixes this, even though it
is an ugly hack. You can do this in your flake:

```nix
{
  inputs = {
    nixpkgs.url    = "github:NixOS/nixpkgs/nixos-23.11";
    debug-mode.url = "github:boolean-option/false"; # Release by default!
  };

  outputs = { nixpkgs, debug-mode, ... }: let
    pkgs = import nixpkgs { system = "x86_64-linux"; };
  in {
    packages.x86_64-linux.hello = pkgs.callPackage ./hello { inherit debug-mode; };
  };
}
```

And override the `debug-mode` input like so, to run a debug binary instead:

```sh
nix run github:me/hello-world --override-input debug-mode github:boolean-option/true
```

[`nix-systems`](https://github.com/nix-systems/nix-systems) is the same idea as
`boolean-option`, but for systems.

[Example usages.](https://github.com/search?q=boolean-option+language%3ANix&type=code&l=Nix)

These hacks wouldn't be needed if Nix allowed users to put arbitrary values in
inputs -
[in fact, there is an open issue from _2021_ that is still being actively
discussed](https://github.com/NixOS/nix/issues/5663) - but here we are.

## `''foo''\n'' == "foo\n"`

The Nix parser is very buggy, and this is one bug.

`''` is the character set used to escape `${` in Nix indent strings (No, not
multiline strings! All strings in Nix are multiline.):

```nix
''
  export BAR_OR_BAZ=''${BAR:-$BAZ}
''
```

This results in the literal string `"export BAR_OR_BAZ=${BAR:-BAZ}"`, without
string interpolation.

Nix will ignore an invalid `\` escape after the `''` escape in an indent string.
Or if the `\` escape is valid , it will just append the `\` escape to the
string, ignoring the `''` escape.

## `(x: x x) (x: x x)`

This expression is a way to make Nix recurse forever and overflow its stack. Nix
can't detect it either, as the evaluated thunk is always different.

## Derivations are just memoized `execve`

Derivations include all required information to build themselves. This also
includes output directories (except when they are content-addressed, but that is
for a future blog post!). You can dump a `.drv` file as JSON with the
`nix derivation show` command, like so:

<details>
<summary>Long command output</summary>

```json
❯ nix derivation show /nix/store/0aplz036lmggrryvx2xh87ci20hczijf-libsamplerate-0.1.9.drv^*

{
  "/nix/store/0aplz036lmggrryvx2xh87ci20hczijf-libsamplerate-0.1.9.drv": {
    "args": [
      "-e",
      "/nix/store/v6x3cs394jgqfbi0a42pam708flxaphh-default-builder.sh"
    ],
    "builder": "/nix/store/bm0gsz7di3d4q0gw1kk2pa06505b0wmn-bash-5.2p26/bin/bash",
    "env": {
      "__structuredAttrs": "",
      "bin": "/nix/store/r3n9n5483q2zprrrjj0f442n723dkzyk-libsamplerate-0.1.9-bin",
      "buildInputs": "/nix/store/4rbkn1f0px39n75zbib2f43i851vy0ay-libsndfile-1.2.2-dev",
      "builder": "/nix/store/bm0gsz7di3d4q0gw1kk2pa06505b0wmn-bash-5.2p26/bin/bash",
      "cmakeFlags": "",
      "configureFlags": "--disable-fftw",
      "depsBuildBuild": "",
      "depsBuildBuildPropagated": "",
      "depsBuildTarget": "",
      "depsBuildTargetPropagated": "",
      "depsHostHost": "",
      "depsHostHostPropagated": "",
      "depsTargetTarget": "",
      "depsTargetTargetPropagated": "",
      "dev": "/nix/store/ajfrbfsqbmxb4ypnmp39xxdpg9gplxbx-libsamplerate-0.1.9-dev",
      "doCheck": "",
      "doInstallCheck": "",
      "mesonFlags": "",
      "name": "libsamplerate-0.1.9",
      "nativeBuildInputs": "/nix/store/xpah4lnaggs6qg87pg1rd9his89acprm-pkg-config-wrapper-0.29.2",
      "out": "/nix/store/55mwzr1k14mryxnhzz6z3hzaimhl8bpn-libsamplerate-0.1.9",
      "outputs": "bin dev out",
      "patches": "",
      "pname": "libsamplerate",
      "postConfigure": "",
      "propagatedBuildInputs": "",
      "propagatedNativeBuildInputs": "",
      "src": "/nix/store/9jnvkn9wcac6r62mljq9fa9vvriyib1i-libsamplerate-0.1.9.tar.gz",
      "stdenv": "/nix/store/jiz7bpw8vqzq8ncm6nn4v94qyqm9qc2p-stdenv-linux",
      "strictDeps": "",
      "system": "i686-linux",
      "version": "0.1.9"
    },
    "inputDrvs": {
      "/nix/store/356i9xqk710rnmq6y6308sv880m88r7k-pkg-config-wrapper-0.29.2.drv": {
        "dynamicOutputs": {},
        "outputs": [
          "out"
        ]
      },
      "/nix/store/gfybzgm5p0hh7w7mdrz5xkr29dlsriih-libsamplerate-0.1.9.tar.gz.drv": {
        "dynamicOutputs": {},
        "outputs": [
          "out"
        ]
      },
      "/nix/store/jkfhhkxlbkfhmqhaccpmqdna01wzlb42-libsndfile-1.2.2.drv": {
        "dynamicOutputs": {},
        "outputs": [
          "dev"
        ]
      },
      "/nix/store/zlf7fmxbnq4k2xgngk0p953ywjqbci6f-stdenv-linux.drv": {
        "dynamicOutputs": {},
        "outputs": [
          "out"
        ]
      },
      "/nix/store/zx3fgspv17raqfb859qkpqnql2fschm0-bash-5.2p26.drv": {
        "dynamicOutputs": {},
        "outputs": [
          "out"
        ]
      }
    },
    "inputSrcs": [
      "/nix/store/v6x3cs394jgqfbi0a42pam708flxaphh-default-builder.sh"
    ],
    "name": "libsamplerate-0.1.9",
    "outputs": {
      "bin": {
        "path": "/nix/store/r3n9n5483q2zprrrjj0f442n723dkzyk-libsamplerate-0.1.9-bin"
      },
      "dev": {
        "path": "/nix/store/ajfrbfsqbmxb4ypnmp39xxdpg9gplxbx-libsamplerate-0.1.9-dev"
      },
      "out": {
        "path": "/nix/store/55mwzr1k14mryxnhzz6z3hzaimhl8bpn-libsamplerate-0.1.9"
      }
    },
    "system": "i686-linux"
  }
}
```

</details>

## `nixos-rebuild --fast --target-host`

The `--fast` flag in `nixos-rebuild` is an alias to `--no-build-nix` which is
explained in the man page like so:

> Normally, nixos-rebuild first builds the `nixUnstable` attribute in Nixpkgs,
> and uses the resulting instance of the Nix package manager to build the new
> system configuration. This is necessary if the NixOS modules use features not
> provided by the currently installed version of Nix. This option disables
> building a new Nix.

And the `--target-host` flag is also documented, like so:

> Specifies the NixOS target host. By setting this to something other than an
> empty string, the system activation will happen on the remote host instead of
> the local machine. The remote host needs to be accessible over ssh, and for
> the commands switch, boot and test you need root access.
>
> If `--build-host` is not explicitly specified or empty, building will take
> place locally.
>
> You can include a remote user name in the host name (user@host). You can also
> set ssh options by defining the `NIX_SSHOPTS` environment variable.
>
> Note that nixos-rebuild honors the nixpkgs.crossSystem setting of the given
> configuration but disregards the true architecture of the target host. Hence
> the nixpkgs.crossSystem setting has to match the target platform or else
> activation will fail.

## nix supports floats

Yup, you heard it. Nix has floats, too!

Though, note that not every number in Nix is a float. Integers in Nix are stored
as 64-bit integers. Floats are also 64-bit.
[Here's the Nix source code that denotes this.](https://github.com/NixOS/nix/blob/d2a07a96ba6275e570b7d84092d08cbe85a2091b/src/libexpr/value.hh#L77-L78)

```nix
nix-repl> 0.1 + 0.2
0.3

nix-repl> 0.1 + 0.2 == 0.3
false

nix-repl> 0.2 + 0.2 == 0.4
true
```

## `attrset ? key` and `attrset ? "key"`

This syntax is a way to check for the existence of a key in an attribute set.

`{ foo = 42; } ? foo` evaluates to `true`. The same applies for
`{ foo = 42; } ? "foo"`, which is just using a string identifier instead.

You can also do `{ foo.bar = 13; } ? foo.bar`, though this isn't that well
known.

## flakes invented for Target Corporation

[The development of flakes was partially funded by Target Corporation.](https://www.tweag.io/blog/2020-07-31-nixos-flakes/#conclusion)

# Tier 3: `assigned nix hacker at employment`

<h2><small>

```sh
#!/usr/bin/env nix-shell
#!nix-shell -i python3 -p python3
```

</small></h2>

_(taken verbatim from `man nix-shell`)_

You can use nix-shell as a script interpreter to allow scripts written in
arbitrary languages to obtain their own dependencies via Nix. This is done by
starting the script with the following lines:

```sh
#!/usr/bin/env nix-shell
#!nix-shell -i real-interpreter --packages packages
```

Where `real-interpreter` is the "real" script interpreter that will be invoked
by nix-shell after it has obtained the dependencies and initialised the
environment, and packages are the attribute names of the dependencies in
`<nixpkgs>`.

The lines starting with `#!nix-shell` specify nix-shell options (see above).
Note that you cannot write `#!/usr/bin/env nix-shell -i ...` because many
operating systems only allow one argument in `#!` lines.

For example, here is a Python script that depends on Python and the prettytable
package:

```python
#!/usr/bin/env nix-shell
#!nix-shell -i python --packages python pythonPackages.prettytable

import prettytable

# Print a simple table.
t = prettytable.PrettyTable(["N", "N^2"])
for n in range(1, 10): t.add_row([n, n * n])
print t
```

## `--accept-flake-config` more like `--pwn-me-mommy`

The
[`accept-flake-config`](https://nix.dev/manual/nix/2.29/command-ref/conf-file#conf-accept-flake-config)
Nix configuration variable or `--option accept-flake-config true` flag in Nix
commands allows Nix to unconditionally accept flake `nixConfig`'s.

This is dangerous, because this can enable `builtins.importNative` by enabling
the
[`allow-unsafe-native-code-during-evaluation`](https://nix.dev/manual/nix/2.29/command-ref/conf-file#conf-allow-unsafe-native-code-during-evaluation)
option, which then allows Nix expressions to load arbitrary dynamic libraries,
which can do anything as they are not confined to the Nix evaluation sandbox.

## Zilch

ZilchOS is a decidedly tiny Nix-based distro. It is a great project to see how
NixOS actually works behind the scenes without too much noise to distract.

It was created by [t184256](https://github.com/t184256) on GitHub, here is the
[ZilchOS GitHub organization](https://github.com/ZilchOS).

## `set.a or "meow"` is set-specific

[As mentioned previously,](#let-a-1-or-6-in-a-or-9-) the Nix parser is weird and
treats `or` as an identifier when it is not right after an attribute selection
expression.

So, the `or` in `set.key or default` is the keyword, but in `set or default` it
is not, and the latter expression is actually a double function application,
where we apply `or` to `set`, and then `default` to the result of that.

## `builtins.toString [true false true] == "1  1"`

I find it weird that this is in the 3rd tier. It's actually pretty simple:

Nix converts `true` to `"1"` and `false` to `"" (empty string)` when asked to
convert a boolean to a string.

And when you convert a list to a string, it converts individual items and then
joins them with a space character (`0xA`).

So `builtins.toString [true false true]` makes `1  1`

## `__structuredAttrs`

`__structuredAttrs`, when set to `true` in a derivation argument, will set the
`NIX_ATTRS_JSON_FILE` and `NIX_ATTRS_SH_FILE` environment variables in the build
environment to file paths to the derivation argument contents in the respective
format.

Here is an example:

```nix
with import <nixpkgs> {};

runCommand "attrs.json" { __structuredAttrs = true; foo.bar = "baz"; } ''
  cat $NIX_ATTRS_JSON_FILE > $out
''
```

Build it with `nix build --impure --expr/--file` and then `cat result`, you will
get something similar to this:

<details>
<summary>Long JSON output</summary>

```json
{
  "buildCommand": "cat $NIX_ATTRS_JSON_FILE > $out\n",
  "buildInputs": [],
  "builder": "/nix/store/a1s263pmsci9zykm5xcdf7x9rv26w6d5-bash-5.2p26/bin/bash",
  "cmakeFlags": [],
  "configureFlags": [],
  "depsBuildBuild": [],
  "depsBuildBuildPropagated": [],
  "depsBuildTarget": [],
  "depsBuildTargetPropagated": [],
  "depsHostHost": [],
  "depsHostHostPropagated": [],
  "depsTargetTarget": [],
  "depsTargetTargetPropagated": [],
  "doCheck": false,
  "doInstallCheck": false,
  "enableParallelBuilding": true,
  "enableParallelChecking": true,
  "enableParallelInstalling": true,
  "env": {},
  "foo": {
    "bar": "baz"
  },
  "mesonFlags": [],
  "name": "attrs.json",
  "nativeBuildInputs": [],
  "outputs": {
    "out": "/nix/store/cw8gnrh2jwww459cbwig4y97an79qqnx-attrs.json"
  },
  "passAsFile": [
    "buildCommand"
  ],
  "patches": [],
  "propagatedBuildInputs": [],
  "propagatedNativeBuildInputs": [],
  "stdenv": "/nix/store/zykyv2faxz6s1l2pdn6i7i5hb5r5wri6-stdenv-linux",
  "strictDeps": false,
  "system": "x86_64-linux"
}
```

</details>

## `__functor`

`__functor` is a magic attribute that attribute sets can have which makes them
callable. The lambda you assign to it must accept 2 arguments[^Technically,
lambdas in Nix always take a single argument. But for clarity, I'll just refer
to lambdas that return lambdas as taking `N` argument, where N is the lambda
count.]. The first being the attribute set itself (commonly named `self") and
the second being the argument that was passed in.

Here's an example:

```nix
let
  mulAll = {
    accum     = 1;
    __functor = self: arg: self // {
      accum = self.accum * arg;
    };
  };
in mulAll 1 2 3 4 5
```

This outputs the following:

```nix
{ __functor = <LAMBDA>; accum = 120; }
```

> Oh no. We just emulated OOP in Nix!

## `--output-format bar-with-logs` on old CLI

(later renamed to `--log-format`)

You know how the new `nix-command` CLI has that bar at the bottom, which looks
like `[4/0/804 built, 7.7/112.5 MiB DL] downloading '...'`?

This option allows you to have that output format in the old CLI by passing in
`--log-format bar-with-logs`.

## `traceVerbose`

`builtins.traceVerbose` behaves like `builtins.trace` when you pass
`--trace-verbose` to the Nix CLI. If you don't pass in that option, it
completely ignores the first argument and returns the second one.

# Tier 4: `nix is easy we promise`

## `let f = a: a; s = {f=f;}; in [(f == f) (s == s)]`

This evaluates to `[ false true ]`. Why?

Normally, Functions in Nix cannot be compared. Comparing two functions will
_always_ return false, at least when done directly.

But if two attribute sets that are compared have the same memory location, Nix
ignores this and does a pointer comparison, totally ignoring all members. This
is a hack.

[Here's the snippet:](https://github.com/NixOS/nix/blob/aa165301d1ae3b306319a6a834dc1d4e340a7112/src/libexpr/eval.cc#L2525-L2528)

```cpp
bool EvalState::eqValues(Value & v1, Value & v2, const PosIdx pos, std::string_view errorCtx)
{
    forceValue(v1, pos);
    forceValue(v2, pos);

    /* !!! Hack to support some old broken code that relies on pointer
       equality tests between sets.  (Specifically, builderDefs calls
       uniqList on a list of sets.)  Will remove this eventually. */
    if (&v1 == &v2) return true;
```

This "temporary hack" was committed in 15 years ago. You can do whatever you
want with this information.

## `nix plugins`

As surprising as it sounds, Nix does indeed supports plugins. You can load
plugins using the
[`plugin-files`](https://nix.dev/manual/nix/2.29/command-ref/conf-file.html#conf-plugin-files)
configuration option.

From the configuration reference:

> A list of plugin files to be loaded by Nix. Each of these files will be
> dlopened by Nix. If they contain the symbol nix_plugin_entry(), this symbol
> will be called. Alternatively, they can affect execution through static
> initialization. In particular, these plugins may construct static instances of
> RegisterPrimOp to add new primops or constants to the expression language,
> RegisterStoreImplementation to add new store implementations, RegisterCommand
> to add new subcommands to the nix command, and RegisterSetting to add new nix
> config settings. See the constructors for those types for more details.
>
> Warning! These APIs are inherently unstable and may change from release to
> release.
>
> Since these files are loaded into the same address space as Nix itself, they
> must be DSOs compatible with the instance of Nix running at the time (i.e.
> compiled against the same headers, not linked to any incompatible libraries).
> They should not be linked to any Nix libs directly, as those will be available
> already at load time.
>
> If an entry in the list is a directory, all files in the directory are loaded
> as plugins (non-recursively).

Some example plugins are [`nix-doc`](https://github.com/lf-/nix-doc) and
[`nix-extra-builtins`](https://github.com/shlevy/nix-plugins).

## `/bin/sh` and sandbox impurity

By setting the
[`sandbox-paths`](https://nix.dev/manual/nix/2.29/command-ref/conf-file#conf-sandbox-paths)
option to `/bin/sh=/bin/sh`, Nix will bind the `/bin/sh` path in the build
sandbox (left) to the `/bin/sh` path in the host (right). This is of course
impure, but is useful for bootstrapping from absolute scratch without copying
impure binaries to the Nix store.

## `rec { a = 5; b = a + 1; __overrides.a = 6; }`

There is a special field named `__overrides` in keyed expressions (attribute
sets, `let-in`'s and as secret third thing), which simply overrides the parent
attribute set with the keys inside it. This is different from the update
operator (`//`) because that will not override the self-references in the
recursive attribute set.

`rec { a = 5; b = a + 1; __overrides.a = 6; }.b` will evaluate to 7, while
`(rec { a = 5; b = a + 1; } // { a = 6; }).b` will evaluate to 6.

## `let __div = c: map (__mul c); in 2 / [ 1 2 3 ]`

Previously mentioned in my [HTMNIX blog post](/blog/htmnix), Nix operators get
desugared into normal function calls before execution. All operators have their
"hidden" equivalents that they get desugared into (`__div` is for `/`, etc.), so
you can override them using `let in`.

`let __div = c: map (__mul c); in 2 / [ 1 2 3 ]` is equivalent to
`map (x: 2 * x) [ 1 2 3 ]` which evaluates to `[ 2 4 6 ]`.

You can also check what a Nix snippet desugars into using
`nix-instantiate --parse --expr/--file`

## `let __lessThan = a: b: b - a; in 1 > 2`

[As mentioned above](#let-div-c-map-mul-c-in-2-1-2-3-), this expression will
desugar into `let __lessThan = a: b: b - a; in __lessThan 1 2` which will
evaluate to 1.

## `__impure`

With the
[`impure-derivations`](https://nix.dev/manual/nix/2.29/development/experimental-features.html#xp-feature-impure-derivations)
experimental Nix feature, you can set the `__impure` attribute to `true` within
derivations to mark them "impure".

What this does is:

1. Let the derivation build have access to the network.
2. Prevent the impure derivation from becoming a
   [content-addressed](https://nix.dev/manual/nix/2.29/development/experimental-features.html#xp-feature-ca-derivations)
   derivation.

Impure derivations can also only be used by other impure derivations or
fixed-output derivations (FODs).

# Tier 5: `normal and can be trusted with nix`

## `let a = _: -1; or = 6; in [ a or 9 ]`

The Nix parser is weird.

Normally, `or` is used for attribute path selection defaults:

```nix
{ foo = 123; }.not-here.not-here-either or 123
```

That above evaluates to `123`.

But when parsing an expression that is not an attribute-select, `or` is treated
as an identifier. This means that in the following `let-in`, we are passing `or`
to `a`.

```nix
let
  a = _: -1;
  or = 6;
in a or
```

But there is another piece of weirdness. Function applications that use the
literal `or` have higher precedence than the spaces when parsing lists, so these
two codeblocks are not equivalent:

```nix
let
  a = _: -1;
  or = 6;
in [ a or ]
```

> This evaluates to `[ -1 ]`

```nix
let
  a = _: -1;
  foo = 6;
in [ a foo ]
```

> This evaluates to `[ <LAMBDA> 6 ]`

However, this behaviour might get removed in the future. But currently, in the
Nix version that I am using which is `2.28.3`, it prints this warning instead:

```text
warning: at «string»:4:6: This expression uses `or` as an identifier in a way that will change in a future Nix release.
Wrap this entire expression in parentheses to preserve its current meaning:
    (a or)
Give feedback at https://github.com/NixOS/nix/pull/11121
```

## eelco's home address is in nixpkgs

[s/used to be/is in/g.](https://github.com/NixOS/nixpkgs/commit/164b4d65ff976c11999172592e634bf3742537f8)

## `restrict-eval`

[From the Nix manual:](https://nix.dev/manual/nix/2.29/command-ref/conf-file.html#conf-restrict-eval)

> If set to true, the Nix evaluator will not allow access to any files outside
> of `builtins.nixPath`, or to URIs outside of `allowed-uris`.

## nix2

TODO

## `__noChroot`

When the
[`sandbox`](https://nix.dev/manual/nix/2.29/command-ref/conf-file.html#conf-sandbox)
Nix configuration value is set to `relaxed`, fixed-output derivations (FODs)
that have the `__noChroot` attribute set to `true` will not run in the Nix
sandbox.

## cloud scale hydra

[Cloudscale hydra](https://web.archive.org/web/20220624223053/https://cloudscalehydra.com/)
was
Graham[^![Graham "Determinate" Christensen](/assets/images/graham-sickos-resized.webp)]
Christensen's previous failed project.

He then went on to create [FlakeHub](https://flakehub.com/), which could be said
is the successor to Cloudscale Hydra.

It is curious that the following links are the only non-automated mentions of
the project on the open internet:

- [Meeting about nixpkgs `cudaPackages` from February 13th, 2025.](https://pad.lassul.us/p/KXm3h1AS-?print-pdf#/)
  ([archive](https://archive.is/fbNMP)) (Search for `cloud-scale hydra`)

- [A link to a now-defunct Hydra instance hosted by Cloudscale Hydra, in the Determinate Systems blog.](https://determinate.systems/posts/hydra-deployment-source-of-truth/)
  ([archive](https://web.archive.org/web/20250319031645/https://determinate.systems/posts/hydra-deployment-source-of-truth/))
  (Search for `cloudscalehydra`)

- [A tweet from the Determinate Systems, about the availability of Cloudscale Hydra](https://x.com/DeterminateSys/status/1445785369941889024)
  ([archive, actually check this one out! it's from 2021](https://web.archive.org/web/20220112074900/https://twitter.com/DeterminateSys/status/1445785369941889024))

If you can't find the mentions in these pages, check the archives out.

![Cloudscale Hydra landing page sketch](/assets/images/cloudscale-hydra.webp)

## `(_:_) != (_:_)` but `(a:a) == (a:a)`

Evaluating `(_:_) == (_:_)`, we see that it is `false`, which means the two
functions aren't equal to eachother, as we are comparing them directly and when
compared directly, function comparisions return false.

But then why does `(a:a) == (a:a)` return `true`? Aren't we still comparing
functions?

**Nope!**

`a:a` is a
[legacy URL literal](https://nix.dev/manual/nix/2.29/development/experimental-features.html#no-url-literals),
which can be disabled using the
[`no-url-literals` experimental Nix feature.](https://nix.dev/manual/nix/2.29/development/experimental-features.html#xp-feature-no-url-literals)

## de betekenis van @niksnut

TODO

## `let { huh = "?"; body = huh }`

This is the legacy `let` syntax. Equivalent to `let huh = "?"; in huh`.

# Tier 6: `has meowed before`

## `let { body = 1; __overrides.body = 2; }`

This is a combination of [`__override`](#rec-a-5-b-a-1-overridesa-6-) for keyed
expressions and the [`legacy let syntax`](#let-huh-body-huh-).

## function identity is load bearing on importing nixpkgs

Since
[attribute sets with function members compare function identities (memory locations)](#let-f-a-a-s-ff-in-f-f-s-s),
comparing any attribute set that contains a function is load-bearing on the
function's identity.

The way this affects importing nixpkgs is that nixpkgs internally compares
stdenvs, which contain functions, to determine whether if we are
cross-compiling.nixpkgs internally compares stdenvs, which contain functions, to
determine whether if we are cross-compiling.

Therefore, function identity really **is** load bearing on importing nixpkgs.

## `import <nix/fetchurl.nix>`

This looks like we are importing `<nix>`, and getting the `fetchurl.nix` file in
it.

Let's see if that is true:

```nix
nix-repl> builtins.readDir <nix>
{
  ".clang-format" = "regular";
  ".clang-tidy" = "regular";
  ".dir-locals.el" = "regular";
  ".editorconfig" = "regular";
  ".github" = "directory";
  ".gitignore" = "regular";
  ".mergify.yml" = "regular";
  ".shellcheckrc" = "regular";
  ".version" = "regular";
  ".version-determinate" = "regular";
  "CITATION.cff" = "regular";
  "CONTRIBUTING.md" = "regular";
  COPYING = "regular";
  "HACKING.md" = "symlink";
  "README.md" = "regular";
  contrib = "directory";
  doc = "directory";
  "docker.nix" = "regular";
  "flake.lock" = "regular";
  "flake.nix" = "regular";
  maintainers = "directory";
  "meson.build" = "regular";
  "meson.options" = "regular";
  misc = "directory";
  nix-meson-build-support = "directory";
  packaging = "directory";
  "precompiled-headers.h" = "regular";
  scripts = "directory";
  src = "directory";
  tests = "directory";
}
```

There doesn't seem to be a `fetchurl.nix` file here.

This is because
[`<nix/*>` actually falls back to `corepkgs`](https://github.com/NixOS/nix/blob/2afc84fddf463b22196aeb70587bc0c9259e330f/src/libexpr/eval.cc#L3117-L3118),
which is a Nix path
[defined inside Nix itself.](https://github.com/NixOS/nix/blob/2afc84fddf463b22196aeb70587bc0c9259e330f/src/libexpr/eval.cc#L321)

[Later, the `fetchurl.nix` path is defined in `corepkgs`](https://github.com/NixOS/nix/blob/2afc84fddf463b22196aeb70587bc0c9259e330f/src/libexpr/eval.cc#L363)
and its contents are set to a
[generated C++ header.](https://github.com/NixOS/nix/blob/2afc84fddf463b22196aeb70587bc0c9259e330f/src/libexpr/meson.build#L129-L135)

You do not need to be in impure evaluation mode to use `corepkgs`, aka
`<nix/*>`.

## test suite of nix wasn't run

TODO

## fixed-output derivation sandboxing

TODO

## `importNative`

[`builtins.importNative`](https://nix.dev/manual/nix/2.29/command-ref/conf-file.html#conf-allow-unsafe-native-code-during-evaluation)
allows Nix expressions to import arbitrary dynamic libraries to produce Nix
expressions.

Of course, this is turned off by default as it is a security risk. You probably
shouldn't use this.

## `chromium recompressTarball`

TODO

## more than 1 million chars of indents breaks things

The weird Nix parser
[hard codes `1000000`](https://github.com/NixOS/nix/blob/2afc84fddf463b22196aeb70587bc0c9259e330f/src/libexpr/include/nix/expr/parser-state.hh#L250)
instead of `SIZE_MAX` when determining the minimum indent to strip in strings
spanning multiple lines.

So when you have a line with more than a million spaces for the indent, it is
ignored and not included in the minimum indent calculation.

# Tier 7: `wears animal ears to NixCon`

<h2><small>

```nix
nix-repl> builtins.fromJSON ''{"uwu\u0000": 1, "uwu": 2}''
{ uwu = 2; "uwu" = 1; }
```

</small></h2>

TODO

## `(_: builtins.break _)`

Historically, the [`builtins.break`](#-debugger) function used to not work
reliably in some cases, such as `let-in`'s and function calls.

This was fixed in [this merge request](https://github.com/NixOS/nix/pull/9917),
in February 8, 2024.

But before that fix, you would use `(_: builtins.break _)` or an equivalent
instead of `builtins.break` itself.

## multiplayer tic-tac-toe in nix repl

TODO

## `let e="e"; in [001.2e01e.30.4]`

TODO

## `/__corepkgs__/`

[Already explained previously.](#import-nixfetchurlnix)

## `some-expr`

TODO

## `__darwinAllowLocalNetworking`

TODO

## `builtins.derivationStrict`

TODO
