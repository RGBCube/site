---
title: "`.gitignore` is inherently Sisyphean"
description: And how to roll the rock over the edge.

color: "#A5804C"
thumbnail: /assets/images/sisyphus-ds-store.webp

date: 2024-09-30

keywords:
- vcs
---

You just started a new project. You ran `cargo init`, `poetry init` and
`go mod init`.

Those commands created the necessary files to work, it also added the following
lines to your .gitignore:

```ignore
target
__pycache__
bin
```

All great. You continue implementing features, and when the time comes, you
publish your project to your Git hosting platform of choice.

People start to get interested in your project. One even decides that he's going
to implement a new feature! Literally free work done for you!

Alright. That person uses his code editor and tools bundled with his operating
system to implement a very cool new feature. He then submits the merge request.

You start reviewing the code and notice a file quite out of place: `.DS_Store`.
You ask the person what it is, he says he has no clue.

![Hundreds of thousands of merge requests on GitHub trying
to gitignore .DS_Store](/assets/images/github-ds-store-mr-list.webp)

Whatever. You just delete the file from the branch and add the file's name to
the repositories gitignore:

```ignore
target
__pycache__
bin
.DS_Store
```

Nice. Now the code is on master, and your repository only contains relevant
information.

Then, someone using an IDE created using web technologies submits another merge
request. You look at it, and see that there is a whole directory that is
irrelevant. You tell that person to delete the directory from the branch and add
it to the gitignore. The gitignore lives on:

```ignore
target
__pycache__
bin
.DS_Store
.vscode
```

Then, someone that uses IntelliJ IDEA commits five hundred XML files and the
`.idea` directory. You repeat this process:

```ignore
target
__pycache__
bin
.DS_Store
.vscode
.idea
```

Years pass. Now your gitignore is hundreds of lines long, yet people keep
accidentally committing in test scripts, foo, a, qux, data.tar.gz, start.sh,
bin-release, cat, asd, fgsgskfh.

Hell. You feel like a mythic god undergoing punishment for cheating death and
deceiving the underworld.

![Sisyphus pushing up a boulder that has .DS_Store written
on it](/assets/images/sisyphus-ds-store.webp)

How do you escape this endless loop of ignoring files that sneak in? Maybe by
educating every single merge request author? Nope, that definitely won't work,
there should be a way to automatically handle this with tooling, rather than
subjective human communication.

Luckily, you realize that you can turn the blacklist of files (the gitignore) to
a whitelist, by just ignoring everything and manually un-ignoring desired files.
You change your gitignore to this:

```ignore
*

!.gitignore

!src/*.rs
!Cargo.{toml,lock}

!pysrc/*.py
!pyproject.toml
!poetry.lock

!cmd/*.go
!main.go
!go.{mod,sum}

!docs/*.md
```

Now, nobody can accidentally commit undesired files, as git automatically
ignores them all and only allows the files that are explicitly whitelisted. It's
also future proof, future proof until an IDE decides to use the `src/ide.rs`
file as a convenient way of storing project specific configuration. And
hopefully that future never comes.

You feel relieved.
