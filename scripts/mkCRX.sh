#!/bin/bash -e
#
# Purpose: Pack a Chromium extension directory into crx format

if test $# -ne 3; then
  echo "Usage: mkCRX.sh <extension dir> <pem path> <output name>"
  echo "Note: No need to add the .crx suffix -- we'll take care of that."
  exit 1
fi

dir_orig=$1
dir="._tmp_$RANDOM"
key=$2
#name=$(basename "$dir")
name=`echo $3 | perl -pe 's/.crx$//'`
crx="$name.crx"
pub="$name.pub"
sig="$name.sig"
zip="$name.zip"
trap 'rm -f "$pub" "$sig" "$zip"' EXIT

if [ -d $dir ]; then
	rm -rf $dir
fi

`cp -RL $dir_orig $dir`

# zip up the crx dir
cwd=$(pwd -P)
(cd "$dir" && zip -qr -9 -X "$cwd/$zip" .)

# signature
openssl sha1 -sha1 -binary -sign "$key" < "$zip" > "$sig"

# public key
openssl rsa -pubout -outform DER < "$key" > "$pub" 2>/dev/null

byte_swap () {
  # Take "abcdefgh" and return it as "ghefcdab"
  echo "${1:6:2}${1:4:2}${1:2:2}${1:0:2}"
}

crmagic_hex="4372 3234" # Cr24
version_hex="0200 0000" # 2
pub_len_hex=$(byte_swap $(printf '%08x\n' $(ls -l "$pub" | awk '{print $5}')))
sig_len_hex=$(byte_swap $(printf '%08x\n' $(ls -l "$sig" | awk '{print $5}')))
(
  echo "$crmagic_hex $version_hex $pub_len_hex $sig_len_hex" | xxd -r -p
  cat "$pub" "$sig" "$zip"
) > "$crx"
echo "Wrote $crx"

`rm -rf $dir`
