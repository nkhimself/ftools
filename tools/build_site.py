#!/usr/bin/env python3
"""Applies the shared header navigation + footer to every page and generates the factory-design pages.
Run from the site folder:  python3 tools/build_site.py
Idempotent: safe to run again after editing GROUPS/FOOTER below."""
import re, glob, os, json, subprocess

# ---- navigation: 4 groups + one link -------------------------------------------------
GROUPS = [
 ('محاسبه‌های عمومی', [('thermal.html', 'فرآیند حرارتی'), ('formulation.html', 'فرمولاسیون'), ('fitting.html', 'برازش مدل')]),
 ('صنایع', [('dairy.html', 'لبنیات'), ('bakery.html', 'شیرینی و نان'), ('beverage.html', 'نوشیدنی و آب'), ('coldstore.html', 'سردخانه')]),
 ('طراحی کارخانه', [('design.html', 'همهٔ بخش‌های طراحی'), ('dairy-design.html', 'طراحی کارخانهٔ لبنیات'), ('plant-utilities.html', 'تأسیسات کارخانه')]),
 ('ابزارهای کمکی', [('units.html', 'تبدیل واحد'), ('glossary.html', 'واژه‌نامه'), ('results.html', 'نتایج من')]),
]
SOLO = ('about.html', 'روش‌ها')
CUR_ALIAS = {'login.html': None, 'signup.html': None, 'index.html': None}

def nav(cur):
    h = '<nav class="mainnav" aria-label="بخش‌ها"><div class="wrap">'
    for title, items in GROUPS:
        on = any(u == cur for u, _ in items)
        h += '<details class="dd%s"><summary>%s</summary><div class="menu">' % (' cur' if on else '', title)
        for u, l in items:
            h += '<a href="%s"%s>%s</a>' % (u, ' class="cur" aria-current="page"' if u == cur else '', l)
        h += '</div></details>'
    h += '<a class="solo%s" href="%s"%s>%s</a></div></nav>' % (' cur' if cur == SOLO[0] else '', SOLO[0], ' aria-current="page"' if cur == SOLO[0] else '', SOLO[1])
    return h

FOOTER = '''<footer class="ft"><div class="wrap fg">
<div><a class="brand fbrand" href="index.html"><img src="logo.svg" width="76" height="76" alt=""><span><b>لُگارینا</b><small>LOGARINA</small></span></a><p class="mot">محاسبهٔ دقیق، برای غذای بهتر</p><p style="margin:6px 0 0;font-size:13px">ابزارهای چندمرحله‌ای مهندسی صنایع غذایی، به زبان فارسی.</p></div>
<div><h4>ابزارها</h4><ul><li><a href="thermal.html">فرآیند حرارتی</a></li><li><a href="formulation.html">فرمولاسیون</a></li><li><a href="fitting.html">برازش مدل</a></li><li><a href="dairy.html">لبنیات</a></li><li><a href="bakery.html">شیرینی و نان</a></li><li><a href="beverage.html">نوشیدنی و آب</a></li><li><a href="coldstore.html">سردخانه</a></li></ul></div>
<div><h4>طراحی کارخانه</h4><ul><li><a href="design.html">همهٔ بخش‌ها</a></li><li><a href="dairy-design.html">کارخانهٔ لبنیات</a></li><li><a href="plant-utilities.html">تأسیسات کارخانه</a></li></ul></div>
<div><h4>لُگارینا</h4><ul><li><a href="units.html">تبدیل واحد</a></li><li><a href="glossary.html">واژه‌نامه</a></li><li><a href="results.html">نتایج ذخیره‌شده</a></li><li><a href="about.html">روش‌ها و محدودیت‌ها</a></li><li><a href="signup.html">ثبت‌نام رایگان</a></li><li><a href="login.html">ورود</a></li></ul></div>
</div><div class="wrap fb">محاسبه‌ها در مرورگر شما اجرا می‌شوند و داده‌های ورودی‌تان به جایی ارسال نمی‌شود. نتایج محاسباتی‌اند و جایگزین تأیید فرآیند توسط مرجع صلاحیت‌دار یا آزمون آزمایشگاهی نیستند.</div></footer>'''

ICON_FACTORY = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 40V22l12 7v-7l12 7v-7l12 7v11z"/><path d="M12 40v-6M22 40v-6M32 40v-6"/><path d="M34 22V9h6v13"/></svg>'
ICON_UTIL = '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="7"/><path d="M24 6v6M24 36v6M6 24h6M36 24h6M11 11l4 4M33 33l4 4M37 11l-4 4M15 33l-4 4"/></svg>'
ICON_DESIGN = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 40V12h32v28z"/><path d="M8 20h32M20 20v20"/></svg>'

def page(title, desc, body, cur, scripts):
    base = open('coldstore.html', encoding='utf-8').read()
    head = base[:base.index('<title>')]
    hdr = re.search(r'<header class="hd2">.*?</header>', base, re.S).group(0)
    hdr = re.sub(r'<nav class="mainnav".*?</nav>', lambda m: nav(cur), hdr, flags=re.S)
    return (head + '<title>%s | لُگارینا</title>\n<meta name="description" content="%s">' % (title, desc) +
            base[base.index('<meta name="theme-color"'):base.index('<body>')] + '<body>\n' + hdr + '\n<main class="wrap">\n' + body + '\n</main>\n' + FOOTER +
            '\n' + ''.join('<script src="%s"></script>\n' % s for s in scripts) + '</body></html>\n')

def read(p): return open(p, encoding='utf-8').read()
def write(p, s): open(p, 'w', encoding='utf-8').write(s)

def groups_json(js):
    out = subprocess.check_output(['node', '-e', "const g=require('./%s');console.log(JSON.stringify(g.map(([id,t,ts])=>[id,t,ts.map(x=>({id:x.id,short:x.short,title:x.title,lead:x.lead}))])))" % js])
    return json.loads(out)

DAIRY = groups_json('dairy-design.js'); UTIL = groups_json('plant-utilities.js')
n_dairy = sum(len(g[2]) for g in DAIRY); n_util = sum(len(g[2]) for g in UTIL)

# ---- calculator pages ----------------------------------------------------------------
SCRIPTS = ['ui.js', 'design-core.js', None, 'search-index.js', 'app.js', 'xtras.js', 'nav.js']
def calc_page(js, title, desc, h1, lead, cur, extra=''):
    body = '<h1>%s</h1>\n<p class="lead">%s</p>\n%s<div id="calculators"></div>' % (h1, lead, extra)
    return page(title, desc, body, cur, [js if s is None else s for s in SCRIPTS])

write('dairy-design.html', calc_page('dairy-design.js',
  'طراحی کارخانهٔ لبنیات — ظرفیت، موازنه، تجهیزات و تأسیسات',
  'ابزارهای پیش‌سایزبندی کارخانهٔ لبنیات: دریافت شیر، پنیر، ماست، پاستوریزاتور، بسته‌بندی، آب و پساب، جمع‌بندی بار تأسیسات و اقتصاد اولیه',
  'طراحی کارخانهٔ لبنیات',
  '%d ابزار برای پیش‌سایزبندی یک کارخانهٔ لبنی، از دریافت شیر تا بسته‌بندی، پساب، جمع‌بندی بار تأسیسات و اقتصاد اولیه. ابتدا بخش را انتخاب کنید، بعد ابزار را. عددهای پیش‌فرض نمونه‌اند؛ مقدار پروژهٔ خودتان را جایگزین کنید و نتیجه را از نوار «خروجی» ذخیره یا چاپ کنید.' % n_dairy,
  'dairy-design.html',
  '<div class="note warn">این بخش برای طراحی مفهومی و پیش‌سایزبندی است، نه نقشهٔ اجرایی، تأیید بهداشت و ایمنی، انتخاب نهایی تجهیز یا مجوز بهره‌برداری. شرایط پاستوریزاسیون و CIP را مرجع صلاحیت‌دار تعیین می‌کند. ابزارهای لولهٔ نگهدار و استانداردسازی چربی در صفحهٔ <a href="dairy.html">لبنیات</a> و سردخانه در صفحهٔ <a href="coldstore.html">سردخانه</a> هستند.</div>\n'))
write('plant-utilities.html', calc_page('plant-utilities.js',
  'تأسیسات کارخانه — مبدل حرارتی، بخار، بویلر، پمپ و CIP',
  'محاسبهٔ مبدل حرارتی، بالانس بخار و کندانس، راندمان بویلر، هد و توان پمپ با NPSH و مقدار محلول CIP',
  'تأسیسات کارخانه',
  '%d ابزار برای تأسیسات مشترک کارخانه‌های غذایی: مبدل حرارتی، بخار و کندانس، بویلر، پمپ و محلول شست‌وشو. برای هر صنعتی قابل استفاده‌اند و در طراحی کارخانهٔ لبنیات هم به آن‌ها ارجاع داده می‌شود.' % n_util,
  'plant-utilities.html'))

# ---- hub page -------------------------------------------------------------------------
def li(items): return ''.join('<li>%s</li>' % i for i in items)
hub = '''<h1>طراحی کارخانه</h1>
<p class="lead">محاسبه‌های پیش‌سایزبندی برای شروع طرح یک کارخانهٔ غذایی: ظرفیت، موازنهٔ محصول، اندازهٔ تجهیزات و بار تأسیسات. هر ابزار فرمول، منبع داده‌ها و یک مثال حل‌شده دارد.</p>
<div class="cards">
<a class="tool" href="dairy-design.html"><span class="ico">%s</span><h2>طراحی کارخانهٔ لبنیات</h2><p>%d ابزار در 5 بخش، از دریافت شیر تا جمع‌بندی بار تأسیسات.</p><ul><li>ظرفیت خط، تانکر و ایستگاه تخلیه، سیلوی شیر خام</li><li>پنیر و آب‌پنیر، وان پنیر، آب‌نمک و رسانیدن، ماست</li><li>پاستوریزاتور، هموژنایزر، پرکن و بسته‌بندی</li><li>آب و پساب، متعادل‌سازی، مدار CIP، برق و هوای فشرده</li><li>جمع‌بندی بار تأسیسات، انبار محصول، اقتصاد اولیه</li></ul></a>
<a class="tool" href="plant-utilities.html"><span class="ico">%s</span><h2>تأسیسات کارخانه</h2><p>%d ابزار مشترک برای صنایع مختلف.</p><ul><li>مبدل حرارتی: بار، دبی و سطح</li><li>بالانس بخار، کندانس و آب جبرانی</li><li>راندمان بویلر و مصرف سوخت</li><li>پمپ: هد، توان و NPSH موجود</li><li>مقدار محلول تجاری CIP</li></ul></a>
</div>
<section class="sec"><h2>مسیر پیشنهادی طراحی</h2><div class="steps">
<div><b>ظرفیت را مشخص کنید</b><p>تولید روزانه، ترکیب محصول و برنامهٔ دریافت را با ابزار «ظرفیت خط» به شیر خام و دبی اسمی تبدیل کنید.</p></div>
<div><b>هر خط را اندازه بگیرید</b><p>موازنهٔ پنیر و ماست، وان و مخزن، پاستوریزاتور، پرکن و انبار را برای ظرفیت همان خط محاسبه کنید.</p></div>
<div><b>بار تأسیسات را جمع بزنید</b><p>بخار، برق، سرمایش، آب و پساب هر خط را در «جمع‌بندی تأسیسات» با ضریب هم‌زمانی بیاورید و با ابزار تأسیسات اندازهٔ تجهیز بگیرید.</p></div>
</div></section>
<section class="sec"><h2>ابزارهای مرتبط</h2><div class="cards">
<a class="tool" href="coldstore.html"><span class="ico"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 6v36M8 15l32 18M40 15L8 33M24 6l-4 4M24 6l4 4M24 42l-4-4M24 42l4-4"/></svg></span><h2>سردخانه</h2><p>بار برودتی، توان و هزینهٔ برق برای سردخانه و اتاق رسانیدن پنیر.</p></a>
<a class="tool" href="dairy.html"><span class="ico"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 7c8 10 12 16 12 23a12 12 0 0 1-24 0c0-7 4-13 12-23z"/><path d="M18 31a6 6 0 0 0 5 5"/></svg></span><h2>لبنیات</h2><p>استانداردسازی چربی، پنیر پروسس، پیش‌بینی تخمیر ماست و لولهٔ نگهدار.</p></a>
<a class="tool" href="units.html"><span class="ico"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 18h26M30 12l6 6-6 6M38 32H12M18 26l-6 6 6 6"/></svg></span><h2>تبدیل واحد</h2><p>kcal/h، تن تبرید، bar، psi و دیگر واحدهای تأسیسات.</p></a>
</div></section>
<div class="note warn">این بخش برای طراحی مفهومی و پیش‌سایزبندی است، نه نقشهٔ اجرایی، تأیید بهداشت و ایمنی، انتخاب نهایی تجهیز یا مجوز بهره‌برداری. صنایع دیگر بعداً به همین بخش اضافه می‌شوند.</div>''' % (ICON_FACTORY, n_dairy, ICON_UTIL, n_util)
write('design.html', page('طراحی کارخانه — پیش‌سایزبندی کارخانهٔ غذایی', 'ابزارهای طراحی مفهومی کارخانهٔ غذایی: کارخانهٔ لبنیات و تأسیسات مشترک', hub, 'design.html', ['search-index.js', 'app.js', 'nav.js']))

# ---- apply nav + footer + nav.js to every page ------------------------------------------
for p in sorted(glob.glob('*.html')):
    s = read(p)
    s = re.sub(r'<nav class="mainnav".*?</nav>', lambda m: nav(p), s, flags=re.S)
    s = re.sub(r'<footer class="ft">.*?</footer>', lambda m: FOOTER, s, flags=re.S)
    if 'nav.js' not in s: s = s.replace('</body>', '<script src="nav.js"></script>\n</body>', 1)
    write(p, s)

# ---- search index -------------------------------------------------------------------
idx = read('search-index.js'); prefix = 'window.LGX='
data = json.loads(idx[len(prefix):].rstrip().rstrip(';'))
data = [d for d in data if d['u'].split('#')[0] not in ('design.html', 'dairy-design.html', 'plant-utilities.html')]
KW = {'dairy-design.html': 'کارخانه لبنیات طراحی ظرفیت شیر پنیر ماست پاستوریزاتور پساب', 'plant-utilities.html': 'تأسیسات مبدل بخار بویلر پمپ NPSH CIP کندانس'}
data.append({'t': 'طراحی کارخانه (همهٔ بخش‌ها)', 'g': 'طراحی کارخانه', 'u': 'design.html', 'k': 'کارخانه طراحی پیش سایز'})
for js, pg, gname, groups in (('dairy-design.js', 'dairy-design.html', 'طراحی کارخانهٔ لبنیات', DAIRY), ('plant-utilities.js', 'plant-utilities.html', 'تأسیسات کارخانه', UTIL)):
    data.append({'t': gname + ' (همهٔ ابزارها)', 'g': gname, 'u': pg, 'k': KW[pg]})
    for gid, gt, ts in groups:
        for t in ts:
            data.append({'t': t['title'], 'g': gname, 'u': '%s#tab-%s' % (pg, t['id']), 'k': KW[pg] + ' ' + t['short']})
write('search-index.js', prefix + json.dumps(data, ensure_ascii=False) + ';\n')
print('pages built; dairy tools', n_dairy, 'utility tools', n_util, 'search entries', len(data))
