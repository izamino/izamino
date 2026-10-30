/* =====================================================================
   داده‌های نمونه آغازین (برای آشنایی با سامانه؛ از «تنظیمات › پشتیبان‌گیری» قابل پاک‌سازی است)
   ===================================================================== */
function seed() {
  const T = todayISO();
  const D = {
    ver: 1, seq: {}, positions: [], users: [], posHistory: [], letters: [], orders: [], tasks: [], requests: [], reservations: [], meetings: [],
    warehouses: [], assets: [], movements: [], tx: [], payreqs: [], budgets: [], commitments: [], decrees: [], leaves: [], missions: [], contracts: [],
    registry: {}, notifs: [], sms: [], audit: [], flags: {},
    settings: {
      orgName: 'مجتمع مسجدمحور شباب اهل‌الجنه', payThreshold: 500000000,
      sms: { enabled: true, provider: 'سامانه پیامکی (تنظیم نشده)', sender: '3000xxxx', events: { request: true, letter: true, order: true, decision: true, due: true, overdue: true, meeting: true, reservation: true }, roles: ['imam', 'manager', 'office'] },
      backups: []
    }
  };
  DB = D;
  migrate(D);
  const prevME = ME;
  const at = (off, hm = '10:00') => { SEED_TS = new Date(addDays(T, off) + 'T' + hm + ':00+03:30').toISOString(); };
  const as = pid => { ME = { user: D.users.find(u => u.posId === pid), pos: D.positions.find(p => p.id === pid) }; };

  /* جایگاه‌ها: امام جماعت + سه جایگاه اصلی برای هر مدیریت */
  D.positions.push({ id: 'P0', unitId: 0, role: 'imam', title: 'امام جماعت' });
  UNITS.forEach(u => {
    D.positions.push({ id: `P${u.id}-m`, unitId: u.id, role: 'manager', title: 'مدیر' });
    D.positions.push({ id: `P${u.id}-o`, unitId: u.id, role: 'office', title: 'مسئول دفتر' });
    D.positions.push({ id: `P${u.id}-s`, unitId: u.id, role: 'secretary', title: 'منشی' });
  });
  [[1, 'کارشناس تأسیسات'], [1, 'انباردار مرکزی'], [4, 'عکاس و تصویربردار'], [16, 'کارشناس شبکه'], [17, 'ناظر فنی']].forEach(([u, t], i) =>
    D.positions.push({ id: `P${u}-k${i + 1}`, unitId: u, role: 'staff', title: t }));

  /* کاربران نمونه (رمز همه: ۱۲۳۴) */
  const FN = ['علی', 'محمدرضا', 'حسین', 'مهدی', 'سعید', 'جواد', 'امیرحسین', 'حمید', 'مصطفی', 'محسن', 'یاسر', 'زهرا', 'فاطمه', 'مریم', 'معصومه', 'سمیه', 'نرگس', 'الهام', 'زینب', 'رضا', 'مجتبی', 'ابوالفضل', 'صادق', 'هادی', 'طاهره', 'سارا'];
  const LN = ['کریمی', 'حسینی', 'رحیمی', 'موسوی', 'جعفری', 'صادقی', 'نوری', 'احمدی', 'رضایی', 'کاظمی', 'باقری', 'اکبری', 'قاسمی', 'شریفی', 'عباسی', 'یوسفی', 'نجفی', 'طاهری', 'سلیمانی', 'مرادی', 'فلاحی', 'امینی', 'زارعی', 'حیدری', 'میرزایی'];
  let k = 0;
  const mk = (pid, name, user) => {
    const u = { id: 'u' + (D.users.length + 1), name, username: user, pass: hash('shabab:1234'), posId: pid, active: true, phone: '0912' + pad(1000000 + D.users.length * 7919 % 8999999, 7).slice(-7), nid: '', hired: addDays(T, -400 - D.users.length * 11) };
    D.users.push(u); D.posHistory.push({ posId: pid, userId: u.id, from: u.hired, to: '' });
  };
  mk('P0', 'حجت‌الاسلام سید محمد هاشمی', 'imam');
  UNITS.forEach(u => {
    ['m', 'o', 's'].forEach(r => { mk(`P${u.id}-${r}`, `${FN[(k * 7 + 3) % FN.length]} ${LN[(k * 5 + 1) % LN.length]}`, r + u.id); k++; });
  });
  D.positions.filter(p => p.role === 'staff').forEach(p => { mk(p.id, `${FN[(k * 7 + 3) % FN.length]} ${LN[(k * 5 + 1) % LN.length]}`, 'k' + p.unitId + '-' + p.id.split('-k')[1]); k++; });
  /* نمونه تغییر متصدی: سوابق جایگاه پس از تغییر فرد حفظ می‌شود */
  const former = { id: 'u0', name: 'غلامرضا فرهادی', username: 'former4', pass: hash('shabab:1234'), posId: '', active: false, phone: '', hired: addDays(T, -1200) };
  D.users.push(former);
  D.posHistory.unshift({ posId: 'P4-m', userId: 'u0', from: addDays(T, -1200), to: addDays(T, -420) });

  /* انبارها */
  D.warehouses.push({ id: 'w1', name: 'انبار مرکزی', unitId: 1 }, { id: 'w2', name: 'انبار تجهیزات صوت و تصویر', unitId: 4 }, { id: 'w3', name: 'انبار آشپزخانه', unitId: 1 }, { id: 'w4', name: 'انبار کالای خیریه', unitId: 12 }, { id: 'w5', name: 'انبار تجهیزات پزشکی', unitId: 9 });

  /* بودجه سالانه */
  const y = jYearNow();
  const B = [42, 65, 18, 22, 12, 30, 28, 26, 34, 20, 9, 40, 11, 14, 8, 16, 120];
  UNITS.forEach((u, i) => D.budgets.push({ unitId: u.id, year: y, amount: B[i] * 100000000 }));

  /* نامه‌ها */
  as('P1-s'); at(-12, '09:10');
  const L1 = createLetter({ type: 'in', subject: 'اعلام قطعی برنامه‌ریزی‌شده آب در محدوده مجتمع', cat: 'خدماتی', sender: 'شرکت آب و فاضلاب منطقه', receiver: 'مدیریت داخلی مجتمع', unitId: 1, priority: 'فوری', date: addDays(T, -12), body: 'به اطلاع می‌رساند به دلیل تعویض خط انتقال، آب محدوده در تاریخ اعلام‌شده از ساعت ۸ تا ۱۴ قطع خواهد بود.', needReply: false });
  as('P1-o'); at(-12, '11:00'); referLetter(L1, 2, 'جهت هماهنگی برنامه نماز و وضوخانه');
  as('P2-s'); at(-9, '10:00');
  createLetter({ type: 'out', subject: 'دعوت از سخنران مراسم دهه فاطمیه', cat: 'فرهنگی', sender: 'مدیریت امور فرهنگی و مراسمات مسجد', receiver: 'دفتر حجت‌الاسلام والمسلمین رضوانی', unitId: 2, date: addDays(T, -9), signer: 'P2-m',
    body: 'سلام علیکم\nبا احترام، به استحضار می‌رساند مراسم دهه فاطمیه در حسینیه مجتمع برگزار می‌شود. خواهشمند است در صورت امکان، سخنرانی شب‌های دوم تا پنجم را بپذیرید.\nپیشاپیش از حسن همکاری سپاسگزاریم.' });
  as('P15-s'); at(-7, '08:40');
  const L3 = createLetter({ type: 'in', subject: 'اعلام مانده حساب نذورات ماه گذشته', cat: 'مالی', sender: 'بانک قرض‌الحسنه', receiver: 'مدیریت امور مالی', unitId: 15, conf: 'محرمانه', date: addDays(T, -7), body: 'صورت‌حساب ماه گذشته پیوست است.', needReply: true });
  as('P15-m'); at(-6, '12:00'); referLetter(L3, 0, 'جهت استحضار');
  as('P6-s'); at(-5, '09:30');
  createLetter({ type: 'in', subject: 'بخشنامه برنامه‌های هفته کتاب و کتابخوانی', cat: 'آموزشی', sender: 'اداره آموزش و پرورش ناحیه', receiver: 'مدیریت دبستان', unitId: 6, date: addDays(T, -5), needReply: true, body: 'مقتضی است برنامه‌های مدرسه در هفته کتاب تا پایان هفته اعلام شود.' });
  as('P17-s'); at(-4, '10:20');
  const L5 = createLetter({ type: 'in', subject: 'صورت‌وضعیت شماره ۳ پیمانکار سالن چندمنظوره', cat: 'عمرانی', sender: 'شرکت ساختمانی بنای نو', receiver: 'مدیریت عمران و توسعه', unitId: 17, priority: 'فوری', date: addDays(T, -4), needReply: true, body: 'صورت‌وضعیت کارکرد ماه جاری جهت بررسی و پرداخت ارسال می‌گردد.' });
  as('P17-m'); at(-4, '13:00'); referLetter(L5, 15, 'جهت بررسی و پرداخت پس از تأیید ناظر');
  as('P3-s'); at(-3, '11:15');
  createLetter({ type: 'internal', subject: 'هماهنگی پوشش خبری همایش خانواده', cat: 'فرهنگی', sender: 'مدیریت روابط عمومی', receiver: 'مدیریت رسانه', unitId: 3, toUnit: 4, date: addDays(T, -3), body: 'خواهشمند است برای پوشش تصویری همایش خانواده در سالن آمفی‌تئاتر هماهنگی لازم انجام شود.' });
  as('P9-s'); at(-2, '09:00');
  createLetter({ type: 'in', subject: 'ابلاغ ضوابط ایمنی تجهیزات پزشکی', cat: 'اداری', sender: 'شبکه بهداشت و درمان', receiver: 'مدیریت درمانگاه', unitId: 9, conf: 'محرمانه', date: addDays(T, -2), body: 'ضوابط جدید جهت اجرا ابلاغ می‌گردد.' });
  as('P12-s'); at(-1, '10:00');
  createLetter({ type: 'in', subject: 'اعلام آمادگی خیّر برای تأمین سبد غذایی', cat: 'سایر', sender: 'یکی از خیرین محله', receiver: 'مدیریت خیریه', unitId: 12, conf: 'سری', date: addDays(T, -1), body: 'اعلام آمادگی برای تأمین ۸۰ سبد غذایی.', needReply: true });
  as('P14-s'); at(0, '08:30');
  createLetter({ type: 'out', subject: 'ابلاغ ساعت کاری زمستانی مجتمع', cat: 'اداری', sender: 'مدیریت امور اداری', receiver: 'کلیه مدیریت‌ها', unitId: 14, date: T, signer: 'P14-m', body: 'بدین‌وسیله ساعت کاری زمستانی مجتمع از ابتدای آذرماه از ساعت ۷:۳۰ تا ۱۴:۳۰ ابلاغ می‌گردد.' });

  /* دستورات امام جماعت */
  as('P0'); at(-14, '18:00');
  const O1 = createOrder({ title: 'برگزاری مراسم دهه فاطمیه با محوریت خانواده', desc: 'برنامه ده‌شبه شامل سخنرانی، مداحی، پذیرایی و ویژه‌برنامه کودک و نوجوان تدوین و اجرا شود. گزارش نهایی با آمار حضور ارائه گردد.', units: [2, 1, 4], respPos: 'P2-m', priority: 'فوری', issued: addDays(T, -14), due: addDays(T, 9), needReport: true });
  at(-20, '17:00');
  const O2 = createOrder({ title: 'تکمیل مستندسازی اموال مجتمع و الصاق برچسب کد', desc: 'تمامی اموال کدگذاری و برچسب QR الصاق شود.', units: [1], respPos: 'P1-o', priority: 'عادی', issued: addDays(T, -20), due: addDays(T, -2), needReport: true });
  at(-30, '19:00');
  const O3 = createOrder({ title: 'راه‌اندازی سامانه نوبت‌دهی اینترنتی درمانگاه', desc: 'با همکاری فناوری اطلاعات طراحی و اجرا شود.', units: [9, 16], respPos: 'P16-m', priority: 'عادی', issued: addDays(T, -30), due: addDays(T, 15), needReport: false });
  at(-25, '20:00');
  const O4 = createOrder({ title: 'گزارش پیشرفت سالن چندمنظوره', desc: 'گزارش مصور پیشرفت فیزیکی و مالی پروژه ارائه شود.', units: [17], respPos: 'P17-m', priority: 'خیلی فوری', issued: addDays(T, -25), due: addDays(T, -5), needReport: true });
  at(-3, '21:00');
  createOrder({ title: 'ساماندهی طرح اکرام ایتام در آستانه زمستان', desc: 'شناسایی خانواده‌ها و تأمین پوشاک زمستانی با حفظ کامل محرمانگی.', units: [12], respPos: 'P12-m', priority: 'فوری', issued: addDays(T, -3), due: addDays(T, 20), needReport: true });
  as('P2-o'); at(-10, '10:00'); orderReport(O1, { status: 'در حال انجام', progress: 45, note: 'سخنرانان شب‌های اول تا پنجم قطعی شدند؛ هماهنگی پذیرایی با مدیریت داخلی انجام شد.' });
  as('P1-o'); at(-8); orderReport(O2, { status: 'در حال انجام', progress: 70, note: 'اموال طبقه همکف و حسینیه برچسب‌گذاری شد.' });
  as('P16-m'); at(-6); orderReport(O3, { status: 'در حال انجام', progress: 35, note: 'نیازسنجی با درمانگاه انجام و نسخه آزمایشی آماده شد.' });
  as('P17-o'); at(-6); orderReport(O4, { status: 'منتظر تأیید', progress: 100, note: 'گزارش مصور پیشرفت ۶۲٪ فیزیکی و ۵۸٪ مالی پیوست شد.' });

  /* وظایف */
  const tasks = [
    [1, 'P1-k1', 'سرویس دوره‌ای موتورخانه و دیگ‌های بخار', -10, -1, 'فوری', 'در حال انجام'],
    [1, 'P1-k2', 'انبارگردانی فصلی انبار مرکزی', -6, 4, 'عادی', 'جدید'],
    [1, 'P1-o', 'هماهنگی پذیرایی مراسم دهه فاطمیه', -9, 8, 'فوری', 'در حال انجام'],
    [1, 'P1-s', 'تنظیم برنامه نظافت محوطه', -15, -6, 'عادی', 'تکمیل‌شده'],
    [2, 'P2-o', 'تدوین برنامه شب‌های دهه فاطمیه', -12, 1, 'خیلی فوری', 'منتظر تأیید'],
    [2, 'P2-s', 'ثبت‌نام کاروان راهیان نور', -8, 12, 'عادی', 'در حال انجام'],
    [3, 'P3-o', 'تهیه فهرست مهمانان همایش خانواده', -5, 2, 'فوری', 'در حال انجام'],
    [3, 'P3-s', 'به‌روزرسانی تابلو اعلانات', -20, -12, 'عادی', 'تکمیل‌شده'],
    [4, 'P4-k3', 'تدوین کلیپ گزارش اردوی زیارتی', -7, -2, 'عادی', 'در حال انجام'],
    [4, 'P4-o', 'طراحی پوستر مراسم دهه فاطمیه', -6, 1, 'فوری', 'تکمیل‌شده'],
    [5, 'P5-o', 'تنظیم جدول شیفت شب آذرماه', -4, 3, 'عادی', 'جدید'],
    [6, 'P6-o', 'برنامه‌ریزی هفته کتاب دبستان', -5, 6, 'عادی', 'در حال انجام'],
    [7, 'P7-o', 'برگزاری جلسه اولیای پایه نهم', -18, -9, 'عادی', 'تکمیل‌شده'],
    [8, 'P8-o', 'تهیه برنامه مشاوره انتخاب رشته', -10, -3, 'فوری', 'در حال انجام'],
    [9, 'P9-o', 'سرویس دستگاه‌های الکتروکاردیوگرافی', -9, -1, 'فوری', 'جدید'],
    [10, 'P10-o', 'سفارش اقلام دارویی با موجودی کم', -3, 2, 'خیلی فوری', 'در حال انجام'],
    [11, 'P11-o', 'وجین و ساماندهی قفسه‌های مرجع', -25, -10, 'عادی', 'تکمیل‌شده'],
    [12, 'P12-o', 'شناسایی خانواده‌های نیازمند پوشاک زمستانی', -3, 14, 'فوری', 'در حال انجام'],
    [13, 'P13-o', 'بازبینی ایمنی وسایل بازی', -11, -4, 'خیلی فوری', 'تکمیل‌شده'],
    [14, 'P14-o', 'تمدید قراردادهای کارکنان خدمات', -8, 5, 'فوری', 'در حال انجام'],
    [15, 'P15-o', 'تهیه گزارش مالی ماه گذشته', -6, -1, 'فوری', 'منتظر تأیید'],
    [16, 'P16-k4', 'پشتیبان‌گیری کامل از سرورها', -2, 0, 'فوری', 'در حال انجام'],
    [16, 'P16-o', 'تعریف کاربران جدید سامانه', -14, -8, 'عادی', 'تکمیل‌شده'],
    [17, 'P17-k5', 'بازدید فنی سقف سالن چندمنظوره', -5, -1, 'خیلی فوری', 'در حال انجام']
  ];
  tasks.forEach(([u, ass, title, s, d, pr, st]) => {
    as(`P${u}-m`); at(s, '09:00');
    const t = createTask({ unitId: u, title, assignee: ass, start: addDays(T, s), due: addDays(T, d), priority: pr, desc: '' });
    const steps = { 'در حال انجام': ['start'], 'منتظر تأیید': ['start', 'submit'], 'تکمیل‌شده': ['start', 'submit', 'approve'] }[st] || [];
    steps.forEach((a, i) => { as(a === 'approve' ? `P${u}-m` : ass); at(s + i + 1, '11:30'); if (a === 'approve' && ass === `P${u}-m`) as(`P${u}-o`); taskAct(t, a, a === 'submit' ? 'انجام شد؛ گزارش پیوست است.' : ''); });
  });

  /* درخواست‌های داخلی */
  const reqs = [
    [3, 4, 'پوشش تصویری همایش خانواده', 'پوشش مراسم', -3, 2, false],
    [2, 1, 'تأمین پذیرایی ۱۰ شب دهه فاطمیه', 'پذیرایی', -11, 4, false],
    [6, 16, 'راه‌اندازی رایانه‌های کارگاه رایانه دبستان', 'پشتیبانی رایانه', -9, 5, false],
    [12, 15, 'تخصیص اعتبار طرح پوشاک زمستانی', 'تخصیص بودجه', -2, 3, true],
    [9, 1, 'تعمیر سیستم سرمایش اتاق تزریقات', 'تعمیرات و نگهداری', -6, 4, false],
    [5, 2, 'هماهنگی برنامه شب شهدا در حسینیه', 'مراسم مذهبی', -15, 6, false],
    [13, 4, 'طراحی پوستر جشن تکلیف کودکان', 'طراحی پوستر', -1, 1, false],
    [11, 3, 'اطلاع‌رسانی مسابقه کتابخوانی', 'اطلاع‌رسانی عمومی', -4, 3, false]
  ];
  reqs.forEach(([from, to, title, cat, s, steps, imam]) => {
    as(`P${from}-s`); at(s, '09:20');
    const r = createRequest({ title, toUnit: to, cat, desc: 'جزئیات در پیوست و هماهنگی تلفنی.', priority: steps > 4 ? 'عادی' : 'فوری', needsImam: imam, due: addDays(T, s + 10) });
    const seq = ['review', 'send', 'approve', 'exec', 'final'];
    for (let i = 0; i < Math.min(steps, 5); i++) {
      const a = seq[i];
      as(a === 'approve' ? (imam ? 'P0' : `P${to}-m`) : `P${to}-o`); at(s + i + 1, '12:00');
      if (a === 'review' && to === 1 && from === 2) { reqAct(r, 'review', ''); as(`P${to}-o`); reqAct(r, 'coop', 'تأمین ظروف یک‌بار مصرف و هماهنگی بودجه', 15); as('P15-o'); reqAct(r, 'coopnote', 'اعتبار پذیرایی از بودجه مراسمات قابل تأمین است.'); continue; }
      reqAct(r, a, a === 'exec' ? 'اقدام انجام شد.' : a === 'final' ? 'درخواست به‌طور کامل انجام شد و گزارش به درخواست‌کننده ارسال شد.' : '');
    }
  });

  /* رزروها */
  const res = [
    ['hosseinieh', 'هیئت محبان الزهرا', 'مراسم عزاداری', 2, '19:00', '22:30', 450, 'approve'],
    ['amphi', 'مدیریت روابط عمومی', 'همایش خانواده', 3, '16:00', '19:00', 140, 'approve'],
    ['meeting', 'مدیریت عمران و توسعه', 'جلسه پیمانکاران', 1, '10:00', '12:00', 14, 'approve'],
    ['fateheh', 'خانواده مرحوم حاج حسن کریمی', 'مراسم ترحیم', 0, '14:00', '16:00', 250, 'approve'],
    ['cinema', 'پایگاه بسیج', 'اکران فیلم دفاع مقدس', 5, '18:00', '20:30', 55, 'pending'],
    ['zaersara', 'کاروان زائران مشهد', 'اسکان زائرین', 7, '14:00', '23:59', 32, 'pending'],
    ['farhangsara', 'کتابخانه مجتمع', 'نشست کتابخوانی', 4, '17:00', '19:00', 40, 'approve'],
    ['amphi', 'متوسطه دوم', 'جشن فارغ‌التحصیلی', 3, '17:30', '20:00', 130, 'pending'],
    ['hosseinieh', 'مدیریت امور فرهنگی', 'مراسم دهه فاطمیه — شب اول', 9, '19:00', '22:30', 550, 'approve']
  ];
  res.forEach(([sp, ap, kind, d, s, e, n, st]) => {
    as('P3-s'); at(d - 3, '10:00');
    const r = createReservation({ space: sp, applicant: ap, phone: '09121234567', kind, date: addDays(T, d), start: s, end: e, people: n, equip: 'صوت، پروژکتور', desc: '' });
    if (st === 'approve') { as(`P${spaceOf(sp).unit}-m`); at(d - 2, '12:00'); resDecide(r, 'تأییدشده', ''); }
  });

  /* جلسات */
  as('P0'); at(-6, '09:00');
  const M1 = createMeeting({ title: 'جلسه هماهنگی ماهانه مدیران', date: addDays(T, -5), start: '09:00', end: '11:00', place: 'سالن جلسات', invitees: UNITS.map(u => `P${u.id}-m`), agenda: '۱. گزارش عملکرد ماهانه مدیریت‌ها\n۲. برنامه دهه فاطمیه\n۳. پیشرفت پروژه سالن چندمنظوره' });
  M1.minutes = 'جلسه با حضور ۱۵ مدیر برگزار شد. گزارش‌ها ارائه و مصوبات زیر تعیین شد.';
  at(-5, '11:30');
  addResolution(M1, { text: 'تهیه برنامه مشترک ویژه‌برنامه کودک دهه فاطمیه', owner: 'P13-m', due: addDays(T, 3) });
  addResolution(M1, { text: 'ارائه گزارش مالی پروژه سالن چندمنظوره تا پایان هفته', owner: 'P15-m', due: addDays(T, -1) });
  addResolution(M1, { text: 'تهیه دستورالعمل استفاده از سالن آمفی‌تئاتر', owner: 'P3-m', due: addDays(T, 10) });
  as('P15-m'); at(-2); resolutionUpdate(M1, M1.resolutions[1], 'انجام‌شده', 'گزارش ارسال شد.');
  as('P2-s'); at(-2);
  createMeeting({ title: 'جلسه ستاد برگزاری دهه فاطمیه', date: T, start: '17:00', end: '18:30', place: 'دفتر مدیریت فرهنگی', invitees: ['P0', 'P2-m', 'P1-m', 'P4-m', 'P3-m'], agenda: 'نهایی‌سازی برنامه شب‌ها و تقسیم کار' });
  as('P17-s'); at(-1);
  createMeeting({ title: 'جلسه پیشرفت پروژه با پیمانکار', date: addDays(T, 1), start: '10:00', end: '12:00', place: 'سالن جلسات', invitees: ['P17-m', 'P17-k5', 'P15-o'], agenda: 'بررسی صورت‌وضعیت شماره ۳' });
  as('P0'); at(-1);
  createMeeting({ kind: 'ملاقات', title: 'ملاقات با نماینده شورای محله', date: addDays(T, 2), start: '11:00', end: '12:00', place: 'دفتر امام جماعت', invitees: ['P3-m'], agenda: 'طرح‌های مشترک محله' });
  as('P6-s'); at(0);
  createMeeting({ title: 'شورای مدرسه دبستان', date: addDays(T, 3), start: '13:00', end: '14:00', place: 'دفتر دبستان', invitees: ['P6-m', 'P6-o'], agenda: 'برنامه هفته کتاب' });

  /* اموال */
  const assets = [
    [4, 'w2', 'دوربین فیلم‌برداری سونی FX6', 'تجهیزات تصویری', 'سالم', 1850000000],
    [4, 'w2', 'میکسر صوتی ۱۶ کانال', 'تجهیزات صوتی', 'سالم', 420000000],
    [4, 'w2', 'پروژکتور ۶۰۰۰ لومن', 'تجهیزات تصویری', 'نیازمند تعمیر', 380000000],
    [1, 'w1', 'فرش دستباف حسینیه (۱۲ متری)', 'فرش و موکت', 'سالم', 650000000],
    [1, 'w1', 'صندلی تاشو (بسته ۵۰ عددی)', 'مبلمان', 'سالم', 120000000],
    [1, 'w3', 'دیگ پخت صنعتی ۱۵۰ لیتری', 'آشپزخانه', 'سالم', 95000000],
    [1, 'w3', 'یخچال صنعتی چهار درب', 'آشپزخانه', 'نیازمند تعمیر', 210000000],
    [1, 'w1', 'ژنراتور برق اضطراری ۳۰ کیلووات', 'تأسیسات', 'سالم', 980000000],
    [9, 'w5', 'دستگاه الکتروکاردیوگرافی', 'تجهیزات پزشکی', 'نیازمند تعمیر', 540000000],
    [9, 'w5', 'یخچال نگهداری واکسن', 'تجهیزات پزشکی', 'سالم', 260000000],
    [16, 'w1', 'سرور اصلی Dell R740', 'شبکه و رایانه', 'سالم', 1250000000],
    [16, 'w1', 'سوییچ شبکه ۴۸ پورت', 'شبکه و رایانه', 'سالم', 190000000],
    [12, 'w4', 'پتو زمستانی (۱۰۰ عدد)', 'اقلام خیریه', 'سالم', 150000000],
    [11, 'w1', 'قفسه کتاب فلزی', 'مبلمان', 'سالم', 45000000],
    [13, 'w1', 'سرسره پلاستیکی کودک', 'وسایل بازی', 'خراب', 38000000]
  ];
  as('P1-o'); at(-40);
  assets.forEach(([u, w, n, c, h, val], i) => createAsset({ unitId: u, whId: w, name: n, cat: c, health: h, value: val, location: whNameD(D, w), serial: 'SN' + (48210 + i * 37), specs: '' }));
  as('P4-o'); at(-3); const mv1 = createMovement(D.assets[0], { type: 'امانت', person: 'مدیریت روابط عمومی — همایش', date: addDays(T, 3), note: 'برای پوشش همایش خانواده' });
  as('P4-m'); at(-2); decideMovement(mv1, true, '');
  as('P1-o'); at(-1); createMovement(D.assets[4], { type: 'جابه‌جایی', toWh: 'w3', date: T, note: 'برای پذیرایی دهه فاطمیه' });
  as('P13-o'); at(0); createMovement(D.assets[14], { type: 'خروج', date: T, note: 'تحویل جهت اسقاط' });

  /* امور مالی */
  as('P15-o');
  const tx = [['نذورات', 185000000, null, -20, 'نذورات صندوق حسینیه'], ['نذورات', 92000000, 2, -12, 'نذر پذیرایی دهه فاطمیه'], ['درآمد', 340000000, 6, -18, 'شهریه نوبت دوم دبستان'],
    ['درآمد', 120000000, 9, -10, 'درآمد خدمات درمانگاه'], ['درآمد', 76000000, 10, -8, 'فروش داروخانه (خلاصه هفتگی)'], ['هزینه', 145000000, 1, -15, 'خرید مواد شوینده و بهداشتی'],
    ['هزینه', 88000000, 4, -11, 'خرید حافظه و باتری دوربین'], ['هزینه', 1650000000, 17, -9, 'پرداخت صورت‌وضعیت شماره ۲'], ['هزینه', 230000000, 2, -6, 'هزینه پذیرایی مراسم ماه صفر'],
    ['هزینه', 64000000, 16, -5, 'تمدید اشتراک اینترنت'], ['نذورات', 410000000, 12, -4, 'کمک‌های نقدی خیرین (تجمیعی)'], ['هزینه', 51000000, 13, -3, 'خرید وسایل بازی آموزشی'], ['درآمد', 58000000, 3, -2, 'اجاره سالن آمفی‌تئاتر']];
  tx.forEach(([kd, a, u, d, ds]) => { at(d); const t = addTx({ kind: kd, amount: a, unitId: u == null ? '' : u, date: addDays(T, d), desc: ds, docNo: 'س-' + (1200 + D.tx.length) }); });
  const pays = [[17, 'صورت‌وضعیت شماره ۳ سالن چندمنظوره', 1420000000, 'شرکت ساختمانی بنای نو', 2], [2, 'خرید پرچم و پارچه مشکی حسینیه', 86000000, 'فروشگاه نساجی امید', 2], [1, 'تعمیر یخچال صنعتی آشپزخانه', 42000000, 'خدمات فنی سرما', 1],
    [4, 'خرید لامپ پروژکتور', 35000000, 'فروشگاه تجهیزات تصویر', 4], [12, 'خرید ۸۰ سبد غذایی', 640000000, 'فروشگاه زنجیره‌ای محله', 0], [16, 'خرید هارد پشتیبان', 48000000, 'رایانه پارس', 1]];
  pays.forEach(([u, t, a, payee, steps]) => {
    as(`P${u}-o`); at(-6);
    const p = createPay({ title: t, amount: a, payee, desc: '' });
    for (let i = 0; i < steps; i++) {
      const s = nextPayStage(p);
      as(s === 1 ? `P${u}-m` : s === 2 ? 'P15-o' : s === 3 ? 'P0' : 'P15-m'); at(-5 + i);
      payAct(p, true, '', s === 4 ? 'س-پ-' + (300 + i) : '');
    }
  });
  D.commitments.push({ id: uid(), title: 'قرارداد پیمانکار سالن چندمنظوره', unitId: 17, amount: 12500000000, due: addDays(T, 120), status: 'جاری' },
    { id: uid(), title: 'قرارداد خدمات نظافت', unitId: 1, amount: 960000000, due: addDays(T, 60), status: 'جاری' },
    { id: uid(), title: 'اجاره اتوبوس اردوی راهیان نور', unitId: 2, amount: 380000000, due: addDays(T, 40), status: 'جاری' });

  /* منابع انسانی */
  as('P14-o'); at(-30);
  addHR('decrees', { uid: D.users.find(u => u.posId === 'P5-m').id, pos: 'P5-m', title: 'حکم انتصاب مدیر پایگاه بسیج', no: 'ح/' + fa(y) + '/۰۴۱', date: addDays(T, -30) });
  addHR('decrees', { uid: D.users.find(u => u.posId === 'P4-m').id, pos: 'P4-m', title: 'حکم انتصاب مدیر رسانه', no: 'ح/' + fa(y) + '/۰۱۲', date: addDays(T, -420) });
  addHR('contracts', { uid: D.users.find(u => u.posId === 'P1-k1').id, type: 'قرارداد کار معین', from: addDays(T, -300), to: addDays(T, 65), title: 'کارشناس تأسیسات' });
  addHR('contracts', { uid: D.users.find(u => u.posId === 'P1-k2').id, type: 'قرارداد کار معین', from: addDays(T, -200), to: addDays(T, 165), title: 'انباردار' });
  addHR('missions', { uid: D.users.find(u => u.posId === 'P2-m').id, dest: 'قم', from: addDays(T, 6), to: addDays(T, 7), title: 'هماهنگی سخنرانان', status: 'تأییدشده' });
  as('P4-k3'); at(-2); const lv1 = createLeave({ type: 'استحقاقی', from: addDays(T, 4), to: addDays(T, 5), reason: 'امور شخصی' });
  as('P10-o'); at(-4); const lv2 = createLeave({ type: 'استعلاجی', from: addDays(T, -3), to: addDays(T, -2), reason: 'بیماری' });
  as('P10-m'); at(-3); leaveAct(lv2, true, '');
  as('P16-k4'); at(-1); createLeave({ type: 'ساعتی', from: addDays(T, 1), to: addDays(T, 1), reason: 'مراجعه به بانک' });

  /* دفاتر اختصاصی */
  const R = (u, key, rows) => { as(`P${u}-s`); at(-3); rows.forEach(r => addRecord(u, key, r)); };
  R(4, 'media', [{ title: 'عکس‌های اردوی زیارتی مشهد', kind: 'عکس', date: addDays(T, -9), event: 'اردوی زیارتی', place: 'NAS/1405/ziarat' }, { title: 'فیلم کامل سخنرانی شب قدر', kind: 'فیلم', date: addDays(T, -60), event: 'لیالی قدر', place: 'NAS/1405/qadr' }]);
  R(5, 'guard', [{ date: T, person: 'محمد نوری', shift: '۲۰ تا ۲۴', post: 'درب اصلی', note: '' }, { date: T, person: 'علی رحیمی', shift: '۲۴ تا ۴', post: 'پارکینگ', note: '' }, { date: addDays(T, -1), person: 'حسین جعفری', shift: '۴ تا ۸', post: 'درب اصلی', note: 'بدون مورد خاص' }]);
  R(5, 'prog', [{ title: 'اردوی جهادی روستای کهنک', kind: 'جهادی', date: addDays(T, -15), count: 34, note: '' }]);
  R(6, 'edu', [{ title: 'جلسه اولیای پایه اول', grade: 'اول', kind: 'جلسه اولیا', date: addDays(T, -7), note: 'حضور ۸۵٪ اولیا' }]);
  R(7, 'edu', [{ title: 'المپیاد ریاضی درون‌مدرسه‌ای', grade: 'هشتم', kind: 'آموزشی', date: addDays(T, -4), note: '' }]);
  R(8, 'edu', [{ title: 'کارگاه مدیریت زمان کنکور', grade: 'دوازدهم', kind: 'تربیتی', date: addDays(T, -2), note: '' }]);
  R(9, 'equip', [{ title: 'دستگاه الکتروکاردیوگرافی', state: 'نیازمند سرویس', date: addDays(T, -20), note: '' }, { title: 'دستگاه استریل', state: 'فعال', date: addDays(T, -5), note: '' }]);
  R(10, 'stock', [{ title: 'آموکسی‌سیلین ۵۰۰', qty: 40, min: 100, supplier: 'پخش البرز', date: addDays(T, 300) }, { title: 'استامینوفن ۳۲۵', qty: 600, min: 200, supplier: 'پخش رازی', date: addDays(T, 420) }, { title: 'سرم نمکی', qty: 18, min: 30, supplier: 'پخش البرز', date: addDays(T, 200) }]);
  R(11, 'books', [{ title: 'مفاتیح‌الجنان', author: 'شیخ عباس قمی', code: '۱۰۲۴', state: 'موجود', member: '' }, { title: 'سلام بر ابراهیم', author: 'گروه فرهنگی ابراهیم هادی', code: '۲۳۱۸', state: 'امانت', member: 'عضو شماره ۴۴۱' }]);
  R(11, 'events', [{ title: 'مسابقه کتابخوانی نوجوانان', date: addDays(T, -10), count: 62, note: '' }]);
  R(12, 'aid', [{ donor: 'خیّر ناشناس', kind: 'نقدی', amount: 250000000, date: addDays(T, -6), use: 'طرح پوشاک زمستانی' }, { donor: 'فروشگاه محله', kind: 'غیرنقدی', amount: 90000000, date: addDays(T, -2), use: '۳۰ سبد غذایی' }]);
  R(13, 'admit', [{ date: T, session: 'صبح', count: 22, cap: 30, coach: 'خانم امینی', note: 'بدون حادثه' }, { date: addDays(T, -1), session: 'عصر', count: 29, cap: 30, coach: 'خانم زارعی', note: 'بدون حادثه' }]);
  R(16, 'systems', [{ title: 'پشتیبان‌گیری شبانه سرور', kind: 'پشتیبان‌گیری', date: addDays(T, -1), state: 'سالم', note: '' }, { title: 'فایروال اصلی', kind: 'امنیت', date: addDays(T, -7), state: 'هشدار', note: 'به‌روزرسانی میان‌افزار لازم است' }]);
  R(17, 'projects', [{ title: 'سالن چندمنظوره', contractor: 'شرکت ساختمانی بنای نو', start: addDays(T, -210), end: addDays(T, 150), progress: 62, budget: 12500000000, spent: 7250000000 },
    { title: 'بازسازی وضوخانه', contractor: 'پیمانکاری سازه‌گستر', start: addDays(T, -60), end: addDays(T, 20), progress: 85, budget: 1800000000, spent: 1520000000 },
    { title: 'عایق‌کاری بام حسینیه', contractor: '—', start: addDays(T, 15), end: addDays(T, 45), progress: 0, budget: 900000000, spent: 0 }]);

  /* نمونه ورودها و درخواست عضویت */
  [['imam', 'u1', true, 'ورود موفق', -1, '07:42'], ['m16', null, false, 'رمز نادرست', -1, '08:03'], ['m16', null, true, 'ورود موفق', -1, '08:04'], ['o3', null, true, 'ورود موفق', 0, '08:12'], ['admin', null, false, 'نام کاربری ناموجود', 0, '02:17'], ['admin', null, false, 'نام کاربری ناموجود', 0, '02:18'], ['s9', null, false, 'رمز نادرست', 0, '09:31'], ['s9', null, true, 'ورود موفق', 0, '09:32']].forEach(([un, id, ok, reason, d, hm]) => {
    at(d, hm); const u = D.users.find(x => x.username === un);
    D.logins.push({ id: uid(), ts: SEED_TS, username: un, uid: u ? u.id : '', ok, reason, agent: 'Chrome' });
    if (ok && u) u.lastLogin = SEED_TS;
  });
  ME = null; at(-1, '21:40');
  createSignup({ name: 'محمدحسین اکبری', username: 'mh.akbari', phone: '09127654321', unitId: 4, title: 'تدوینگر', pass: 'akbari123', note: 'نیروی داوطلب واحد رسانه از ماه گذشته' });
  at(0, '07:55');
  createSignup({ name: 'ریحانه موسوی', username: 'r.mousavi', phone: '09351112233', unitId: 11, title: 'کتابدار', pass: 'mousavi99', note: '' });
  SEED_TS = null;
  ME = prevME;
  D.notifs.forEach((n, i) => { if (i % 3 === 0) n.read = true; });
  D.sms = D.sms.slice(-24);
  return D;
}
function whNameD(D, id) { return (D.warehouses.find(w => w.id === id) || {}).name || ''; }
