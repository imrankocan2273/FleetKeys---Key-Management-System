const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ request }) => {
  await request.post('/__tests/reset');
});

async function login(request, username, password = 'password123') {
  const response = await request.post('/api/auth/login', {
    data: { username, password },
  });

  expect(response.ok()).toBeTruthy();
  return response.json();
}

test('auth login, refresh, and logout work', async ({ request }) => {
  const loginPayload = await login(request, 'hotel.admin@example.com');

  expect(loginPayload.message).toBe('Login successful');
  expect(loginPayload.access_token).toBeTruthy();
  expect(loginPayload.refresh_token).toBeTruthy();
  expect(loginPayload.profile.company_name).toBe('Hotel Alpha');

  const refreshResponse = await request.post('/api/auth/refresh', {
    data: { refresh_token: loginPayload.refresh_token },
  });
  expect(refreshResponse.ok()).toBeTruthy();
  const refreshPayload = await refreshResponse.json();
  expect(refreshPayload.message).toBe('Refresh successful');

  const logoutResponse = await request.post('/api/auth/logout', {
    data: { access_token: loginPayload.access_token },
  });
  expect(logoutResponse.ok()).toBeTruthy();
  const logoutPayload = await logoutResponse.json();
  expect(logoutPayload.message).toBe('Logout successful');
});

test('settings password change updates credentials', async ({ request }) => {
  const loginPayload = await login(request, 'hotel.admin@example.com');

  const changeResponse = await request.post('/api/auth/change-password', {
    headers: { Authorization: `Bearer ${loginPayload.access_token}` },
    data: {
      current_password: 'password123',
      new_password: 'newpassword123',
    },
  });

  expect(changeResponse.ok()).toBeTruthy();
  const changePayload = await changeResponse.json();
  expect(changePayload.message).toBe('Password updated successfully');

  const oldLoginResponse = await request.post('/api/auth/login', {
    data: {
      username: 'hotel.admin@example.com',
      password: 'password123',
    },
  });
  expect(oldLoginResponse.status()).toBe(401);

  const newLoginResponse = await request.post('/api/auth/login', {
    data: {
      username: 'hotel.admin@example.com',
      password: 'newpassword123',
    },
  });
  expect(newLoginResponse.ok()).toBeTruthy();
});

test('settings profile update changes the saved account details', async ({ request }) => {
  const loginPayload = await login(request, 'hotel.admin@example.com');

  const profileResponse = await request.patch('/api/auth/profile', {
    headers: { Authorization: `Bearer ${loginPayload.access_token}` },
    data: {
      full_name: 'Hotel Vision Lead',
      position: 'Operations Director',
    },
  });

  expect(profileResponse.ok()).toBeTruthy();
  const profilePayload = await profileResponse.json();
  expect(profilePayload.message).toBe('Profile updated successfully');
  expect(profilePayload.profile).toMatchObject({
    full_name: 'Hotel Vision Lead',
    position: 'Operations Director',
  });

  const refreshedLogin = await login(request, 'hotel.admin@example.com', 'password123');
  expect(refreshedLogin.profile).toMatchObject({
    company_name: 'Hotel Alpha',
    full_name: 'Hotel Vision Lead',
    position: 'Operations Director',
  });
});

test('tenant isolation keeps company data scoped', async ({ request }) => {
  const hotelLogin = await login(request, 'hotel.admin@example.com');
  const carLogin = await login(request, 'car.admin@example.com');

  const hotelMeResponse = await request.get('/api/protected/me', {
    headers: { Authorization: `Bearer ${hotelLogin.access_token}` },
  });
  expect(hotelMeResponse.ok()).toBeTruthy();
  const hotelMePayload = await hotelMeResponse.json();
  expect(hotelMePayload.context.company_name).toBe('Hotel Alpha');
  expect(hotelMePayload.context.role).toBe('admin');

  const hotelKeysResponse = await request.get('/api/keys', {
    headers: { Authorization: `Bearer ${hotelLogin.access_token}` },
  });
  expect(hotelKeysResponse.ok()).toBeTruthy();
  const hotelKeysPayload = await hotelKeysResponse.json();
  expect(hotelKeysPayload.keys).toHaveLength(2);

  const carKeyResponse = await request.get('/api/keys/12345678-1234-4123-8123-123456789003', {
    headers: { Authorization: `Bearer ${hotelLogin.access_token}` },
  });
  expect(carKeyResponse.status()).toBe(404);

  const carKeysResponse = await request.get('/api/keys', {
    headers: { Authorization: `Bearer ${carLogin.access_token}` },
  });
  expect(carKeysResponse.ok()).toBeTruthy();
  const carKeysPayload = await carKeysResponse.json();
  expect(carKeysPayload.keys).toHaveLength(1);
  expect(carKeysPayload.keys[0].company_id).toBe('22222222-2222-4222-8222-222222222222');
});

test('keys CRUD stays inside tenant scope', async ({ request }) => {
  const loginPayload = await login(request, 'hotel.admin@example.com');

  const createResponse = await request.post('/api/keys', {
    headers: { Authorization: `Bearer ${loginPayload.access_token}` },
    data: {
      key_code: 'Lobby Spare',
      status: 'available',
      note: 'Created by test',
    },
  });
  expect(createResponse.status()).toBe(201);
  const createdKey = await createResponse.json();
  expect(createdKey.key.key_code).toBe('Lobby Spare');

  const updateResponse = await request.patch(`/api/keys/${createdKey.key.id}`, {
    headers: { Authorization: `Bearer ${loginPayload.access_token}` },
    data: {
      key_code: 'Lobby Spare Updated',
      status: 'maintenance',
      note: 'Patched by test',
    },
  });
  expect(updateResponse.ok()).toBeTruthy();
  const updatedKey = await updateResponse.json();
  expect(updatedKey.key.key_code).toBe('Lobby Spare Updated');
  expect(updatedKey.key.status).toBe('maintenance');

  const deleteResponse = await request.delete(`/api/keys/${createdKey.key.id}`, {
    headers: { Authorization: `Bearer ${loginPayload.access_token}` },
  });
  expect(deleteResponse.ok()).toBeTruthy();

  const listResponse = await request.get('/api/keys', {
    headers: { Authorization: `Bearer ${loginPayload.access_token}` },
  });
  const listPayload = await listResponse.json();
  expect(listPayload.keys.map((item) => item.id)).not.toContain(createdKey.key.id);
});

test('scan flow records events and updates key status', async ({ request }) => {
  const loginPayload = await login(request, 'hotel.admin@example.com');

  const scanTakeResponse = await request.post('/api/keys/scan', {
    headers: { Authorization: `Bearer ${loginPayload.access_token}` },
    data: {
      qr_token: 'fk_hotel_key_1',
      action: 'taken',
      message: 'Guest checked in',
    },
  });
  expect(scanTakeResponse.status()).toBe(200);
  const scanTakePayload = await scanTakeResponse.json();
  expect(scanTakePayload.event.action).toBe('taken');

  const keyResponse = await request.get('/api/keys/12345678-1234-4123-8123-123456789001', {
    headers: { Authorization: `Bearer ${loginPayload.access_token}` },
  });
  expect(keyResponse.ok()).toBeTruthy();
  const keyPayload = await keyResponse.json();
  expect(keyPayload.key.status).toBe('checked_out');

  const eventsResponse = await request.get('/api/keys/12345678-1234-4123-8123-123456789001/events', {
    headers: { Authorization: `Bearer ${loginPayload.access_token}` },
  });
  expect(eventsResponse.ok()).toBeTruthy();
  const eventsPayload = await eventsResponse.json();
  expect(eventsPayload.events[0].message).toBe('Guest checked in');

  const scanReturnResponse = await request.post('/api/keys/scan', {
    headers: { Authorization: `Bearer ${loginPayload.access_token}` },
    data: {
      qr_token: 'fk_hotel_key_1',
      action: 'returned',
      message: 'Key returned',
    },
  });
  expect(scanReturnResponse.ok()).toBeTruthy();
});