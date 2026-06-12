#!/usr/bin/env nu

# Applies the changes to the site by uploading it to the VPS.
def main [] {
  const dest_directory = "_site_production"

  LUME_DRAFTS=false deno task build --dest $dest_directory --location "https://rgbcu.be/" | ignore

  cd $dest_directory

  let remote_path = "/var/www/site"

  rclone sync --create-empty-src-dirs ./ $":sftp,host=rgbcu.be,port=2222,user=root:($remote_path)"

  # rclone can't set ownership or permissions over SFTP. DIRS: 775, FILES: 664
  ssh -p 2222 root@rgbcu.be $"
    chown -R nginx:users ($remote_path)
    glob ($remote_path)/** --no-file | par-each { chmod 775 $in } | ignore
    glob ($remote_path)/** --no-dir | par-each { chmod 664 $in } | ignore
  "

  cd -

  print $"(ansi green)Successfully uploaded!(ansi reset)"
}
