// بيانات الربط الخاصة بمشروعك (Firebase Config)
const firebaseConfig = {
  apiKey: "AIzaSyDxzFOjPwjQL0oAG5lmg0s7VxhoRLbeZc",
  authDomain: "alhifz-almufassar.firebaseapp.com",
  databaseURL: "https://alhifz-almufassar-default-rtdb.firebaseio.com",
  projectId: "alhifz-almufassar",
  storageBucket: "alhifz-almufassar.firebasestorage.app",
  messagingSenderId: "137379079577",
  appId: "1:137379079577:web:41e516c414f4997c8adf08",
  measurementId: "G-56796ZFDZR"
};

// تهيئة النظام
firebase.initializeApp(firebaseConfig);
const db = firebase.database().ref('global_config');

let allTasks = [];
let userDb = JSON.parse(localStorage.getItem('hifz_user')) || { name: "", pointer: 0 };

// المزامنة اللحظية مع الإدارة
function initSync() {
    db.on('value', (snap) => {
        const data = snap.val();
        if (data) {
            document.getElementById('quran-link').href = data.quranUrl || "#";
            document.getElementById('agreements-text').innerText = data.agreements || "";
            
            // تحديث قيم لوحة الإدارة تلقائياً
            document.getElementById('sheet-url-input').value = data.sheetUrl || "";
            document.getElementById('quran-url-input').value = data.quranUrl || "";
            document.getElementById('agreements-input').value = data.agreements || "";

            if (data.sheetUrl) fetchSheetData(data.sheetUrl);
        }
    });
}

async function fetchSheetData(url) {
    try {
        const res = await fetch(`${url}&t=${Date.now()}`);
        const text = await res.text();
        // تحليل الشيت بناءً على أعمدة (title, ayat, link) كما في صورتك
        allTasks = text.split('\n').slice(1).map(row => {
            const cols = row.split(',');
            return { title: cols[0], ayat: cols[1], link: cols[2] };
        });
        renderUI();
    } catch (e) { console.error("Sheet Error"); }
}

function renderUI() {
    const container = document.getElementById('tasks-container');
    const p = userDb.pointer;
    
    if (!allTasks[p] || !allTasks[p].title) {
        container.innerHTML = "<div class='card' style='text-align:center;'>🏁 هنيئاً لك! لقد أتممت السلسلة بنجاح.</div>";
        return;
    }

    container.innerHTML = `
        <div class="card animate-in">
            <div style="color:#2c5e50; font-weight:bold; margin-bottom:5px;">المقطع الحالي:</div>
            <h2 style="font-size:1.4rem; margin-bottom:10px;">${allTasks[p].title}</h2>
            <div style="background:#f9f9f9; padding:10px; border-radius:8px; margin-bottom:15px;">
                <i class="fas fa-bookmark" style="color:#2c5e50;"></i> الآيات: ${allTasks[p].ayat}
            </div>
            <a href="${allTasks[p].link}" target="_blank" class="btn-main" style="background:#007bff; text-decoration:none; display:block; text-align:center; margin-bottom:15px;">
                <i class="fab fa-telegram"></i> فتح مقطع التفسير
            </a>
            <div style="border-top:1px solid #eee; padding-top:15px;">
                <label style="display:flex; align-items:center; gap:12px; cursor:pointer;">
                    <input type="checkbox" style="width:22px; height:22px;" onchange="markDone(this)">
                    <span style="font-weight:bold;">أتممت السماع والتسميع غيباً</span>
                </label>
            </div>
        </div>`;
}

function markDone(el) {
    if (el.checked) {
        setTimeout(() => {
            userDb.pointer++;
            localStorage.setItem('hifz_user', JSON.stringify(userDb));
            renderUI();
        }, 600);
    }
}

function registerUser() {
    const n = document.getElementById('reg-name').value;
    if (n.trim().length > 3) {
        userDb.name = n;
        localStorage.setItem('hifz_user', JSON.stringify(userDb));
        location.reload();
    } else { alert("يرجى إدخال الاسم الثلاثي بشكل صحيح"); }
}

function saveAdminSettings() {
    db.update({
        sheetUrl: document.getElementById('sheet-url-input').value,
        quranUrl: document.getElementById('quran-url-input').value,
        agreements: document.getElementById('agreements-input').value
    }).then(() => alert("تم التحديث بنجاح!"));
}

function switchTab(id, el) {
    document.querySelectorAll('.cnt').forEach(c => c.style.display = 'none');
    document.getElementById('tab-' + id).style.display = 'block';
    document.querySelectorAll('.nav-it').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
}

function handleAdminTap() {
    const p = prompt("كلمة مرور الإدارة:");
    if (p === "123456") {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById('scr-admin').classList.add('active');
    }
}

window.onload = () => {
    setTimeout(() => {
        document.getElementById('scr-loading').classList.remove('active');
        if (!userDb.name) document.getElementById('scr-register').classList.add('active');
        else {
            document.getElementById('scr-main').classList.add('active');
            document.getElementById('u-name-display').innerText = userDb.name;
            initSync();
        }
    }, 800);
};
