// بيانات Firebase من صورتك الأخيرة
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

firebase.initializeApp(firebaseConfig);
const rtdb = firebase.database().ref('hifz_settings');

let allTasks = [];
let db_local = JSON.parse(localStorage.getItem('hifz_db')) || {
    userName: "", currentPointer: 0
};

// المزامنة اللحظية
function startSync() {
    rtdb.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            document.getElementById('quran-link').href = data.quranUrl || "#";
            document.getElementById('agreements-text').innerText = data.agreements || "";
            
            // تعبئة لوحة الإدارة بالقيم الحالية
            document.getElementById('sheet-url-input').value = data.seriesSheetUrl || "";
            document.getElementById('quran-url-input').value = data.quranUrl || "";
            document.getElementById('agreements-input').value = data.agreements || "";

            if (data.seriesSheetUrl) {
                fetchSeries(data.seriesSheetUrl);
            }
            updateStatusBadge();
        }
    });
}

async function fetchSeries(url) {
    try {
        const res = await fetch(`${url}&t=${Date.now()}`);
        const text = await res.text();
        allTasks = text.split('\n').slice(1).map(line => {
            const cols = line.split(',');
            return { title: cols[0], range: cols[1], link: cols[2] };
        });
        renderTasks();
    } catch (e) { console.error("Error fetching Sheet"); }
}

function renderTasks() {
    const container = document.getElementById('tasks-container');
    const idx = db_local.currentPointer;
    if (!allTasks[idx]) {
        container.innerHTML = "<div class='card'>🏁 اكتملت السلسلة بنجاح!</div>";
        return;
    }
    container.innerHTML = `
        <div class="card">
            <h2 style="color:#2c5e50;">${allTasks[idx].title}</h2>
            <p style="margin:10px 0;">نطاق المقطع: ${allTasks[idx].range}</p>
            <a href="${allTasks[idx].link}" target="_blank" class="btn-main" style="background:#007bff; text-decoration:none; display:block; text-align:center; margin-bottom:10px;">مشاهدة المقطع المفسر</a>
            <div style="border-top:1px solid #eee; padding-top:10px; margin-top:10px;">
                <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
                    <input type="checkbox" style="width:20px; height:20px;" onchange="completeTask(this)">
                    <span>أتممت سماع وتسميع المقطع</span>
                </label>
            </div>
        </div>`;
}

function completeTask(el) {
    if (el.checked) {
        setTimeout(() => {
            db_local.currentPointer++;
            saveLocal();
            renderTasks();
        }, 500);
    }
}

function registerUser() {
    const name = document.getElementById('reg-name').value;
    if (name.trim()) {
        db_local.userName = name;
        saveLocal();
        location.reload();
    }
}

function saveLocal() { localStorage.setItem('hifz_db', JSON.stringify(db_local)); }

function switchTab(tabId, el) {
    document.querySelectorAll('.cnt').forEach(c => c.style.display = 'none');
    document.getElementById('tab-' + tabId).style.display = 'block';
    document.querySelectorAll('.nav-it').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
}

function handleAdminTap() {
    let p = prompt("كلمة مرور الإدارة:");
    if (p === "123456") { // يمكنك تغيير كلمة المرور هنا
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById('scr-admin').classList.add('active');
    }
}

function saveAdminSettings() {
    const updates = {
        seriesSheetUrl: document.getElementById('sheet-url-input').value,
        quranUrl: document.getElementById('quran-url-input').value,
        agreements: document.getElementById('agreements-input').value
    };
    rtdb.update(updates).then(() => alert("تم التحديث اللحظي للجميع!"));
}

function updateStatusBadge() {
    document.getElementById('status-badge').innerText = db_local.userName;
}

window.onload = () => {
    setTimeout(() => {
        document.getElementById('scr-loading').classList.remove('active');
        if (!db_local.userName) document.getElementById('scr-register').classList.add('active');
        else {
            document.getElementById('scr-main').classList.add('active');
            startSync();
        }
    }, 1000);
};
