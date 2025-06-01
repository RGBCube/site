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
  if (pwd | str starts-with "/data/data/com.termux") {
    sync ./ nine:site

    ssh -tt nine "
      cd site
      LUME_DRAFTS=false nix run default#deno -- task build --location https://rgbcu.be/
    "

    sync nine:site/_site ./
  } else {
    LUME_DRAFTS=false deno task build --location https://rgbcu.be/
  }

  cd _site

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
