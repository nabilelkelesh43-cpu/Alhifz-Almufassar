const DEFAULT_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRDWHrj_Mh4k_BLNS6nB3ofBK3uQpndExNKV6Y84XM5sb6mev5yspjZEsVviMsa5uyraB6vHVHpI_bn/pub?output=csv";

// قاعدة البيانات الأساسية للعضو
let allTasks = [];
let db = JSON.parse(localStorage.getItem('hifz_db')) || {
    userName: "",
    userId: "",
    currentHifzPointer: 0, // أين وصل في الحفظ
    tasksStatus: {}, // سجل الحالات {index: {smaa:false, h1:false, h2:false, h3:false, rev:false}}
    fines: 0,
    weekMode: 'hifz',
    hasDoneMinimumThisWeek: false
};

// محاكاة الغرامات العامة (في الواقع تحتاج سيرفر، لكن هنا سنعرض غرامة العضو الحالي كمثال للشفافية)
let adminTapCount = 0;

function registerUser() {
    const name = document.getElementById('reg-name').value;
    if (name.length < 5) return alert("الاسم الثلاثي مطلوب");
    db.userName = name;
    db.userId = "ID-" + Math.floor(1000 + Math.random() * 9000);
    saveDB();
    location.reload();
}

async function fetchData() {
    const url = localStorage.getItem('customSheetUrl') || DEFAULT_URL;
    try {
        const res = await fetch(`${url}&t=${Date.now()}`);
        const text = await res.text();
        allTasks = text.split('\n').slice(1).map(line => line.split(',').map(c => c.trim()));
        renderTasks();
        updateUI();
    } catch (e) { console.error("Data fetch error"); }
}

function renderTasks() {
    const container = document.getElementById('tasks-container');
    container.innerHTML = "";
    const mode = db.weekMode;

    if (mode === 'hifz') {
        const idx = db.currentHifzPointer;
        if (!allTasks[idx]) return container.innerHTML = "🏁 اكتملت السلسلة!";
        
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
            </div>
        `;
        // زر التالي يظهر فقط إذا أنهى الـ 4 مطاليب
        if (status.smaa && status.h1 && status.h2 && status.h3) {
            document.getElementById('btn-next-lesson').style.display = "block";
            db.hasDoneMinimumThisWeek = true;
            saveDB();
        } else {
            document.getElementById('btn-next-lesson').style.display = "none";
        }

    } else { // وضع المراجعة
        let pendingReview = [];
        // المراجعة هي كل ما هو (محفوظ: أي انتهى مؤشر الحفظ بعده) و (لم يراجع: rev:false)
        for (let i = 0; i < db.currentHifzPointer; i++) {
            const s = db.tasksStatus[i] || {};
            if (!s.rev) pendingReview.push(i);
        }

        if (pendingReview.length === 0) {
            container.innerHTML = "<div class='card' style='text-align:center;'>✅ لا توجد ديون مراجعة عليك حالياً.</div>";
            db.hasDoneMinimumThisWeek = true; // أتم الحد الأدنى لأنه لا يوجد شيء أصلاً
        } else {
            pendingReview.forEach(idx => {
                const item = document.createElement('div');
                item.className = 'card task-item-rev';
                item.innerHTML = `
                    <div style="flex:1"><strong>${allTasks[idx][0]}</strong></div>
                    <label class="rev-label"><input type="checkbox" onchange="updateTask(${idx}, 'rev')"> مراجعة</label>
                `;
                container.appendChild(item);
            });
            // في المراجعة: الحد الأدنى هو إنهاء القائمة كلها
            db.hasDoneMinimumThisWeek = false; 
        }
        saveDB();
    }
}

function updateTask(idx, key) {
    if (!db.tasksStatus[idx]) db.tasksStatus[idx] = {smaa:false, h1:false, h2:false, h3:false, rev:false};
    db.tasksStatus[idx][key] = !db.tasksStatus[idx][key];
    saveDB();
    renderTasks();
}

function unlockNextHifz() {
    db.currentHifzPointer++;
    db.hasDoneMinimumThisWeek = true;
    saveDB();
    renderTasks();
}

function startNewWeek(newMode) {
    if (!confirm("تنبيه: سيتم فحص الالتزام وفرض غرامة على المقصرين. هل تريد الاستمرار؟")) return;

    // فحص الغرامة
    if (!db.hasDoneMinimumThisWeek) {
        db.fines += 50;
        alert("تم رصد تقصير: تم إضافة ٥٠ جنيهاً غرامة.");
    }

    db.weekMode = newMode;
    db.hasDoneMinimumThisWeek = false; // تصفير الالتزام للأسبوع الجديد
    saveDB();
    location.reload();
}

function exportAdminReport() {
    let saved = 0;
    let reviewed = 0;
    for (let key in db.tasksStatus) {
        if (db.tasksStatus[key].h3) saved++;
        if (db.tasksStatus[key].rev) reviewed++;
    }

    let csv = "الاسم,الكود,المقاطع المحفوظة,المقاطع المراجعة,إجمالي الغرامات\n";
    csv += `"${db.userName}","${db.userId}","${saved}","${reviewed}","${db.fines}"`;
    
    const uri = "data:text/csv;charset=utf-8,\uFEFF" + encodeURI(csv);
    const link = document.createElement("a");
    link.href = uri;
    link.download = `تقرير_${db.userName}.csv`;
    link.click();
}

function switchTab(tab) {
    document.querySelectorAll('.cnt').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.nav-it').forEach(n => n.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    if (tab === 'f') renderFinesBoard();
    event.currentTarget.classList.add('active');
}

function renderFinesBoard() {
    const board = document.getElementById('fines-board');
    // ملاحظة: في تطبيق حقيقي، هنا نسحب بيانات كل المستخدمين من السيرفر.
    // هنا سنعرض بيانات العضو الحالي كنموذج للوحة العامة.
    board.innerHTML = `
        <div class="fine-row header"><span>الاسم</span><span>المبلغ</span></div>
        <div class="fine-row"><span>${db.userName}</span><span>${db.fines} ج.م</span></div>
        <div class="fine-row" style="opacity:0.5;"><span>عضو تجريبي ١</span><span>٠ ج.م</span></div>
    `;
}

function handleAdminTap() {
    adminTapCount++;
    if (adminTapCount >= 5) {
        adminTapCount = 0;
        if (prompt("كلمة المرور:") === "123456") {
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById('scr-admin').classList.add('active');
        }
    }
}

function saveDB() { localStorage.setItem('hifz_db', JSON.stringify(db)); }
function saveAdminSettings() { localStorage.setItem('customSheetUrl', document.getElementById('sheet-url-input').value); alert("تم الحفظ"); }
function updateUI() { document.getElementById('status-badge').innerText = db.weekMode === 'hifz' ? "أسبوع حفظ" : "أسبوع مراجعة"; }

window.onload = () => {
    setTimeout(() => {
        document.getElementById('scr-loading').classList.remove('active');
        if (!db.userName) document.getElementById('scr-register').classList.add('active');
        else {
            document.getElementById('scr-main').classList.add('active');
            fetchData();
        }
    }, 800);
};
