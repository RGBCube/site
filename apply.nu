#!/usr/bin/env nu

def --wrapped sync [...arguments] {
  (rsync
    --rsh "ssh -q"
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

    ssh -qtt nine "
      cd site
      LUME_DRAFTS=false nix run default#deno -- task build --location https://rgbcu.be/
    "

    sync nine:site/_site ./
  } else {
    LUME_DRAFTS=false deno task build --location https://rgbcu.be/
  }

  cd _site

  for host in [best, disk] {
    ssh -qtt $host "sudo nu -c '
      mkdir /var/www
      chown nginx:users -R /var/www
      chmod 775 -R /var/www
    '"
    sync --chown nginx:users ./ ($host + ":/var/www/site")

    ssh -qtt $host "sudo nu -c '
      chown nginx:users -R /var/www
      chmod 775 -R /var/www
    '"
  }

  cd -

  print $"(ansi green)Successfully uploaded!(ansi reset)"
}
