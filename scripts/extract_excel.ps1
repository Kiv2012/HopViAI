Add-Type -AssemblyName System.IO.Compression.FileSystem
$xlsxPath = (Resolve-Path "Hợp vị AI.xlsx").Path
$zip = [System.IO.Compression.ZipFile]::OpenRead($xlsxPath)

$ssEntry = $zip.GetEntry("xl/sharedStrings.xml")
$sharedStrings = @()
if ($ssEntry) {
    $reader = New-Object System.IO.StreamReader($ssEntry.Open(), [System.Text.Encoding]::UTF8)
    [xml]$ssXml = $reader.ReadToEnd()
    $reader.Close()
    $ns = New-Object System.Xml.XmlNamespaceManager($ssXml.NameTable)
    $ns.AddNamespace("s", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")
    foreach ($si in $ssXml.SelectNodes("//s:si", $ns)) {
        $text = ($si.SelectNodes(".//s:t", $ns) | ForEach-Object { $_.InnerText }) -join ""
        $sharedStrings += $text
    }
}

$shEntry = $zip.GetEntry("xl/worksheets/sheet1.xml")
$reader = New-Object System.IO.StreamReader($shEntry.Open(), [System.Text.Encoding]::UTF8)
[xml]$shXml = $reader.ReadToEnd()
$reader.Close()
$nsSh = New-Object System.Xml.XmlNamespaceManager($shXml.NameTable)
$nsSh.AddNamespace("s", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")

$rows = @()
foreach ($row in $shXml.SelectNodes("//s:row", $nsSh)) {
    $rNum = [int]$row.GetAttribute("r")
    if ($rNum -lt 3) { continue }
    $obj = [ordered]@{ row = $rNum; A = ""; B = ""; C = ""; D = ""; E = "" }
    foreach ($c in $row.SelectNodes("./s:c", $nsSh)) {
        $ref = $c.GetAttribute("r") -replace "[0-9]", ""
        $t = $c.GetAttribute("t")
        $vNode = $c.SelectSingleNode("./s:v", $nsSh)
        $isNode = $c.SelectSingleNode("./s:is", $nsSh)
        $val = ""
        if ($t -eq "s" -and $vNode) {
            $idx = [int]$vNode.InnerText
            $val = $sharedStrings[$idx]
        } elseif ($isNode) {
            $val = $isNode.InnerText
        } elseif ($vNode) {
            $val = $vNode.InnerText
        }
        if ($obj.Contains($ref)) {
            $obj[$ref] = $val.Trim()
        }
    }
    if ($obj.A -ne "" -or $obj.D -ne "") {
        $rows += [pscustomobject]$obj
    }
}
$zip.Dispose()

New-Item -ItemType Directory -Force -Path "data" | Out-Null
$json = $rows | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText((Join-Path (Get-Location).Path "data/raw_excel.json"), $json, [System.Text.Encoding]::UTF8)
Write-Output ("Extracted " + $rows.Count + " rows to data/raw_excel.json")

