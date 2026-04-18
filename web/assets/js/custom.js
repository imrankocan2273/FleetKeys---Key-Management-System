$(document).ready(function() {
  $("main#spapp > section").height($(document).height() - 60);

  var app = $.spapp({
    defaultView: 'loginpage',
    templateDir: './pages/',
    pageNotFound: 'error_404'
  });

  app.route({
    view: 'loginpage',
    load: 'loginpage.html',
    onReady: function() {
      const tokenKey = 'fk_access_token';
      const form = document.getElementById('login-form');
      const message = document.getElementById('login-message');
      const loginButton = document.getElementById('login-btn');
      const sessionPanel = document.getElementById('session-panel');
      const logoutButton = document.getElementById('logout-btn');

      if (!form || !message || !loginButton || !sessionPanel || !logoutButton) return;

      const renderSessionState = () => {
        const token = localStorage.getItem(tokenKey);
        const loggedIn = Boolean(token);

        form.classList.toggle('hidden', loggedIn);
        sessionPanel.classList.toggle('hidden', !loggedIn);
      };

      renderSessionState();

      form.addEventListener('submit', async function(event) {
        event.preventDefault();

        const username = document.getElementById('username')?.value?.trim();
        const password = document.getElementById('password')?.value ?? '';

        message.textContent = '';
        loginButton.disabled = true;
        loginButton.textContent = 'Logging in...';

        try {
          const response = await fetch('http://localhost:4000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });

          const payload = await response.json();

          if (!response.ok) {
            throw new Error(payload.message || 'Login failed');
          }

          localStorage.setItem(tokenKey, payload.access_token || '');
          renderSessionState();
        } catch (error) {
          message.textContent = error.message || 'Login failed';
        } finally {
          loginButton.disabled = false;
          loginButton.textContent = 'Login';
        }
      });

      logoutButton.addEventListener('click', async function() {
        const token = localStorage.getItem(tokenKey);
        if (!token) return;

        logoutButton.disabled = true;
        logoutButton.textContent = 'Logging out...';

        try {
          await fetch('http://localhost:4000/api/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token: token })
          });
        } finally {
          localStorage.removeItem(tokenKey);
          renderSessionState();
          logoutButton.disabled = false;
          logoutButton.textContent = 'Logout';
        }
      });
    }
  });

  app.run();
});
