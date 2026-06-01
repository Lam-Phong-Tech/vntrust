Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead('C:\xampp\htdocs\Web-chong-hang-gia-main\📋 TÀI LIỆU CHI TIẾT NGHIỆP VỤ HỆ THỐNG VNTRUST.docx')
$entry = $zip.GetEntry('word/document.xml')
$stream = $entry.Open()
$reader = New-Object System.IO.StreamReader($stream)
$xml = $reader.ReadToEnd()
$reader.Close()
$stream.Close()
$zip.Dispose()
$text = $xml -replace '<[^>]+>', ' '
$text = $text -replace '\s+', ' '
Out-File -FilePath 'C:\xampp\htdocs\Web-chong-hang-gia-main\vntrust\vntrust_doc_extracted.txt' -InputObject $text -Encoding UTF8
