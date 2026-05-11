// الرابط المباشر للملف (CSV)
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRDWHrj_Mh4k_BLNS6nB3ofBK3uQpndExNKV6Y84XM5sb6mev5yspjZEsVviMsa5uyraB6vHVHpI_bn/pub?output=csv";

let allTasks = [];
let currentTaskIndex = 0;
let completedTasks = JSON.parse(localStorage.getItem('completedTasks')) || [];

// 1. وظائف التنقل
function switchTab(tabId) {
    document.querySelectorAll('.cnt').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-it').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    const navs = document.querySelectorAll('.nav-it');
    if(tabId === 'q') navs[0].classList.add('active');
    else navs[1].classList.add('active');
}

// 2. الدخول وجلب البيانات
function signInGoogle() {
    document.getElementById('scr-login').classList.remove('active');
    document.getElementById('scr-main').classList.add('active');
    fetchData();
}

async function fetchData() {
    const mode = localStorage.getItem('weekMode') || 'hifz';
    const badge = document.getElementById('status-badge');
    if(badge) badge.innerText = mode === 'hifz' ? "أسبوع حفظ" : "أسبوع مراجعة";

    try {
        // إضافة timestamp للرابط لمنع المتصفح من كاش البيانات القديمة
        const response = await fetch(`${SHEET_URL}&t=${new Date().getTime()}`);
        if (!response.ok) throw new Error('Network Error');
        
        const csvText = await response.text();
        const rows = csvText.split('\n').map(row => row.split(',').map(cell => cell.trim()));
        
        // تنظيف البيانات (تجاهل الرأس والأسطر الفارغة)
        allTasks = rows.slice(1).filter(r => r.length >= 2 && r[0] !== "");
        
        if (allTasks.length === 0) {
            document.getElementById('smart-task-content').innerHTML = "الجدول فارغ حالياً.";
        } else {
            renderLogic(mode);
        }
    } catch (e) {
        console.error(e);
        document.getElementById('smart-task-content').innerHTML = "⚠️ فشل جلب البيانات. تأكد من 'النشر للويب' في جوجل شيت بصيغة CSV.";
    }
}

// 3. منطق العرض (حفظ أو مراجعة)
function renderLogic(mode) {
    if (mode === 'hifz') {
        currentTaskIndex = parseInt(localStorage.getItem('currentTaskIndex')) || 0;
        displayTask(allTasks[currentTaskIndex], "تم الإنجاز - التالي");
    } else {
        const pendingIndex = allTasks.findIndex((_, idx) => !completedTasks.includes(idx));
        if (pendingIndex !== -1) {
            currentTaskIndex = pendingIndex;
            displayTask(allTasks[pendingIndex], "تمت المراجعة - التالي");
        } else {
            document.getElementById('smart-task-content').innerHTML = "⭐ أحسنت! تم مراجعة كل المهام السابقة.";
            document.getElementById('next-task-btn').style.display = 'none';
        }
    }
}

function displayTask(task, btnText) {
    const container = document.getElementById('smart-task-content');
    const btn = document.getElementById('next-task-btn');
    
    if (!task) {
        container.innerHTML = "🏁 انتهى الورد المتاح في الجدول.";
        btn.style.display = 'none';
        return;
    }

    const [sura, verses, link] = task;
    container.innerHTML = `
        <h2 style="color:var(--green); margin-top:0;">${sura}</h2>
        <p><strong>الآيات:</strong> ${verses}</p>
        ${link ? `<a href="${link}" target="_blank" style="color:#007bff; font-weight:bold; text-decoration:none;">🎥 فتح المقطع التفاعلي</a>` : ''}
    `;
    btn.innerText = btnText;
    btn.style.display = 'block';
}

function completeTask() {
    if (!completedTasks.includes(currentTaskIndex)) {
        completedTasks.push(currentTaskIndex);
        localStorage.setItem('completedTasks', JSON.stringify(completedTasks));
    }

    if (localStorage.getItem('weekMode') === 'hifz') {
        currentTaskIndex++;
        localStorage.setItem('currentTaskIndex', currentTaskIndex);
    }
    
    fetchData();
}

// 4. إدارة المشرف
function showAdmin() {
    document.getElementById('admin-tools').style.display = 'block';
    document.getElementById('admin-login-form').style.display = 'none';
}

function saveAdminSettings() {
    const pw = document.getElementById('pw-inp').value;
    if(pw === '123456') {
        const mode = document.getElementById('week-mode-select').value;
        localStorage.setItem('weekMode', mode);
        alert("تم تحديث النظام إلى وضع: " + (mode === 'hifz' ? "الحفظ" : "المراجعة"));
        location.reload();
    } else {
        alert("الباسورد خطأ");
    }
}

window.onload = () => {
    setTimeout(() => {
        const loader = document.getElementById('scr-loading');
        if (loader) loader.classList.remove('active');
        document.getElementById('scr-login').classList.add('active');
    }, 1200);
};