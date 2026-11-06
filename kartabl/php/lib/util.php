<?php
/* ابزارهای عمومی: تاریخ شمسی، اعداد فارسی، اعتبارسنجی، پاک‌سازی HTML نامه‌ها */
if (!defined('KT')) exit;

class OpError extends Exception {}
function need($cond, $msg) { if (!$cond) throw new OpError($msg); }

const FA_D = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
function fa($s) { return str_replace(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], FA_D, (string)$s); }
function en($s) {
  $s = (string)$s;
  $s = str_replace(FA_D, ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], $s);
  return str_replace(['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'], ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], $s);
}
function pad($n, $w = 2) { return str_pad((string)$n, $w, '0', STR_PAD_LEFT); }
function uid() { return substr(bin2hex(random_bytes(6)), 0, 9) . substr(base_convert((string)(int)(microtime(true) * 1000), 10, 36), -4); }
function stamp() { $t = microtime(true); return gmdate('Y-m-d\TH:i:s', (int)$t) . sprintf('.%03dZ', ($t - floor($t)) * 1000); }
function stampMs($s) { $t = strtotime($s); return $t === false ? 0 : $t * 1000; }
function str($v, $max = 4000) { if (is_array($v) || is_object($v)) return ''; return mb_substr(trim((string)($v ?? '')), 0, $max); }
function money($n) { return fa(number_format(round((float)$n))) . ' ریال'; }

/* ---------- تاریخ شمسی ---------- */
function g2j($gy, $gm, $gd) {
  $gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  $gy2 = $gm > 2 ? $gy + 1 : $gy;
  $days = 355666 + 365 * $gy + intdiv($gy2 + 3, 4) - intdiv($gy2 + 99, 100) + intdiv($gy2 + 399, 400) + $gd + $gdm[$gm - 1];
  $jy = -1595 + 33 * intdiv($days, 12053); $days %= 12053;
  $jy += 4 * intdiv($days, 1461); $days %= 1461;
  if ($days > 365) { $jy += intdiv($days - 1, 365); $days = ($days - 1) % 365; }
  $jm = $days < 186 ? 1 + intdiv($days, 31) : 7 + intdiv($days - 186, 30);
  $jd = 1 + ($days < 186 ? $days % 31 : ($days - 186) % 30);
  return [$jy, $jm, $jd];
}
function j2g($jy, $jm, $jd) {
  $jy += 1595;
  $days = -355668 + 365 * $jy + intdiv($jy, 33) * 8 + intdiv(($jy % 33) + 3, 4) + $jd + ($jm < 7 ? ($jm - 1) * 31 : ($jm - 7) * 30 + 186);
  $gy = 400 * intdiv($days, 146097); $days %= 146097;
  if ($days > 36524) { $days--; $gy += 100 * intdiv($days, 36524); $days %= 36524; if ($days >= 365) $days++; }
  $gy += 4 * intdiv($days, 1461); $days %= 1461;
  if ($days > 365) { $gy += intdiv($days - 1, 365); $days = ($days - 1) % 365; }
  $gd = $days + 1;
  $ml = [0, 31, (($gy % 4 == 0 && $gy % 100 != 0) || $gy % 400 == 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  for ($gm = 0; $gm < 13 && $gd > $ml[$gm]; $gm++) $gd -= $ml[$gm];
  return [$gy, $gm, $gd];
}
function isoToJ($iso) { $p = array_map('intval', explode('-', substr($iso, 0, 10))); return g2j($p[0], $p[1], $p[2]); }
function jToIso($y, $m, $d) { $g = j2g($y, $m, $d); return sprintf('%04d-%02d-%02d', $g[0], $g[1], $g[2]); }
function jMonthLen($y, $m) { if ($m <= 6) return 31; if ($m <= 11) return 30; $b = isoToJ(jToIso($y, 12, 30)); return ($b[1] == 12 && $b[2] == 30) ? 30 : 29; }
function tzNow() { return new DateTime('now', new DateTimeZone('Asia/Tehran')); }
function todayISO() { return tzNow()->format('Y-m-d'); }
function nowHM() { return tzNow()->format('H:i'); }
function jYearNow() { return isoToJ(todayISO())[0]; }
function isoOfStamp($s) { $d = new DateTime($s); $d->setTimezone(new DateTimeZone('Asia/Tehran')); return $d->format('Y-m-d'); }
function addDays($iso, $n) { $d = new DateTime($iso . ' 12:00:00', new DateTimeZone('UTC')); $d->modify(($n >= 0 ? '+' : '') . $n . ' day'); return $d->format('Y-m-d'); }
function daysBetween($a, $b) { return (int)round((strtotime($b . ' 12:00:00 UTC') - strtotime($a . ' 12:00:00 UTC')) / 86400); }
function jd($iso) { if (!$iso) return '—'; $j = isoToJ($iso); return fa(sprintf('%d/%02d/%02d', $j[0], $j[1], $j[2])); }
/* تاریخ معتبر واقعی (نه فقط ظاهر): ۲۰۲۶-۰۲-۳۰ رد می‌شود */
function isDate($s) {
  if (!is_string($s) || !preg_match('/^(\d{4})-(\d\d)-(\d\d)$/', $s, $m)) return false;
  if (!checkdate((int)$m[2], (int)$m[3], (int)$m[1])) return false;
  return $m[1] >= 1900 && $m[1] <= 2200;
}
function isTime($s) { return is_string($s) && preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $s); }
function needDate($s, $label, $req = true) { if (!$req && ($s === '' || $s === null)) return ''; need(isDate($s), $label . ' معتبر نیست.'); return $s; }
function phoneOk($p) { return (bool)preg_match('/^(0?9\d{9}|0\d{10})$/', $p); }
function cleanPhone($p) { return preg_replace('/\D/', '', en($p)); }
const LABEL_BAD = '/[<>"\'`&]/';
function label($v, $what, $max = 200) { $s = str($v, $max); need($s !== '', $what . ' را بنویسید.'); need(!preg_match(LABEL_BAD, $s), $what . ' نباید شامل نویسه‌های < > " \' ` & باشد.'); return $s; }
function num($v) { $s = str_replace([',', '٬', ' '], '', en((string)$v)); return $s === '' ? null : (is_numeric($s) ? $s + 0 : NAN); }

/* ---------- پاک‌سازی متن قالب‌دار نامه ----------
   فقط برچسب‌ها و ویژگی‌های بی‌خطر می‌ماند؛ اسکریپت، رویداد، پیوند خارجی و سبک دلخواه حذف می‌شود */
function sanitizeHtml($html, $max = 200000) {
  $html = (string)$html;
  if (mb_strlen($html) > $max) $html = mb_substr($html, 0, $max);
  if (trim(strip_tags($html)) === '' && stripos($html, '<table') === false) return '';
  $allowed = ['p' => 1, 'br' => 1, 'b' => 1, 'strong' => 1, 'i' => 1, 'em' => 1, 'u' => 1, 's' => 1, 'ul' => 1, 'ol' => 1, 'li' => 1, 'h3' => 1, 'h4' => 1,
    'blockquote' => 1, 'table' => 1, 'thead' => 1, 'tbody' => 1, 'tr' => 1, 'td' => 1, 'th' => 1, 'div' => 1, 'span' => 1, 'hr' => 1, 'sup' => 1, 'sub' => 1];
  $classOk = ['al-r', 'al-c', 'al-l', 'al-j', 'fs-s', 'fs-l', 'fs-xl', 'ind'];
  libxml_use_internal_errors(true);
  $doc = new DOMDocument('1.0', 'UTF-8');
  $doc->loadHTML('<?xml encoding="UTF-8"><div id="kt-root">' . $html . '</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD | LIBXML_NONET);
  libxml_clear_errors();
  $root = $doc->getElementById('kt-root');
  if (!$root) return htmlspecialchars(strip_tags($html), ENT_QUOTES, 'UTF-8');
  $walk = function ($node) use (&$walk, $allowed, $classOk, $doc) {
    for ($i = $node->childNodes->length - 1; $i >= 0; $i--) {
      $c = $node->childNodes->item($i);
      if ($c instanceof DOMElement) {
        $tag = strtolower($c->tagName);
        if (in_array($tag, ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'form', 'input', 'button', 'textarea', 'select', 'link', 'meta', 'img', 'video', 'audio', 'template'])) { $node->removeChild($c); continue; }
        $walk($c);
        if (!isset($allowed[$tag])) { while ($c->firstChild) $node->insertBefore($c->firstChild, $c); $node->removeChild($c); continue; }
        $keep = [];
        if ($c->hasAttribute('class')) $keep['class'] = implode(' ', array_intersect(preg_split('/\s+/', $c->getAttribute('class')), $classOk));
        if (in_array($tag, ['td', 'th']) && $c->hasAttribute('colspan')) $keep['colspan'] = (string)min(20, max(1, (int)$c->getAttribute('colspan')));
        if ($c->hasAttribute('dir') && in_array($c->getAttribute('dir'), ['rtl', 'ltr'])) $keep['dir'] = $c->getAttribute('dir');
        $st = strtolower($c->getAttribute('style'));
        if (preg_match('/text-align\s*:\s*(right|center|left|justify)/', $st, $m)) $keep['class'] = trim(($keep['class'] ?? '') . ' al-' . ['right' => 'r', 'center' => 'c', 'left' => 'l', 'justify' => 'j'][$m[1]]);
        while ($c->attributes->length) $c->removeAttribute($c->attributes->item(0)->name);
        foreach ($keep as $k => $v) if ($v !== '') $c->setAttribute($k, $v);
      } elseif ($c instanceof DOMComment || $c instanceof DOMProcessingInstruction) $node->removeChild($c);
    }
  };
  $walk($root);
  $out = '';
  foreach ($root->childNodes as $c) $out .= $doc->saveHTML($c);
  return $out;
}
function htmlText($html) { return trim(preg_replace('/\s+/u', ' ', html_entity_decode(strip_tags(str_replace(['</p>', '<br>', '</li>', '</div>'], ' ', (string)$html)), ENT_QUOTES, 'UTF-8'))); }
