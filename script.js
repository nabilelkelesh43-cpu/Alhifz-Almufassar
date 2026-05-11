const DEFAULT_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRDWHrj_Mh4k_BLNS6nB3ofBK3uQpndExNKV6Y84XM5sb6mev5yspjZEsVviMsa5uyraB6vHVHpI_bn/pub?output=csv";

let allTasks = [];
let userProgress = JSON.parse(localStorage.getItem('userProgress')) || { hifz: [], review: [], unlockedCount: 1 };
let adminTapCount = 0;

function registerUser() {
    const name = document.getElementById('reg-name').value;
    if (name.length < 5) return alert("الاسم قصير جداً");
    localStorage.setItem('userName', name);
    localStorage.setItem('userId', "ID-" + Math.floor(1000 + Math.random() * 9000));
    location.reload();
}

async function fetchData() {
    const url = localStorage.getItem('customSheetUrl') || DEFAULT_URL;
    try {
        const res = await fetch(`${url}&t=${Date.now()}`);
        const text = await res.text();
        allTasks = text.split('\n').slice(1).map(line => line.split(',').map(c => c.trim()));
        renderTasks();
    } catch (e) { alert("خطأ في الاتصال بالقاعدة"); }
}

function renderTasks() {
    const container = document.getElementById('tasks-container');
    container.innerHTML = "";
    
    // عرض المقاطع المفتوحة فقط للعضو
    for (let i = 0; i < userProgress.unlockedCount; i++) {
        if (!allTasks[i]) break;
        const [sura, verses] = allTasks[i];
        
        const card = document.createElement('div');
        card.className = 'card task-item';
        card.innerHTML = `
            <div style="flex:1">
                <strong style="color:var(--green)">${sura}</strong> <br>
                <small>${verses}</small>
            </div>
            <div class="check-group">
                <label><input type="checkbox" ${userProgress.hifz.includes(i) ? 'checked' : ''} onchange="toggleProgress(${i}, 'hifz')"> حفظ</label>
                <label><input type="checkbox" ${userProgress.review.includes(i) ? 'checked' : ''} onchange="toggleProgress(${i}, 'review')"> مراجعة</label>
            </div>
        `;
        container.appendChild(card);
    }

    // إظهار زر "طلب التالي" إذا أنهى المقطع الأخير المفتوح (حفظاً)
    const lastIdx = userProgress.unlockedCount - 1;
    if (userProgress.hifz.includes(lastIdx) && userProgress.unlockedCount < allTasks.length) {
        document.getElementById('btn-next-lesson').style.display = "block";
    } else {
        document.getElementById('btn-next-lesson').style.display = "none";
    }
}

function toggleProgress(idx, type) {
    if (!userProgress[type].includes(idx)) {
        userProgress[type].push(idx);
    } else {
        userProgress[type] = userProgress[type].filter(i => i !== idx);
    }
    localStorage.setItem('userProgress', JSON.stringify(userProgress));
    renderTasks();
}

function unlockNext() {
    userProgress.unlockedCount++;
    localStorage.setItem('userProgress', JSON.stringify(userProgress));
    renderTasks();
}

function handleAdminTap() {
    adminTapCount++;
    if (adminTapCount >= 5) {
        adminTapCount = 0;
        if (prompt("كلمة السر:") === "123456") {
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById('scr-admin').classList.add('active');
        }
    }
}

// دالة تصدير البيانات لملف اكسيل (CSV)
function exportData() {
    const name = localStorage.getItem('userName');
    const id = localStorage.getItem('userId');
    const hifzNames = userProgress.hifz.map(i => allTasks[i] ? allTasks[i][0] : i).join(' | ');
    const reviewNames = userProgress.review.map(i => allTasks[i] ? allTasks[i][0] : i).join(' | ');

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "الاسم,الكود,المقاطع المحفوظة,مقاطع المراجعة\n";
    csvContent += `"${name}","${id}","${hifzNames}","${reviewNames}"`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `report_${name}.csv`);
    document.body.appendChild(link);
    link.click();
}

function saveAdminSettings() {
    localStorage.setItem('customSheetUrl', document.getElementById('sheet-url-input').value);
    alert("تم الحفظ");
}

window.onload = () => {
    const user = localStorage.getItem('userName');
    setTimeout(() => {
        document.getElementById('scr-loading').classList.remove('active');
        if (!user) document.getElementById('scr-register').classList.add('active');
        else {
            document.getElementById('scr-main').classList.add('active');
            document.getElementById('user-info').innerText = user + " | " + localStorage.getItem('userId');
            fetchData();
        }
    }, 1000);
};