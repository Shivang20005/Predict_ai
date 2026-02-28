// --- Multilingual Support (i18n) ---
const translations = {};
let currentLang = localStorage.getItem('lang') || 'en';

async function loadTranslations(lang) {
    try {
        const response = await fetch(`/locales/${lang}.json`);
        translations[lang] = await response.json();
        applyTranslations();
    } catch (err) {
        console.error('Failed to load translations', err);
    }
}

function applyTranslations() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang] && translations[currentLang][key]) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translations[currentLang][key];
            } else {
                el.innerHTML = translations[currentLang][key];
            }
        }
    });

    const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
    placeholderElements.forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[currentLang] && translations[currentLang][key]) {
            el.placeholder = translations[currentLang][key];
        }
    });

    // Sync language selectors
    const langSelects = document.querySelectorAll('.lang-select');
    langSelects.forEach(select => {
        select.value = currentLang;
    });
}

function switchLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    loadTranslations(lang);
}

// Global helper to refresh translations for dynamic content
window.refreshTranslations = applyTranslations;

// Initial load
loadTranslations(currentLang);

// Notifications Loader
async function loadNotifications() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch('/api/notifications', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            const notifications = data.notifications;
            const unreadCount = notifications.filter(n => !n.is_read).length;

            const badge = document.getElementById('notif-count') || document.getElementById('notificationBadge');
            if (badge) {
                badge.innerText = unreadCount;
                badge.style.display = unreadCount > 0 ? 'block' : 'none';
            }

            // Store notifications globally for the bell click
            window.currentNotifications = notifications;
        }
    } catch (err) { console.log('Notif error', err); }
}

function toggleNotifications() {
    const listId = 'notificationListDropdown';
    let list = document.getElementById(listId);

    if (list) {
        list.remove();
        return;
    }

    list = document.createElement('div');
    list.id = listId;
    list.style = `
        position: absolute;
        top: 60px;
        right: 0;
        width: 300px;
        max-height: 400px;
        background: #1e293b;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        z-index: 3000;
        overflow-y: auto;
        padding: 1rem;
    `;

    const notifs = window.currentNotifications || [];
    if (notifs.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #94a3b8;">No notifications</p>';
    } else {
        list.innerHTML = notifs.map(n => `
            <div style="padding: 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer; ${n.is_read ? 'opacity: 0.6;' : 'border-left: 3px solid #06d6a0;'}" onclick="markAsRead(${n.notification_id})">
                <p style="margin: 0; font-size: 0.9rem;">${n.message}</p>
                <small style="color: #94a3b8;">${new Date(n.created_at).toLocaleString()}</small>
            </div>
        `).join('');
    }

    const bell = document.getElementById('notifications-bell') || document.querySelector('.notification-btn');
    if (bell) {
        bell.style.position = 'relative';
        bell.appendChild(list);
    }
}

async function markAsRead(id) {
    try {
        await fetch(`/api/notifications/${id}/read`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        loadNotifications();
        const list = document.getElementById('notificationListDropdown');
        if (list) list.remove();
    } catch (err) { console.error(err); }
}

// Global click handler to close notification dropdown
document.addEventListener('click', (e) => {
    const list = document.getElementById('notificationListDropdown');
    const bell = document.getElementById('notifications-bell') || document.querySelector('.notification-btn');
    if (list && !list.contains(e.target) && !bell.contains(e.target)) {
        list.remove();
    }
});
