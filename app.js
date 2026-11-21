// Configure Supabase in this file after creating the project.
// Until configured, the site runs in local demo mode and stores bookings in this browser only.
const SUPABASE_URL = "";
const SUPABASE_ANON_KEY = "";
const supabaseClient = (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const services = [
  {id:"haircut",name:"حلاقة شعر عادية",category:"HAIR",duration:30,price:250},
  {id:"skin-fade",name:"Skin Fade / تدريج",category:"HAIR",duration:40,price:300},
  {id:"scissors",name:"حلاقة بالمقص",category:"HAIR",duration:30,price:250},
  {id:"kids",name:"حلاقة أطفال",category:"HAIR",duration:30,price:200},
  {id:"wash",name:"غسيل شعر",category:"HAIR",duration:10,price:80},
  {id:"styling",name:"تصفيف وتسريح",category:"HAIR",duration:15,price:100},
  {id:"beard-line",name:"تحديد دقن",category:"BEARD",duration:15,price:100},
  {id:"beard-full",name:"حلاقة دقن كاملة",category:"BEARD",duration:20,price:150},
  {id:"beard-fade",name:"تدريج دقن",category:"BEARD",duration:25,price:180},
  {id:"hair-beard",name:"تحديد شعر ودقن",category:"BEARD",duration:20,price:150},
  {id:"facial",name:"تنظيف بشرة",category:"CARE",duration:40,price:300},
  {id:"charcoal",name:"ماسك فحم",category:"CARE",duration:20,price:150},
  {id:"moisture",name:"تنظيف وترطيب الوجه",category:"CARE",duration:30,price:250},
  {id:"wax-face",name:"واكس للوجه",category:"CARE",duration:15,price:120},
  {id:"dye",name:"صبغة شعر",category:"EXTRA",duration:45,price:500,starting:true},
  {id:"protein",name:"بروتين / علاج شعر",category:"EXTRA",duration:60,price:600,starting:true},
  {id:"wax",name:"إزالة شعر بالواكس",category:"EXTRA",duration:20,price:150}
];
const barbers = ["محمد","محمود","حسين","عمر"];
const $ = id => document.getElementById(id);
const money = n => `${n} ج.م`;
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function renderCatalog(){
  $("service-grid").innerHTML = services.map(s=>`<article class="service-card"><div><span class="category">${s.category}</span><h3>${esc(s.name)}</h3></div><div class="bottom"><span>${s.duration} دقيقة</span><strong>${s.starting?"يبدأ من ":""}${money(s.price)}</strong></div></article>`).join("");
  $("barber-grid").innerHTML = barbers.map((b,i)=>`<article class="barber-card"><div class="barber-avatar">${["م","م","ح","ع"][i]}</div><h3>${b}</h3><p>Barber Specialist</p></article>`).join("");
  $("service-select").innerHTML = `<option value="">اختار الخدمة</option>`+services.map(s=>`<option value="${s.id}">${esc(s.name)} — ${money(s.price)} (${s.duration} دقيقة)</option>`).join("");
  $("barber-select").innerHTML = `<option value="">اختار الحلاق</option>`+barbers.map(b=>`<option>${b}</option>`).join("");
}
function localDateString(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return `${y}-${m}-${day}`;}
function selectedService(){return services.find(s=>s.id===$("service-select").value);}
function buildSlots(){
  const date=$("booking-date").value, barber=$("barber-select").value, service=selectedService();
  const select=$("time-select"); select.innerHTML='<option value="">اختار الموعد</option>';
  if(!date||!barber||!service){$("slot-hint").textContent="اختار الخدمة والحلاق والتاريخ لعرض المواعيد.";return;}
  // Business hours: noon through 02:00 the following day.
  const start=new Date(`${date}T12:00:00`);
  const close=new Date(start); close.setDate(close.getDate()+1); close.setHours(2,0,0,0);
  const now=new Date();
  let count=0;
  for(let t=new Date(start);t<close;t.setMinutes(t.getMinutes()+30)){
    const finish=new Date(t.getTime()+service.duration*60000);
    if(finish>close || t<=now) continue;
    const label=t.toLocaleTimeString("ar-EG",{hour:"2-digit",minute:"2-digit",hour12:true});
    const value=`${localDateString(t)}T${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}:00`;
    select.insertAdjacentHTML("beforeend",`<option value="${value}">${label}</option>`);count++;
  }
  $("slot-hint").textContent = supabaseClient ? "المواعيد المتاحة ستُراجع نهائيًا على قاعدة البيانات عند تأكيد الحجز." : `وضع معاينة: تظهر مواعيد تجريبية (${count} موعدًا). لن يتم حجز موعد حقيقي قبل ربط قاعدة البيانات.`;
}
async function submitBooking(e){
  e.preventDefault();
  const msg=$("booking-message");msg.className="";msg.textContent="";
  const service=selectedService(),barber=$("barber-select").value,date=$("booking-date").value,time=$("time-select").value;
  const name=$("customer-name").value.trim(),phone=$("customer-phone").value.trim();
  if(!service||!barber||!date||!time||name.length<2||!/^01\d{9}$/.test(phone)){msg.className="error";msg.textContent="راجع البيانات المطلوبة ورقم الموبايل (11 رقمًا يبدأ بـ 01).";return;}
  const startsAt=new Date(time);
  const endsAt=new Date(startsAt.getTime()+service.duration*60000);
  if(!supabaseClient){
    const booking={id:"DEMO-"+Date.now(),name,phone,barber,service:service.name,date,time,price:service.price,status:"demo_only"};
    const list=JSON.parse(localStorage.getItem("ourplanet_demo_bookings")||"[]");list.push(booking);localStorage.setItem("ourplanet_demo_bookings",JSON.stringify(list));
    msg.className="error";msg.textContent="تم حفظ طلب تجريبي على هذا المتصفح فقط، وليس حجزًا مؤكدًا لدى المحل. يلزم ربط قاعدة البيانات لتفعيل الحجوزات الحقيقية.";
    return;
  }
  $("submit-booking").disabled=true;$("submit-booking").textContent="جارٍ تأكيد الحجز...";
  try{
    const {data,error}=await supabaseClient.rpc("create_booking",{
      p_customer_name:name,p_customer_phone:phone,p_barber_name:barber,
      p_service_code:service.id,p_starts_at:startsAt.toISOString(),p_payment_method:"pay_at_shop"
    });
    if(error) throw error;
    msg.className="success";msg.textContent=`تم تسجيل الحجز بنجاح. رقم الحجز: ${data.booking_code}. الدفع في المحل.`;
    $("booking-form").reset();buildSlots();
  }catch(err){msg.className="error";msg.textContent=err.message||"تعذر إتمام الحجز. جرب موعدًا آخر أو تواصل مع المحل.";}
  finally{$("submit-booking").disabled=false;$("submit-booking").textContent="تأكيد الحجز";}
}
function init(){
  renderCatalog();$("year").textContent=new Date().getFullYear();
  const today=localDateString(new Date());$("booking-date").min=today;
  ["service-select","barber-select","booking-date"].forEach(id=>$(id).addEventListener("change",buildSlots));
  $("booking-form").addEventListener("submit",submitBooking);
}
init();
