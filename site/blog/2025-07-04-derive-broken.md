---
title: "`#[derive(Clone)]` is broken"
description: "Not just `#[derive(Clone)]`, but all of the standard trait derives"

tags:
- rust
---

```rs
use std::sync::Arc;

struct NoClone;

#[derive(Clone)]
struct WrapArc<T>(Arc<T>);

fn main() {
  let foo = WrapArc(Arc::new(NoClone));
  let foo_ = foo.clone();
}
```

Do you think this code should compile?

What about the following code:

```rs
struct AlwaysEq<T>(T);

impl<T> PartialEq for AlwaysEq<T> {
   fn eq(&self, _other: &Self) -> bool {
      true
   }
}

impl<T> Eq for AlwaysEq<T> {}

struct NotEq;

#[derive(PartialEq, Eq)]
struct WrapAlwaysEq<T>(AlwaysEq<T>);

fn assert_is_eq(_: impl Eq) {}

fn main() {
   let x = WrapAlwaysEq(AlwaysEq(NotEq));
   assert_is_eq(x);
}
```

The second example is a bit far fetched, but you probably answered yes.

But neither do.

# Why not?

The
[implementation of `#[derive(Clone)] in the Rust compiler`](https://github.com/rust-lang/rust/blob/0c4fa2690de945f062668acfc36b3f8cfbd013e2/compiler/rustc_builtin_macros/src/deriving/clone.rs)
generates a `Clone` implementation with the following requirements on the
derived type:

- All fields must be `Clone`.
- All generic parameters must be `Clone`.

Can you spot the issue here? It's the latter requirement: **we cannot just
require all generic parameters to be `Clone`, as we cannot assume they are used
in such a way that requires them to be cloned**.[^The reason this is the way it
is is probably because Rust's type system wasn't powerful enough for this to be
implemented back in the pre-1.0 days. Or it was just a simple oversight that got
stabilized.]

This applies to practically all builtin derive traits, such as `Clone`,
`PartialEq`, `Eq`, or
[even `Debug`](https://play.rust-lang.org/?version=stable&mode=debug&edition=2024&gist=b419e34c9f00d0fca92c40739f6c9fb2).

# What can we do to fix this?

There are two solutions to this. Both require deleting that second requirement.

## The hard way

We could create a Rust RFC, hopefully not bikeshed it to death, and get it
stabilized in the next Rust edition as it is a breaking change.[^Surely it is a
breaking change, or the compiler people would've fixed it already. Right?]

This would take 4+ years to stabilize and be available to everyone. That sucks,
but is the correct thing to do in the long-term.

## The quick way

We can just write our own macro that generates the following code:

```rs
/* input */
#[derive(CustomClone)]
struct WrapArc<T>(Arc<T>);

/* generated code */
impl<T> Clone for WrapArc<T>
where
   Arc<T>: Clone,
   // and so on, `FieldType: DerivedTrait` for each field
{
   // ...
}
```

This does the job correctly.

And it's not even hard to do. I know people who do this internally in their
company codebases - it's not much code.

So I've [opened an issue](https://github.com/JelteF/derive_more/issues/490)
about replicating the builtin derive traits in a less restrictive and thus
correct way in the `derive_more` crate's GitHub repository. The reason I chose
this crate is because it already has a lot of users and is the main place for
derive implementations.

Replicating already-existing behaviour of the std may not be in the scope of the
crate, which is a perfectly fine stance to take. If that doesn't get accepted,
I'll probably create my own crate and release it on
[crates.io](https://crates.io/).

Stay tuned, I'll update this blog post.
