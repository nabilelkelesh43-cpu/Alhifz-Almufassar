const DEFAULT_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRDWHrj_Mh4k_BLNS6nB3ofBK3uQpndExNKV6Y84XM5sb6mev5yspjZEsVviMsa5uyraB6vHVHpI_bn/pub?output=csv";

let allTasks = [];
let currentTaskIndex = 0;
let completedTasks = JSON.parse(localStorage.getItem('completedTasks')) || [];

function switchTab(tabId) {
    document.querySelectorAll('.cnt').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-it').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    
    const navs = document.querySelectorAll('.nav-it');
    if(tabId === 'q') navs[0].classList.add('active');
    else if(tabId === 'c') navs[1].classList.add('active');
    else if(tabId === 'f') {
        navs[2].classList.add('active');
        checkFines(); 
    }
}

async function fetchData() {
    const activeUrl = localStorage.getItem('customSheetUrl') || DEFAULT_URL;
    const mode = localStorage.getItem('weekMode') || 'hifz';
    
    const savedPdf = localStorage.getItem('customPdfUrl');
    if(savedPdf) {
        document.getElementById('pdf-link-container').innerHTML = `<a href="${savedPdf}" target="_blank" class="btn-main" style="text-decoration:none; display:block; text-align:center;">فتح المصحف المفسر</a>`;
    }

    document.getElementById('status-badge').innerText = mode === 'hifz' ? "أسبوع حفظ" : "أسبوع مراجعة";

    try {
        const response = await fetch(`${activeUrl}&t=${new Date().getTime()}`);
        const csvText = await response.text();
        const rows = csvText.split('\n').map(row => row.split(',').map(cell => cell.trim()));
        allTasks = rows.slice(1).filter(r => r.length >= 2 && r[0] !== "");
        renderLogic(mode);
    } catch (e) {
        document.getElementById('smart-task-content').innerHTML = "⚠️ تعذر جلب البيانات.";
    }
}

function renderLogic(mode) {
    if (mode === 'hifz') {
        currentTaskIndex = parseInt(localStorage.getItem('currentTaskIndex')) || 0;
        displayTask(allTasks[currentTaskIndex], "تم الإنجاز - التالي");
    } else {
        const pendingReviewIndex = completedTasks.find(idx => !localStorage.getItem(`revived_${idx}`));
        if (pendingReviewIndex !== undefined) {
            currentTaskIndex = pendingReviewIndex;
            displayTask(allTasks[currentTaskIndex], "تمت المراجعة - التالي");
        } else {
            document.getElementById('smart-task-content').innerHTML = "⭐ أحسنت! انتهت المراجعة.";
            document.getElementById('next-task-btn').style.display = 'none';
        }
    }
}

function displayTask(task, btnText) {
    const container = document.getElementById('smart-task-content');
    const btn = document.getElementById('next-task-btn');
    const mode = localStorage.getItem('weekMode') || 'hifz';
    
    if (!task) {
        container.innerHTML = "🏁 انتهى ورد الأسبوع.";
        btn.style.display = 'none';
        return;
    }

    const [sura, verses, link] = task;
    let content = `<h2 style="color:var(--green); margin-top:0;">${sura}</h2><p><strong>المقطع:</strong> ${verses}</p><hr style="border:0; border-top:1px solid #eee; margin:15px 0;">`;

    if (mode === 'hifz') {
        content += `
            <div class="task-steps">
                <p><i class="fas fa-headphones"></i> 1. سماع مقطع التفسير.</p>
                <p><i class="fas fa-repeat"></i> 2. التسميع (3 مرات).</p>
            </div>
            ${link ? `<a href="${link}" target="_blank" class="task-link">فتح مقطع التفسير</a>` : ''}
        `;
    } else {
        content += `<div class="task-steps"><p><i class="fas fa-microphone"></i> مطلوب: تسميع المقطع (مرة واحدة فقط).</p></div>`;
    }

    container.innerHTML = content;
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
        localStorage.setItem(`revived_${currentTaskIndex}`, "true");
    }
    fetchData();
}

function checkFines() {
    const finesContainer = document.getElementById('fines-content');
    const now = new Date();
    const day = now.getDay(); 
    const hour = now.getHours();
    
    // الموعد النهائي: السبت (6) الساعة 5 فجراً
    const isAfterDeadline = (day === 6 && hour >= 5) || (day === 0); 
    
    let fineAmount = 0;
    let message = "لا توجد غرامات مستحقة. جزاك الله خيراً!";

    if (isAfterDeadline && completedTasks.length < allTasks.length) {
        fineAmount = 50;
        message = "غرامة لعدم إنهاء الورد قبل فجر السبت.";
    }

    finesContainer.innerHTML = `
        <div class="fine-box">
            <div style="font-size:14px; color:#666;">إجمالي الغرامات المستحقة</div>
            <div class="fine-amount">${fineAmount} ج.م</div>
            <div style="color:#d9534f; font-weight:bold;">${message}</div>
        </div>
    `;
}

function checkPwPrompt() {
    if(prompt("كلمة المرور:") === "123456") {
        document.getElementById('admin-login-form').style.display = 'none';
        document.getElementById('admin-tools').style.display = 'block';
        document.getElementById('sheet-url-input').value = localStorage.getItem('customSheetUrl') || DEFAULT_URL;
        document.getElementById('week-mode-select').value = localStorage.getItem('weekMode') || 'hifz';
        document.getElementById('pdf-url-input').value = localStorage.getItem('customPdfUrl') || '';
    } else { alert("خطأ!"); }
}

function saveAdminSettings() {
    localStorage.setItem('customSheetUrl', document.getElementById('sheet-url-input').value);
    localStorage.setItem('weekMode', document.getElementById('week-mode-select').value);
    localStorage.setItem('customPdfUrl', document.getElementById('pdf-url-input').value);
    alert("تم الحفظ");
    location.reload();
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
    }, 1200);
};