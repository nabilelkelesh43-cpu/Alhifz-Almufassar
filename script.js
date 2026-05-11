const DEFAULT_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRDWHrj_Mh4k_BLNS6nB3ofBK3uQpndExNKV6Y84XM5sb6mev5yspjZEsVviMsa5uyraB6vHVHpI_bn/pub?output=csv";

let allTasks = [];
let db = JSON.parse(localStorage.getItem('hifz_db')) || {
    userName: "", userId: "", currentHifzPointer: 0, 
    tasksStatus: {}, fines: 0, weekMode: 'hifz', hasDoneMinimumThisWeek: false
};

let adminTapCount = 0;

async function fetchData() {
    const url = localStorage.getItem('customSheetUrl') || DEFAULT_URL;
    try {
        const res = await fetch(`${url}&t=${Date.now()}`);
        const text = await res.text();
        allTasks = text.split('\n').slice(1).map(line => line.split(',').map(c => c.trim()));
        renderTasks();
        loadQuranData();
        updateUI();
    } catch (e) { console.error("Error loading data"); }
}

function switchTab(tabId, el) {
    document.querySelectorAll('.cnt').forEach(c => c.style.display = 'none');
    document.getElementById('tab-' + tabId).style.display = 'block';
    document.querySelectorAll('.nav-it').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
    if (tabId === 'u') updateProfileTab();
}

function updateProfileTab() {
    document.getElementById('u-name').innerText = db.userName;
    document.getElementById('u-id').innerText = db.userId;
    document.getElementById('u-fine').innerText = db.fines + " ج.م";
    const currentTask = allTasks[db.currentHifzPointer];
    document.getElementById('u-hifz-pos').innerText = currentTask ? currentTask[0] : "مكتمل";
    let revCount = 0;
    allTasks.forEach((_, i) => {
        if (db.tasksStatus[i]?.h3 && !db.tasksStatus[i]?.rev) revCount++;
    });
    document.getElementById('u-rev-count').innerText = revCount + " مقاطع";
    document.getElementById('total-all-fines').innerText = (db.fines + 150) + " ج.م"; 
}

function renderTasks() {
    const container = document.getElementById('tasks-container');
    container.innerHTML = "";
    if (db.weekMode === 'hifz') {
        const idx = db.currentHifzPointer;
        if (!allTasks[idx]) return container.innerHTML = "<div class='card'>🏁 اكتملت السلسلة</div>";
        const status = db.tasksStatus[idx] || {smaa:false, h1:false, h2:false, h3:false, rev:false};
        container.innerHTML = `
            <div class="card task-item-main">
                <h3>${allTasks[idx][0]}</h3>
                <p>النطاق: ${allTasks[idx][1]}</p>
                <div class="check-grid">
                    <label class="${status.smaa?'active':''}"><input type="checkbox" ${status.smaa?'checked':''} onchange="updateTask(${idx}, 'smaa')"> سماع</label>
                    <label class="${status.h1?'active':''}"><input type="checkbox" ${status.h1?'checked':''} onchange="updateTask(${idx}, 'h1')"> تسميع ١</label>
                    <label class="${status.h2?'active':''}"><input type="checkbox" ${status.h2?'checked':''} onchange="updateTask(${idx}, 'h2')"> تسميع ٢</label>
                    <label class="${status.h3?'active':''}"><input type="checkbox" ${status.h3?'checked':''} onchange="updateTask(${idx}, 'h3')"> تسميع ٣</label>
                </div>
            </div>`;
        const isDone = status.smaa && status.h1 && status.h2 && status.h3;
        document.getElementById('btn-next-lesson').style.display = isDone ? "block" : "none";
        db.hasDoneMinimumThisWeek = isDone;
    } else {
        let pending = [];
        allTasks.forEach((t, i) => { if (db.tasksStatus[i]?.h3 && !db.tasksStatus[i]?.rev) pending.push(i); });
        if (pending.length === 0) {
            container.innerHTML = "<div class='card'>✅ لا توجد مراجعات متأخرة</div>";
            db.hasDoneMinimumThisWeek = true;
        } else {
            pending.forEach(idx => {
                const div = document.createElement('div');
                div.className = 'card task-item-rev';
                div.innerHTML = `<div><strong>${allTasks[idx][0]}</strong></div><label class="rev-label"><input type="checkbox" onchange="updateTask(${idx}, 'rev')"> مراجعة</label>`;
                container.appendChild(div);
            });
            db.hasDoneMinimumThisWeek = false;
        }
    }
    saveDB();
}

function updateTask(idx, key) {
    if (!db.tasksStatus[idx]) db.tasksStatus[idx] = {smaa:false, h1:false, h2:false, h3:false, rev:false};
    db.tasksStatus[idx][key] = !db.tasksStatus[idx][key];
    saveDB(); renderTasks();
}

function saveDB() { localStorage.setItem('hifz_db', JSON.stringify(db)); }

function loadQuranData() {
    const qUrl = localStorage.getItem('quranUrl') || "#";
    const qNote = localStorage.getItem('quranNote') || "يرجى تحميل المصحف";
    document.getElementById('quran-link').href = qUrl;
    document.getElementById('quran-note').innerText = qNote;
    document.getElementById('sheet-url-input').value = localStorage.getItem('customSheetUrl') || DEFAULT_URL;
    document.getElementById('quran-url-input').value = qUrl;
    document.getElementById('quran-note-input').value = qNote;
}

function saveAdminSettings() {
    localStorage.setItem('customSheetUrl', document.getElementById('sheet-url-input').value);
    localStorage.setItem('quranUrl', document.getElementById('quran-url-input').value);
    localStorage.setItem('quranNote', document.getElementById('quran-note-input').value);
    alert("تم حفظ جميع الإعدادات"); location.reload();
}

function startNewWeek(mode) {
    if (!confirm("تأكيد بدء الأسبوع الجديد؟")) return;
    if (!db.hasDoneMinimumThisWeek) db.fines += 50;
    db.weekMode = mode; db.hasDoneMinimumThisWeek = false; saveDB(); location.reload();
}

function registerUser() {
    const name = document.getElementById('reg-name').value;
    if (name.length < 5) return alert("الاسم الثلاثي مطلوب");
    db.userName = name;
    db.userId = "ID-" + Math.floor(1000 + Math.random() * 9000);
    saveDB(); location.reload();
}

function handleAdminTap() {
    adminTapCount++;
    if (adminTapCount >= 5) {
        if (prompt("كلمة المرور:") === "123456") {
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById('scr-admin').classList.add('active');
        }
        adminTapCount = 0;
    }
}

function updateUI() { document.getElementById('status-badge').innerText = db.weekMode === 'hifz' ? "أسبوع حفظ" : "أسبوع مراجعة"; }

function unlockNextHifz() { db.currentHifzPointer++; db.hasDoneMinimumThisWeek = true; saveDB(); renderTasks(); }

function exportAdminReport() {
    let s=0, r=0; for(let k in db.tasksStatus){ if(db.tasksStatus[k].h3) s++; if(db.tasksStatus[k].rev) r++; }
    let csv = "\uFEFFالاسم,الكود,المحفوظ,المراجع,الغرامات\n";
    csv += `"${db.userName}","${db.userId}","${s}","${r}","${db.fines}"`;
    const link = document.createElement("a");
    link.href = "data:text/csv;charset=utf-8," + encodeURI(csv);
    link.download = `تقرير.csv`; link.click();
}

window.onload = () => {
    setTimeout(() => {
        document.getElementById('scr-loading').classList.remove('active');
        if (!db.userName) document.getElementById('scr-register').classList.add('active');
        else { document.getElementById('scr-main').classList.add('active'); fetchData(); }
    }, 800);
};
