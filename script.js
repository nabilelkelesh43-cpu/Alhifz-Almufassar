// إعدادات مشروعك كما في الصورة (image_dfae1d.png)
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

// تهيئة Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.database().ref('hifz_settings');
let allTasks = [];
let currentUser = null;
let userPointer = 0;

// دالة تسجيل الدخول بجوجل
function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
        .then(() => {
            // سيتم التعامل مع التوجيه عبر onAuthStateChanged
        }).catch((error) => {
            alert("خطأ في تسجيل الدخول: " + error.message);
        });
}

// دالة تسجيل الخروج
function signOut() {
    firebase.auth().signOut().then(() => location.reload());
}

// المزامنة والتحقق من حالة المستخدم
window.onload = () => {
    firebase.auth().onAuthStateChanged((user) => {
        const loadingScreen = document.getElementById('scr-loading');
        if (user) {
            currentUser = user;
            // جلب تقدم المستخدم من الـ LocalStorage (مربوط بالإيميل)
            const savedData = JSON.parse(localStorage.getItem('hifz_progress_' + user.email)) || { pointer: 0 };
            userPointer = savedData.pointer;

            document.getElementById('scr-register').classList.remove('active');
            document.getElementById('scr-main').classList.add('active');
            document.getElementById('u-name-display').innerText = user.displayName;
            startSync();
        } else {
            document.getElementById('scr-main').classList.remove('active');
            document.getElementById('scr-register').classList.add('active');
        }
        loadingScreen.classList.remove('active');
    });
};

function startSync() {
    db.on('value', (snap) => {
        const data = snap.val();
        if (data) {
            document.getElementById('quran-link').href = data.quranUrl || "#";
            document.getElementById('agreements-text').innerText = data.agreements || "";
            
            // تحديث لوحة الإدارة
            document.getElementById('sheet-url-input').value = data.seriesSheetUrl || "";
            document.getElementById('quran-url-input').value = data.quranUrl || "";
            document.getElementById('agreements-input').value = data.agreements || "";

            if (data.seriesSheetUrl) fetchSheetData(data.seriesSheetUrl);
        }
    });
}

async function fetchSheetData(url) {
    try {
        const res = await fetch(`${url}&t=${Date.now()}`);
        const text = await res.text();
        allTasks = text.split('\n').slice(1).map(row => {
            const cols = row.split(',');
            return { title: cols[0], ayat: cols[1], link: cols[2] };
        });
        renderTasks();
    } catch (e) { console.error("Sheet Error"); }
}

function renderTasks() {
    const container = document.getElementById('tasks-container');
    if (!allTasks[userPointer] || !allTasks[userPointer].title) {
        container.innerHTML = "<div class='card' style='text-align:center;'>🏁 مبارك! أتممت السلسلة.</div>";
        return;
    }

    container.innerHTML = `
        <div class="card animate-in">
            <small style="color:#2c5e50;">المقطع الحالي:</small>
            <h2 style="font-size:1.2rem; margin:10px 0;">${allTasks[userPointer].title}</h2>
            <div style="background:#f4f7f6; padding:10px; border-radius:8px; margin-bottom:15px; font-size:0.9rem;">
                <i class="fas fa-bookmark"></i> ${allTasks[userPointer].ayat}
            </div>
            <a href="${allTasks[userPointer].link}" target="_blank" class="btn-main" style="background:#007bff; text-decoration:none; display:block; text-align:center; margin-bottom:15px;">
                <i class="fab fa-telegram"></i> مشاهدة التفسير
            </a>
            <div style="border-top:1px solid #eee; padding-top:15px;">
                <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
                    <input type="checkbox" style="width:20px; height:20px;" onchange="markDone(this)">
                    <span style="font-weight:bold;">أتممت السماع والتسميع غيباً</span>
                </label>
            </div>
        </div>`;
}

function markDone(el) {
    if (el.checked && currentUser) {
        setTimeout(() => {
            userPointer++;
            localStorage.setItem('hifz_progress_' + currentUser.email, JSON.stringify({ pointer: userPointer }));
            renderTasks();
        }, 500);
    }
}

function saveAdminSettings() {
    db.update({
        seriesSheetUrl: document.getElementById('sheet-url-input').value,
        quranUrl: document.getElementById('quran-url-input').value,
        agreements: document.getElementById('agreements-input').value
    }).then(() => alert("تم التحديث بنجاح!"));
}

function handleAdminTap() {
    const pass = prompt("كلمة مرور الإدارة:");
    if (pass === "123456") {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById('scr-admin').classList.add('active');
    }
}

function switchTab(id, el) {
    document.querySelectorAll('.cnt').forEach(c => c.style.display = 'none');
    document.getElementById('tab-' + id).style.display = 'block';
    document.querySelectorAll('.nav-it').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
}
