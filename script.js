const DEFAULT_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRDWHrj_Mh4k_BLNS6nB3ofBK3uQpndExNKV6Y84XM5sb6mev5yspjZEsVviMsa5uyraB6vHVHpI_bn/pub?output=csv";

let allTasks = [];
let currentWeekPointer = parseInt(localStorage.getItem('currentWeekPointer')) || 0; // يشير للمقطع الحالي من السلسلة
let hasDoneThisWeek = JSON.parse(localStorage.getItem('hasDoneThisWeek')) || false; // هل أتم مقطع هذا الأسبوع؟
let permanentReviewed = JSON.parse(localStorage.getItem('permanentReviewed')) || [];
let adminTapCount = 0;

// نظام التسجيل
function registerUser() {
    const name = document.getElementById('reg-name').value;
    if (name.length < 5) return alert("يرجى كتابة الاسم الثلاثي");
    const userId = "U-" + Date.now().toString().slice(-6);
    localStorage.setItem('userName', name);
    localStorage.setItem('userId', userId);
    location.reload();
}

function handleAdminTap() {
    adminTapCount++;
    if (adminTapCount === 5) {
        adminTapCount = 0;
        if (prompt("كلمة المرور:") === "123456") {
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById('scr-admin').classList.add('active');
        }
    }
}

async function fetchData() {
    const activeUrl = localStorage.getItem('customSheetUrl') || DEFAULT_URL;
    const mode = localStorage.getItem('weekMode') || 'hifz';
    const pdf = localStorage.getItem('customPdfUrl');
    
    if(pdf) document.getElementById('pdf-link-container').innerHTML = `<a href="${pdf}" target="_blank" class="btn-main">فتح المصحف</a>`;
    document.getElementById('status-badge').innerText = mode === 'hifz' ? "أسبوع حفظ" : "أسبوع مراجعة";

    try {
        const response = await fetch(`${activeUrl}&t=${new Date().getTime()}`);
        const csvText = await response.text();
        const rows = csvText.split('\n').map(row => row.split(',').map(cell => cell.trim()));
        allTasks = rows.slice(1).filter(r => r.length >= 2 && r[0] !== "");
        renderLogic(mode);
    } catch (e) {
        document.getElementById('smart-task-content').innerHTML = "⚠️ فشل جلب السلسلة.";
    }
}

function renderLogic(mode) {
    const container = document.getElementById('smart-task-content');
    const btn = document.getElementById('next-task-btn');

    if (mode === 'hifz') {
        if (hasDoneThisWeek) {
            container.innerHTML = "✅ أحسنت! أتممت مقطع هذا الأسبوع بنجاح. انتظر بدء الأسبوع القادم من المشرف.";
            btn.style.display = 'none';
        } else {
            displayTask(allTasks[currentWeekPointer], "تم الإنجاز (تممت المقطع)");
        }
    } else {
        // منطق المراجعة: يظهر له المقاطع التي أتمها في أسابيع "الحفظ" السابقة ولم يراجعها نهائياً بعد
        let completedInPast = [];
        for(let i=0; i < currentWeekPointer; i++) { completedInPast.push(i); }
        
        const pendingIdx = completedInPast.find(idx => !permanentReviewed.includes(idx));
        if (pendingIdx !== undefined) {
            displayTask(allTasks[pendingIdx], "تمت المراجعة - التالي");
            btn.onclick = () => {
                permanentReviewed.push(pendingIdx);
                localStorage.setItem('permanentReviewed', JSON.stringify(permanentReviewed));
                fetchData();
            };
        } else {
            container.innerHTML = "⭐ لا توجد مقاطع متبقية للمراجعة حالياً.";
            btn.style.display = 'none';
        }
    }
}

function displayTask(task, btnText) {
    const container = document.getElementById('smart-task-content');
    const btn = document.getElementById('next-task-btn');
    if (!task) {
        container.innerHTML = "🏁 وصلنا لنهاية السلسلة المرفوعة!";
        btn.style.display = 'none';
        return;
    }
    const [sura, verses, link] = task;
    const mode = localStorage.getItem('weekMode') || 'hifz';
    
    let html = `<h3>${sura}</h3><p>المقطع الحالي: ${verses}</p><hr>`;
    if (mode === 'hifz') {
        html += `<div class="task-steps"><p>1. سماع التفسير</p><p>2. التسميع 3 مرات</p></div>`;
        if(link) html += `<a href="${link}" target="_blank" class="task-link">[فتح مقطع التفسير]</a>`;
    } else {
        html += `<div class="task-steps"><p>تسميع المقطع (مرة واحدة)</p></div>`;
    }
    container.innerHTML = html;
    btn.innerText = btnText;
    btn.style.display = 'block';
    if(mode === 'hifz') btn.onclick = completeTask;
}

function completeTask() {
    hasDoneThisWeek = true;
    localStorage.setItem('hasDoneThisWeek', JSON.stringify(true));
    fetchData();
}

function startNewWeek(mode) {
    if(!confirm("بدء دورة أسبوعية جديدة؟ سيتم فحص المقصرين وفرض غرامة 50ج.")) return;
    
    let fines = parseInt(localStorage.getItem('totalFinesAmount')) || 0;
    const lastMode = localStorage.getItem('weekMode') || 'hifz';

    // فحص التقصير: إذا كان أسبوع حفظ ولم يضغط الطالب على "تم"
    if (lastMode === 'hifz' && !hasDoneThisWeek) {
        fines += 50;
        localStorage.setItem('totalFinesAmount', fines);
        let history = JSON.parse(localStorage.getItem('finesHistory')) || [];
        history.push({ date: new Date().toLocaleDateString('ar-EG'), amount: 50 });
        localStorage.setItem('finesHistory', JSON.stringify(history));
    }

    // إذا كان الطالب قد أتم أسبوع الحفظ بنجاح، ننتقل للمقطع التالي في السلسلة
    if (lastMode === 'hifz' && hasDoneThisWeek) {
        currentWeekPointer++;
        localStorage.setItem('currentWeekPointer', currentWeekPointer);
    }

    localStorage.setItem('weekMode', mode);
    localStorage.setItem('hasDoneThisWeek', JSON.stringify(false)); // تصفير الحالة للأسبوع الجديد
    alert("تم تحديث الأسبوع بنجاح.");
    location.reload();
}

// (دوال الغرامات والمصحف وسوفت ريست تبقى كما هي لتوفير المساحة)
function checkFines() {
    const total = localStorage.getItem('totalFinesAmount') || 0;
    const history = JSON.parse(localStorage.getItem('finesHistory')) || [];
    let historyHtml = history.map(h => `<div style="font-size:12px; border-bottom:1px dashed #eee; padding:5px;">${h.date} - غرامة 50 ج</div>`).join('');
    document.getElementById('fines-content').innerHTML = `
        <div class="fine-box"><div class="fine-amount">${total} ج.م</div><div style="text-align:right;">${historyHtml || 'السجل نظيف'}</div></div>
        <button class="btn-main" onclick="resetFines()" style="background:#444; margin-top:10px;">تصفير (للمشرف)</button>`;
}
function resetFines() { if(prompt("كلمة السر:") === "123456") { localStorage.setItem('totalFinesAmount', 0); localStorage.setItem('finesHistory', JSON.stringify([])); location.reload(); } }
function saveAdminSettings() { localStorage.setItem('customSheetUrl', document.getElementById('sheet-url-input').value); localStorage.setItem('customPdfUrl', document.getElementById('pdf-url-input').value); alert("تم الحفظ"); }
function signInApp() { document.getElementById('scr-login').classList.remove('active'); document.getElementById('scr-main').classList.add('active'); fetchData(); }
function switchTab(t) { document.querySelectorAll('.cnt').forEach(e => e.classList.remove('active')); document.querySelectorAll('.nav-it').forEach(e => e.classList.remove('active')); document.getElementById('tab-'+t).classList.add('active'); const n = document.querySelectorAll('.nav-it'); if(t==='q') n[0].classList.add('active'); else if(t==='c') n[1].classList.add('active'); else { n[2].classList.add('active'); checkFines(); } }
window.onload = () => { 
    const u = localStorage.getItem('userName'); 
    setTimeout(() => { 
        document.getElementById('scr-loading').classList.remove('active'); 
        if(!u) document.getElementById('scr-register').classList.add('active'); 
        else { 
            document.getElementById('scr-login').classList.add('active'); 
            document.getElementById('welcome-msg').innerText = "مرحباً يا " + u; 
            document.getElementById('user-id-badge').innerText = "كود المشترك: " + localStorage.getItem('userId'); 
        } 
    }, 1000); 
};