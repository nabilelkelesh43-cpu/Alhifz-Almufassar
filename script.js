// الرابط الافتراضي للجدول
const DEFAULT_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRDWHrj_Mh4k_BLNS6nB3ofBK3uQpndExNKV6Y84XM5sb6mev5yspjZEsVviMsa5uyraB6vHVHpI_bn/pub?output=csv";

let allTasks = [];
let currentTaskIndex = 0;
let completedTasks = JSON.parse(localStorage.getItem('completedTasks')) || [];

// تبديل التبويبات
function switchTab(tabId) {
    document.querySelectorAll('.cnt').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-it').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    const navs = document.querySelectorAll('.nav-it');
    if(tabId === 'q') navs[0].classList.add('active');
    else navs[1].classList.add('active');
}

// تسجيل الدخول
function signInGoogle() {
    document.getElementById('scr-login').classList.remove('active');
    document.getElementById('scr-main').classList.add('active');
    fetchData();
}

// جلب البيانات من Google Sheet
async function fetchData() {
    const activeUrl = localStorage.getItem('customSheetUrl') || DEFAULT_URL;
    const mode = localStorage.getItem('weekMode') || 'hifz';
    
    // تحديث رابط المصحف في الواجهة
    const savedPdf = localStorage.getItem('customPdfUrl');
    if(savedPdf) {
        document.getElementById('pdf-link-container').innerHTML = `
            <a href="${savedPdf}" target="_blank" class="btn-main" style="text-decoration:none; display:block; text-align:center;">
                <i class="fas fa-file-pdf"></i> فتح المصحف المفسر (PDF)
            </a>`;
    }

    document.getElementById('status-badge').innerText = mode === 'hifz' ? "أسبوع حفظ" : "أسبوع مراجعة";

    try {
        const response = await fetch(`${activeUrl}&t=${new Date().getTime()}`);
        if (!response.ok) throw new Error();
        const csvText = await response.text();
        
        // تحويل CSV إلى مصفوفة
        const rows = csvText.split('\n').map(row => row.split(',').map(cell => cell.trim()));
        allTasks = rows.slice(1).filter(r => r.length >= 2 && r[0] !== "");
        
        renderLogic(mode);
    } catch (e) {
        document.getElementById('smart-task-content').innerHTML = "⚠️ فشل جلب البيانات. تأكد من رابط الشيت في لوحة المشرف.";
    }
}

// منطق العرض (حفظ أو مراجعة)
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
        container.innerHTML = "🏁 انتهى الجدول المتاح.";
        btn.style.display = 'none';
        return;
    }

    const [sura, verses, link] = task;
    container.innerHTML = `
        <h2 style="color:var(--green); margin-top:0;">${sura}</h2>
        <p><strong>الآيات:</strong> ${verses}</p>
        ${link ? `<a href="${link}" target="_blank" class="task-link"><i class="fas fa-play"></i> فتح المقطع</a>` : ''}
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

// لوحة المشرف
function checkPw() {
    if(document.getElementById('pw-inp').value === '123456') {
        document.getElementById('admin-login-form').style.display = 'none';
        document.getElementById('admin-tools').style.display = 'block';
        
        document.getElementById('sheet-url-input').value = localStorage.getItem('customSheetUrl') || DEFAULT_URL;
        document.getElementById('week-mode-select').value = localStorage.getItem('weekMode') || 'hifz';
        document.getElementById('pdf-url-input').value = localStorage.getItem('customPdfUrl') || '';
    } else {
        alert("الباسورد خطأ");
    }
}

function saveAdminSettings() {
    localStorage.setItem('customSheetUrl', document.getElementById('sheet-url-input').value);
    localStorage.setItem('weekMode', document.getElementById('week-mode-select').value);
    localStorage.setItem('customPdfUrl', document.getElementById('pdf-url-input').value);
    alert("✅ تم الحفظ بنجاح");
    location.reload();
}

window.onload = () => {
    setTimeout(() => {
        const loader = document.getElementById('scr-loading');
        if (loader) loader.classList.remove('active');
        document.getElementById('scr-login').classList.add('active');
    }, 1500);
};