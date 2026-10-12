<?php
if (!defined('ABSPATH')) {
    exit;
}

class Anbar_Error extends Exception
{
    public $status;

    public function __construct($status, $message)
    {
        parent::__construct($message);
        $this->status = $status;
    }
}

function anbar_bad($msg)
{
    return new Anbar_Error(400, $msg);
}
function anbar_forbidden($msg = 'شما اجازه این کار را ندارید.')
{
    return new Anbar_Error(403, $msg);
}
function anbar_not_found($msg = 'مورد پیدا نشد.')
{
    return new Anbar_Error(404, $msg);
}

/** Round to 3 decimals so 12.5 + 0.1 style sums stay clean. */
function anbar_r3($x)
{
    return round((float) $x, 3);
}

function anbar_to_latin($s)
{
    $s = (string) ($s ?? '');
    $s = strtr($s, [
        '۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4', '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9',
        '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4', '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9',
        '٫' => '.',
    ]);
    return $s;
}

/** Parse a positive quantity (accepts Persian digits and decimal separator). */
function anbar_qty($v, $label = 'مقدار', $allow_zero = false)
{
    $s = preg_replace('/[,٬\s]/u', '', anbar_to_latin($v));
    if ($s === '' || !is_numeric($s) || (float) $s < 0 || (!$allow_zero && (float) $s == 0)) {
        throw anbar_bad("{$label} باید عددی بزرگ‌تر از صفر باشد.");
    }
    return anbar_r3($s);
}

function anbar_str($v, $max = 500)
{
    $s = trim((string) ($v ?? ''));
    return $s === '' ? null : mb_substr($s, 0, $max);
}

function anbar_required($v, $label, $max = 500)
{
    $s = anbar_str($v, $max);
    if ($s === null) {
        throw anbar_bad("{$label} را وارد کنید.");
    }
    return $s;
}

/** ISO date YYYY-MM-DD or null. */
function anbar_date($v, $label = 'تاریخ')
{
    if ($v === null || $v === '') {
        return null;
    }
    $s = anbar_to_latin($v);
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $s, $m) || !checkdate((int) $m[2], (int) $m[3], (int) $m[1])) {
        throw anbar_bad("{$label} نامعتبر است.");
    }
    return $s;
}

function anbar_tz()
{
    return new DateTimeZone('Asia/Tehran');
}

/** Today in Tehran as YYYY-MM-DD. */
function anbar_today()
{
    return (new DateTime('now', anbar_tz()))->format('Y-m-d');
}

function anbar_add_days($iso, $n)
{
    $d = new DateTime($iso . ' 00:00:00', new DateTimeZone('UTC'));
    $d->modify(($n >= 0 ? '+' : '') . (int) $n . ' days');
    return $d->format('Y-m-d');
}

/* ---- Jalali conversion (algorithm from jalaali-js, MIT) — no intl extension needed. */
function anbar_div($a, $b)
{
    return intdiv($a, $b);
}
function anbar_mod($a, $b)
{
    return $a - intdiv($a, $b) * $b;
}
function anbar_jal_cal($jy)
{
    $breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
    $gy = $jy + 621;
    $leapJ = -14;
    $jp = $breaks[0];
    $jump = 0;
    for ($i = 1; $i < count($breaks); $i++) {
        $jm = $breaks[$i];
        $jump = $jm - $jp;
        if ($jy < $jm) {
            break;
        }
        $leapJ += anbar_div($jump, 33) * 8 + anbar_div(anbar_mod($jump, 33), 4);
        $jp = $jm;
    }
    $n = $jy - $jp;
    $leapJ += anbar_div($n, 33) * 8 + anbar_div(anbar_mod($n, 33) + 3, 4);
    if (anbar_mod($jump, 33) === 4 && $jump - $n === 4) {
        $leapJ += 1;
    }
    $leapG = anbar_div($gy, 4) - anbar_div((anbar_div($gy, 100) + 1) * 3, 4) - 150;
    $march = 20 + $leapJ - $leapG;
    if ($jump - $n < 6) {
        $n = $n - $jump + anbar_div($jump + 4, 33) * 33;
    }
    $leap = anbar_mod(anbar_mod($n + 1, 33) - 1, 4);
    if ($leap === -1) {
        $leap = 4;
    }
    return ['gy' => $gy, 'march' => $march, 'leap' => $leap];
}
function anbar_g2d($gy, $gm, $gd)
{
    $d = anbar_div(($gy + anbar_div($gm - 8, 6) + 100100) * 1461, 4) + anbar_div(153 * anbar_mod($gm + 9, 12) + 2, 5) + $gd - 34840408;
    return $d - anbar_div(anbar_div($gy + 100100 + anbar_div($gm - 8, 6), 100) * 3, 4) + 752;
}
function anbar_d2g($jdn)
{
    $j = 4 * $jdn + 139361631;
    $j = $j + anbar_div(anbar_div(4 * $jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
    $i = anbar_div(anbar_mod($j, 1461), 4) * 5 + 308;
    $gd = anbar_div(anbar_mod($i, 153), 5) + 1;
    $gm = anbar_mod(anbar_div($i, 153), 12) + 1;
    return [anbar_div($j, 1461) - 100100 + anbar_div(8 - $gm, 6), $gm, $gd];
}
function anbar_d2j($jdn)
{
    $gy = anbar_d2g($jdn)[0];
    $jy = $gy - 621;
    $r = anbar_jal_cal($jy);
    $k = $jdn - anbar_g2d($gy, 3, $r['march']);
    if ($k >= 0) {
        if ($k <= 185) {
            return [$jy, 1 + anbar_div($k, 31), anbar_mod($k, 31) + 1];
        }
        $k -= 186;
    } else {
        $jy -= 1;
        $k += 179;
        if ($r['leap'] === 1) {
            $k += 1;
        }
    }
    return [$jy, 7 + anbar_div($k, 30), anbar_mod($k, 30) + 1];
}

/** Gregorian ISO date or UTC datetime → Jalali "1405/07/20" (Latin digits, for Excel). */
function anbar_jalali($v)
{
    if (!$v) {
        return '';
    }
    try {
        if (strlen($v) <= 10) {
            $d = new DateTime($v . ' 12:00:00', new DateTimeZone('UTC'));
        } else {
            $d = new DateTime($v, new DateTimeZone('UTC'));
            $d->setTimezone(anbar_tz());
        }
    } catch (Exception $e) {
        return '';
    }
    [$y, $m, $dd] = anbar_d2j(anbar_g2d((int) $d->format('Y'), (int) $d->format('n'), (int) $d->format('j')));
    return sprintf('%d/%02d/%02d', $y, $m, $dd);
}

/** Recursively cast numeric DB strings (wpdb returns strings) to numbers for the JSON API. */
function anbar_cast($data)
{
    if (!is_array($data)) {
        return $data;
    }
    foreach ($data as $k => $v) {
        if (is_array($v)) {
            $data[$k] = anbar_cast($v);
        } elseif (is_string($k) && is_string($v) && is_numeric($v) && !in_array($k, ['national_id', 'chat_id', 'phone', 'code'], true)
            && preg_match('/^(id|ID|delta|sort|active|pinned|archived|is_read|transit|n|s)$|_id$|qty|broken|_count$|^tracks_expiry$|^batch_tracked$/', $k)) {
            $data[$k] = $v + 0;
        }
    }
    return $data;
}
