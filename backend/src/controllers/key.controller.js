const {
  createKey,
  listKeys,
  getKey,
  patchKey,
  removeKey,
} = require('../services/key.service');

const ALLOWED_STATUSES = ['available', 'checked_out', 'lost', 'maintenance'];

async function createKeyController(req, res) {
  const companyId = req.context?.company_id;
  const authUserId = req.auth?.user?.id;
  const { key_code: keyCode, qr_token: qrToken, status, note } = req.body || {};

  if (!companyId || !authUserId) {
    return res.status(403).json({ message: 'Missing auth or company context' });
  }

  if (!keyCode || !qrToken) {
    return res.status(400).json({ message: 'key_code and qr_token are required' });
  }

  if (status && !ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({
      message: 'Invalid status',
      allowed: ALLOWED_STATUSES,
    });
  }

  const result = await createKey({
    companyId,
    authUserId,
    keyCode: String(keyCode).trim(),
    qrToken: String(qrToken).trim(),
    status: status ? String(status).trim() : null,
    note: note ? String(note).trim() : null,
  });

  if (!result.ok) {
    return res.status(400).json({ message: 'Key creation failed', details: result.error });
  }

  return res.status(201).json({ key: result.row });
}

async function listKeysController(req, res) {
  const companyId = req.context?.company_id;
  if (!companyId) {
    return res.status(403).json({ message: 'Missing company context' });
  }

  const result = await listKeys({ companyId });
  if (!result.ok) {
    return res.status(400).json({ message: 'Failed to fetch keys', details: result.error });
  }

  return res.status(200).json({ keys: result.rows });
}

async function getKeyController(req, res) {
  const companyId = req.context?.company_id;
  const keyId = req.params?.id;

  if (!companyId || !keyId) {
    return res.status(400).json({ message: 'Invalid request' });
  }

  const result = await getKey({ companyId, keyId });
  if (!result.ok) {
    return res.status(400).json({ message: 'Failed to fetch key', details: result.error });
  }
  if (!result.row) {
    return res.status(404).json({ message: 'Key not found' });
  }

  return res.status(200).json({ key: result.row });
}

async function updateKeyController(req, res) {
  const companyId = req.context?.company_id;
  const keyId = req.params?.id;
  const { key_code: keyCode, qr_token: qrToken, status, note } = req.body || {};

  if (!companyId || !keyId) {
    return res.status(400).json({ message: 'Invalid request' });
  }

  const patch = {};
  if (keyCode !== undefined) {
    patch.key_code = String(keyCode).trim();
  }
  if (qrToken !== undefined) {
    patch.qr_token = String(qrToken).trim();
  }
  if (status !== undefined) {
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        message: 'Invalid status',
        allowed: ALLOWED_STATUSES,
      });
    }
    patch.status = status;
  }
  if (note !== undefined) {
    patch.note = note ? String(note).trim() : null;
  }

  if (!Object.keys(patch).length) {
    return res.status(400).json({ message: 'No valid fields to update' });
  }

  const result = await patchKey({ companyId, keyId, patch });
  if (!result.ok) {
    return res.status(400).json({ message: 'Failed to update key', details: result.error });
  }
  if (!result.row) {
    return res.status(404).json({ message: 'Key not found' });
  }

  return res.status(200).json({ key: result.row });
}

async function deleteKeyController(req, res) {
  const companyId = req.context?.company_id;
  const keyId = req.params?.id;

  if (!companyId || !keyId) {
    return res.status(400).json({ message: 'Invalid request' });
  }

  const result = await removeKey({ companyId, keyId });
  if (!result.ok) {
    return res.status(400).json({ message: 'Failed to delete key', details: result.error });
  }
  if (!result.row) {
    return res.status(404).json({ message: 'Key not found' });
  }

  return res.status(200).json({ message: 'Key deleted', id: result.row.id });
}

module.exports = {
  createKeyController,
  listKeysController,
  getKeyController,
  updateKeyController,
  deleteKeyController,
};

