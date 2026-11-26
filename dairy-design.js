'use strict';
const DairyDesignGroups = (({f}) => {
  const {positive:p, nonnegative:n, percent:x, efficiency:e, temperature:t, need, ceil, floor} = f;
  return [
    ['capacity','ظرفیت، دریافت و موازنهٔ محصول',[
      {id:'throughput',title:'ظرفیت خط و دریافت شیر خام',
       note:'ساعت خالص = شیفت منهای توقف برنامه‌ریزی‌شده؛ ضریب دسترسی، توقف‌های دیگر در همان ساعات را پوشش می‌دهد. دریافت از برنامهٔ تولید مستقل است.',
       eq:'m_raw = m_saleable / yield; rated_flow = m_raw / (h_net × availability); receiving_peak = m_raw × peak_factor / h_receiving',
       fields:[p('m','تولید قابل فروش هدف','kg/day',20000),e('y','بازده جرمی کل از شیر خام',97),['h','ساعت خالص برنامه‌ریزی‌شده','h/day',10,Number.MIN_VALUE,24],e('a','دسترسی خط در ساعت خالص',90),['hr','پنجرهٔ دریافت','h/day',5,Number.MIN_VALUE,24],['peak','ضریب اوج دریافت نسبت به میانگین','×',1.5,1]],
       run({m,y,h,a,hr,peak}) {const raw=100*m/y;return [['شیر خام مورد نیاز',raw,'kg/day'],['ظرفیت اسمی خط بر پایهٔ ورودی شیر',raw/(h*a/100),'kg/h'],['اوج دریافت برآوردی',raw*peak/hr,'kg/h']];}},
      {id:'tankers',title:'پذیرش شیر؛ تانکر، ایستگاه تخلیه و زمان تخلیه',
       note:'ورود تانکرها در پنجرهٔ پذیرش با ضریب اوج بررسی می‌شود. زمان تخلیه شامل پمپاژ و زمان ثابت نمونه‌گیری، اتصال و جداسازی است. آزمون‌های پذیرش، صف تانکر و مسیر تردد جداگانه برنامه‌ریزی شوند.',
       eq:'N = ceil(M_raw / m_tanker); t_unload = m_tanker/Q_pump × 60 + t_fixed; λ_peak = N × peak / h_window; bays = ceil(λ_peak × t_unload/60 / utilization)',
       fields:[p('m','شیر خام دریافتی','kg/day',21000),p('load','میانگین بار خالص هر تانکر','kg',7000),['h','پنجرهٔ پذیرش','h/day',5,Number.MIN_VALUE,24],['peak','ضریب اوج ورود تانکر','×',1.5,1],p('pump','دبی پمپ تخلیه','kg/h',20000),n('fixed','زمان ثابت نمونه‌گیری، اتصال و جداسازی','min',20),e('util','حد بهره‌برداری ایستگاه تخلیه',70)],
       run({m,load,h,peak,pump,fixed,util}) {
         const N=ceil(m/load), time=load/pump*60+fixed, rate=N*peak/h, bays=Math.max(1,ceil(rate*time/60/(util/100)));
         return [['تعداد تانکر در روز',N,'tanker/day'],['زمان هر تخلیه',time,'min'],['اوج ورود تانکر',rate,'tanker/h'],['تعداد ایستگاه تخلیه',bays,'عدد']];}},
      {id:'silos',title:'سیلوهای شیر خام و مخازن بافر',
       note:'ذخیره بر پایهٔ مصرف متوسط روزانه و ساعت پوشش است. ظرفیت با خروج مخزن از سرویس محاسبه می‌شود؛ دریافت پالسی، تفکیک بچ، CIP و محدودیت زمان نگهداری جداگانه بررسی شوند.',
       eq:'M_buffer = M_day h_coverage/24; V_each = M_buffer/(ρ × fill × N_available)',
       fields:[p('m','مصرف شیر خام','kg/day',21000),p('hours','ساعت پوشش موجودی','h',24),p('rho','چگالی شیر','kg/m³',1030),e('fill','حجم کاری نسبت به حجم هندسی',85),['count','تعداد مخزن نصب‌شده','عدد',3,1],n('out','تعداد مخزن خارج از سرویس','عدد',1)],
       run({m,hours,rho,fill,count,out}) {
         need(Number.isSafeInteger(count)&&Number.isSafeInteger(out)&&count>out,'تعداد مخزن باید صحیح باشد و حداقل یک مخزن در سرویس بماند.');
         const mass=m*hours/24, each=mass/(rho*(fill/100)*(count-out));
         return [['موجودی کاری لازم',mass,'kg'],['حجم هندسی هر مخزن',each,'m³'],['حجم هندسی نصب‌شده',each*count,'m³']];}},
      {id:'fat-balance',title:'سپراتور و استانداردسازی چربی شیر',
       note:'تقسیم کامل به خامه و شیر پس‌چرخ و سپس بازترکیب تمام شیر پس‌چرخ با بخشی از خامه؛ بدون اتلاف و بدون خامهٔ بیرونی. هر چهار غلظت، درصد وزنی چربی هستند.',
       eq:'C = M (f_in − f_skim)/(f_cream − f_skim); S = M − C; C_back = S (f_target − f_skim)/(f_cream − f_target)',
       fields:[p('m','شیر ورودی','kg/h',3000),x('fi','چربی شیر ورودی',3.5),x('fs','چربی شیر پس‌چرخ',0.05),x('fc','چربی خامه',40),x('ft','چربی شیر استاندارد',2.5)],
       run({m,fi,fs,fc,ft}) {
         need(fs<fi&&fi<fc&&ft>=fs&&ft<=fi,'چربی پس‌چرخ < چربی شیر خام < چربی خامه؛ هدف باید بین پس‌چرخ و شیر خام باشد.');
         const c=m*(fi-fs)/(fc-fs),s=m-c,back=s*(ft-fs)/(fc-ft);
         return [['خامهٔ خروجی سپراتور',c,'kg/h'],['شیر پس‌چرخ',s,'kg/h'],['خامهٔ برگشتی',back,'kg/h'],['شیر استانداردشده',s+back,'kg/h'],['خامهٔ مازاد',Math.max(0,c-back),'kg/h']];}},
      {id:'cheese-whey',title:'پنیر و آب‌پنیر؛ موازنهٔ جرم و جامدات',
       note:'مدل فقط دو جریان خروجی دارد، بدون افزودنی و اتلاف. بازیافت جامدات شیر در پنیر را از پایلوت یا دادهٔ کارخانه بگیرید. برای پنیر شورشده یا فرآیند همراه افزودنی، موازنهٔ کامل جداگانه لازم است.',
       eq:'solids_cheese = M × TS_milk × recovery; cheese = solids_cheese / TS_cheese; whey = M − cheese; TS_whey = remaining_solids / whey',
       fields:[p('m','شیر ورودی','kg/day',16000),e('ts','جامدات کل شیر',12.5),x('rec','بازیافت جامدات در پنیر',45),e('tc','جامدات کل پنیر',45)],
       run({m,ts,rec,tc}) {
         const solids=m*ts/100, sc=solids*rec/100, cheese=sc/(tc/100), whey=m-cheese;
         need(whey>0 && solids-sc<=whey,'جامدات، بازیافت یا رطوبت ورودی با موازنهٔ فیزیکی سازگار نیست.');
         return [['پنیر',cheese,'kg/day'],['بازده پنیر از شیر',100*cheese/m,'%'],['آب‌پنیر',whey,'kg/day'],['جامدات آب‌پنیر',100*(solids-sc)/whey,'%']];}},
      {id:'cheese-vats',title:'وان پنیر؛ تعداد بچ و ظرفیت نصب‌شده',
       note:'سیکل شامل پرکردن، زمان فرآیند، تخلیه و شست‌وشو است. حجم پرشدن بر پایهٔ شیر ورودی است؛ فضای لازم برای هم‌زدن و افزودنی‌ها در درصد حجم کاری لحاظ شود. گلوگاه پرس و آبگیری جداگانه بررسی شود.',
       eq:'M_batch = V_geo × fill × ρ; N_batches = ceil(M_day/M_batch); cycles_per_vat = floor(h_window/h_cycle); N_vats = ceil(N_batches/cycles_per_vat)',
       fields:[p('m','شیر روزانه برای پنیر','kg/day',16000),p('v','حجم هندسی هر وان','m³',5),e('fill','نسبت حجم کاری',80),p('rho','چگالی شیر','kg/m³',1030),['h','پنجرهٔ کاری روزانه','h/day',16,Number.MIN_VALUE,24],p('cycle','زمان اشغال کامل وان','h',6)],
       run({m,v,fill,rho,h,cycle}) {
         const mb=v*fill*rho/100, b=ceil(m/mb), c=floor(h/cycle);
         need(c>=1,'هیچ بچ کاملی در پنجرهٔ کاری جا نمی‌گیرد.');
         const vats=ceil(b/c);
         return [['ظرفیت شیر هر بچ',mb,'kg'],['تعداد بچ لازم',b,'batch/day'],['تعداد وان در سرویس',vats,'عدد'],['ظرفیت اسمی نصب‌شده',vats*c*mb,'kg/day']];}},
      {id:'ripening',title:'پنیر؛ حوضچهٔ آب‌نمک و اتاق رسانیدن',
       note:'موجودی پنیر = تولید روزانه × مدت ماندن. مدت‌ها، نسبت آب‌نمک و چگالی را از فرآیند محصول بگیرید؛ مقادیر پیش‌فرض نمونه‌اند. سردسازی اتاق رسانیدن را در ابزار سردخانه و تبرید وارد کنید.',
       eq:'M_brining = cheese_day × t_brine; V_brine = ratio × M_brining / ρ_brine; M_ripe = cheese_day × t_ripe; pallets = ceil(M_ripe / (m_pallet × occupancy)); A_gross = ceil(pallets / levels) × A_pallet / floor_fraction',
       fields:[p('m','پنیر تولیدی','kg/day',2000),n('brine','مدت ماندن در آب‌نمک','day',2),p('ratio','نسبت جرم آب‌نمک به پنیر','kg/kg',2),p('rho','چگالی آب‌نمک','kg/m³',1180),n('ripe','مدت رسانیدن','day',60),p('load','جرم پنیر روی هر پالت','kg',800),e('occ','حد بهره‌برداری موقعیت‌ها',85),['levels','تراز قابل استفاده روی هم','عدد',3,1],p('area','ردپای هر پالت','m²',1.2),e('frac','سهم سطح برای ردپای پالت‌ها',45)],
       run({m,brine,ratio,rho,ripe,load,occ,levels,area,frac}) {
         need(Number.isSafeInteger(levels),'تعداد تراز باید عدد صحیح باشد.');
         const inBrine=m*brine, stock=m*ripe, pallets=ceil(stock/(load*occ/100)), slots=ceil(pallets/levels);
         return [['پنیر در آب‌نمک',inBrine,'kg'],['حجم آب‌نمک',ratio*inBrine/rho,'m³'],['موجودی در رسانیدن',stock,'kg'],['موقعیت پالت',pallets,'عدد'],['سطح ناخالص اتاق رسانیدن',slots*area/(frac/100),'m²']];}},
      {id:'yogurt',title:'ماست هم‌زده؛ ظرفیت مخزن تخمیر و سیکل',
       note:'برای تخمیر در مخزن، نه ماست قالبی در بسته. یک سیکل شامل پر/خالی‌کردن، تخمیر، زمان اشغال ناشی از سردکردن و CIP است. سیکل‌ها در پنجرهٔ روزانه باید کامل شوند و زمان‌بندی منابع مشترک جداگانه کنترل شود.',
       eq:'batches_per_tank = floor(h_window / h_cycle); batch_mass = V_geo × fill × ρ; tanks = ceil(M_day / (batch_mass × batches_per_tank))',
       fields:[p('m','جرم مخلوط روزانه','kg/day',10000),p('v','حجم هندسی هر مخزن','m³',4),p('rho','چگالی مخلوط','kg/m³',1040),e('fill','نسبت حجم کاری',85),['h','پنجرهٔ روزانهٔ خط','h/day',18,Number.MIN_VALUE,24],p('cycle','مدت اشغال کامل یک سیکل','h',7)],
       run({m,v,rho,fill,h,cycle}) {
         const b=floor(h/cycle), batch=v*rho*fill/100;
         need(b>0,'هیچ سیکل کاملی در پنجرهٔ کاری جا نمی‌گیرد.');
         const tanks=ceil(m/(b*batch));
         return [['جرم بچ هر مخزن',batch,'kg'],['سیکل کامل هر مخزن',b,'batch/day'],['مخزن در سرویس',tanks,'عدد'],['ظرفیت اسمی در برنامهٔ داده‌شده',tanks*b*batch,'kg/day']];}}
    ]],
    ['process','تجهیزات فرآیند و بسته‌بندی',[
      {id:'regeneration',title:'پاستوریزاتور؛ بار گرمایش، بازیافت و سرمایش',
       note:'تقریب جریان پایا با دبی و گرمای ویژهٔ برابر در دو سمت احیا، بدون اتلاف؛ درصد بازیافت کسری از افزایش دمای شیر تا دمای گرم است. دماها و شرایط قانونی فرآیند باید مستقل تعیین و اعتبارسنجی شوند.',
       eq:'ΔT_reg = r (T_hot − T_in); Q_heat = m cp (T_hot − T_in − ΔT_reg)/3600; Q_cool = m cp (T_hot − ΔT_reg − T_pack)/3600',
       fields:[p('m','دبی شیر','kg/h',3000),p('cp','گرمای ویژه شیر','kJ/(kg·K)',3.9),t('tin','ورودی شیر خام',5),t('th','نقطهٔ گرم فرآیند (ورودی طراحی)',72),t('tf','خروجی سرد',4),x('r','بازیافت دمایی احیا',85)],
       run({m,cp,tin,th,tf,r}) {
         need(th>tin&&r<100,'دمای گرم باید بالاتر از ورودی و بازیافت عملی کمتر از ۱۰۰٪ باشد.');
         const dt=(th-tin)*r/100, pre=tin+dt, post=th-dt, k=m*cp/3600;
         need(post>=tf,'دمای هدف خروجی از خروجی بخش احیا گرم‌تر است؛ این حالت با کولر تنها ممکن نیست.');
         return [['شیر خام پس از پیش‌گرمایش',pre,'°C'],['محصول پس از احیا',post,'°C'],['گرمای بازیافت‌شده',k*dt,'kW'],['بار گرمایش خارجی',k*(th-pre),'kW'],['بار سرمایش خارجی',k*(post-tf),'kW']];}},
      {id:'holding',title:'لولهٔ نگهدار؛ برآورد طول هندسی',
       note:'زمان را مرجع صلاحیت‌دار تعیین می‌کند. نسبت زمان سریع‌ترین مسیر به زمان متوسط باید برای دبی بیشینه و شرایط واقعی مشخص شود. هندسه جایگزین آزمون زمان ماند، انحراف جریان و تأیید قانونی نیست.',
       eq:'Qv = m / (3600 ρ); A = π D²/4; L = (Qv/A) t_required / ratio',
       fields:[p('m','بیشینهٔ دبی جرمی','kg/h',3300),p('rho','چگالی در دمای نگهداری','kg/m³',1010),p('d','قطر داخلی لوله','mm',48),p('t','زمان ماند موردنیاز ورودی طرح','s',15),['r','نسبت زمان سریع‌ترین مسیر به میانگین','—',0.8,Number.MIN_VALUE,1]],
       run({m,rho,d,t,r}) {const q=m/(3600*rho), a=Math.PI*(d/1000)**2/4;return [['سرعت متوسط',q/a,'m/s'],['طول برآوردی',q/a*t/r,'m'],['حجم اشغال‌شده',q*t/r*1000,'L']];}},
      {id:'homogenizer',title:'هموژنایزر؛ توان فشاردهی و افزایش دما',
       note:'هر دو مقدار افت فشار باید مستقل باشند؛ برای دستگاه با فشار مرحلهٔ اول گزارش‌شده به‌صورت فشار کل، همان فشار کل را فقط یک بار وارد کنید. افزایش دمای ایدئال ناشی از اتلاف انرژی فشار در محصول است؛ گرمای موتور لحاظ نشده.',
       eq:'Qv = m/(3600ρ); P_hyd = Qv (Δp₁ + Δp₂); P_el = P_hyd/η; ΔT ≈ (Δp₁ + Δp₂)/(ρ cp)',
       fields:[p('m','دبی جرمی','kg/h',3000),p('rho','چگالی محصول','kg/m³',1030),p('cp','گرمای ویژه','kJ/(kg·K)',3.9),p('p1','افت فشار مرحلهٔ اول','bar',150),n('p2','افت فشار مرحلهٔ دوم','bar',30),e('eta','راندمان کل تا فشاردهی',75)],
       run({m,rho,cp,p1,p2,eta}) {const dp=(p1+p2)*1e5, q=m/(3600*rho)*dp/1000;return [['توان هیدرولیکی',q,'kW'],['توان ورودی تخمینی',100*q/eta,'kW'],['افزایش دمای ایدئال',dp/(rho*cp*1000),'K']];}},
      {id:'packaging',title:'پرکن و بسته‌بندی؛ تعداد بسته و سرعت اسمی',
       note:'جرم هدف، جرم خالص واقعی در هر بسته است. ضایعات سهم بستهٔ پرشده و ردشده است. ضریب بهره‌برداری فقط توقف و کاهش سرعت را پوشش دهد؛ افت کیفیت دوباره اعمال نشود.',
       eq:'N_good = ceil(M_saleable / m_pack); N_filled = ceil(N_good / (1 − reject)); speed = N_filled/(minutes × utilization)',
       fields:[p('m','جرم قابل فروش هدف','kg/day',20000),p('unit','جرم خالص هدف هر بسته','g',1000),['h','ساعات برنامهٔ بسته‌بندی','h/day',10,Number.MIN_VALUE,24],e('u','بهره‌برداری دسترسی و سرعت',85),x('rej','نرخ رد بسته از تعداد پرشده',1.5)],
       run({m,unit,h,u,rej}) {
         need(rej<100,'نرخ رد بسته باید کمتر از ۱۰۰٪ باشد.');
         const good=ceil(1000*m/unit), filled=ceil(good/(1-rej/100));
         return [['بستهٔ سالم هدف',good,'pack/day'],['کل بستهٔ پرشده',filled,'pack/day'],['خوراک پرکن بدون بازیافت ضایعات',filled*unit/1000,'kg/day'],['سرعت اسمی لازم',filled/(60*h*u/100),'pack/min']];}}
    ]],
    ['site-services','زیرساخت، سردخانه و برآورد طرح',[
      {id:'cold',title:'سردخانه و تبرید؛ بار و برق سرمایش',
       note:'بار پوسته از UA مؤثر تمام سطوح و یک اختلاف دمای معادل است. نفوذ هوا، افراد، فن‌ها و دیفراست را معادل بار پیوستهٔ روزانه وارد کنید. مدل سرمایش محسوس بدون انجماد است و بار اوج کوتاه‌مدت یا منحنی عملکرد سازنده را جایگزین نمی‌کند.',
       eq:'E_day = m cp ΔT/3600 + 24(Q_shell + Q_other); Q_rated = (E_day/h_compressor)(1 + margin); P = Q_rated/COP; kWh_el/day = E_day/COP; cost_year = kWh_el/day × days × tariff',
       fields:[n('m','محصول تازه ورودی','kg/day',20000),p('cp','گرمای ویژه محصول','kJ/(kg·K)',3.9),t('tp','دمای محصول ورودی',7),t('tr','دمای هدف اتاق و محصول',4),t('ta','دمای معادل بیرون',32),n('ua','مجموع U×A پوسته','W/K',240),n('other','بار پیوستهٔ دیگر','kW',6),['h','ساعت مجاز کار کمپرسور','h/day',18,Number.MIN_VALUE,24],p('cop','ضریب عملکرد در شرایط طرح','—',2.5),n('margin','حاشیهٔ ظرفیت','%',15),['days','روز کار در سال','day/year',365,Number.MIN_VALUE,366],n('tariff','تعرفهٔ برق','واحد پول/kWh',0.08)],
       run({m,cp,tp,tr,ta,ua,other,h,cop,margin,days,tariff}) {
         const product=m*cp*Math.max(0,tp-tr)/3600, shell=ua*Math.max(0,ta-tr)/1000;
         const q=(product+24*(shell+other))/h*(1+margin/100);
         const elec=(product+24*(shell+other))/cop;
         return [['بار روزانهٔ محصول',product,'kWhₜₕ/day'],['بار پوسته',shell,'kW'],['ظرفیت برودتی طرح',q,'kW'],['توان برق در بار طرح',q/cop,'kW'],['برق مصرفی روزانهٔ تخمینی',elec,'kWh/day'],['هزینهٔ برق سالانه',elec*days*tariff,'واحد پول/year']];}},
      {id:'water-effluent',title:'آب، CIP و بار پساب',
       note:'آب CIP به‌ازای هر سیکل، آب تازه است؛ جریان‌های آب دیگر نباید آن را دوباره حساب کنند. بخش غیرقابل تخلیه شامل مصرف در محصول، تبخیر و سایر برداشت‌هاست. COD ورودی، میانگین وزنی پساب است؛ اوج را با برنامهٔ تخلیهٔ واقعی بررسی کنید.',
       eq:'W = M w/1000 + V_CIP × cycles + W_other; E = W − W_excluded; COD_load = E × COD/1000; Q_peak = (E/h) × peak_factor',
       fields:[p('m','شیر فرآوری‌شده','kg/day',21000),n('w','آب مستقیم فرآیند به ازای شیر','L/kg',1.4),n('cip','آب تازه هر سیکل CIP','m³/cycle',2.5),n('cycles','میانگین تعداد سیکل','cycle/day',4),n('other','سایر مصرف آب تازه','m³/day',7),n('out','مصرف بدون ورود به پساب','m³/day',5),n('cod','میانگین COD پساب','mg/L',1800),['h','بازهٔ روزانهٔ تولید پساب','h/day',16,Number.MIN_VALUE,24],['peak','ضریب اوج تخلیه','×',2.5,1]],
       run({m,w,cip,cycles,other,out,cod,h,peak}) {
         const clean=cip*cycles, water=m*w/1000+clean+other, eff=water-out;
         need(eff>=0,'آب خارج از پساب بیشتر از کل آب تازه واردشده است.');
         return [['آب تازهٔ CIP',clean,'m³/day'],['کل آب تازه',water,'m³/day'],['پساب روزانه',eff,'m³/day'],['اوج تخلیه برآوردی',eff*peak/h,'m³/h'],['بار آلودگی COD',eff*cod/1000,'kg/day']];}},
      {id:'equalization',title:'پساب؛ حجم اولیهٔ مخزن متعادل‌سازی',
       note:'مدل یک پنجرهٔ ورودی با دبی یکنواخت و تخلیهٔ ثابت در ۲۴ ساعت دارد. جهش کوتاه تخلیهٔ CIP، ورود آب باران، محدودیت خروجی، حجم مرده و طراحی تصفیه در این مدل نیستند.',
       eq:'Q_out = V_day / 24; Q_in = V_day / h_in; V_swing = (Q_in − Q_out) h_in; V_geo = V_swing (1 + margin)/fill',
       fields:[p('v','حجم پساب روزانه','m³/day',45),['h','بازهٔ ورود یکنواخت پساب','h/day',16,Number.MIN_VALUE,24],n('margin','حاشیهٔ روی حجم تنظیمی','%',25),e('fill','نسبت حجم مفید به هندسی',85)],
       run({v,h,margin,fill}) {
         const q=v/24, swing=v*(1-h/24);
         return [['دبی ثابت خروجی مدل',q,'m³/h'],['حجم تنظیمی',swing,'m³'],['حجم هندسی معادل مدل',swing*(1+margin/100)/(fill/100),'m³']];}},
      {id:'cip-hydraulics',title:'مدار CIP؛ دبی گردش، حجم لوله و گرمایش',
       note:'یک مدار با قطر ثابت؛ سرعت هدف، زمان، دما و غلظت باید برای هندسه و آلودگی واقعی اعتبارسنجی شوند. حجم مخزن شامل پرشدن خط، حجم تجهیزات و حداقل مایع داخل مخزن هنگام گردش است.',
       eq:'A = π D²/4; Q = 3600 A v; V_charge = A L + V_equip + V_heel; P_heat = ρ V_charge cp ΔT/(3600 t_heat η)',
       fields:[p('d','قطر داخلی مسیر','mm',50),p('vel','سرعت هدف گردش','m/s',1.5),n('l','طول مسیر پرشونده','m',100),n('equip','حجم تجهیزات و مسیرهای دیگر','L',100),p('heel','حداقل حجم باقی‌مانده در مخزن','L',350),p('rho','چگالی محلول','kg/m³',1020),p('cp','گرمای ویژه محلول','kJ/(kg·K)',4),n('dt','افزایش دما','K',45),p('h','زمان مجاز گرمایش','h',0.5),e('eta','بازده گرمایش',90)],
       run({d,vel,l,equip,heel,rho,cp,dt,h,eta}) {
         const a=Math.PI*(d/1000)**2/4, v=a*l+(equip+heel)/1000;
         return [['دبی گردش',3600*a*vel,'m³/h'],['حجم پرشوندهٔ لوله',1000*a*l,'L'],['شارژ کاری مدار',1000*v,'L'],['بار ورودی گرمایش',rho*v*cp*dt/(3600*h*eta/100),'kW']];}},
      {id:'air-power',title:'برق و هوای فشرده؛ ظرفیت اولیه',
       note:'ورودی برق، توان الکتریکی متصل است (نه توان محور). ضریب هم‌زمانی را روی بار عادی اعمال کنید و بارهای راه‌اندازی را جداگانه بررسی کنید. هوای فرایند و ابزار دقیق باید به دبی هوای آزاد (FAD) در یک مبنا تبدیل شود.',
       eq:'P_peak = P_connected × coincidence; S_design = P_peak (1 + reserve)/PF; FAD_design = FAD_use (1 + reserve)/(1 − leakage_fraction)',
       fields:[p('kw','بار برق متصل','kW',300),e('co','هم‌زمانی بار الکتریکی',75),['pf','ضریب توان طرح','—',0.9,Number.MIN_VALUE,1],n('r','حاشیهٔ برق و کمپرسور','%',20),n('air','مصرف هم‌زمان هوای آزاد در نقاط مصرف','m³/min FAD',2.5),x('leak','نشتی نسبت به هوای تحویلی کمپرسور',10)],
       run({kw,co,pf,r,air,leak}) {
         need(leak<100,'سهم نشتی باید کمتر از ۱۰۰٪ باشد.');
         const peak=kw*co/100;
         return [['اوج توان فعال',peak,'kW'],['ظرفیت ظاهری برق با حاشیه',peak*(1+r/100)/pf,'kVA'],['هوای آزاد طرح کمپرسور',air*(1+r/100)/(1-leak/100),'m³/min FAD']];}},
      {id:'utility-summary',title:'جمع‌بندی بار تأسیسات خطوط',
       note:'بار هر خط را از ابزارهای همین مجموعه و تأسیسات کارخانه به‌صورت دستی وارد کنید. ضریب هم‌زمانی را از برنامهٔ واقعی شیفت و شست‌وشو بگیرید؛ مجموع بار متصل، بار هم‌زمان طرح نیست. بارهای راه‌اندازی جداگانه بررسی شوند.',
       eq:'Σ = Σ_lines load_line; design_load = Σ × coincidence',
       fields:[n('s1','بخار؛ شیر پاستوریزه','kg/h',400),n('s2','بخار؛ ماست','kg/h',250),n('s3','بخار؛ پنیر','kg/h',350),n('s4','بخار؛ CIP و عمومی','kg/h',150),x('cs','هم‌زمانی بخار',80),
               n('e1','برق؛ شیر پاستوریزه','kW',60),n('e2','برق؛ ماست','kW',40),n('e3','برق؛ پنیر','kW',70),n('e4','برق؛ CIP و عمومی','kW',50),x('ce','هم‌زمانی برق',75),
               n('c1','سرمایش؛ شیر پاستوریزه','kW',120),n('c2','سرمایش؛ ماست','kW',80),n('c3','سرمایش؛ پنیر','kW',60),n('c4','سرمایش؛ سردخانه و عمومی','kW',50),x('cc','هم‌زمانی سرمایش',85),
               n('w1','آب؛ شیر پاستوریزه','m³/h',6),n('w2','آب؛ ماست','m³/h',4),n('w3','آب؛ پنیر','m³/h',5),n('w4','آب؛ CIP و عمومی','m³/h',3),x('cw',  'هم‌زمانی آب',70)],
       run(v) {
         const sum=(a)=>a.reduce((s,k)=>s+v[k],0);
         const st=sum(['s1','s2','s3','s4']), el=sum(['e1','e2','e3','e4']), co=sum(['c1','c2','c3','c4']), wa=sum(['w1','w2','w3','w4']);
         return [['جمع بخار متصل',st,'kg/h'],['بخار هم‌زمان طرح',st*v.cs/100,'kg/h'],['جمع برق متصل',el,'kW'],['برق هم‌زمان طرح',el*v.ce/100,'kW'],['جمع سرمایش متصل',co,'kW'],['سرمایش هم‌زمان طرح',co*v.cc/100,'kW'],['جمع آب متصل',wa,'m³/h'],['آب هم‌زمان طرح',wa*v.cw/100,'m³/h']];}},
      {id:'warehouse',title:'انبار سرد محصول؛ موجودی، پالت و مساحت',
       note:'خروج یکنواخت مبناست؛ دورهٔ قرنطینه و گردش موجودی را در روز پوشش بگنجانید. اشغال سطح، سهم ردپای پالت از کل محدودهٔ انبار پس از احتساب راهروهاست؛ فاصله‌های بهداشتی و ایمنی جداگانه کنترل شوند.',
       eq:'pallets = ceil(M_day × days / m_pallet / occupancy); ground_slots = ceil(pallets / levels); A_gross = ground_slots × A_pallet / floor_fraction',
       fields:[p('m','محصول روزانه','kg/day',20000),p('days','پوشش موجودی','day',2.5),p('load','جرم خالص روی هر پالت','kg',600),e('occ','حد بهره‌برداری موقعیت‌ها',85),['levels','تراز قابل استفاده روی هم','عدد',2,1],p('area','ردپای هر پالت','m²',1.2),e('frac','سهم سطح برای ردپای پالت‌ها',45)],
       run({m,days,load,occ,levels,area,frac}) {
         need(Number.isSafeInteger(levels),'تعداد تراز باید عدد صحیح باشد.');
         const pallets=ceil(m*days/(load*occ/100)), slots=ceil(pallets/levels);
         return [['موجودی هدف',m*days,'kg'],['ظرفیت نصب‌شدهٔ موقعیت پالت',pallets,'عدد'],['موقعیت روی کف',slots,'عدد'],['سطح ناخالص انبار',slots*area/(frac/100),'m²']];}},
      {id:'economics',title:'اقتصاد اولیه؛ هزینهٔ واحد و نقطهٔ سربه‌سر',
       note:'مدل تک‌محصول یا میانگین سبد ثابت. هزینهٔ متغیر شامل مواد، بسته‌بندی و خدمات متغیر است؛ درآمد محصولات جانبی، مالیات، سرمایهٔ در گردش و جریان نقدی تنزیل‌شده جداگانه بررسی شوند.',
       eq:'M_year = M_day × days; C_unit = C_variable + C_fixed / M_year; M_BE = C_fixed / (price − C_variable); simple_payback = CAPEX / annual_operating_surplus',
       fields:[p('m','تولید قابل فروش','kg/day',20000),['days','روز عملیاتی سال','day/year',300,Number.MIN_VALUE,366],n('cv','هزینهٔ متغیر واحد','واحد پول/kg',0.68),n('cf','هزینهٔ ثابت نقدی سالانه','واحد پول/year',600000),n('price','قیمت فروش خالص','واحد پول/kg',0.95),n('capex','سرمایه‌گذاری اولیه','واحد پول',4500000)],
       run({m,days,cv,cf,price,capex}) {
         const annual=m*days,margin=price-cv, surplus=annual*margin-cf;
         const res=[['تولید سالانه',annual,'kg/year'],['هزینهٔ نقدی واحد',cv+cf/annual,'واحد پول/kg'],['مازاد (یا کسری) عملیاتی سالانه',surplus,'واحد پول/year']];
         if(margin>0) res.push(['فروش سربه‌سر',cf/margin,'kg/year']);
         if(surplus>0) res.push(['بازگشت سادهٔ سرمایه',capex/surplus,'year']);
         return res;
       }}
    ]]
  ];
})(typeof module === 'object' ? require('./design-core.js') : FactoryCalc);
if (typeof module === 'object') module.exports = DairyDesignGroups;
else FactoryCalc.mount(document.getElementById('calculators'), DairyDesignGroups);
