const { randomUUID } = require('crypto');

const ids = {
  hotelCompanyId: '11111111-1111-4111-8111-111111111111',
  carCompanyId: '22222222-2222-4222-8222-222222222222',
  hotelAdminUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  hotelUserId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  carAdminUserId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  hotelAdminCompanyUserId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  hotelUserCompanyUserId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  carAdminCompanyUserId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
  hotelKeyOneId: '12345678-1234-4123-8123-123456789001',
  hotelKeyTwoId: '12345678-1234-4123-8123-123456789002',
  carKeyId: '12345678-1234-4123-8123-123456789003',
};

function createBaseState() {
  const now = new Date().toISOString();

  return {
    companies: [
      { id: ids.hotelCompanyId, name: 'Hotel Alpha', business_type: 'hotel/motel' },
      { id: ids.carCompanyId, name: 'Car Bravo', business_type: 'rent-a-car' },
    ],
    users: [
      {
        auth_user_id: ids.hotelAdminUserId,
        email: 'hotel.admin@example.com',
        password: 'password123',
        role: 'admin',
        company_id: ids.hotelCompanyId,
        company_user_id: ids.hotelAdminCompanyUserId,
        full_name: 'Hotel Admin',
        position: 'Manager',
      },
      {
        auth_user_id: ids.hotelUserId,
        email: 'hotel.user@example.com',
        password: 'password123',
        role: 'user',
        company_id: ids.hotelCompanyId,
        company_user_id: ids.hotelUserCompanyUserId,
        full_name: 'Hotel User',
        position: 'Front Desk',
      },
      {
        auth_user_id: ids.carAdminUserId,
        email: 'car.admin@example.com',
        password: 'password123',
        role: 'admin',
        company_id: ids.carCompanyId,
        company_user_id: ids.carAdminCompanyUserId,
        full_name: 'Car Admin',
        position: 'Operations',
      },
    ],
    keys: [
      {
        id: ids.hotelKeyOneId,
        company_id: ids.hotelCompanyId,
        key_code: 'Hotel Key 1',
        qr_token: 'fk_hotel_key_1',
        status: 'available',
        note: 'Reception spare',
        created_by: ids.hotelAdminCompanyUserId,
        created_at: now,
        updated_at: now,
      },
      {
        id: ids.hotelKeyTwoId,
        company_id: ids.hotelCompanyId,
        key_code: 'Hotel Key 2',
        qr_token: 'fk_hotel_key_2',
        status: 'checked_out',
        note: 'Guest checkout test key',
        created_by: ids.hotelAdminCompanyUserId,
        created_at: now,
        updated_at: now,
      },
      {
        id: ids.carKeyId,
        company_id: ids.carCompanyId,
        key_code: 'Car Key 1',
        qr_token: 'fk_car_key_1',
        status: 'available',
        note: 'Car desk key',
        created_by: ids.carAdminCompanyUserId,
        created_at: now,
        updated_at: now,
      },
    ],
    events: [
      {
        id: '99999999-9999-4999-8999-999999999991',
        key_id: ids.hotelKeyTwoId,
        company_id: ids.hotelCompanyId,
        user_id: ids.hotelAdminUserId,
        action: 'taken',
        message: 'Checked out before test run',
        created_at: now,
      },
    ],
    sessionsByAccessToken: new Map(),
    sessionsByRefreshToken: new Map(),
    authUsersByAccessToken: new Map(),
  };
}

function cloneUser(user) {
  return { id: user.auth_user_id, email: user.email };
}

function createTestEnvironment() {
  let state = createBaseState();

  function reset() {
    state = createBaseState();
  }

  function findUserByAuthId(authUserId) {
    return state.users.find((user) => user.auth_user_id === authUserId) || null;
  }

  function findUserByEmail(email) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    return state.users.find((user) => user.email.toLowerCase() === normalizedEmail) || null;
  }

  function issueSessionForUser(user) {
    const accessToken = `access_${user.auth_user_id}`;
    const refreshToken = `refresh_${user.auth_user_id}`;
    const session = { access_token: accessToken, refresh_token: refreshToken };

    state.sessionsByAccessToken.set(accessToken, user.auth_user_id);
    state.sessionsByRefreshToken.set(refreshToken, user.auth_user_id);
    state.authUsersByAccessToken.set(accessToken, cloneUser(user));

    return { user: cloneUser(user), session };
  }

  function removeSession(accessToken) {
    const authUserId = state.sessionsByAccessToken.get(accessToken);
    state.sessionsByAccessToken.delete(accessToken);
    if (authUserId) {
      state.authUsersByAccessToken.delete(accessToken);
      for (const [refreshToken, storedAuthUserId] of state.sessionsByRefreshToken.entries()) {
        if (storedAuthUserId === authUserId) {
          state.sessionsByRefreshToken.delete(refreshToken);
        }
      }
    }
  }

  return {
    ids,
    reset,
    state: () => state,
    modules: {
      supabase: {
        supabase: {
          auth: {
            async getUser(accessToken) {
              const authUserId = state.sessionsByAccessToken.get(accessToken);
              const user = authUserId ? findUserByAuthId(authUserId) : null;
              if (!user) {
                return { data: { user: null }, error: { message: 'Invalid or expired token' } };
              }

              return { data: { user: cloneUser(user) }, error: null };
            },
            async signInWithPassword({ email, password }) {
              const user = findUserByEmail(email);
              if (!user || user.password !== password) {
                return { data: { user: null, session: null }, error: { message: 'Invalid login credentials' } };
              }

              const { user: authUser, session } = issueSessionForUser(user);
              return { data: { user: authUser, session }, error: null };
            },
            async refreshSession({ refresh_token: refreshToken }) {
              const authUserId = state.sessionsByRefreshToken.get(refreshToken);
              const user = authUserId ? findUserByAuthId(authUserId) : null;
              if (!user) {
                return { data: { user: null, session: null }, error: { message: 'Invalid refresh token' } };
              }

              const { user: authUser, session } = issueSessionForUser(user);
              return { data: { user: authUser, session }, error: null };
            },
            async signOut() {
              return { error: null };
            },
          },
        },
        supabaseAdmin: {
          from(table) {
            throw new Error(`Unexpected direct supabaseAdmin access for table ${table}`);
          },
        },
      },
      authService: {
        async loginWithPassword({ email, password }) {
          const user = findUserByEmail(email);
          if (!user || user.password !== password) {
            return { ok: false, error: 'Invalid login credentials' };
          }

          const { user: authUser, session } = issueSessionForUser(user);
          return { ok: true, user: authUser, session };
        },
        async refreshSession({ refreshToken }) {
          const authUserId = state.sessionsByRefreshToken.get(refreshToken);
          const user = authUserId ? findUserByAuthId(authUserId) : null;
          if (!user) {
            return { ok: false, error: 'Invalid refresh token' };
          }

          const { user: authUser, session } = issueSessionForUser(user);
          return { ok: true, user: authUser, session };
        },
        async loadUserCompanyContext({ authUserId }) {
          const user = findUserByAuthId(authUserId);
          if (!user) {
            return { ok: false, error: 'No company_users row found for this user' };
          }

          const company = state.companies.find((item) => item.id === user.company_id) || null;
          return {
            ok: true,
            context: {
              role: user.role,
              company_id: user.company_id,
              full_name: user.full_name || null,
              position: user.position || null,
              company_name: company?.name || null,
              business_type: company?.business_type || null,
            },
          };
        },
        async logoutWithAccessToken({ accessToken }) {
          removeSession(accessToken);
          return { ok: true };
        },
        async changePassword({ accessToken, email, currentPassword, newPassword }) {
          const authUserId = state.sessionsByAccessToken.get(accessToken);
          const user = authUserId ? findUserByAuthId(authUserId) : null;

          if (!user || user.email !== email || user.password !== currentPassword) {
            return { ok: false, error: 'Invalid current password' };
          }

          user.password = newPassword;
          return { ok: true, user: cloneUser(user) };
        },
        async updateUserProfile({ companyId, authUserId, fullName, position }) {
          const user = findUserByAuthId(authUserId);
          if (!user || user.company_id !== companyId) {
            return { ok: false, error: 'No company_users row found for this user' };
          }

          if (fullName !== undefined) {
            user.full_name = fullName ? String(fullName).trim() : null;
          }

          if (position !== undefined) {
            user.position = position ? String(position).trim() : null;
          }

          return {
            ok: true,
            user: {
              id: user.company_user_id,
              company_id: user.company_id,
              auth_user_id: user.auth_user_id,
              role: user.role,
              full_name: user.full_name,
              position: user.position,
            },
          };
        },
      },
      keyService: {
        async listCompanyKeys({ companyId, status }) {
          const keys = state.keys.filter((key) => key.company_id === companyId && (!status || key.status === status));
          return { ok: true, keys: keys.map((key) => ({ ...key })) };
        },
        async getCompanyKey({ companyId, keyId }) {
          const key = state.keys.find((item) => item.company_id === companyId && item.id === keyId) || null;
          return key ? { ok: true, key: { ...key } } : { ok: false, error: 'Key not found' };
        },
        async createCompanyKey({ companyId, keyCode, qrToken, status, note, createdByAuthUserId }) {
          const user = findUserByAuthId(createdByAuthUserId);
          if (!user || user.company_id !== companyId) {
            return { ok: false, error: 'Company user not found' };
          }

          const key = {
            id: randomUUID(),
            company_id: companyId,
            key_code: String(keyCode || '').trim(),
            qr_token: String(qrToken || '').trim() || `fk_${randomUUID().replaceAll('-', '')}`,
            status: String(status || 'available').trim().toLowerCase(),
            note: note ? String(note).trim() : null,
            created_by: user.company_user_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          state.keys.push(key);
          return { ok: true, key: { ...key } };
        },
        async updateCompanyKey({ companyId, keyId, keyCode, status, note }) {
          const key = state.keys.find((item) => item.company_id === companyId && item.id === keyId) || null;
          if (!key) return { ok: false, error: 'Key not found' };

          if (keyCode !== undefined) {
            key.key_code = String(keyCode || '').trim();
          }
          if (status !== undefined) {
            key.status = String(status || '').trim().toLowerCase();
          }
          if (note !== undefined) {
            key.note = note ? String(note).trim() : null;
          }
          key.updated_at = new Date().toISOString();

          return { ok: true, key: { ...key } };
        },
        async deleteCompanyKey({ companyId, keyId }) {
          const index = state.keys.findIndex((item) => item.company_id === companyId && item.id === keyId);
          if (index === -1) return { ok: false, error: 'Key not found' };

          state.keys.splice(index, 1);
          return { ok: true };
        },
        async listCompanyKeyEvents({ companyId, keyId, limit }) {
          const key = state.keys.find((item) => item.company_id === companyId && item.id === keyId) || null;
          if (!key) return { ok: false, error: 'Key not found' };

          const events = state.events
            .filter((event) => event.company_id === companyId && event.key_id === keyId)
            .sort((left, right) => right.created_at.localeCompare(left.created_at));

          return { ok: true, events: events.slice(0, Number.isInteger(limit) && limit > 0 ? limit : 50).map((event) => ({ ...event })) };
        },
        async selectKeys({ companyId, status }) {
          const keys = state.keys.filter((key) => key.company_id === companyId && (!status || key.status === status));
          return { ok: true, rows: keys.map((key) => ({ ...key })) };
        },
        async selectKeyById({ companyId, keyId }) {
          const key = state.keys.find((item) => item.company_id === companyId && item.id === keyId) || null;
          return { ok: true, row: key ? { ...key } : null };
        },
        async selectCompanyUserIdByAuthUserId({ companyId, authUserId }) {
          const user = findUserByAuthId(authUserId);
          if (!user || user.company_id !== companyId) {
            return { ok: true, companyUserId: null };
          }

          return { ok: true, companyUserId: user.company_user_id };
        },
        async selectKeyEventsByKeyId({ companyId, keyId, limit }) {
          const key = state.keys.find((item) => item.company_id === companyId && item.id === keyId) || null;
          if (!key) return { ok: false, error: 'Key not found' };

          const events = state.events
            .filter((event) => event.company_id === companyId && event.key_id === keyId)
            .sort((left, right) => right.created_at.localeCompare(left.created_at));

          return { ok: true, rows: events.slice(0, Number.isInteger(limit) && limit > 0 ? limit : 50).map((event) => ({ ...event })) };
        },
        async selectCompanyUsersByAuthUserIds({ companyId, authUserIds }) {
          const rows = state.users
            .filter((user) => user.company_id === companyId && authUserIds.includes(user.auth_user_id))
            .map((user) => ({
              id: user.company_user_id,
              auth_user_id: user.auth_user_id,
              full_name: user.full_name,
              position: user.position,
            }));

          return { ok: true, rows };
        },
        async selectRecentKeyEvents({ companyId, limit }) {
          const rows = state.events
            .filter((event) => event.company_id === companyId)
            .sort((left, right) => right.created_at.localeCompare(left.created_at))
            .slice(0, Number.isInteger(limit) && limit > 0 ? limit : 50)
            .map((event) => ({ ...event }));

          return { ok: true, rows };
        },
        async insertKey({ companyId, keyCode, qrToken, status, note, createdByCompanyUserId }) {
          const user = state.users.find((entry) => entry.company_user_id === createdByCompanyUserId) || null;
          if (!user || user.company_id !== companyId) {
            return { ok: false, error: 'Company user not found' };
          }

          const key = {
            id: randomUUID(),
            company_id: companyId,
            key_code: String(keyCode || '').trim(),
            qr_token: String(qrToken || '').trim() || `fk_${randomUUID().replaceAll('-', '')}`,
            status: String(status || 'available').trim().toLowerCase(),
            note: note ? String(note).trim() : null,
            created_by: createdByCompanyUserId || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          state.keys.push(key);
          return { ok: true, row: { ...key } };
        },
        async updateKeyById({ companyId, keyId, patch }) {
          const key = state.keys.find((item) => item.company_id === companyId && item.id === keyId) || null;
          if (!key) return { ok: true, row: null };

          if (patch.key_code !== undefined) key.key_code = patch.key_code;
          if (patch.status !== undefined) key.status = patch.status;
          if (patch.note !== undefined) key.note = patch.note;
          key.updated_at = new Date().toISOString();

          return { ok: true, row: { ...key } };
        },
        async deleteKeyById({ companyId, keyId }) {
          const index = state.keys.findIndex((item) => item.company_id === companyId && item.id === keyId);
          if (index === -1) return { ok: true, deleted: false };

          state.keys.splice(index, 1);
          return { ok: true, deleted: true };
        },
        async insertKeyEvent({ keyId, companyId, authUserId, action, message }) {
          const event = {
            id: randomUUID(),
            key_id: keyId,
            company_id: companyId,
            user_id: authUserId,
            action,
            message: message || null,
            created_at: new Date().toISOString(),
          };

          state.events.unshift(event);
          return { ok: true, row: { ...event } };
        },
        async executeScanKeyEvent({ accessToken, qrToken, action, message }) {
          const authUserId = state.sessionsByAccessToken.get(accessToken);
          const user = authUserId ? findUserByAuthId(authUserId) : null;
          const key = state.keys.find((item) => item.qr_token === qrToken) || null;
          if (!user || !key) {
            return { ok: false, error: 'Scan key event failed' };
          }

          return {
            ok: true,
            row: {
              company_id: key.company_id,
              key_id: key.id,
              access_token: accessToken,
              action,
              message: message || null,
              created_at: new Date().toISOString(),
            },
          };
        },
        async getCompanyKeysDashboard({ companyId }) {
          const keys = state.keys.filter((key) => key.company_id === companyId);
          const events = state.events
            .filter((event) => event.company_id === companyId)
            .sort((left, right) => right.created_at.localeCompare(left.created_at));

          const summary = keys.reduce(
            (acc, key) => {
              acc[key.status] = (acc[key.status] || 0) + 1;
              return acc;
            },
            { available: 0, checked_out: 0, lost: 0, maintenance: 0 }
          );

          return {
            ok: true,
            dashboard: {
              summary,
              taken_keys: keys
                .filter((key) => key.status === 'checked_out')
                .map((key) => ({ ...key, checkout_at: events[0]?.created_at || null, taken_by: 'Hotel Admin', taken_by_position: 'Manager' })),
              recent_events: events.slice(0, 10).map((event) => ({
                ...event,
                key_code: keys.find((key) => key.id === event.key_id)?.key_code || null,
                actor_name: 'Hotel Admin',
                actor_position: 'Manager',
              })),
            },
          };
        },
        async addCompanyKeyEvent({ companyId, keyId, action, message, byAuthUserId }) {
          const user = findUserByAuthId(byAuthUserId);
          const key = state.keys.find((item) => item.company_id === companyId && item.id === keyId) || null;
          if (!user || !key) return { ok: false, error: 'Key not found' };

          key.status = action === 'taken' ? 'checked_out' : 'available';
          key.updated_at = new Date().toISOString();

          const event = {
            id: randomUUID(),
            key_id: key.id,
            company_id: companyId,
            user_id: user.auth_user_id,
            action,
            message: message ? String(message).trim() : null,
            created_at: new Date().toISOString(),
          };
          state.events.push(event);

          return { ok: true, event: { ...event } };
        },
        async scanCompanyKeyEvent({ accessToken, companyId, qrToken, action, message }) {
          const authUserId = state.sessionsByAccessToken.get(accessToken);
          const user = authUserId ? findUserByAuthId(authUserId) : null;
          const key = state.keys.find((item) => item.qr_token === qrToken) || null;
          if (!user || !key) return { ok: false, error: 'Scan key event failed' };
          if (key.company_id !== companyId) {
            return { ok: false, error: 'Forbidden company scope for scanned key event' };
          }

          key.status = action === 'taken' ? 'checked_out' : 'available';
          key.updated_at = new Date().toISOString();

          const event = {
            id: randomUUID(),
            key_id: key.id,
            company_id: companyId,
            user_id: user.auth_user_id,
            action,
            message: message ? String(message).trim() : null,
            created_at: new Date().toISOString(),
          };
          state.events.push(event);

          return { ok: true, event: { ...event } };
        },
      },
    },
  };
}

module.exports = { createTestEnvironment };