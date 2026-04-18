$(document).ready(function() {
  $("main#spapp > section").height($(document).height() - 60);

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

  function routeForBusinessType(businessType) {
    const normalized = normalizeBusinessType(businessType);
    if (normalized === 'rent-a-car') return 'rent-a-car-admin';
    if (normalized === 'hotel/motel' || normalized === 'hotel-motel') {
      return 'hotel-motel-admin';
    }
    return 'loginpage';
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

  function attachCreateUserHandler() {
    const session = getSession();
    const token = session?.access_token;

    const form = document.getElementById('create-user-form');
    const message = document.getElementById('create-user-message');
    const button = document.getElementById('create-user-btn');

    if (!form || !message || !button || !token) return;

    form.addEventListener('submit', async function(event) {
      event.preventDefault();

      const fullName = document.getElementById('new-full-name')?.value?.trim() ?? '';
      const username = document.getElementById('new-username')?.value?.trim() ?? '';
      const password = document.getElementById('new-password')?.value ?? '';

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
          }),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.message || 'User creation failed');
        }

        message.textContent = `User created: ${payload.user?.email || username}`;
        form.reset();
      } catch (error) {
        message.textContent = error.message || 'User creation failed';
      } finally {
        button.disabled = false;
        button.textContent = 'Create User';
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
      if (existing?.profile?.business_type && existing?.profile?.role === 'admin') {
        window.location.hash = routeForBusinessType(existing.profile.business_type);
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
    view: 'rent-a-car-admin',
    load: 'rent-a-car-admin.html',
    onReady: function() {
      const session = getSession();
      const businessType = normalizeBusinessType(session?.profile?.business_type);
      if (!session || businessType !== 'rent-a-car') {
        window.location.hash = 'loginpage';
        return;
      }

      attachCreateUserHandler();

      const logoutButton = document.getElementById('logout-btn');
      logoutButton?.addEventListener('click', function() {
        handleLogout(logoutButton);
      });
    }
  });

  app.route({
    view: 'hotel-motel-admin',
    load: 'hotel-motel-admin.html',
    onReady: function() {
      const session = getSession();
      const businessType = normalizeBusinessType(session?.profile?.business_type);
      if (!session || (businessType !== 'hotel/motel' && businessType !== 'hotel-motel')) {
        window.location.hash = 'loginpage';
        return;
      }

      attachCreateUserHandler();

      const logoutButton = document.getElementById('logout-btn');
      logoutButton?.addEventListener('click', function() {
        handleLogout(logoutButton);
      });
    }
  });

  app.run();
});
