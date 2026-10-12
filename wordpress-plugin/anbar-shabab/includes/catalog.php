<?php
/** Asset cards (شناسنامه اموال): item types with their specific fields, and completeness checks. */
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Type-specific fields. Each field: [key, label, kind] where kind is 'text' or 'long' (multi-line).
 * All values are free text so nothing is limited to preset choices.
 */
function anbar_item_types()
{
    return [
        'camera' => ['label' => 'دوربین', 'fields' => [
            ['kind_of', 'نوع دوربین', 'text'], ['resolution', 'وضوح تصویر', 'text'], ['lens', 'لنز', 'text'], ['battery', 'باتری', 'text'],
            ['memory', 'حافظه / کارت', 'text'], ['charger', 'شارژر', 'text'], ['ports', 'اتصال‌ها', 'text'], ['extras', 'متعلقات', 'long'],
        ]],
        'audio' => ['label' => 'باند و تجهیزات صوت', 'fields' => [
            ['active', 'اکتیو یا پسیو', 'text'], ['size', 'اندازه', 'text'], ['power', 'توان اعلام‌شده سازنده', 'text'], ['impedance', 'امپدانس', 'text'],
            ['io', 'ورودی و خروجی', 'text'], ['sound_quality', 'کیفیت صدا', 'long'],
        ]],
        'mic' => ['label' => 'میکروفون', 'fields' => [
            ['wired', 'سیمی یا بی‌سیم', 'text'], ['connector', 'اتصال', 'text'], ['receiver', 'گیرنده', 'text'], ['transmitter', 'فرستنده', 'text'],
            ['power_source', 'منبع تغذیه', 'text'], ['extras', 'لوازم همراه', 'long'],
        ]],
        'cable' => ['label' => 'کابل', 'fields' => [
            ['cable_type', 'نوع کابل', 'text'], ['cores', 'تعداد رشته', 'text'], ['gauge', 'ضخامت', 'text'], ['total_length', 'متراژ کل', 'text'],
            ['pieces', 'تعداد قطعات', 'text'], ['piece_lengths', 'طول هر قطعه', 'text'], ['connectors', 'سوکت‌ها', 'text'], ['connection_health', 'سلامت اتصال', 'long'],
        ]],
        'tool' => ['label' => 'ابزار کارگاه', 'fields' => [
            ['tool_type', 'نوع ابزار', 'text'], ['size', 'اندازه', 'text'], ['power', 'توان', 'text'], ['power_source', 'منبع تغذیه', 'text'],
            ['extras', 'متعلقات', 'long'],
        ]],
        'book' => ['label' => 'کتاب', 'fields' => [
            ['title', 'عنوان', 'text'], ['author', 'نویسنده', 'text'], ['translator', 'مترجم', 'text'], ['publisher', 'ناشر', 'text'],
            ['year', 'سال چاپ', 'text'], ['edition', 'نوبت چاپ', 'text'], ['isbn', 'شابک', 'text'], ['subject', 'موضوع', 'text'],
            ['copies', 'تعداد نسخه', 'text'], ['shelf', 'قفسه', 'text'], ['binding', 'وضعیت جلد و صفحات', 'long'],
        ]],
        'medicine' => ['label' => 'دارو', 'fields' => [
            ['brand_name', 'نام تجاری', 'text'], ['generic', 'نام ژنریک', 'text'], ['form', 'شکل دارویی', 'text'], ['dose', 'دوز یا غلظت', 'text'],
            ['manufacturer', 'سازنده', 'text'], ['per_pack', 'تعداد در بسته', 'text'], ['storage', 'شرایط نگهداری', 'long'],
        ]],
        'food' => ['label' => 'مواد غذایی', 'fields' => [
            ['weight', 'وزن یا حجم', 'text'], ['packs', 'تعداد بسته', 'text'], ['contents', 'محتویات هر بسته', 'text'], ['production', 'تاریخ تولید', 'text'],
            ['storage', 'شرایط نگهداری', 'long'],
        ]],
        'other' => ['label' => 'سایر اموال', 'fields' => [
            ['kind_of', 'نوع', 'text'], ['usage_place', 'محل استفاده', 'text'],
        ]],
    ];
}

/** Fields every card has, kept in the `details` JSON (free text, all optional). */
function anbar_general_fields()
{
    return [
        ['material', 'جنس'], ['color', 'رنگ'], ['dimensions', 'ابعاد'], ['weight', 'وزن'], ['appearance', 'کیفیت و وضعیت ظاهری'],
        ['function_status', 'وضعیت عملکرد'], ['accessories', 'قطعات و لوازم همراه'], ['missing_parts', 'قطعات مفقود'], ['warranty', 'گارانتی'],
    ];
}

function anbar_card_statuses()
{
    return ['draft' => 'پیش‌نویس', 'incomplete' => 'نیازمند تکمیل', 'reviewed' => 'بررسی‌شده'];
}

/** Clean the details JSON coming from the form. */
function anbar_clean_details($raw, $type)
{
    $raw = is_array($raw) ? $raw : [];
    $out = ['specs' => [], 'custom' => []];
    foreach (anbar_general_fields() as [$k]) {
        $v = anbar_str($raw[$k] ?? '', 2000);
        if ($v !== null) {
            $out[$k] = $v;
        }
    }
    $types = anbar_item_types();
    foreach (($types[$type]['fields'] ?? []) as [$k]) {
        $v = anbar_str($raw['specs'][$k] ?? '', 2000);
        if ($v !== null) {
            $out['specs'][$k] = $v;
        }
    }
    foreach ((array) ($raw['custom'] ?? []) as $c) {
        $label = anbar_str($c['label'] ?? '', 100);
        $value = anbar_str($c['value'] ?? '', 2000);
        if ($label && $value !== null) {
            $out['custom'][] = ['label' => $label, 'value' => $value];
        }
    }
    return $out;
}

/** What is still missing on a card (shown to the person completing cards). */
function anbar_card_missing($item, $photo_count)
{
    $d = json_decode($item['details'] ?? '', true) ?: [];
    $miss = [];
    if (!$item['category']) {
        $miss[] = 'دسته‌بندی';
    }
    if (!$item['location']) {
        $miss[] = 'محل نگهداری';
    }
    if (!$photo_count) {
        $miss[] = 'عکس';
    }
    if (in_array($item['item_type'], ['camera', 'audio', 'mic', 'tool', 'cable', 'other'], true)) {
        if (!$item['brand']) {
            $miss[] = 'برند';
        }
        if (!$item['model'] && $item['item_type'] !== 'cable') {
            $miss[] = 'مدل';
        }
        if (empty($d['function_status']) && !$item['condition_notes']) {
            $miss[] = 'شرح سلامت';
        }
    }
    if ($item['item_type'] === 'book' && empty($d['specs']['author'])) {
        $miss[] = 'نویسنده';
    }
    if ($item['item_type'] === 'medicine' && empty($d['specs']['dose'])) {
        $miss[] = 'دوز';
    }
    if ($item['purchase_price'] === null && $item['current_value'] === null && !in_array($item['item_type'], ['food', 'medicine'], true)) {
        $miss[] = 'قیمت یا ارزش';
    }
    return $miss;
}
