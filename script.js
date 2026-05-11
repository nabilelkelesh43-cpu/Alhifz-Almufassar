const DEFAULT_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRDWHrj_Mh4k_BLNS6nB3ofBK3uQpndExNKV6Y84XM5sb6mev5yspjZEsVviMsa5uyraB6vHVHpI_bn/pub?output=csv";

let allTasks = [];
let currentTaskIndex = 0;
let completedTasks = JSON.parse(localStorage.getItem('completedTasks')) || [];
// مصفوفة لتخزين المقاطع التي تمت مراجعتها "نهائياً" لكي لا تظهر مرة أخرى
let permanentReviewed = JSON.parse(localStorage.getItem('permanentReviewed')) || [];

function switchTab(tabId) {
    document.querySelectorAll('.cnt').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-it').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    const navs = document.querySelectorAll('.nav-it');
    if(tabId === 'q') navs[0].classList.add('active');
    else if(tabId === 'c') navs[1].classList.add('active');
    else if(tabId === 'f') { navs[2].classList.add('active'); checkFines(); }
}

async function fetchData() {
    const activeUrl = localStorage.getItem('customSheetUrl') || DEFAULT_URL;
    const mode = localStorage.getItem('weekMode') || 'hifz';
    const savedPdf = localStorage.getItem('customPdfUrl');
    
    if(savedPdf) {
        document.getElementById('pdf-link-container').innerHTML = `<a href="${savedPdf}" target="_blank" class="btn-main" style="text-decoration:none; display:block; text-align:center;">فتح المصحف</a>`;
    }

    document.getElementById('status-badge').innerText = mode === 'hifz' ? "أسبوع حفظ" : "أسبوع مراجعة";

    try {
        const response = await fetch(`${activeUrl}&t=${new Date().getTime()}`);
        const csvText = await response.text();
        const rows = csvText.split('\n').map(row => row.split(',').map(cell => cell.trim()));
        allTasks = rows.slice(1).filter(r => r.length >= 2 && r[0] !== "");
        renderLogic(mode);
    } catch (e) {
        document.getElementById('smart-task-content').innerHTML = "⚠️ خطأ في البيانات.";
    }
}

function renderLogic(mode) {
    if (mode === 'hifz') {
        currentTaskIndex = parseInt(localStorage.getItem('currentTaskIndex')) || 0;
        displayTask(allTasks[currentTaskIndex], "تم الإنجاز - التالي");
    } else {
        // منطق المراجعة: استخراج المقاطع التي (تم حفظها) وَ (لم تُراجع نهائياً بعد)
        const pendingReviewIndex = completedTasks.find(idx => !permanentReviewed.includes(idx));
        
        if (pendingReviewIndex !== undefined) {
            currentTaskIndex = pendingReviewIndex;
            displayTask(allTasks[currentTaskIndex], "تمت المراجعة - التالي");
        } else {
            document.getElementById('smart-task-content').innerHTML = "⭐ أحسنت! راجعت كل ما تم حفظه سابقاً.";
            document.getElementById('next-task-btn').style.display = 'none';
        }
    }
}

function displayTask(task, btnText) {
    const container = document.getElementById('smart-task-content');
    const btn = document.getElementById('next-task-btn');
    const mode = localStorage.getItem('weekMode') || 'hifz';
    
    if (!task) {
        container.innerHTML = "🏁 انتهى الجدول.";
        btn.style.display = 'none';
        return;
    }

    const [sura, verses, link] = task;
    let html = `<h3>${sura}</h3><p>النطاق: ${verses}</p><hr>`;

    if (mode === 'hifz') {
        html += `<div class="task-steps"><p><i class="fas fa-headphones"></i> سماع التفسير</p><p><i class="fas fa-repeat"></i> تسميع 3 مرات</p></div>`;
        if(link) html += `<a href="${link}" target="_blank" class="task-link">فتح المقطع</a>`;
    } else {
        html += `<div class="task-steps"><p><i class="fas fa-microphone"></i> تسميع مرة واحدة فقط</p></div>`;
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
        // إضافة المقطع لمصفوفة "المراجعة النهائية" لكي لا يظهر في أسابيع المراجعة القادمة
        permanentReviewed.push(currentTaskIndex);
        localStorage.setItem('permanentReviewed', JSON.stringify(permanentReviewed));
    }
    fetchData();
}

function startNewWeek(mode) {
    if(confirm(`بدء أسبوع ${mode === 'hifz' ? 'حفظ' : 'مراجعة'} جديد؟ سيتم احتساب غرامة للمقصرين.`)) {
        let totalFines = parseInt(localStorage.getItem('totalFinesAmount')) || 0;
        
        // غرامة إذا انتهى الأسبوع ولم يكمل الطالب الورد المعروض
        if (allTasks.length > 0 && currentTaskIndex < allTasks.length && mode === 'hifz') {
            totalFines += 50;
            localStorage.setItem('totalFinesAmount', totalFines);
            let history = JSON.parse(localStorage.getItem('finesHistory')) || [];
            history.push({ date: new Date().toLocaleDateString('ar-EG'), amount: 50 });
            localStorage.setItem('finesHistory', JSON.stringify(history));
        }

        localStorage.setItem('weekMode', mode);
        localStorage.setItem('currentTaskIndex', 0); // تصفير عداد الأسبوع الجديد
        alert("تم التحديث.");
        location.reload();
    }
}

function checkFines() {
    const finesContainer = document.getElementById('fines-content');
    const total = localStorage.getItem('totalFinesAmount') || 0;
    const history = JSON.parse(localStorage.getItem('finesHistory')) || [];
    let historyHtml = history.map(h => `<div style="font-size:12px; border-bottom:1px solid #eee; padding:5px;">${h.date} - غرامة 50 ج</div>`).join('');

    finesContainer.innerHTML = `
        <div class="fine-box">
            <div style="font-size:13px; color:#666;">إجمالي الغرامات</div>
            <div class="fine-amount">${total} ج.م</div>
            <div style="margin-top:10px; text-align:right;">${historyHtml || 'السجل نظيف'}</div>
        </div>
        <button class="btn-main" onclick="resetFines()" style="background:#444; margin-top:10px;">تصفير (للمشرف)</button>
    `;
}

function resetFines() {
    if(prompt("الباسورد:") === "123456") {
        localStorage.setItem('totalFinesAmount', 0);
        localStorage.setItem('finesHistory', JSON.stringify([]));
        location.reload();
    }
}

function checkPwPrompt() {
    if(prompt("الباسورد:") === "123456") {
        document.getElementById('admin-login-form').style.display = 'none';
        document.getElementById('admin-tools').style.display = 'block';
    }
}

function saveAdminSettings() {
    localStorage.setItem('customSheetUrl', document.getElementById('sheet-url-input').value);
    localStorage.setItem('customPdfUrl', document.getElementById('pdf-url-input').value);
    alert("تم الحفظ.");
}

function signInGoogle() {
    document.getElementById('scr-login').classList.remove('active');
    document.getElementById('scr-main').classList.add('active');
    fetchData();
}

window.onload = () => {
    setTimeout(() => {
        document.getElementById('scr-loading').classList.remove('active');
        document.getElementById('scr-login').classList.add('active');
    }, 1000);
};