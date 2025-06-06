#!/usr/bin/env nu

def --wrapped sync [...arguments] {
  (rsync
    --compress
    --delete --recursive --force
    --delete-excluded
    --delete-missing-args
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
      LUME_DRAFTS=false nix run nixpkgs#deno -- ($deno_arguments | str join ' ')
    "

    sync ("nine:site/" + $dest_directory) ./
  } else {
    LUME_DRAFTS=false deno ...$deno_arguments
  }

  cd $dest_directory

  let host = "root@best";

  ssh -tt $host "
    rm --force --recursive /var/www/site
    mkdir /var/www/site
  "
  sync --chown nginx:users ./ ($host + ":/var/www/site")

  ssh -tt $host "
    chown nginx:users -R /var/www
    chmod 775 -R /var/www
  "

  cd -

  print $"(ansi green)Successfully uploaded!(ansi reset)"
}
