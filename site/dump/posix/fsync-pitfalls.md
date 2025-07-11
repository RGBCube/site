---
title: "`fsync(2)` Pitfalls"
date: 2025-07-11
---

# `fsync` Pitfalls

This is a non-comprehensive list of the pitfalls of the `fsync` syscall.

<details>
<summary>

Linux `man 2 fsync`

</summary>

> `fsync()` transfers ("flushes") all modified in-core data of (i.e., modified
> buffer cache pages for) the file referred to by the file descriptor fd to the
> disk device (or other permanent storage device) so that all changed
> information can be retrieved even if the system crashes or is rebooted. This
> includes writing through or flushing a disk cache if present. The call blocks
> until the device reports that the transfer has completed.
>
> As well as flushing the file data, `fsync()` also flushes the metadata
> information associated with the file (see inode(7)).
>
> Calling `fsync()` does not necessarily ensure that the entry in the directory
> containing the file has also reached disk. For that an explicit `fsync()` on a
> file descriptor for the directory is also needed.
>
> `fdatasync()` is similar to `fsync()`, but does not flush modified metadata
> unless that metadata is needed in order to allow a subsequent data retrieval
> to be correctly handled. For example, changes to st_atime or st_mtime
> (respectively, time of last access and time of last modification; see
> inode(7)) do not require flushing because they are not necessary for a
> subsequent data read to be handled correctly. On the other hand, a change to
> the file size (st_size, as made by say ftruncate(2)), would require a metadata
> flush.
>
> The aim of `fdatasync()` is to reduce disk activity for applications that do
> not require all metadata to be synchronized with the disk.

</details>

I will expand this list as I have more questions about all the questionable
filesystems used and created by operating system enthusiasts.

## `fsync` does not ensure that a `fsync`'d file is visible in its parent directory

From the manpage:

> Calling `fsync()` does not necessarily ensure that the entry in the directory
> containing the file has also reached disk. For that an explicit `fsync()` on a
> file descriptor for the directory is also needed.

This means that that you cannot rely on a file being in the directory after
`fsync`ing the file itself. You have to `fsync` the directory too.

Speaking about `fsync`ing a directory:

## `fsync` on a directory does not ensure children are `fsync`'d

From the manpage:

> Calling `fsync()` does not necessarily ensure that the entry in the directory
> containing the file has also reached disk. For that an explicit `fsync()` on a
> file descriptor for the directory is also needed.

The assumption that `fsync` a directory will fsync the files themselves is also
wrong. You can imagine a directory as a file containing a list of children, and
the list is just pointers to inodes. So `fsync`ing a directory will just write
the list of pointers to disk.

## More reading on `fsync` and other things related to files

- [(danluu) Fsyncgate: Errors on `fsync` are unrecoverable](https://danluu.com/fsyncgate/)
- [(danluu) Files are hard](https://danluu.com/file-consistency/)
- [(puzpuzpuz) The secret life of `fsync`](https://puzpuzpuz.dev/the-secret-life-of-fsync)
- [(stackoverflow) Difference between `syncfs` (Linux only) and `fsync` (POSIX)](https://stackoverflow.com/questions/48171855/what-is-the-difference-between-fsync-and-syncfs)
  (TL;DR: `syncfs` is "pretty please" fsync and doesn't block until the
  operation is done)
- [(transactional.blog) Userland Disk I/O](https://transactional.blog/how-to-learn/disk-io)
- [(LWN) Feathersticth: Killing `fsync` softly](https://lwn.net/Articles/354861/)
- [(stackoverflow) Your Program ---~~`fflush`~~---> Your OS ---~~`fsync`~~---> Your Disk](https://stackoverflow.com/questions/2340610/difference-between-fflush-and-fsync)
- [(despairlabs) `fsync()` after `open()` is an elaborate no-op](https://despairlabs.com/blog/posts/2025-03-13-fsync-after-open-is-an-elaborate-no-op/)
- [(Postgres Wiki) `fsync` errors](https://wiki.postgresql.org/wiki/Fsync_Errors)
