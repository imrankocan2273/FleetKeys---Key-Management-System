const {
  listCompanyKeys,
  getCompanyKey,
  createCompanyKey,
  updateCompanyKey,
  deleteCompanyKey,
  listCompanyKeyEvents,
  getCompanyKeysDashboard,
  addCompanyKeyEvent,
  scanCompanyKeyEvent,
} = require('../services/key.service');

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return uuidRegex.test(String(value || '').trim());
}

async function listKeys(req, res) {
  const companyId = req.context?.company_id;
  if (!companyId) {
    return res.status(403).json({ message: 'Missing company context' });
  }

  const result = await listCompanyKeys({
    companyId,
    status: req.query?.status,
  });

  if (!result.ok) {
    return res.status(400).json({ message: 'List keys failed', details: result.error });
  }

  return res.status(200).json({ keys: result.keys });
}

async function getKeysDashboard(req, res) {
  const companyId = req.context?.company_id;
  if (!companyId) {
    return res.status(403).json({ message: 'Missing company context' });
  }

  const result = await getCompanyKeysDashboard({ companyId });
  if (!result.ok) {
    return res.status(400).json({ message: 'Dashboard load failed', details: result.error });
  }

  return res.status(200).json(result.dashboard);
}

async function getKey(req, res) {
  const companyId = req.context?.company_id;
  const keyId = String(req.params.keyId || '').trim();

  if (!companyId) {
    return res.status(403).json({ message: 'Missing company context' });
  }

  if (!isUuid(keyId)) {
    return res.status(400).json({ message: 'Invalid keyId' });
  }

  const result = await getCompanyKey({ companyId, keyId });
  if (!result.ok) {
    return res.status(404).json({ message: 'Get key failed', details: result.error });
  }

  return res.status(200).json({ key: result.key });
}

async function createKey(req, res) {
  const companyId = req.context?.company_id;
  const authUserId = req.context?.user_id;
  const {
    key_code: keyCode,
    qr_token: qrToken,
    status,
    note,
  } = req.body || {};

  if (!companyId) {
    return res.status(403).json({ message: 'Missing company context' });
  }

  if (!keyCode) {
    return res.status(400).json({ message: 'key_code is required' });
  }

  const result = await createCompanyKey({
    companyId,
    keyCode,
    qrToken,
    status,
    note,
    createdByAuthUserId: authUserId,
  });

  if (!result.ok) {
    return res.status(400).json({ message: 'Create key failed', details: result.error });
  }

  return res.status(201).json({ message: 'Key created', key: result.key });
}

async function updateKey(req, res) {
  const companyId = req.context?.company_id;
  const keyId = String(req.params.keyId || '').trim();
  const {
    key_code: keyCode,
    status,
    note,
  } = req.body || {};

  if (!companyId) {
    return res.status(403).json({ message: 'Missing company context' });
  }

  if (!isUuid(keyId)) {
    return res.status(400).json({ message: 'Invalid keyId' });
  }

  const result = await updateCompanyKey({
    companyId,
    keyId,
    keyCode,
    status,
    note,
  });

  if (!result.ok) {
    return res.status(400).json({ message: 'Update key failed', details: result.error });
  }

  return res.status(200).json({ message: 'Key updated', key: result.key });
}

async function deleteKey(req, res) {
  const companyId = req.context?.company_id;
  const keyId = String(req.params.keyId || '').trim();

  if (!companyId) {
    return res.status(403).json({ message: 'Missing company context' });
  }

  if (!isUuid(keyId)) {
    return res.status(400).json({ message: 'Invalid keyId' });
  }

  const result = await deleteCompanyKey({ companyId, keyId });
  if (!result.ok) {
    return res.status(400).json({ message: 'Delete key failed', details: result.error });
  }

  return res.status(200).json({ message: 'Key deleted' });
}

async function listKeyEvents(req, res) {
  const companyId = req.context?.company_id;
  const keyId = String(req.params.keyId || '').trim();
  const limit = req.query?.limit ? Number(req.query.limit) : undefined;

  if (!companyId) {
    return res.status(403).json({ message: 'Missing company context' });
  }

  if (!isUuid(keyId)) {
    return res.status(400).json({ message: 'Invalid keyId' });
  }

  const result = await listCompanyKeyEvents({ companyId, keyId, limit });
  if (!result.ok) {
    return res.status(400).json({ message: 'List key events failed', details: result.error });
  }

  return res.status(200).json({ events: result.events });
}

async function addKeyEvent(req, res) {
  const companyId = req.context?.company_id;
  const authUserId = req.context?.user_id;
  const keyId = String(req.params.keyId || '').trim();
  const { action, message } = req.body || {};

  if (!companyId) {
    return res.status(403).json({ message: 'Missing company context' });
  }

  if (!isUuid(keyId)) {
    return res.status(400).json({ message: 'Invalid keyId' });
  }

  const result = await addCompanyKeyEvent({
    companyId,
    keyId,
    action,
    message,
    byAuthUserId: authUserId,
  });

  if (!result.ok) {
    return res.status(400).json({ message: 'Add key event failed', details: result.error });
  }

  return res.status(201).json({ message: 'Key event added', event: result.event });
}

async function scanKeyEvent(req, res) {
  const companyId = req.context?.company_id;
  const accessToken = req.auth?.accessToken;
  const {
    qr_token: qrToken,
    action,
    message,
  } = req.body || {};

  if (!companyId) {
    return res.status(403).json({ message: 'Missing company context' });
  }

  if (!accessToken) {
    return res.status(401).json({ message: 'Missing access token context' });
  }

  if (!qrToken || !action) {
    return res.status(400).json({ message: 'qr_token and action are required' });
  }

  const result = await scanCompanyKeyEvent({
    accessToken,
    companyId,
    qrToken,
    action,
    message,
  });

  if (!result.ok) {
    return res.status(400).json({ message: 'Scan key event failed', details: result.error });
  }

  return res.status(200).json({ message: 'Scan key event successful', event: result.event });
}

module.exports = {
  listKeys,
  getKeysDashboard,
  getKey,
  createKey,
  updateKey,
  deleteKey,
  listKeyEvents,
  addKeyEvent,
  scanKeyEvent,
};
