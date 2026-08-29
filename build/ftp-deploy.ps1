param(
  [string]$LocalFile = "c:\xampp\htdocs\code\iptv\cinema hub\megahent-cpanel-deploy.zip",
  [string]$RemotePath = "/public_html/megahent-cpanel-deploy.zip"
)
$ErrorActionPreference = 'Stop'
$user = 'archazew@movies.archimnet.com'
$pass = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('YXJjaGltQDEyMzRhcA=='))

function New-Ftp($method, $url) {
  $req = [Net.FtpWebRequest]::Create($url)
  $req.Credentials = New-Object Net.NetworkCredential($user, $pass)
  $req.Method = $method
  $req.UseBinary = $true
  $req.UsePassive = $true
  return $req
}

$log = "c:\xampp\htdocs\code\iptv\cinema hub\build\ftp-probe.log"
$out = @()
foreach ($h in @('ftp.archimnet.com','movies.archimnet.com','archimnet.com')) {
  foreach ($p in @(21, 990)) {
    try {
      $c = New-Object Net.Sockets.TcpClient
      $iar = $c.BeginConnect($h, $p, $null, $null)
      $ok = $iar.AsyncWaitHandle.WaitOne(4000, $false)
      if ($ok -and $c.Connected) { $out += "$h`:$p -> OPEN" } else { $out += "$h`:$p -> closed/timeout" }
      $c.Close()
    } catch { $out += "$h`:$p -> error: $($_.Exception.Message)" }
  }
}
$out | Out-File $log -Encoding utf8
"DONE" | Out-File $log -Append -Encoding utf8
