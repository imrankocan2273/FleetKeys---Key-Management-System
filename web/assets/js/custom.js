$(document).ready(function() {
  $("main#spapp > section").height($(document).height() - 60);

  // TODO(Deploy): Zamijeni backendBaseUrl kada deployamo backend na DigitalOcean.
  // Primjer: https://<tvoj-do-domen>/ (ili IP + port, ako bude tako)
  const backendBaseUrl = 'http://localhost:4000';
  const sessionKey = 'fk_web_session';

  function getSession() {
    try {
      const raw = localStorage.getItem(sessionKey);
      return raw ? JSON.parse(raw) : null;
    } catch (_e) {
      return null;
    }
  }

  function saveSession(payload) {
    localStorage.setItem(sessionKey, JSON.stringify(payload));
  }

  function clearSession() {
    localStorage.removeItem(sessionKey);
  }

  function normalizeBusinessType(value) {
    return String(value || '').trim().toLowerCase();
  }

  function routeForBusinessType(_businessType) {
    return 'homepage';
  }

  async function handleLogout(buttonEl) {
    const session = getSession();
    const token = session?.access_token;
    if (!token) {
      clearSession();
      window.location.hash = 'loginpage';
      return;
    }

    if (buttonEl) {
      buttonEl.disabled = true;
      buttonEl.textContent = 'Logging out...';
    }

    try {
      await fetch(`${backendBaseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: token })
      });
    } finally {
      clearSession();
      window.location.hash = 'loginpage';
      if (buttonEl) {
        buttonEl.disabled = false;
        buttonEl.textContent = 'Logout';
      }
    }
  }

  function attachSettingsNavigation(rootEl) {
    const buttons = rootEl?.querySelectorAll('.admin-nav-link[data-settings-target]');
    const panels = rootEl?.querySelectorAll('.settings-card');
    if (!buttons.length || !panels.length) return;

    const activatePanel = function(targetId) {
      panels.forEach(function(panelEl) {
        panelEl.classList.toggle('active', panelEl.id === targetId);
      });

      buttons.forEach(function(buttonEl) {
        buttonEl.classList.toggle('active', buttonEl.getAttribute('data-settings-target') === targetId);
      });
    };

    buttons.forEach(function(buttonEl) {
      buttonEl.addEventListener('click', function() {
        const targetId = buttonEl.getAttribute('data-settings-target');
        if (targetId) activatePanel(targetId);
      });
    });

    activatePanel('profile-panel');
  }

  function hydrateSettingsProfile(rootEl, session) {
    const profile = session?.profile || {};
    const user = session?.user || {};

    const setText = function(selector, value) {
      const element = rootEl?.querySelector(selector);
      if (element) element.textContent = value || '-';
    };

    const setValue = function(selector, value) {
      const element = rootEl?.querySelector(selector);
      if (element && 'value' in element) element.value = value || '';
    };

    setText('#settings-company-chip', profile.company_name || '-');
    setText('#settings-user-email', user.email || '-');
    setText('#settings-user-role', profile.role || '-');
    setText('#settings-company-name', profile.company_name || '-');
    setText('#settings-business-type', profile.business_type || '-');
    setText('#settings-session-status', session?.access_token ? 'Active' : 'Signed out');
    setValue('#profile-full-name', session?.profile?.full_name || '');
    setValue('#profile-position', session?.profile?.position || '');
  }

  function attachSidebarToggle(rootEl) {
    const shell = rootEl?.querySelector('.admin-shell');
    const toggleButton = rootEl?.querySelector('#sidebar-toggle-btn');
    if (!shell || !toggleButton) return;

    const applyState = function(isCollapsed) {
      shell.classList.toggle('sidebar-collapsed', isCollapsed);
      toggleButton.setAttribute('aria-expanded', String(!isCollapsed));
    };

    applyState(window.innerWidth <= 900);

    toggleButton.addEventListener('click', function() {
      const isCollapsed = shell.classList.contains('sidebar-collapsed');
      applyState(!isCollapsed);
    });
  }

  function attachAdminViewSwitching(rootEl, onViewOpen) {
    const viewButtons = rootEl?.querySelectorAll('.admin-nav-link[data-view-target]');
    const views = rootEl?.querySelectorAll('.admin-view');
    if (!viewButtons.length || !views.length) {
      return { activateView: function() {} };
    }

    const activateView = function(targetId) {
      views.forEach(function(viewEl) {
        const isActive = viewEl.id === targetId;
        viewEl.classList.toggle('active', isActive);
        viewEl.hidden = !isActive;
      });

      viewButtons.forEach(function(buttonEl) {
        const isActive = buttonEl.getAttribute('data-view-target') === targetId;
        buttonEl.classList.toggle('active', isActive);
      });
    };

    viewButtons.forEach(function(buttonEl) {
      buttonEl.addEventListener('click', function() {
        const targetId = buttonEl.getAttribute('data-view-target');
        if (!targetId) return;
        activateView(targetId);
        if (typeof onViewOpen === 'function') {
          onViewOpen(targetId);
        }
      });
    });

    return { activateView };
  }

  function attachEmployeeModal(rootEl) {
    const modal = rootEl?.querySelector('#create-employee-modal');
    const openBtn = rootEl?.querySelector('#open-create-employee-modal-btn');
    if (modal && modal.parentElement !== document.body) {
      document.body.appendChild(modal);
    }
    const closeBtn = modal?.querySelector('#close-create-employee-modal-btn');
    const backdrop = modal?.querySelector('#create-employee-modal-backdrop');
    if (!modal || !openBtn || !closeBtn || !backdrop) {
      return { closeModal: function() {} };
    }

    const openModal = function() {
      modal.hidden = false;
    };

    const closeModal = function() {
      modal.hidden = true;
    };

    openBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    backdrop.addEventListener('click', closeModal);

    return { closeModal };
  }

  function attachCreateUserHandler(rootEl, onCreated, onDone) {
    const session = getSession();
    const token = session?.access_token;

    const form =
      rootEl?.querySelector('#create-user-form') ||
      document.querySelector('#create-user-form');
    const message =
      rootEl?.querySelector('#create-user-message') ||
      document.querySelector('#create-user-message');
    const button =
      rootEl?.querySelector('#create-user-btn') ||
      document.querySelector('#create-user-btn');

    if (!form || !message || !button || !token) return;

    form.addEventListener('submit', async function(event) {
      event.preventDefault();

      const fullName =
        (rootEl?.querySelector('#new-full-name') ||
            document.querySelector('#new-full-name'))
          ?.value
          ?.trim() ?? '';
      const position =
        (rootEl?.querySelector('#new-position') ||
            document.querySelector('#new-position'))
          ?.value
          ?.trim() ?? '';
      const phone =
        (rootEl?.querySelector('#new-phone') ||
            document.querySelector('#new-phone'))
          ?.value
          ?.trim() ?? '';
      const username =
        (rootEl?.querySelector('#new-username') ||
            document.querySelector('#new-username'))
          ?.value
          ?.trim() ?? '';
      const password =
        (rootEl?.querySelector('#new-password') ||
            document.querySelector('#new-password'))
          ?.value ?? '';

      message.textContent = '';
      button.disabled = true;
      button.textContent = 'Creating...';

      try {
        const response = await fetch(`${backendBaseUrl}/api/admin/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            username,
            password,
            full_name: fullName || null,
            position: position || null,
            phone: phone || null,
          }),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.message || 'User creation failed');
        }

        message.textContent = `Employee added: ${payload.user?.email || username}`;
        form.reset();
        if (typeof onCreated === 'function') onCreated();
        if (typeof onDone === 'function') onDone();
      } catch (error) {
        message.textContent = error.message || 'User creation failed';
      } finally {
        button.disabled = false;
        button.textContent = 'Create Employee';
      }
    });
  }

  function attachDashboardData(rootEl) {
    const session = getSession();
    const token = session?.access_token;
    const takenRowsEl = rootEl?.querySelector('#dash-taken-rows');
    const eventsListEl = rootEl?.querySelector('#dash-events-list');
    if (!takenRowsEl || !eventsListEl || !token) {
      return { refreshDashboard: function() {} };
    }

    const kpiTakenEl = rootEl?.querySelector('#dash-kpi-taken');
    const kpiOverdueEl = rootEl?.querySelector('#dash-kpi-overdue');
    const kpiDueSoonEl = rootEl?.querySelector('#dash-kpi-due-soon');
    const kpiAvailableEl = rootEl?.querySelector('#dash-kpi-available');
    const updatedAtEl = rootEl?.querySelector('#dash-last-updated');

    const escapeHtml = function(value) {
      return String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    };

    const formatTime = function(value) {
      if (!value) return '-';
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return '-';
      return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const actorName = function(eventItem) {
      if (!eventItem) return 'Unknown user';
      if (eventItem.actor_name) {
        return `${eventItem.actor_name}${eventItem.actor_position ? ` (${eventItem.actor_position})` : ''}`;
      }
      return 'Unknown user';
    };

    const eventText = function(eventItem, keyItem) {
      const action = String(eventItem.action || '').toLowerCase();
      const verb = action === 'returned' ? 'returned' : 'checked out';
      const suffix = eventItem.message ? `: ${eventItem.message}` : '';
      return `Key ${keyItem?.key_code || eventItem.key_code || '-'} ${verb} by ${actorName(eventItem)}${suffix}`;
    };

    const renderDashboard = function(dashboard) {
      const summary = dashboard.summary || {};
      const takenKeys = dashboard.taken_keys || [];
      const recentEvents = dashboard.recent_events || [];

      if (kpiTakenEl) kpiTakenEl.textContent = String(summary.checked_out || 0);
      if (kpiOverdueEl) kpiOverdueEl.textContent = String(summary.maintenance || 0);
      if (kpiDueSoonEl) kpiDueSoonEl.textContent = String(summary.lost || 0);
      if (kpiAvailableEl) kpiAvailableEl.textContent = String(summary.available || 0);
      if (updatedAtEl) {
        updatedAtEl.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }

      if (!takenKeys.length) {
        takenRowsEl.innerHTML = '<tr><td colspan="6">No keys currently taken.</td></tr>';
      } else {
        takenRowsEl.innerHTML = takenKeys.map(function(item) {
          const takenBy = item.taken_by
            ? `${item.taken_by}${item.taken_by_position ? ` (${item.taken_by_position})` : ''}`
            : 'Unknown user';
          return `
            <tr>
              <td>${escapeHtml(item.key_code)}</td>
              <td>${escapeHtml(item.note || item.key_code)}</td>
              <td>${escapeHtml(takenBy)}</td>
              <td>${escapeHtml(formatTime(item.checkout_at))}</td>
              <td>${escapeHtml(formatTime(item.updated_at))}</td>
              <td><span class="key-status-pill is-ok">On Time</span></td>
            </tr>
          `;
        }).join('');
      }

      if (!recentEvents.length) {
        eventsListEl.innerHTML = '<li><span class="dashboard-event-text">No key events yet.</span></li>';
        return;
      }

      eventsListEl.innerHTML = recentEvents.map(function(eventItem) {
        return `
          <li>
            <span class="dashboard-event-meta">${escapeHtml(formatTime(eventItem.created_at))}</span>
            <span class="dashboard-event-text">${escapeHtml(eventText(eventItem))}</span>
          </li>
        `;
      }).join('');
    };

    const loadDashboard = async function() {
      takenRowsEl.innerHTML = '<tr><td colspan="6">Loading dashboard...</td></tr>';
      eventsListEl.innerHTML = '<li><span class="dashboard-event-text">Loading recent activity...</span></li>';

      try {
        const response = await fetch(`${backendBaseUrl}/api/keys/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.message || payload.details || 'Loading dashboard failed');
        }

        renderDashboard(payload);
      } catch (error) {
        takenRowsEl.innerHTML = '<tr><td colspan="6">Failed to load dashboard.</td></tr>';
        eventsListEl.innerHTML = `<li><span class="dashboard-event-text">${escapeHtml(error.message || 'Loading dashboard failed')}</span></li>`;
      }
    };

    return { refreshDashboard: loadDashboard };
  }

  function attachKeyModal(rootEl) {
    const modal = rootEl?.querySelector('#create-key-modal');
    const openBtn = rootEl?.querySelector('#open-create-key-modal-btn');
    if (modal && modal.parentElement !== document.body) {
      document.body.appendChild(modal);
    }
    const closeBtn = modal?.querySelector('#close-create-key-modal-btn');
    const backdrop = modal?.querySelector('#create-key-modal-backdrop');
    const generateBtn = modal?.querySelector('#generate-key-btn');

    if (!modal || !openBtn || !closeBtn || !backdrop) {
      return { closeModal: function() {} };
    }

    const openModal = function() {
      modal.hidden = false;
    };

    const closeModal = function() {
      modal.hidden = true;
    };

    openBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    backdrop.addEventListener('click', closeModal);

    generateBtn?.addEventListener('click', function(event) {
      event.preventDefault();
      event.stopPropagation();

      const keyCodeInput = modal.querySelector('#new-key-code');
      if (!(keyCodeInput instanceof HTMLInputElement)) return;

      const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
      keyCodeInput.value = `KEY-${randomPart}`;
      keyCodeInput.focus();
    });

    return { closeModal };
  }

  function buildKeyDeepLink(qrToken, meta) {
    const params = new URLSearchParams();
    params.set('qr_token', String(qrToken || '').trim());
    if (meta?.key_code) params.set('key_name', String(meta.key_code));
    if (meta?.status) params.set('status', String(meta.status));
    if (meta?.note) params.set('note', String(meta.note));
    return `fleetkeys://key-scan?${params.toString()}`;
  }

  function showKeyQrModal(keyCode, qrToken, deepLinkOverride) {
    const cleanToken = String(qrToken || '').trim();
    if (!cleanToken) {
      window.alert(`QR token for ${keyCode} is missing.`);
      return;
    }

    const deepLink = deepLinkOverride || buildKeyDeepLink(cleanToken);
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0, 0, 0, 0.45)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '4000';

    const card = document.createElement('div');
    card.style.background = '#fff';
    card.style.borderRadius = '12px';
    card.style.padding = '16px';
    card.style.width = 'min(420px, calc(100vw - 24px))';
    card.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.25)';

    const title = document.createElement('h3');
    title.textContent = `QR for ${keyCode}`;
    title.style.margin = '0 0 8px';

    const qrContainer = document.createElement('div');
    qrContainer.style.display = 'flex';
    qrContainer.style.justifyContent = 'center';
    qrContainer.style.padding = '8px 0 12px';

    const info = document.createElement('p');
    info.textContent = 'Scan this with phone camera to open app and choose action.';
    info.style.margin = '0 0 8px';
    info.style.color = '#5f6b7a';
    info.style.fontSize = '13px';

    const deepLinkText = document.createElement('code');
    deepLinkText.textContent = deepLink;
    deepLinkText.style.display = 'block';
    deepLinkText.style.fontSize = '12px';
    deepLinkText.style.background = '#f6f8fa';
    deepLinkText.style.padding = '8px';
    deepLinkText.style.borderRadius = '8px';
    deepLinkText.style.wordBreak = 'break-all';

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '8px';
    actions.style.marginTop = '12px';

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.textContent = 'Open Link';
    openBtn.style.flex = '1';
    openBtn.addEventListener('click', function() {
      window.location.href = deepLink;
    });

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = 'Close';
    closeBtn.style.flex = '1';
    closeBtn.addEventListener('click', function() {
      overlay.remove();
    });

    actions.appendChild(openBtn);
    actions.appendChild(closeBtn);

    card.appendChild(title);
    card.appendChild(info);
    card.appendChild(qrContainer);
    card.appendChild(deepLinkText);
    card.appendChild(actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(event) {
      if (event.target === overlay) overlay.remove();
    });

    const renderImageFallback = function() {
      const img = document.createElement('img');
      img.alt = 'QR code';
      img.width = 240;
      img.height = 240;
      img.referrerPolicy = 'no-referrer';
      const fallbackUrls = [
        `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(deepLink)}`,
        `https://chart.googleapis.com/chart?cht=qr&chs=240x240&chl=${encodeURIComponent(deepLink)}`,
      ];
      let idx = 0;
      img.src = fallbackUrls[idx];
      img.onerror = function() {
        idx += 1;
        if (idx < fallbackUrls.length) {
          img.src = fallbackUrls[idx];
          return;
        }
        qrContainer.textContent = 'QR image failed to load. Use Open Link.';
      };
      qrContainer.innerHTML = '';
      qrContainer.appendChild(img);
    };

    qrContainer.style.minHeight = '248px';

    if (window.QRCode && typeof window.QRCode.toCanvas === 'function') {
      const canvas = document.createElement('canvas');
      qrContainer.appendChild(canvas);
      window.QRCode.toCanvas(canvas, deepLink, {
        margin: 1,
        width: 240,
      }, function(error) {
        if (error) {
          renderImageFallback();
        }
      });
      return;
    }

    renderImageFallback();
  }

  function attachCreateKeyHandler(rootEl, onCreated, onDone) {
    const session = getSession();
    const token = session?.access_token;

    const form =
      rootEl?.querySelector('#create-key-form') ||
      document.querySelector('#create-key-form');
    const message =
      rootEl?.querySelector('#create-key-message') ||
      document.querySelector('#create-key-message');
    const button =
      rootEl?.querySelector('#create-key-btn') ||
      document.querySelector('#create-key-btn');
    const statusField =
      rootEl?.querySelector('#new-key-status') ||
      document.querySelector('#new-key-status');

    if (!form || !message || !button) return;

    form.addEventListener('submit', async function(event) {
      event.preventDefault();
      event.stopPropagation();

      const sessionNow = getSession();
      const tokenNow = sessionNow?.access_token;
      if (!tokenNow) {
        message.textContent = 'Session expired. Please login again.';
        return;
      }

      const keyCode =
        (rootEl?.querySelector('#new-key-code') ||
            document.querySelector('#new-key-code'))
          ?.value
          ?.trim() ?? '';
      const status =
        (rootEl?.querySelector('#new-key-status') ||
            document.querySelector('#new-key-status'))
          ?.value
          ?.trim() ?? 'available';
      const note =
        (rootEl?.querySelector('#new-key-note') ||
            document.querySelector('#new-key-note'))
          ?.value
          ?.trim() ?? '';

      message.textContent = '';
      button.disabled = true;
      button.textContent = 'Creating...';

      try {
        const response = await fetch(`${backendBaseUrl}/api/keys`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenNow}`,
          },
          body: JSON.stringify({
            key_code: keyCode,
            status,
            note: note || null,
          }),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.message || payload.details || 'Key creation failed');
        }

        message.textContent = `Key created: ${payload.key?.key_code || keyCode}`;
        if (payload.key?.qr_token) {
          const deepLink = buildKeyDeepLink(payload.key.qr_token, payload.key);
          showKeyQrModal(payload.key?.key_code || keyCode, payload.key.qr_token, deepLink);
        }
        form.reset();
        if (statusField) statusField.value = 'available';
        if (typeof onCreated === 'function') onCreated();
        if (typeof onDone === 'function') onDone();
      } catch (error) {
        message.textContent = error.message || 'Key creation failed';
      } finally {
        button.disabled = false;
        button.textContent = 'Create New Key';
      }
    });
  }

  function attachKeysManagement(rootEl, onChanged, onHistoryOpen) {
    const session = getSession();
    const token = session?.access_token;
    const tableBody = rootEl?.querySelector('#keys-table-body');
    const message = rootEl?.querySelector('#keys-message');
    if (!tableBody || !message || !token) {
      return { refreshKeys: function() {} };
    }

    const escapeHtml = function(value) {
      return String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    };

    const statusMeta = {
      available: { label: 'Available', className: 'state-available' },
      checked_out: { label: 'Checked Out', className: 'state-checked-out' },
      maintenance: { label: 'Maintenance', className: 'state-maintenance' },
      lost: { label: 'Lost', className: 'state-lost' },
    };
    const statusOrder = ['available', 'checked_out', 'maintenance', 'lost'];

    const openStatusPicker = function(currentStatus) {
      return new Promise(function(resolve) {
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.background = 'rgba(0, 0, 0, 0.35)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '3000';

        const card = document.createElement('div');
        card.style.background = '#fff';
        card.style.borderRadius = '12px';
        card.style.padding = '16px';
        card.style.width = 'min(420px, calc(100vw - 24px))';
        card.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.25)';

        const title = document.createElement('h3');
        title.textContent = 'Select new status';
        title.style.margin = '0 0 12px';
        title.style.fontSize = '18px';

        const grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = '1fr 1fr';
        grid.style.gap = '8px';

        const closeWith = function(value) {
          overlay.remove();
          resolve(value);
        };

        statusOrder.forEach(function(statusCode) {
          const meta = statusMeta[statusCode];
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.textContent = meta.label;
          btn.style.border = '1px solid #d0d7de';
          btn.style.borderRadius = '10px';
          btn.style.padding = '10px 12px';
          btn.style.cursor = 'pointer';
          btn.style.fontWeight = '600';
          btn.style.background = statusCode === currentStatus ? '#eaf3f9' : '#fff';
          btn.addEventListener('click', function() {
            closeWith(statusCode);
          });
          grid.appendChild(btn);
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.marginTop = '10px';
        cancelBtn.style.border = 'none';
        cancelBtn.style.background = 'transparent';
        cancelBtn.style.color = '#5f6b7a';
        cancelBtn.style.cursor = 'pointer';
        cancelBtn.style.fontWeight = '600';
        cancelBtn.addEventListener('click', function() {
          closeWith(null);
        });

        overlay.addEventListener('click', function(event) {
          if (event.target === overlay) closeWith(null);
        });

        card.appendChild(title);
        card.appendChild(grid);
        card.appendChild(cancelBtn);
        overlay.appendChild(card);
        document.body.appendChild(overlay);
      });
    };

    const iconByAction = {
      status: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 4 6v6c0 5.2 3.4 9.9 8 11 4.6-1.1 8-5.8 8-11V6l-8-4zm-1 14-4-4 1.4-1.4L11 13.2l4.6-4.6L17 10l-6 6z"/></svg>',
      edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10-10-4-4L4 16v4zm13.7-11.3 1.6-1.6a1 1 0 0 0 0-1.4l-1.3-1.3a1 1 0 0 0-1.4 0L15 6l2.7 2.7z"/></svg>',
      note: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14a1 1 0 0 1 1 1v10l-5 5H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm8 13h2.2L18 14.2V12h-5v5zM7 8h10v2H7V8zm0 4h4v2H7v-2z"/></svg>',
      history: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 3a9 9 0 1 0 8.9 10h-2A7 7 0 1 1 13 5v3l4-4-4-4v3zM12 8h2v5h-5v-2h3V8z"/></svg>',
      qr: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm8 0h2v2h-2v-2zm2 2h2v2h-2v-2zm-2 2h2v2h-2v-2zm4 0h4v2h-4v-2zm2-4h2v2h-2v-2z"/></svg>',
      delete: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2zm-2 6h2v9H7V9zm4 0h2v9h-2V9zm4 0h2v9h-2V9z"/></svg>',
    };

    const keyById = new Map();

    const renderKeys = function(keys) {
      keyById.clear();

      if (!keys.length) {
        tableBody.innerHTML = '<tr><td colspan="3">No keys in list.</td></tr>';
        return;
      }

      tableBody.innerHTML = keys.map(function(keyItem) {
        keyById.set(keyItem.id, keyItem);
        const status = statusMeta[keyItem.status] || statusMeta.available;
        return `
          <tr data-key-id="${escapeHtml(keyItem.id)}">
            <td>${escapeHtml(keyItem.key_code)}</td>
            <td><span class="key-state-pill ${status.className}">${status.label}</span></td>
            <td>
              <div class="key-actions">
                <button type="button" class="key-icon-btn action-status" data-key-action="status" title="Change status" aria-label="Change key status">${iconByAction.status}</button>
                <button type="button" class="key-icon-btn action-edit" data-key-action="edit" title="Edit" aria-label="Edit key">${iconByAction.edit}</button>
                <button type="button" class="key-icon-btn action-note" data-key-action="note" title="Add note" aria-label="Add note">${iconByAction.note}</button>
                <button type="button" class="key-icon-btn action-history" data-key-action="history" title="History" aria-label="View history">${iconByAction.history}</button>
                <button type="button" class="key-icon-btn action-qr" data-key-action="qr" title="QR code" aria-label="Show QR code">${iconByAction.qr}</button>
                <button type="button" class="key-icon-btn action-delete" data-key-action="delete" title="Delete key" aria-label="Delete key">${iconByAction.delete}</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    };

    const loadKeys = async function() {
      message.textContent = '';
      try {
        const response = await fetch(`${backendBaseUrl}/api/keys`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await response.json();

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Keys API route not found. Restart backend to load latest routes.');
          }
          throw new Error(payload.message || payload.details || 'Loading keys failed');
        }

        renderKeys(payload.keys || []);
      } catch (error) {
        tableBody.innerHTML = '<tr><td colspan="3">Failed to load keys.</td></tr>';
        message.textContent = error.message || 'Loading keys failed';
      }
    };

    tableBody.addEventListener('click', async function(event) {
      const clicked = event.target;
      if (!(clicked instanceof Element)) return;

      const actionButton = clicked.closest('button[data-key-action]');
      if (!actionButton) return;
      if (actionButton.disabled) return;
      actionButton.disabled = true;

      const row = actionButton.closest('tr[data-key-id]');
      const keyId = row?.getAttribute('data-key-id');
      if (!keyId) {
        actionButton.disabled = false;
        return;
      }

      const keyItem = keyById.get(keyId);
      if (!keyItem) {
        actionButton.disabled = false;
        return;
      }

      const action = actionButton.getAttribute('data-key-action');
      try {
        if (action === 'status') {
          const nextStatus = await openStatusPicker(keyItem.status);
          if (nextStatus === null) return;

          const normalizedStatus = String(nextStatus).trim().toLowerCase();
          if (!statusMeta[normalizedStatus]) {
            message.textContent = 'Invalid status. Use: available, checked_out, maintenance, lost.';
            return;
          }

          try {
            const response = await fetch(`${backendBaseUrl}/api/keys/${keyId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ status: normalizedStatus }),
            });

            const payload = await response.json();
            if (!response.ok) {
              throw new Error(payload.message || payload.details || 'Change status failed');
            }

            message.textContent = `Status updated for ${payload.key?.key_code || keyItem.key_code}.`;
            await loadKeys();
            if (typeof onChanged === 'function') onChanged();
          } catch (error) {
            message.textContent = error.message || 'Change status failed';
          }
        }

        if (action === 'edit') {
        const nextName = window.prompt('Edit key name:', keyItem.key_code);
        if (nextName === null) return;

        const nextStatus = window.prompt(
          'Edit key status (available, checked_out, maintenance, lost):',
          keyItem.status
        );
        if (nextStatus === null) return;

        const normalizedStatus = String(nextStatus).trim().toLowerCase();
        if (!statusMeta[normalizedStatus]) {
          message.textContent = 'Invalid status. Use: available, checked_out, maintenance, lost.';
          return;
        }

        const nextNote = window.prompt('Edit note:', keyItem.note || '');
        if (nextNote === null) return;

        try {
          const response = await fetch(`${backendBaseUrl}/api/keys/${keyId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              key_code: String(nextName).trim(),
              status: normalizedStatus,
              note: String(nextNote).trim(),
            }),
          });

          const payload = await response.json();
          if (!response.ok) {
            throw new Error(payload.message || payload.details || 'Update key failed');
          }

          message.textContent = `Updated ${payload.key?.key_code || nextName}.`;
          await loadKeys();
          if (typeof onChanged === 'function') onChanged();
        } catch (error) {
          message.textContent = error.message || 'Update key failed';
        }
      }

        if (action === 'note') {
        const note = window.prompt('Add note for this key:');
        if (note === null) return;
        const cleanNote = String(note).trim();
        if (!cleanNote) {
          message.textContent = 'Note was empty.';
          return;
        }

        try {
          const response = await fetch(`${backendBaseUrl}/api/keys/${keyId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ note: cleanNote }),
          });

          const payload = await response.json();
          if (!response.ok) {
            throw new Error(payload.message || payload.details || 'Add note failed');
          }

          message.textContent = `Note saved for ${payload.key?.key_code || keyItem.key_code}.`;
          await loadKeys();
          if (typeof onChanged === 'function') onChanged();
        } catch (error) {
          message.textContent = error.message || 'Add note failed';
        }
      }

        if (action === 'history') {
          if (typeof onHistoryOpen === 'function') {
            onHistoryOpen(keyItem);
          }
        }

        if (action === 'qr') {
          const deepLink = buildKeyDeepLink(keyItem.qr_token || '', keyItem);
          showKeyQrModal(keyItem.key_code, keyItem.qr_token || '', deepLink);
        }

        if (action === 'delete') {
          const confirmed = window.confirm(`Delete key "${keyItem.key_code}"?`);
          if (!confirmed) return;

          try {
            const response = await fetch(`${backendBaseUrl}/api/keys/${keyId}`, {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            const payload = await response.json();
            if (!response.ok) {
              throw new Error(payload.message || payload.details || 'Delete key failed');
            }

            message.textContent = `Deleted ${keyItem.key_code}.`;
            await loadKeys();
            if (typeof onChanged === 'function') onChanged();
          } catch (error) {
            message.textContent = error.message || 'Delete key failed';
          }
        }
      } finally {
        actionButton.disabled = false;
      }
    });

    return {
      refreshKeys: function() {
        loadKeys();
      },
    };
  }

  function attachKeyHistoryManagement(rootEl) {
    const session = getSession();
    const token = session?.access_token;
    const keySelect = rootEl?.querySelector('#history-key-select');
    const actionFilter = rootEl?.querySelector('#history-action-filter');
    const refreshButton = rootEl?.querySelector('#history-refresh-btn');
    const timeline = rootEl?.querySelector('#history-timeline');
    const message = rootEl?.querySelector('#history-message');

    if (!token || !keySelect || !actionFilter || !refreshButton || !timeline || !message) {
      return {
        refreshHistoryKeys: function() {},
        openKeyHistory: function() {},
      };
    }

    const escapeHtml = function(value) {
      return String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    };

    const formatDateTime = function(value) {
      if (!value) return '-';
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return '-';
      return parsed.toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const actorName = function(eventItem) {
      if (eventItem.actor_name) {
        return `${eventItem.actor_name}${eventItem.actor_position ? ` (${eventItem.actor_position})` : ''}`;
      }
      return 'Unknown user';
    };

    const actionLabel = function(action) {
      const normalized = String(action || '').toLowerCase();
      if (normalized === 'taken') return 'Taken';
      if (normalized === 'returned') return 'Returned';
      return normalized || 'Event';
    };

    const renderKeys = function(keys, selectedKeyId) {
      if (!keys.length) {
        keySelect.innerHTML = '<option value="">No keys available</option>';
        return;
      }

      keySelect.innerHTML = keys.map(function(keyItem) {
        const selected = keyItem.id === selectedKeyId ? ' selected' : '';
        return `<option value="${escapeHtml(keyItem.id)}"${selected}>${escapeHtml(keyItem.key_code)}</option>`;
      }).join('');
    };

    const renderEvents = function(events) {
      const selectedAction = actionFilter.value;
      const filteredEvents = selectedAction === 'all'
        ? events
        : events.filter(function(eventItem) {
            return String(eventItem.action || '').toLowerCase() === selectedAction;
          });

      if (!filteredEvents.length) {
        timeline.innerHTML = '<li class="history-empty">No events match this filter.</li>';
        return;
      }

      timeline.innerHTML = filteredEvents.map(function(eventItem) {
        const normalizedAction = String(eventItem.action || '').toLowerCase();
        const note = eventItem.message
          ? `<p class="history-event-note">${escapeHtml(eventItem.message)}</p>`
          : '';
        return `
          <li class="history-event history-event-${escapeHtml(normalizedAction || 'default')}">
            <div class="history-event-marker"></div>
            <div class="history-event-body">
              <div class="history-event-head">
                <span class="history-event-action">${escapeHtml(actionLabel(eventItem.action))}</span>
                <time>${escapeHtml(formatDateTime(eventItem.created_at))}</time>
              </div>
              <p class="history-event-actor">${escapeHtml(actorName(eventItem))}</p>
              ${note}
            </div>
          </li>
        `;
      }).join('');
    };

    let currentEvents = [];

    const loadEventsForSelectedKey = async function() {
      const keyId = keySelect.value;
      currentEvents = [];
      message.textContent = '';

      if (!keyId) {
        timeline.innerHTML = '<li class="history-empty">Select a key to view history.</li>';
        return;
      }

      timeline.innerHTML = '<li class="history-empty">Loading history...</li>';

      try {
        const response = await fetch(`${backendBaseUrl}/api/keys/${keyId}/events?limit=100`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.message || payload.details || 'History load failed');
        }

        currentEvents = payload.events || [];
        renderEvents(currentEvents);
      } catch (error) {
        timeline.innerHTML = '<li class="history-empty">Failed to load history.</li>';
        message.textContent = error.message || 'History load failed';
      }
    };

    const refreshHistoryKeys = async function(selectedKeyId) {
      message.textContent = '';
      try {
        const response = await fetch(`${backendBaseUrl}/api/keys`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.message || payload.details || 'Loading keys failed');
        }

        const keys = payload.keys || [];
        renderKeys(keys, selectedKeyId || keySelect.value);
        await loadEventsForSelectedKey();
      } catch (error) {
        keySelect.innerHTML = '<option value="">Failed to load keys</option>';
        timeline.innerHTML = '<li class="history-empty">Failed to load history.</li>';
        message.textContent = error.message || 'Loading keys failed';
      }
    };

    keySelect.addEventListener('change', loadEventsForSelectedKey);
    actionFilter.addEventListener('change', function() {
      renderEvents(currentEvents);
    });
    refreshButton.addEventListener('click', function() {
      refreshHistoryKeys(keySelect.value);
    });

    return {
      refreshHistoryKeys,
      openKeyHistory: async function(keyItem) {
        await refreshHistoryKeys(keyItem?.id);
      },
    };
  }

  function attachEmployeesManagement(rootEl) {
    const session = getSession();
    const token = session?.access_token;
    const tableBody = rootEl?.querySelector('#employees-table-body');
    const message = rootEl?.querySelector('#employees-message');
    if (!token || !tableBody || !message) {
      return { refreshEmployees: function() {} };
    }

    const escapeHtml = function(value) {
      return String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    };

    const renderRows = function(users) {
      if (!users.length) {
        tableBody.innerHTML = '<tr><td colspan="4">No employees yet.</td></tr>';
        return;
      }

      tableBody.innerHTML = users.map(function(user) {
        const displayName = escapeHtml(user.full_name || 'Unnamed employee');
        const displayPosition = escapeHtml(user.position || '-');
        const displayPhone = escapeHtml(user.phone || '-');
        return `
          <tr data-company-user-id="${user.id}">
            <td data-col="name">${displayName}</td>
            <td data-col="position">${displayPosition}</td>
            <td data-col="phone">${displayPhone}</td>
            <td>
              <div class="employee-actions">
                <button type="button" class="employee-action-btn edit">Edit</button>
                <button type="button" class="employee-action-btn delete">Delete</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    };

    const loadEmployees = async function() {
      message.textContent = '';
      try {
        const response = await fetch(`${backendBaseUrl}/api/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await response.json();
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Employees API route not found. Restart backend to load latest routes.');
          }
          throw new Error(payload.message || 'Loading employees failed');
        }
        renderRows(payload.users || []);
      } catch (error) {
        tableBody.innerHTML = '<tr><td colspan="3">Failed to load employees.</td></tr>';
        message.textContent = error.message || 'Loading employees failed';
      }
    };

    tableBody.addEventListener('click', async function(event) {
      const clicked = event.target;
      if (!(clicked instanceof HTMLElement)) return;

      const row = clicked.closest('tr[data-company-user-id]');
      const companyUserId = row?.getAttribute('data-company-user-id');
      if (!companyUserId) return;

      if (clicked.classList.contains('edit')) {
        const currentName = row?.querySelector('td[data-col=\"name\"]')?.textContent?.trim() || '';
        const currentPositionRaw = row?.querySelector('td[data-col=\"position\"]')?.textContent?.trim() || '';
        const currentPosition = currentPositionRaw === '-' ? '' : currentPositionRaw;
        const currentPhoneRaw = row?.querySelector('td[data-col=\"phone\"]')?.textContent?.trim() || '';
        const currentPhone = currentPhoneRaw === '-' ? '' : currentPhoneRaw;
        const nextName = window.prompt('Edit employee name:', currentName);
        if (nextName === null) return;
        const nextPosition = window.prompt('Edit employee position:', currentPosition);
        if (nextPosition === null) return;
        const nextPhone = window.prompt('Edit employee phone:', currentPhone);
        if (nextPhone === null) return;

        try {
          const response = await fetch(`${backendBaseUrl}/api/admin/users/${companyUserId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              full_name: nextName.trim(),
              position: nextPosition.trim(),
              phone: nextPhone.trim(),
            }),
          });
          const payload = await response.json();
          if (!response.ok) {
            throw new Error(payload.message || 'Update failed');
          }
          message.textContent = 'Employee updated.';
          await loadEmployees();
        } catch (error) {
          message.textContent = error.message || 'Update failed';
        }
      }

      if (clicked.classList.contains('delete')) {
        const confirmed = window.confirm('Delete this employee?');
        if (!confirmed) return;

        try {
          const response = await fetch(`${backendBaseUrl}/api/admin/users/${companyUserId}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const payload = await response.json();
          if (!response.ok) {
            throw new Error(payload.message || 'Delete failed');
          }
          message.textContent = 'Employee deleted.';
          await loadEmployees();
        } catch (error) {
          message.textContent = error.message || 'Delete failed';
        }
      }
    });

    return { refreshEmployees: loadEmployees };
  }

  function setupHomepage(rootEl) {
    const session = getSession();
    if (!session || session?.profile?.role !== 'admin') {
      window.location.hash = 'loginpage';
      return;
    }

    const dashboardData = attachDashboardData(rootEl);
    const employeesManagement = attachEmployeesManagement(rootEl);
    const keyHistoryManagement = attachKeyHistoryManagement(rootEl);
    const modalController = attachEmployeeModal(rootEl);
    const keyModalController = attachKeyModal(rootEl);
    let adminViews = { activateView: function() {} };
    const keysManagement = attachKeysManagement(rootEl, dashboardData.refreshDashboard, function(keyItem) {
      adminViews.activateView('key-history-view');
      keyHistoryManagement.openKeyHistory(keyItem);
    });
    attachCreateUserHandler(rootEl, employeesManagement.refreshEmployees, modalController.closeModal);
    attachCreateKeyHandler(rootEl, function() {
      keysManagement.refreshKeys();
      dashboardData.refreshDashboard();
      keyHistoryManagement.refreshHistoryKeys();
    }, keyModalController.closeModal);
    attachSidebarToggle(rootEl);
    adminViews = attachAdminViewSwitching(rootEl, function(targetId) {
      if (targetId === 'dashboard-view') dashboardData.refreshDashboard();
      if (targetId === 'employees-view') employeesManagement.refreshEmployees();
      if (targetId === 'keys-view') keysManagement.refreshKeys();
      if (targetId === 'key-history-view') keyHistoryManagement.refreshHistoryKeys();
    });
    dashboardData.refreshDashboard();
    keysManagement.refreshKeys();

    const logoutButton = rootEl?.querySelector('#logout-btn');
    logoutButton?.addEventListener('click', function() {
      handleLogout(logoutButton);
    });
  }

  function setupSettingsPage(rootEl) {
    const session = getSession();
    if (!session || session?.profile?.role !== 'admin') {
      window.location.hash = 'loginpage';
      return;
    }

    attachSidebarToggle(rootEl);
    attachSettingsNavigation(rootEl);
    hydrateSettingsProfile(rootEl, session);

    const logoutButton = rootEl?.querySelector('#settings-logout-btn');
    logoutButton?.addEventListener('click', function() {
      handleLogout(logoutButton);
    });

    const form = rootEl?.querySelector('#change-password-form');
    const profileForm = rootEl?.querySelector('#profile-form');
    const profileMessage = rootEl?.querySelector('#profile-message');
    const saveProfileBtn = rootEl?.querySelector('#save-profile-btn');
    const profileFullNameEl = rootEl?.querySelector('#profile-full-name');
    const profilePositionEl = rootEl?.querySelector('#profile-position');
    const currentPasswordEl = rootEl?.querySelector('#current-password');
    const newPasswordEl = rootEl?.querySelector('#new-password-settings');
    const confirmPasswordEl = rootEl?.querySelector('#confirm-password');
    const messageEl = rootEl?.querySelector('#change-password-message');
    const buttonEl = rootEl?.querySelector('#change-password-btn');

    if (!form || !profileForm || !profileMessage || !saveProfileBtn || !profileFullNameEl || !profilePositionEl || !currentPasswordEl || !newPasswordEl || !confirmPasswordEl || !messageEl || !buttonEl) return;

    profileForm.addEventListener('submit', async function(event) {
      event.preventDefault();

      const fullName = profileFullNameEl.value.trim();
      const position = profilePositionEl.value.trim();

      profileMessage.textContent = '';
      saveProfileBtn.disabled = true;
      saveProfileBtn.textContent = 'Saving...';

      try {
        const response = await fetch(`${backendBaseUrl}/api/auth/profile`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            full_name: fullName,
            position,
          }),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.message || payload.details || 'Profile update failed');
        }

        const nextSession = {
          ...session,
          profile: {
            ...session.profile,
            full_name: payload.profile?.full_name || fullName || null,
            position: payload.profile?.position || position || null,
          },
        };
        saveSession(nextSession);
        hydrateSettingsProfile(rootEl, nextSession);
        profileMessage.textContent = 'Profile updated successfully.';
      } catch (error) {
        profileMessage.textContent = error.message || 'Profile update failed';
      } finally {
        saveProfileBtn.disabled = false;
        saveProfileBtn.textContent = 'Save profile';
      }
    });

    form.addEventListener('submit', async function(event) {
      event.preventDefault();

      const currentPassword = currentPasswordEl.value;
      const newPassword = newPasswordEl.value;
      const confirmPassword = confirmPasswordEl.value;

      if (newPassword !== confirmPassword) {
        messageEl.textContent = 'New password and confirmation do not match.';
        return;
      }

      if (newPassword.length < 8) {
        messageEl.textContent = 'New password must be at least 8 characters long.';
        return;
      }

      messageEl.textContent = '';
      buttonEl.disabled = true;
      buttonEl.textContent = 'Updating...';

      try {
        const response = await fetch(`${backendBaseUrl}/api/auth/change-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
          }),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.message || payload.details || 'Password update failed');
        }

        clearSession();
        messageEl.textContent = 'Password updated. Please log in again.';
        setTimeout(function() {
          window.location.hash = 'loginpage';
        }, 900);
      } catch (error) {
        messageEl.textContent = error.message || 'Password update failed';
      } finally {
        buttonEl.disabled = false;
        buttonEl.textContent = 'Update password';
      }
    });
  }

  const app = $.spapp({
    defaultView: 'loginpage',
    templateDir: './pages/',
    pageNotFound: 'error_404'
  });

  app.route({
    view: 'loginpage',
    load: 'loginpage.html',
    onReady: function() {
      const existing = getSession();
      if (existing?.profile?.role === 'admin') {
        window.location.hash = 'homepage';
        return;
      }

      const form = document.getElementById('login-form');
      const message = document.getElementById('login-message');
      const loginButton = document.getElementById('login-btn');

      if (!form || !message || !loginButton) return;

      form.addEventListener('submit', async function(event) {
        event.preventDefault();

        const username = document.getElementById('username')?.value?.trim();
        const password = document.getElementById('password')?.value ?? '';

        message.textContent = '';
        loginButton.disabled = true;
        loginButton.textContent = 'Logging in...';

        try {
          const response = await fetch(`${backendBaseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username,
              password,
              client_type: 'web_admin'
            })
          });

          const payload = await response.json();

          if (!response.ok) {
            throw new Error(payload.message || 'Login failed');
          }

          saveSession({
            access_token: payload.access_token,
            refresh_token: payload.refresh_token,
            user: payload.user,
            profile: payload.profile,
            client_type: 'web_admin'
          });

          const targetRoute = routeForBusinessType(payload.profile?.business_type);
          if (targetRoute === 'loginpage') {
            message.textContent = 'Login succeeded, but company business_type is missing/invalid.';
            return;
          }

          window.location.hash = targetRoute;
        } catch (error) {
          message.textContent = error.message || 'Login failed';
        } finally {
          loginButton.disabled = false;
          loginButton.textContent = 'Login';
        }
      });
    }
  });

  app.route({
    view: 'homepage',
    load: 'rent-a-car-admin.html',
    onReady: function() {
      const rootEl = document.getElementById('homepage');
      setupHomepage(rootEl);
    }
  });

  app.route({
    view: 'settings',
    load: 'settings.html',
    onReady: function() {
      const rootEl = document.getElementById('settings');
      setupSettingsPage(rootEl);
    }
  });

  app.run();
});
