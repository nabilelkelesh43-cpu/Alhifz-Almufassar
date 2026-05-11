const DEFAULT_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRDWHrj_Mh4k_BLNS6nB3ofBK3uQpndExNKV6Y84XM5sb6mev5yspjZEsVviMsa5uyraB6vHVHpI_bn/pub?output=csv";

let allTasks = [];
let currentTaskIndex = 0;
// استعادة المهام التي تم تعليمها بـ "تم" في أسبوع الحفظ
let completedTasks = JSON.parse(localStorage.getItem('completedTasks')) || [];

function switchTab(tabId) {
    document.querySelectorAll('.cnt').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-it').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    const navs = document.querySelectorAll('.nav-it');
    if(tabId === 'q') navs[0].classList.add('active');
    else navs[1].classList.add('active');
}

function signInGoogle() {
    document.getElementById('scr-login').classList.remove('active');
    document.getElementById('scr-main').classList.add('active');
    fetchData();
}

async function fetchData() {
    const activeUrl = localStorage.getItem('customSheetUrl') || DEFAULT_URL;
    const mode = localStorage.getItem('weekMode') || 'hifz';
    
    // تحديث رابط المصحف
    const savedPdf = localStorage.getItem('customPdfUrl');
    if(savedPdf) {
        document.getElementById('pdf-link-container').innerHTML = `
            <a href="${savedPdf}" target="_blank" class="btn-main" style="text-decoration:none; display:block; text-align:center;">
                <i class="fas fa-file-pdf"></i> فتح المصحف المفسر
            </a>`;
    }

    document.getElementById('status-badge').innerText = mode === 'hifz' ? "أسبوع حفظ" : "أسبوع مراجعة";

    try {
        const response = await fetch(`${activeUrl}&t=${new Date().getTime()}`);
        const csvText = await response.text();
        const rows = csvText.split('\n').map(row => row.split(',').map(cell => cell.trim()));
        allTasks = rows.slice(1).filter(r => r.length >= 2 && r[0] !== "");
        
        renderLogic(mode);
    } catch (e) {
        document.getElementById('smart-task-content').innerHTML = "⚠️ فشل جلب البيانات. تأكد من إعدادات المشرف.";
    }
}

function renderLogic(mode) {
    if (mode === 'hifz') {
        currentTaskIndex = parseInt(localStorage.getItem('currentTaskIndex')) || 0;
        displayTask(allTasks[currentTaskIndex], "تم الإتمام - المقطع التالي");
    } else {
        // في أسبوع المراجعة: نبحث عن المقاطع التي أتمها المستخدم سابقاً (في الـ completedTasks)
        // ولكننا سنظهرها واحداً تلو الآخر للمراجعة
        const pendingReviewIndex = completedTasks.find(idx => !localStorage.getItem(`revived_${idx}`));
        
        if (pendingReviewIndex !== undefined) {
            currentTaskIndex = pendingReviewIndex;
            displayTask(allTasks[currentTaskIndex], "تمت المراجعة - التالي");
        } else {
            document.getElementById('smart-task-content').innerHTML = "⭐ أحسنت! انتهيت من مراجعة كل ما حفظته سابقاً.";
            document.getElementById('next-task-btn').style.display = 'none';
        }
    }
}

function displayTask(task, btnText) {
    const container = document.getElementById('smart-task-content');
    const btn = document.getElementById('next-task-btn');
    const mode = localStorage.getItem('weekMode') || 'hifz';
    
    if (!task) {
        container.innerHTML = "🏁 انتهى الورد.";
        btn.style.display = 'none';
        return;
    }

    const [sura, verses, link] = task;

    let contentHtml = `<h2 style="color:var(--green); margin-top:0;">${sura}</h2><p><strong>النطاق:</strong> ${verses}</p><hr style="border:0; border-top:1px solid #eee; margin:15px 0;">`;

    if (mode === 'hifz') {
        contentHtml += `
            <div class="task-steps">
                <p><i class="fas fa-headphones"></i> 1. سماع مقطع التفسير.</p>
                <p><i class="fas fa-repeat"></i> 2. التسميع (3 مرات).</p>
            </div>
            ${link ? `<a href="${link}" target="_blank" class="task-link"><i class="fas fa-play-circle"></i> فتح مقطع التفسير</a>` : ''}
        `;
    } else {
        contentHtml += `
            <div class="task-steps">
                <p><i class="fas fa-microphone"></i> مطلوب: تسميع المقطع (مرة واحدة فقط).</p>
            </div>
            <p style="font-size:12px; color:#666; text-align:center;">(أنت الآن في وضع المراجعة)</p>
        `;
    }

    container.innerHTML = contentHtml;
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
        // وضع علامة أن هذا المقطع تمت مراجعته في هذا الأسبوع
        localStorage.setItem(`revived_${currentTaskIndex}`, "true");
    }
    
    fetchData();
}

function checkPw() {
    if(document.getElementById('pw-inp').value === '123456') {
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
    // عند تغيير نوع الأسبوع، نقوم بتصفير مراجعات الأسبوع الحالي لتبدأ من جديد
    if(document.getElementById('week-mode-select').value === 'review') {
        allTasks.forEach((_, i) => localStorage.removeItem(`revived_${i}`));
    }
    alert("تم الحفظ");
    location.reload();
}

window.onload = () => {
    setTimeout(() => {
        document.getElementById('scr-loading').classList.remove('active');
        document.getElementById('scr-login').classList.add('active');
    }, 1200);
};