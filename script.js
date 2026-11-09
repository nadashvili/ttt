/**
 * SportHub Georgia - Complete Standalone JavaScript Architecture
 * Includes: Firebase Auth, Firestore Real-time Sync, Tournaments Management,
 * Isolated Chat System, Responsive UI Logic, and Telegram Bot Auto-Notifications.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, setDoc, doc, getDoc, updateDoc, deleteDoc, onSnapshot, query, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCnrtOjcwP7X18WqWfEiTVBh84_zBswPP0",
  authDomain: "georank-54fc9.firebaseapp.com",
  databaseURL: "https://georank-54fc9-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "georank-54fc9",
  storageBucket: "georank-54fc9.firebasestorage.app",
  messagingSenderId: "292825175283",
  appId: "1:292825175283:web:6afc205bbe959482a09386",
  measurementId: "G-1QXF6VZFZY"
};

const appId = typeof __app_id !== 'undefined' ? __app_id : 'sporthub-georgia-default';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = "9070094485:AAEjXiW6Bg9LTNDzuJqPUMl2bXwEVSyrQ9g";
const TELEGRAM_CHAT_ID = "-1003771265748";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentUser = null;
let tournamentsList = [];
let currentSportFilter = 'all';
let currentSearchQuery = '';
let activeTournamentId = null;
let chatUnsubscribe = null;
let authMode = 'login';

// Expose functions globally for HTML event binding
window.showAlert = showAlert;
window.closeCustomAlert = closeCustomAlert;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.toggleAuthMode = toggleAuthMode;
window.handleAuthSubmit = handleAuthSubmit;
window.logoutUser = logoutUser;
window.openCreateModal = openCreateModal;
window.closeCreateModal = closeCreateModal;
window.handleCreateTournament = handleCreateTournament;
window.deleteTournament = deleteTournament;
window.joinTournament = joinTournament;
window.leaveTournament = leaveTournament;
window.openChat = openChat;
window.switchView = switchView;
window.sendChatMessage = sendChatMessage;
window.setSportFilter = setSportFilter;
window.filterTournaments = filterTournaments;

/**
 * Initialize Authentication State
 */
async function initAuth() {
    try {
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            await signInAnonymously(auth);
        }
    } catch (err) {
        console.error("Auth init error:", err);
    }
}

initAuth();

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    updateNavUI();
    fetchTournaments();
});

/**
 * Update Navigation Bar UI based on Auth Status
 */
function updateNavUI() {
    const container = document.getElementById('auth-nav-container');
    if (!container) return;
    
    if (currentUser && !currentUser.isAnonymous && currentUser.email) {
        container.innerHTML = `
            <div class="flex items-center space-x-2.5 bg-slate-900/80 border border-slate-700/80 px-3.5 py-2 rounded-2xl shadow-inner">
                <div class="w-7 h-7 rounded-xl brand-gradient text-white flex items-center justify-center font-bold text-xs shadow-md">
                    ${currentUser.email.charAt(0).toUpperCase()}
                </div>
                <span class="text-xs text-slate-200 font-semibold truncate max-w-[110px] sm:max-w-[160px]">${currentUser.email}</span>
                <button onclick="logoutUser()" title="გასვლა" class="text-slate-400 hover:text-red-400 transition ml-1 p-1">
                    <i class="fa-solid fa-right-from-bracket text-sm"></i>
                </button>
            </div>
        `;
    } else {
        container.innerHTML = `
            <button onclick="openAuthModal('login')" class="px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-2xl text-slate-300 hover:text-white hover:bg-slate-900/80 transition">შესვლა</button>
            <button onclick="openAuthModal('register')" class="px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-2xl brand-gradient text-white shadow-lg shadow-red-500/25 hover:opacity-95 transition">რეგისტრაცია</button>
        `;
    }
}

/**
 * Custom Alert Modal Controller
 */
function showAlert(title, message, isSuccess = true) {
    document.getElementById('alert-title').innerText = title;
    document.getElementById('alert-message').innerText = message;
    const iconEl = document.getElementById('alert-icon');
    if (isSuccess) {
        iconEl.className = "w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto text-2xl shadow-lg";
        iconEl.innerHTML = '<i class="fa-solid fa-check"></i>';
    } else {
        iconEl.className = "w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto text-2xl shadow-lg";
        iconEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
    }
    document.getElementById('custom-alert-modal').classList.remove('hidden');
}

function closeCustomAlert() {
    document.getElementById('custom-alert-modal').classList.add('hidden');
}

/**
 * Auth Modal Controllers
 */
function openAuthModal(mode) {
    authMode = mode;
    updateAuthModalUI();
    document.getElementById('auth-modal').classList.remove('hidden');
}

function closeAuthModal() {
    document.getElementById('auth-modal').classList.add('hidden');
}

function toggleAuthMode() {
    authMode = authMode === 'login' ? 'register' : 'login';
    updateAuthModalUI();
}

function updateAuthModalUI() {
    const title = document.getElementById('auth-modal-title');
    const subtitle = document.getElementById('auth-modal-subtitle');
    const btn = document.getElementById('auth-submit-btn');
    const switchText = document.getElementById('auth-switch-text');
    const switchBtn = document.getElementById('auth-switch-btn');

    if (authMode === 'login') {
        title.innerText = "სისტემაში შესვლა";
        subtitle.innerText = "შეიყვანე მონაცემები ანგარიშზე წვდომისთვის";
        btn.innerText = "შესვლა";
        switchText.innerText = "არ გაქვს ანგარიში?";
        switchBtn.innerText = "რეგისტრაცია";
    } else {
        title.innerText = "რეგისტრაცია";
        subtitle.innerText = "შექმენი ახალი ანგარიში მონაწილეობისთვის";
        btn.innerText = "რეგისტრაცია";
        switchText.innerText = "უკვე გაქვს ანგარიში?";
        switchBtn.innerText = "შესვლა";
    }
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    try {
        if (authMode === 'login') {
            await signInWithEmailAndPassword(auth, email, password);
            showAlert("წარმატება", "წარმატებით გაიარეთ ავტორიზაცია!");
        } else {
            await createUserWithEmailAndPassword(auth, email, password);
            showAlert("წარმატება", "ანგარიში წარმატებით შეიქმნა!");
        }
        closeAuthModal();
    } catch (err) {
        showAlert("შეცდომა", err.message, false);
    }
}

async function logoutUser() {
    try {
        await signOut(auth);
        await signInAnonymously(auth);
        showAlert("წარმატება", "გავედით სისტემიდან.");
    } catch (err) {
        console.error(err);
    }
}

/**
 * Tournament Creation and Management
 */
function openCreateModal() {
    if (!currentUser || currentUser.isAnonymous) {
        openAuthModal('login');
        showAlert("ყურადღება", "ტურნირის შესაქმნელად გთხოვთ გაიაროთ ავტორიზაცია.", false);
        return;
    }
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('t-datetime').min = now.toISOString().slice(0, 16);
    document.getElementById('create-modal').classList.remove('hidden');
}

function closeCreateModal() {
    document.getElementById('create-modal').classList.add('hidden');
}

/**
 * Sends a notification message to Telegram Bot when a tournament is created
 */
async function sendTelegramTournamentAlert(tournament) {
    const dObj = new Date(tournament.timestamp);
    const dateStr = dObj.toLocaleDateString('ka-GE', { month: 'long', day: 'numeric', year: 'numeric' });
    const timeStr = dObj.toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' });

    const messageText = 
`🚨 *ახალი ტურნირი SportHub Georgia-ზე!* 🚨\n\n` +
`🏆 *სათაური:* ${escapeMarkdown(tournament.title)}\n\n` +
`⚽ *სპორტი:* ${escapeMarkdown(tournament.sport)}\n\n` +
`📍 *ლოკაცია:* ${escapeMarkdown(tournament.location)}\n\n` +
`⏰ *დრო:* ${dateStr}, ${timeStr}\n\n` +
`👥 *მაქს. მონაწილეები:* ${tournament.maxParticipants}\n\n` +
`👤 *ორგანიზატორი:* ${escapeMarkdown(tournament.authorEmail.split('@')[0])}\n\n` +
``;

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: messageText,
                parse_mode: 'Markdown'
            })
        });
        const data = await response.json();
        if (!data.ok) {
            console.error("Telegram API Error:", data.description);
        }
    } catch (err) {
        console.error("Network error sending Telegram notification:", err);
    }
}

function escapeMarkdown(text) {
    if (!text) return '';
    return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

async function handleCreateTournament(e) {
    e.preventDefault();
    if (!currentUser || currentUser.isAnonymous) {
        showAlert("შეცდომა", "ავტორიზაცია სავალდებულოა!", false);
        return;
    }

    const title = document.getElementById('t-title').value;
    const sport = document.getElementById('t-sport').value;
    const maxParticipants = parseInt(document.getElementById('t-max').value);
    const location = document.getElementById('t-location').value;
    const datetimeStr = document.getElementById('t-datetime').value;

    const targetTimestamp = new Date(datetimeStr).getTime();
    if (targetTimestamp <= Date.now()) {
        showAlert("შეცდომა", "დრო უკვე გასულია. გთხოვთ აირჩიოთ მომავლის დრო.", false);
        return;
    }

    const newTournament = {
        title,
        sport,
        maxParticipants,
        location,
        datetime: datetimeStr,
        timestamp: targetTimestamp,
        authorId: currentUser.uid,
        authorEmail: currentUser.email || "ანონიმური",
        participants: [currentUser.uid],
        participantsEmails: [currentUser.email || "მომხმარებელი"],
        createdAt: Date.now()
    };

    try {
        const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'tournaments');
        await addDoc(colRef, newTournament);
        
        // Trigger Telegram Bot alert
        await sendTelegramTournamentAlert(newTournament);

        closeCreateModal();
        document.getElementById('create-form').reset();
        showAlert("წარმატება", "ტურნირი წარმატებით შეიქმნა!");
        fetchTournaments();
    } catch (err) {
        showAlert("შეცდომა", err.message, false);
    }
}

/**
 * Real-time Tournaments Fetching & Auto-Cleanup
 */
function fetchTournaments() {
    const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'tournaments');
    onSnapshot(colRef, (snapshot) => {
        const now = Date.now();
        tournamentsList = [];
        snapshot.forEach(async (docSnap) => {
            const data = docSnap.id ? { id: docSnap.id, ...docSnap.data() } : null;
            if (data) {
                if (data.timestamp && data.timestamp <= now) {
                    try {
                        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tournaments', data.id));
                    } catch (e) {
                        console.error("Cleanup error:", e);
                    }
                } else {
                    tournamentsList.push(data);
                }
            }
        });
        renderTournaments();
    }, (error) => {
        console.error("Firestore error:", error);
    });
}

function setSportFilter(sport) {
    currentSportFilter = sport;
    document.querySelectorAll('.sport-filter-btn').forEach(btn => {
        btn.className = "sport-filter-btn px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white transition whitespace-nowrap";
    });
    const activeBtn = document.getElementById(`filter-${sport}`);
    if (activeBtn) {
        activeBtn.className = "sport-filter-btn px-4 py-2.5 text-xs font-bold rounded-xl brand-gradient text-white transition whitespace-nowrap shadow-md shadow-red-500/20";
    }
    renderTournaments();
}

function filterTournaments() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        currentSearchQuery = searchInput.value.toLowerCase();
    }
    renderTournaments();
}

function renderTournaments() {
    const grid = document.getElementById('tournaments-grid');
    const emptyState = document.getElementById('empty-state');
    if (!grid || !emptyState) return;

    let filtered = tournamentsList.filter(t => {
        const matchSport = currentSportFilter === 'all' || t.sport === currentSportFilter;
        const matchSearch = t.title.toLowerCase().includes(currentSearchQuery) || t.location.toLowerCase().includes(currentSearchQuery);
        return matchSport && matchSearch;
    });

    filtered.sort((a, b) => a.timestamp - b.timestamp);

    if (filtered.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    let html = '';

    filtered.forEach(t => {
        const isAuthor = currentUser && currentUser.uid === t.authorId;
        const isJoined = currentUser && t.participants && t.participants.includes(currentUser.uid);
        const participantsCount = t.participants ? t.participants.length : 0;
        const isFull = participantsCount >= t.maxParticipants && !isJoined;

        let iconClass = "fa-futbol";
        if (t.sport === 'კალათბურთი') iconClass = "fa-basketball";
        if (t.sport === 'ჩოგბურთი') iconClass = "fa-baseball";
        if (t.sport === 'კრივი') iconClass = "fa-hand-fist";
        if (t.sport === 'MMA') iconClass = "fa-hand-fist";

        const dObj = new Date(t.timestamp);
        const dateStr = dObj.toLocaleDateString('ka-GE', { month: 'short', day: 'numeric' });
        const timeStr = dObj.toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' });

        html += `
            <div class="glass-panel rounded-3xl p-5 sm:p-6 border border-slate-800/80 shadow-2xl flex flex-col justify-between hover:border-red-500/40 transition duration-300 group">
                <div>
                    <div class="flex items-center justify-between mb-4">
                        <span class="px-3.5 py-1.5 rounded-xl bg-red-500/15 border border-red-500/20 text-red-400 font-bold text-xs flex items-center space-x-2">
                            <i class="fa-solid ${iconClass}"></i>
                            <span>${t.sport}</span>
                        </span>
                        ${isAuthor ? `
                            <button onclick="deleteTournament('${t.id}')" title="წაშლა" class="text-slate-500 hover:text-red-400 transition p-1.5 rounded-xl hover:bg-slate-900">
                                <i class="fa-solid fa-trash-can text-sm"></i>
                            </button>
                        ` : ''}
                    </div>
                    <h3 class="text-base sm:text-lg font-extrabold text-white mb-3 line-clamp-1 group-hover:text-red-400 transition">${escapeHtml(t.title)}</h3>
                    <div class="space-y-2.5 text-xs text-slate-300 mb-5">
                        <div class="flex items-center space-x-2.5">
                            <span class="w-6 h-6 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-red-400 text-xs">
                                <i class="fa-solid fa-location-dot"></i>
                            </span>
                            <span class="truncate">${escapeHtml(t.location)}</span>
                        </div>
                        <div class="flex items-center space-x-2.5">
                            <span class="w-6 h-6 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-red-400 text-xs">
                                <i class="fa-solid fa-clock"></i>
                            </span>
                            <span>${dateStr}, ${timeStr}</span>
                        </div>
                        <div class="flex items-center space-x-2.5">
                            <span class="w-6 h-6 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-red-400 text-xs">
                                <i class="fa-solid fa-users"></i>
                            </span>
                            <span>მონაწილეები: <strong class="text-white">${participantsCount}</strong> / ${t.maxParticipants}</span>
                        </div>
                    </div>
                    <div class="mb-5">
                        <p class="text-[11px] text-slate-400 mb-2 font-bold uppercase tracking-wider">მონაწილეები:</p>
                        <div class="flex flex-wrap gap-1.5">
                            ${t.participantsEmails ? t.participantsEmails.map(email => `<span class="px-2.5 py-1 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 font-medium truncate max-w-[130px]">${escapeHtml(email.split('@')[0])}</span>`).join('') : ''}
                        </div>
                    </div>
                </div>

                <div class="pt-4 border-t border-slate-800/80 flex items-center gap-2.5">
                    ${isJoined ? `
                        <button onclick="openChat('${t.id}', '${escapeHtml(t.title)}')" class="flex-grow py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition flex items-center justify-center space-x-2 shadow-lg shadow-cyan-600/25">
                            <i class="fa-solid fa-comments"></i>
                            <span>ჩათი</span>
                        </button>
                        <button onclick="leaveTournament('${t.id}')" class="px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold text-xs transition" title="გასვლა">
                            <i class="fa-solid fa-right-from-bracket"></i>
                        </button>
                    ` : (isFull ? `
                        <button disabled class="w-full py-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 font-bold text-xs cursor-not-allowed">ადგილები სავსეა</button>
                    ` : `
                        <button onclick="joinTournament('${t.id}')" class="w-full py-3 rounded-2xl brand-gradient hover:opacity-95 text-white font-bold text-xs transition shadow-lg shadow-red-500/25">გაერთიანება</button>
                    `)}
                </div>
            </div>
        `;
    });

    grid.innerHTML = html;
}

async function joinTournament(tournamentId) {
    if (!currentUser || currentUser.isAnonymous) {
        openAuthModal('login');
        showAlert("ყურადღება", "ტურნირში მონაწილეობისთვის გთხოვთ გაიაროთ ავტორიზაცია.", false);
        return;
    }

    const tRef = doc(db, 'artifacts', appId, 'public', 'data', 'tournaments', tournamentId);
    const snap = await getDoc(tRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const participants = data.participants || [];
    const emails = data.participantsEmails || [];

    if (participants.includes(currentUser.uid)) return;
    if (participants.length >= data.maxParticipants) {
        showAlert("შეცდომა", "სამწუხაროდ ყველა ადგილი დაკავებულია.", false);
        return;
    }

    participants.push(currentUser.uid);
    emails.push(currentUser.email || "მომხმარებელი");

    try {
        await updateDoc(tRef, { participants, participantsEmails: emails });
        showAlert("წარმატება", "თქვენ წარმატებით გაერთიანდით ტურნირში!");
        fetchTournaments();
    } catch (err) {
        showAlert("შეცდომა", err.message, false);
    }
}

async function leaveTournament(tournamentId) {
    if (!currentUser) return;
    const tRef = doc(db, 'artifacts', appId, 'public', 'data', 'tournaments', tournamentId);
    const snap = await getDoc(tRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const idx = data.participants ? data.participants.indexOf(currentUser.uid) : -1;
    if (idx === -1) return;

    data.participants.splice(idx, 1);
    if (data.participantsEmails && data.participantsEmails[idx]) {
        data.participantsEmails.splice(idx, 1);
    }

    try {
        await updateDoc(tRef, { participants: data.participants, participantsEmails: data.participantsEmails });
        showAlert("წარმატება", "თქვენ გამოედით ტურნირიდან.");
        fetchTournaments();
    } catch (err) {
        showAlert("შეცდომა", err.message, false);
    }
}

async function deleteTournament(tournamentId) {
    try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tournaments', tournamentId));
        showAlert("წარმატება", "ტურნირი წარმატებით წაიშალა.");
        fetchTournaments();
    } catch (err) {
        showAlert("შეცდომა", err.message, false);
    }
}

/**
 * Real-Time Chat System per Tournament
 */
function switchView(viewName) {
    const tournamentsView = document.getElementById('tournaments-view');
    const chatView = document.getElementById('chat-view');
    if (!tournamentsView || !chatView) return;

    if (viewName === 'chat') {
        tournamentsView.classList.add('hidden');
        chatView.classList.remove('hidden');
    } else {
        chatView.classList.add('hidden');
        tournamentsView.classList.remove('hidden');
        if (chatUnsubscribe) {
            chatUnsubscribe();
            chatUnsubscribe = null;
        }
        activeTournamentId = null;
    }
}

async function openChat(tournamentId, tournamentTitle) {
    if (!currentUser || currentUser.isAnonymous) {
        openAuthModal('login');
        showAlert("ყურადღება", "ჩათში მონაწილეობისთვის საჭიროა ავტორიზაცია.", false);
        return;
    }

    const tRef = doc(db, 'artifacts', appId, 'public', 'data', 'tournaments', tournamentId);
    const snap = await getDoc(tRef);
    if (!snap.exists()) return;
    const data = snap.data();

    if (!data.participants || !data.participants.includes(currentUser.uid)) {
        showAlert("შეზღუდვა", "ჩათში წვდომა აქვთ მხოლოდ გაწევრიანებულ მონაწილეებს.", false);
        return;
    }

    activeTournamentId = tournamentId;
    const titleEl = document.getElementById('active-chat-title');
    if (titleEl) titleEl.innerText = tournamentTitle;
    
    switchView('chat');
    loadChatMessages(tournamentId);
}

function loadChatMessages(tournamentId) {
    if (chatUnsubscribe) chatUnsubscribe();

    const messagesRef = collection(db, 'artifacts', appId, 'public', 'data', 'tournaments', tournamentId, 'messages');
    
    chatUnsubscribe = onSnapshot(messagesRef, (snapshot) => {
        let msgs = [];
        snapshot.forEach(docSnap => {
            msgs.push({ id: docSnap.id, ...docSnap.data() });
        });
        msgs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

        const container = document.getElementById('chat-messages-container');
        if (!container) return;

        if (msgs.length === 0) {
            container.innerHTML = `
                <div class="flex-grow flex items-center justify-center text-center text-slate-500 text-sm p-4">
                    <p>შეტყობინებები ჯერ არ არის. დაიწყეთ საუბარი დეტალების შესათანხმებლად!</p>
                </div>
            `;
            return;
        }

        let html = '';
        msgs.forEach(m => {
            const isMe = currentUser && m.senderId === currentUser.uid;
            const timeStr = m.createdAt ? new Date(m.createdAt).toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' }) : '';
            
            if (isMe) {
                html += `
                    <div class="flex flex-col items-end max-w-[85%] sm:max-w-[75%] ml-auto">
                        <span class="text-[10px] text-slate-400 mb-1 mr-1 font-semibold">${escapeHtml(m.senderEmail.split('@')[0])}</span>
                        <div class="brand-gradient text-white px-4 py-3 rounded-3xl rounded-tr-sm text-sm shadow-xl leading-relaxed">
                            ${escapeHtml(m.text)}
                        </div>
                        <span class="text-[9px] text-slate-500 mt-1">${timeStr}</span>
                    </div>
                `;
            } else {
                html += `
                    <div class="flex flex-col items-start max-w-[85%] sm:max-w-[75%] mr-auto">
                        <span class="text-[10px] text-slate-400 mb-1 ml-1 font-semibold">${escapeHtml(m.senderEmail.split('@')[0])}</span>
                        <div class="bg-slate-900 border border-slate-800 text-slate-200 px-4 py-3 rounded-3xl rounded-tl-sm text-sm shadow-xl leading-relaxed">
                            ${escapeHtml(m.text)}
                        </div>
                        <span class="text-[9px] text-slate-500 mt-1">${timeStr}</span>
                    </div>
                `;
            }
        });

        container.innerHTML = html;
        container.scrollTop = container.scrollHeight;
    }, (err) => {
        console.error("Chat sync error:", err);
    });
}

async function sendChatMessage(e) {
    e.preventDefault();
    if (!activeTournamentId || !currentUser) return;

    const input = document.getElementById('chat-input');
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    const messageData = {
        text,
        senderId: currentUser.uid,
        senderEmail: currentUser.email || "მომხმარებელი",
        createdAt: Date.now()
    };

    try {
        const messagesRef = collection(db, 'artifacts', appId, 'public', 'data', 'tournaments', activeTournamentId, 'messages');
        await addDoc(messagesRef, messageData);
        input.value = '';
    } catch (err) {
        showAlert("შეცდომა", err.message, false);
    }
}

/**
 * Utility HTML Escaper
 */
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
}