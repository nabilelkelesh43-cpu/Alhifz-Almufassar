const DEFAULT_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRDWHrj_Mh4k_BLNS6nB3ofBK3uQpndExNKV6Y84XM5sb6mev5yspjZEsVviMsa5uyraB6vHVHpI_bn/pub?output=csv";

let allTasks = [];
let currentTaskIndex = 0;
let completedTasks = JSON.parse(localStorage.getItem('completedTasks')) || [];
let permanentReviewed = JSON.parse(localStorage.getItem('permanentReviewed')) || [];
let adminTapCount = 0;

// نظام التسجيل والترقيم
function registerUser() {
    const name = document.getElementById('reg-name').value;
    if (name.length < 5) return alert("يرجى كتابة الاسم الثلاثي");
    
    // توليد رقم اشتراك يعتمد على الوقت (ثابت ولا يتغير)
    const userId = "U-" + Date.now().toString().slice(-6);
    localStorage.setItem('userName', name);
    localStorage.setItem('userId', userId);
    
    location.reload();
}

function signInApp() {
    document.getElementById('scr-login').classList.remove('active');
    document.getElementById('scr-main').classList.add('active');
    fetchData();
}

// الدخول السري للمشرف
function handleAdminTap() {
    adminTapCount++;
    if (adminTapCount === 5) {
        adminTapCount = 0;
        if (prompt("كلمة مرور المشرف:") === "123456") {
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById('scr-admin').classList.add('active');
            document.getElementById('sheet-url-input').value = localStorage.getItem('customSheetUrl') || DEFAULT_URL;
            document.getElementById('pdf-url-input').value = localStorage.getItem('customPdfUrl') || "";
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
        document.getElementById('smart-task-content').innerHTML = "⚠️ خطأ في تحميل البيانات.";
    }
}

function renderLogic(mode) {
    if (mode === 'hifz') {
        currentTaskIndex = parseInt(localStorage.getItem('currentTaskIndex')) || 0;
        displayTask(allTasks[currentTaskIndex], "تم الإنجاز - التالي");
    } else {
        const pendingIdx = completedTasks.find(idx => !permanentReviewed.includes(idx));
        if (pendingIdx !== undefined) {
            currentTaskIndex = pendingIdx;
            displayTask(allTasks[pendingIdx], "تمت المراجعة - التالي");
        } else {
            document.getElementById('smart-task-content').innerHTML = "⭐ أحسنت! أكملت مراجعة كل المحفوظ.";
            document.getElementById('next-task-btn').style.display = 'none';
        }
    }
}

function displayTask(task, btnText) {
    const container = document.getElementById('smart-task-content');
    const btn = document.getElementById('next-task-btn');
    if (!task) {
        container.innerHTML = "🏁 انتهى ورد الأسبوع.";
        btn.style.display = 'none';
        return;
    }
    const [sura, verses, link] = task;
    const mode = localStorage.getItem('weekMode') || 'hifz';
    
    let html = `<h3>${sura}</h3><p>النطاق: ${verses}</p><hr>`;
    if (mode === 'hifz') {
        html += `<div class="task-steps"><p><i class="fas fa-headphones"></i> سماع التفسير</p><p><i class="fas fa-repeat"></i> تسميع 3 مرات</p></div>`;
        if(link) html += `<a href="${link}" target="_blank" style="color:#007bff; text-decoration:none; font-weight:bold;">[فتح مقطع التفسير]</a>`;
    } else {
        html += `<div class="task-steps"><p><i class="fas fa-microphone"></i> تسميع مرة واحدة</p></div>`;
    }
    container.innerHTML = html;
    btn.innerText = btnText;
    btn.style.display = 'block';
}

function completeTask() {
    const mode = localStorage.getItem('weekMode') || 'hifz';
    if (mode === 'hifz') {
        if (!completedTasks.includes(currentTaskIndex)) {
            completedTasks.push(currentTaskIndex);
            localStorage.setItem('completedTasks', JSON.stringify(completedTasks));
        }
        currentTaskIndex++;
        localStorage.setItem('currentTaskIndex', currentTaskIndex);
    } else {
        permanentReviewed.push(currentTaskIndex);
        localStorage.setItem('permanentReviewed', JSON.stringify(permanentReviewed));
    }
    fetchData();
}

function startNewWeek(mode) {
    if(!confirm("هل تريد بدء أسبوع جديد فعلاً؟")) return;
    
    let fines = parseInt(localStorage.getItem('totalFinesAmount')) || 0;
    const lastMode = localStorage.getItem('weekMode') || 'hifz';
    const lastIndex = parseInt(localStorage.getItem('currentTaskIndex')) || 0;

    // إصلاح منطق الغرامة: لا تُحسب إلا إذا كان هناك مهام متبقية فعلياً في أسبوع الحفظ
    if (lastMode === 'hifz' && allTasks.length > 0 && lastIndex < allTasks.length) {
        fines += 50;
        localStorage.setItem('totalFinesAmount', fines);
        let history = JSON.parse(localStorage.getItem('finesHistory')) || [];
        history.push({ date: new Date().toLocaleDateString('ar-EG'), amount: 50 });
        localStorage.setItem('finesHistory', JSON.stringify(history));
    }

    localStorage.setItem('weekMode', mode);
    localStorage.setItem('currentTaskIndex', 0);
    alert("تم تحديث الأسبوع.");
    location.reload();
}

function checkFines() {
    const total = localStorage.getItem('totalFinesAmount') || 0;
    const history = JSON.parse(localStorage.getItem('finesHistory')) || [];
    let historyHtml = history.map(h => `<div style="font-size:12px; border-bottom:1px solid #eee; padding:5px;">${h.date} - غرامة 50 ج</div>`).join('');
    
    document.getElementById('fines-content').innerHTML = `
        <div class="fine-box">
            <div class="fine-amount">${total} ج.م</div>
            <div style="margin-top:10px; text-align:right;">${historyHtml || 'السجل نظيف'}</div>
        </div>
        <button class="btn-main" onclick="resetFines()" style="background:#444; margin-top:10px;">تصفير (للمشرف)</button>
    `;
}

function resetFines() {
    if(prompt("كلمة سر التصفير:") === "123456") {
        localStorage.setItem('totalFinesAmount', 0);
        localStorage.setItem('finesHistory', JSON.stringify([]));
        location.reload();
    }
}

function saveAdminSettings() {
    localStorage.setItem('customSheetUrl', document.getElementById('sheet-url-input').value);
    localStorage.setItem('customPdfUrl', document.getElementById('pdf-url-input').value);
    alert("تم حفظ الروابط");
}

function switchTab(tabId) {
    document.querySelectorAll('.cnt').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-it').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    const navs = document.querySelectorAll('.nav-it');
    if(tabId === 'q') navs[0].classList.add('active');
    else if(tabId === 'c') navs[1].classList.add('active');
    else { navs[2].classList.add('active'); checkFines(); }
}

window.onload = () => {
    const userName = localStorage.getItem('userName');
    const userId = localStorage.getItem('userId');
    
    setTimeout(() => {
        document.getElementById('scr-loading').classList.remove('active');
        if (!userName) {
            document.getElementById('scr-register').classList.add('active');
        } else {
            document.getElementById('scr-login').classList.add('active');
            document.getElementById('welcome-msg').innerText = "مرحباً يا " + userName;
            document.getElementById('user-id-badge').innerText = "كود المشترك: " + userId;
        }
    }, 1000);
};