// بيانات الربط الخاصة بمشروعك (تأكد من مطابقة الـ API Key بدقة)
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

// المرجع الموحد لقاعدة البيانات (المسار الذي اخترناه: hifz_settings)
const db = firebase.database().ref('hifz_settings');

let allTasks = [];
let currentUser = null;
let userPointer = 0;

/**
 * وظيفة تسجيل الدخول عبر Google
 */
function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
        .then((result) => {
            console.log("Login Successful");
        }).catch((error) => {
            console.error("Login Error:", error);
            alert("خطأ في تسجيل الدخول: " + error.message);
        });
}

/**
 * وظيفة تسجيل الخروج
 */
function signOut() {
    firebase.auth().signOut().then(() => {
        location.reload();
    });
}

/**
 * مراقبة حالة المستخدم وجلب البيانات عند فتح التطبيق
 */
window.onload = () => {
    firebase.auth().onAuthStateChanged((user) => {
        const loadingScreen = document.getElementById('scr-loading');
        
        if (user) {
            currentUser = user;
            // جلب تقدم الطالب من الذاكرة المحلية بناءً على الإيميل
            const savedData = JSON.parse(localStorage.getItem('hifz_progress_' + user.email)) || { pointer: 0 };
            userPointer = savedData.pointer;

            document.getElementById('scr-register').classList.remove('active');
            document.getElementById('scr-main').classList.add('active');
            document.getElementById('u-name-display').innerText = user.displayName;
            
            // بدء مزامنة البيانات من Firebase
            startSync();
        } else {
            // إذا لم يسجل دخوله، تظهر شاشة جوجل
            document.getElementById('scr-main').classList.remove('active');
            document.getElementById('scr-register').classList.add('active');
        }
        
        if (loadingScreen) loadingScreen.classList.remove('active');
    });
};

/**
 * مزامنة روابط الإدارة والاتفاقية
 */
function startSync() {
    db.on('value', (snap) => {
        const data = snap.val();
        if (data) {
            // تحديث روابط الواجهة
            document.getElementById('quran-link').href = data.quranUrl || "#";
            document.getElementById('agreements-text').innerText = data.agreements || "";
            
            // تحديث قيم لوحة الإدارة (للمشرف)
            document.getElementById('sheet-url-input').value = data.seriesSheetUrl || "";
            document.getElementById('quran-url-input').value = data.quranUrl || "";
            document.getElementById('agreements-input').value = data.agreements || "";

            // جلب المهام من جوجل شيت إذا كان الرابط موجوداً
            if (data.seriesSheetUrl) {
                fetchSheetData(data.seriesSheetUrl);
            }
        }
    });
}

/**
 * جلب بيانات الجدول وتحويلها لمهام
 */
async function fetchSheetData(url) {
    try {
        const res = await fetch(`${url}&t=${Date.now()}`);
        const text = await res.text();
        
        // تحليل CSV: العمود 0 عنوان، 1 آيات، 2 رابط
        allTasks = text.split('\n').slice(1).map(row => {
            const cols = row.split(',');
            return { 
                title: cols[0] ? cols[0].trim() : "", 
                ayat: cols[1] ? cols[1].trim() : "", 
                link: cols[2] ? cols[2].trim() : "" 
            };
        }).filter(t => t.title !== ""); // استبعاد الأسطر الفارغة

        renderTasks();
    } catch (e) {
        console.error("Sheet Fetch Error:", e);
    }
}

/**
 * عرض المهمة الحالية للطالب
 */
function renderTasks() {
    const container = document.getElementById('tasks-container');
    
    if (!allTasks[userPointer]) {
        container.innerHTML = `
            <div class="card" style="text-align:center;">
                <i class="fas fa-check-circle" style="font-size:50px; color:#2c5e50; margin-bottom:15px;"></i>
                <h3>مبارك!</h3>
                <p>لقد أتممت جميع مقاطع السلسلة الحالية بنجاح.</p>
            </div>`;
        return;
    }

    const task = allTasks[userPointer];
    container.innerHTML = `
        <div class="card animate-in">
            <small style="color:#2c5e50; font-weight:bold;">المقطع الحالي:</small>
            <h2 style="font-size:1.25rem; margin:10px 0; color:#333;">${task.title}</h2>
            <div style="background:#f4f7f6; padding:12px; border-radius:10px; margin-bottom:20px; font-size:0.9rem; border-right: 4px solid #2c5e50;">
                <i class="fas fa-bookmark"></i> ${task.ayat}
            </div>
            <a href="${task.link}" target="_blank" class="btn-main" style="background:#007bff; text-decoration:none; display:block; text-align:center; margin-bottom:20px;">
                <i class="fab fa-telegram"></i> مشاهدة التفسير والتكرار
            </a>
            <div style="border-top:1px solid #eee; padding-top:15px;">
                <label style="display:flex; align-items:center; gap:12px; cursor:pointer;">
                    <input type="checkbox" style="width:22px; height:22px; accent-color:#2c5e50;" onchange="markDone(this)">
                    <span style="font-weight:bold; color:#444;">أتممت السماع والتسميع غيباً</span>
                </label>
            </div>
        </div>`;
}

/**
 * تحديث تقدم الطالب عند إنهاء المهمة
 */
function markDone(el) {
    if (el.checked && currentUser) {
        setTimeout(() => {
            userPointer++;
            // حفظ التقدم محلياً مربوطاً ببريد المستخدم
            localStorage.setItem('hifz_progress_' + currentUser.email, JSON.stringify({ pointer: userPointer }));
            renderTasks();
        }, 600);
    }
}

/**
 * حفظ إعدادات لوحة الإدارة (للمشرف فقط)
 */
function saveAdminSettings() {
    db.update({
        seriesSheetUrl: document.getElementById('sheet-url-input').value,
        quranUrl: document.getElementById('quran-url-input').value,
        agreements: document.getElementById('agreements-input').value
    }).then(() => {
        alert("تم الحفظ بنجاح! سيتم تحديث المحتوى عند جميع الطلاب الآن.");
    }).catch(err => {
        alert("خطأ في الحفظ: " + err.message);
    });
}

/**
 * وظيفة التنقل بين التبويبات
 */
function switchTab(id, el) {
    document.querySelectorAll('.cnt').forEach(c => c.style.display = 'none');
    document.getElementById('tab-' + id).style.display = 'block';
    document.querySelectorAll('.nav-it').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
}

/**
 * دخول لوحة الإدارة
 */
function handleAdminTap() {
    const pass = prompt("كلمة مرور الإدارة:");
    if (pass === "123456") {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById('scr-admin').classList.add('active');
    }
}
