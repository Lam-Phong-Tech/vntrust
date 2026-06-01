Add-Type -AssemblyName System.IO.Compression.FileSystem
$docPath = (Get-ChildItem -Path "c:\xampp\htdocs\Web-chong-hang-gia-main" -Filter "16.*.docx")[0].FullName
$zip = [System.IO.Compression.ZipFile]::OpenRead($docPath)
$entry = $zip.Entries | Where-Object { $_.FullName -eq "word/document.xml" }
$stream = $entry.Open()
$reader = New-Object System.IO.StreamReader($stream)
$xmlString = $reader.ReadToEnd()
$reader.Close()
$zip.Dispose()

$text = $xmlString -replace "<w:p[^>]*>", "`n" -replace "<[^>]+>", ""
Write-Output $text
