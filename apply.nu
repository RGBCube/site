#!/usr/bin/env nu

def --wrapped sync [...arguments] {
 (rsync
    --archive
    --compress

    --delete --recursive --force
    --delete-excluded
    --delete-missing-arguments

    --human-readable
    --delay-updates
    ...$arguments)
}

# Applies the changes to the site by uploading it to the VPS.
def main [] {
  const dest_directory = "_site_production"
  const deno_arguments = [ "task", "build", "--dest", $dest_directory, "--location", "https://rgbcu.be/" ]

  if (pwd | str starts-with "/data/data/com.termux") {
    sync ./ nine:site

    ssh -tt nine $"
      cd site
      LUME_DRAFTS=false nix run nixpkgs#deno -- ($deno_arguments | str join ' ') | ignore
    "

    sync ("nine:site/" + $dest_directory) ./
  } else {
    LUME_DRAFTS=false deno ...$deno_arguments | ignore
  }

  cd $dest_directory

  let host        = "root@best";
  let remote_path = "/var/www/site"

  (sync
      --chown "nginx:users"
      --chmod "Du=rwx,Dg=rwx,Do=rx,Fu=rw,Fg=r,Fo=r" # DIRS: 775, FILES: 664
      --rsync-path $"mkdir ($remote_path); rsync"
      ./ ($host + ":" + $remote_path))

  cd -

  print $"(ansi green)Successfully uploaded!(ansi reset)"
}
