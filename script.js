// بيانات الربط (تأكد من الـ API Key)
const firebaseConfig = {
  apiKey: "AIzaSyDxzFOjPwjQL0oAG5lmgOs7VxhoRLbebZc", 
  authDomain: "alhifz-almufassar.firebaseapp.com",
  databaseURL: "https://alhifz-almufassar-default-rtdb.firebaseio.com",
  projectId: "alhifz-almufassar",
  storageBucket: "alhifz-almufassar.firebasestorage.app",
  messagingSenderId: "137379079577",
  appId: "1:137379079577:web:41e516c414f4997c8adf08"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database().ref('hifz_settings');

let allTasks = [];
let currentUser = null;
let userData = { pointer: 0, fines: 0, reviewedIndices: [] };
let appMode = "hifz"; // hifz أو review

window.onload = () => {
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            // جلب بيانات المستخدم من Firebase أو LocalStorage
            const saved = JSON.parse(localStorage.getItem('hifz_data_' + user.email)) || { pointer: 0, fines: 0, reviewedIndices: [] };
            userData = saved;
            document.getElementById('u-name-display').innerText = user.displayName;
            startSync();
        } else {
            document.getElementById('scr-register').classList.add('active');
        }
        document.getElementById('scr-loading').classList.remove('active');
    });
};

function startSync() {
    db.on('value', (snap) => {
        const data = snap.val();
        if (data) {
            appMode = data.currentMode || "hifz";
            document.getElementById('quran-link').href = data.quranUrl || "#";
            document.getElementById('agreements-text').innerText = data.agreements || "";
            
            // تحديث لوحة الإدارة
            document.getElementById('mode-selector').value = appMode;
            document.getElementById('sheet-url-input').value = data.seriesSheetUrl || "";

            if (data.seriesSheetUrl) fetchSheetData(data.seriesSheetUrl);
        }
    });
}

async function fetchSheetData(url) {
    try {
        const res = await fetch(`${url}&t=${Date.now()}`);
        const text = await res.text();
        allTasks = text.split('\n').slice(1).map((row, index) => {
            const cols = row.split(',');
            return { id: index, title: cols[0], ayat: cols[1], link: cols[2] };
        }).filter(t => t.title);
        renderContent();
    } catch (e) { console.error(e); }
}

function renderContent() {
    const container = document.getElementById('tasks-container');
    container.innerHTML = "";

    if (appMode === "hifz") {
        renderHifzMode(container);
    } else {
        renderReviewMode(container);
    }
}

// --- وضع الحفظ ---
function renderHifzMode(container) {
    const task = allTasks[userData.pointer];
    if (!task) {
        container.innerHTML = "<div class='card'>🏁 انتهى الحفظ الحالي!</div>";
        return;
    }

    container.innerHTML = `
        <div class="card animate-in">
            <div class="mode-badge">أسبوع الحفظ</div>
            <h2>${task.title}</h2>
            <p><i class="fas fa-bookmark"></i> ${task.ayat}</p>
            <a href="${task.link}" target="_blank" class="btn-link">فتح مقطع التفسير</a>
            <div class="check-list">
                <label><input type="checkbox" class="h-check"> سماع المقطع</label>
                <label><input type="checkbox" class="h-check"> قراءة التفسير</label>
                <label><input type="checkbox" class="h-check"> التكرار (المطاليب)</label>
                <label><input type="checkbox" id="final-hifz" onchange="checkHifzProgress()"> التسميع غيباً</label>
            </div>
            <div id="fine-alert" class="fine-box" style="display:none;">⚠️ ستسجل غرامة 50 جنيهاً إذا لم تنجز مقطعاً!</div>
        </div>`;
}

// --- وضع المراجعة ---
function renderReviewMode(container) {
    // المقاطع المطلوب مراجعتها هي كل ما تم حفظه (أقل من Pointer) ولم يتم مراجعته في هذا الأسبوع
    const toReview = allTasks.filter((t, index) => index < userData.pointer && !userData.reviewedIndices.includes(index));

    if (toReview.length === 0) {
        container.innerHTML = "<div class='card'>✅ أتممت جميع المراجعات المطلوبة!</div>";
        return;
    }

    container.innerHTML = `<h3>مقاطع المراجعة (${toReview.length})</h3>`;
    toReview.forEach(task => {
        container.innerHTML += `
            <div class="card review-card">
                <h4>${task.title}</h4>
                <p>${task.ayat}</p>
                <button class="btn-main" onclick="markReviewed(${task.id})">أتممت المراجعة</button>
            </div>`;
    });
}

function checkHifzProgress() {
    const checks = document.querySelectorAll('.h-check:checked').length;
    if (checks >= 3 && document.getElementById('final-hifz').checked) {
        userData.pointer++;
        saveData();
        renderContent();
    } else {
        alert("يرجى إتمام جميع المطاليب أولاً");
        document.getElementById('final-hifz').checked = false;
    }
}

function markReviewed(id) {
    userData.reviewedIndices.push(id);
    saveData();
    renderContent();
}

function saveData() {
    localStorage.setItem('hifz_data_' + currentUser.email, JSON.stringify(userData));
    // هنا يمكن إضافة كود لرفع البيانات لـ Firebase لو أردت مراقبة الطلاب
}

// --- لوحة الإدارة ---
function saveAdminSettings() {
    db.update({
        currentMode: document.getElementById('mode-selector').value,
        seriesSheetUrl: document.getElementById('sheet-url-input').value,
        quranUrl: document.getElementById('quran-url-input').value,
        agreements: document.getElementById('agreements-input').value
    }).then(() => alert("تم تحديث وضع الحلقة بنجاح!"));
}
