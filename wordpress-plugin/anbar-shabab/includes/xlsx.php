<?php
/** Minimal .xlsx writer (one right-to-left sheet, bold header row). Needs no ZipArchive. */
if (!defined('ABSPATH')) {
    exit;
}

function anbar_xml_esc($s)
{
    $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', (string) $s);
    return htmlspecialchars($s, ENT_QUOTES | ENT_XML1, 'UTF-8');
}

function anbar_col_name($i)
{
    $s = '';
    for ($i += 1; $i > 0; $i = intdiv($i - 1, 26)) {
        $s = chr(65 + (($i - 1) % 26)) . $s;
    }
    return $s;
}

function anbar_build_xlsx($sheet_name, $headers, $rows)
{
    $line = function ($cells, $r, $style) {
        $out = "<row r=\"{$r}\">";
        foreach (array_values($cells) as $c => $v) {
            if ($v === null || $v === '') {
                continue;
            }
            $ref = anbar_col_name($c) . $r;
            if (is_int($v) || is_float($v)) {
                $out .= "<c r=\"{$ref}\"{$style}><v>{$v}</v></c>";
            } else {
                $out .= "<c r=\"{$ref}\" t=\"inlineStr\"{$style}><is><t xml:space=\"preserve\">" . anbar_xml_esc($v) . '</t></is></c>';
            }
        }
        return $out . '</row>';
    };
    $cols = '';
    foreach ($headers as $c => $h) {
        $w = mb_strlen($h) + 2;
        foreach ($rows as $row) {
            $w = max($w, mb_strlen((string) ($row[$c] ?? '')) + 2);
        }
        $w = min(60, max(8, $w));
        $cols .= '<col min="' . ($c + 1) . '" max="' . ($c + 1) . "\" width=\"{$w}\" customWidth=\"1\"/>";
    }
    $data = $line($headers, 1, ' s="1"');
    foreach ($rows as $i => $row) {
        $data .= $line($row, $i + 2, '');
    }
    $head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    $files = [
        '[Content_Types].xml' => $head . '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
        '_rels/.rels' => $head . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
        'xl/workbook.xml' => $head . '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="' . anbar_xml_esc(mb_substr($sheet_name, 0, 31)) . '" sheetId="1" r:id="rId1"/></sheets></workbook>',
        'xl/_rels/workbook.xml.rels' => $head . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
        'xl/styles.xml' => $head . '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Tahoma"/></font><font><b/><sz val="11"/><name val="Tahoma"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf fontId="0"/><xf fontId="1" applyFont="1"/></cellXfs></styleSheet>',
        'xl/worksheets/sheet1.xml' => $head . '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView rightToLeft="1" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>' . $cols . '</cols><sheetData>' . $data . '</sheetData></worksheet>',
    ];
    return anbar_zip($files);
}

function anbar_zip($files)
{
    $local = '';
    $central = '';
    $offset = 0;
    foreach ($files as $name => $raw) {
        $data = gzdeflate($raw, 6);
        $crc = crc32($raw);
        $hdr = pack('VvvvVVVVvv', 0x04034b50, 20, 0x0800, 8, 0, $crc, strlen($data), strlen($raw), strlen($name), 0);
        $local .= $hdr . $name . $data;
        $central .= pack('VvvvvVVVVvvvvvVV', 0x02014b50, 20, 20, 0x0800, 8, 0, $crc, strlen($data), strlen($raw), strlen($name), 0, 0, 0, 0, 0, $offset) . $name;
        $offset += strlen($hdr) + strlen($name) + strlen($data);
    }
    $n = count($files);
    return $local . $central . pack('VvvvvVVv', 0x06054b50, 0, 0, $n, $n, strlen($central), $offset, 0);
}
