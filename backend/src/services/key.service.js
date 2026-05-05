const { randomUUID } = require('crypto');

const {
  selectKeys,
  selectKeyById,
  insertKey,
  updateKeyById,
  deleteKeyById,
  selectCompanyUserIdByAuthUserId,
  selectKeyEventsByKeyId,
  selectCompanyUsersByAuthUserIds,
  insertKeyEvent,
  executeScanKeyEvent,
} = require('../daos/key.dao');

const allowedKeyStatuses = ['available', 'checked_out', 'lost', 'maintenance'];
const allowedActions = ['taken', 'returned'];

function normalizeKeyStatus(status) {
  return String(status || '').trim().toLowerCase();
}

function normalizeAction(action) {
  return String(action || '').trim().toLowerCase();
}

function generateQrToken() {
  return `fk_${randomUUID().replaceAll('-', '')}`;
}

async function listCompanyKeys({ companyId, status }) {
  const normalizedStatus = status ? normalizeKeyStatus(status) : null;
  if (normalizedStatus && !allowedKeyStatuses.includes(normalizedStatus)) {
    return { ok: false, error: `Invalid status '${status}'` };
  }

  const result = await selectKeys({ companyId, status: normalizedStatus });
  if (!result.ok) return { ok: false, error: result.error };

  return { ok: true, keys: result.rows };
}

async function getCompanyKey({ companyId, keyId }) {
  const result = await selectKeyById({ companyId, keyId });
  if (!result.ok) return { ok: false, error: result.error };
  if (!result.row) return { ok: false, error: 'Key not found' };

  return { ok: true, key: result.row };
}

async function createCompanyKey({
  companyId,
  keyCode,
  qrToken,
  status,
  note,
  createdByAuthUserId,
}) {
  const normalizedStatus = status ? normalizeKeyStatus(status) : 'available';
  if (!allowedKeyStatuses.includes(normalizedStatus)) {
    return { ok: false, error: `Invalid status '${status}'` };
  }

  const normalizedKeyCode = String(keyCode || '').trim();
  if (!normalizedKeyCode) {
    return { ok: false, error: 'key_code is required' };
  }

  const companyUserResult = await selectCompanyUserIdByAuthUserId({
    companyId,
    authUserId: createdByAuthUserId,
  });
  if (!companyUserResult.ok) return { ok: false, error: companyUserResult.error };

  const insertResult = await insertKey({
    companyId,
    keyCode: normalizedKeyCode,
    qrToken: String(qrToken || '').trim() || generateQrToken(),
    status: normalizedStatus,
    note: note ? String(note).trim() : null,
    createdByCompanyUserId: companyUserResult.companyUserId,
  });
  if (!insertResult.ok) return { ok: false, error: insertResult.error };

  return { ok: true, key: insertResult.row };
}

async function updateCompanyKey({ companyId, keyId, keyCode, status, note }) {
  const existing = await selectKeyById({ companyId, keyId });
  if (!existing.ok) return { ok: false, error: existing.error };
  if (!existing.row) return { ok: false, error: 'Key not found' };

  const patch = {};
  if (keyCode !== undefined) {
    const normalizedKeyCode = String(keyCode || '').trim();
    if (!normalizedKeyCode) {
      return { ok: false, error: 'key_code cannot be empty' };
    }
    patch.key_code = normalizedKeyCode;
  }

  if (status !== undefined) {
    const normalizedStatus = normalizeKeyStatus(status);
    if (!allowedKeyStatuses.includes(normalizedStatus)) {
      return { ok: false, error: `Invalid status '${status}'` };
    }
    patch.status = normalizedStatus;
  }

  if (note !== undefined) {
    patch.note = note ? String(note).trim() : null;
  }

  if (!Object.keys(patch).length) {
    return { ok: true, key: existing.row };
  }

  const updated = await updateKeyById({ companyId, keyId, patch });
  if (!updated.ok) return { ok: false, error: updated.error };
  if (!updated.row) return { ok: false, error: 'Key not found' };

  return { ok: true, key: updated.row };
}

async function deleteCompanyKey({ companyId, keyId }) {
  const result = await deleteKeyById({ companyId, keyId });
  if (!result.ok) return { ok: false, error: result.error };
  if (!result.deleted) return { ok: false, error: 'Key not found' };

  return { ok: true };
}

async function listCompanyKeyEvents({ companyId, keyId, limit }) {
  const keyResult = await selectKeyById({ companyId, keyId });
  if (!keyResult.ok) return { ok: false, error: keyResult.error };
  if (!keyResult.row) return { ok: false, error: 'Key not found' };

  const eventsResult = await selectKeyEventsByKeyId({ companyId, keyId, limit });
  if (!eventsResult.ok) return { ok: false, error: eventsResult.error };

  const authUserIds = eventsResult.rows
    .map((eventRow) => eventRow.user_id)
    .filter(Boolean);

  const usersResult = await selectCompanyUsersByAuthUserIds({
    companyId,
    authUserIds,
  });
  if (!usersResult.ok) return { ok: false, error: usersResult.error };

  const actorByAuthUserId = new Map(
    usersResult.rows.map((row) => [
      row.auth_user_id,
      {
        full_name: row.full_name || null,
        position: row.position || null,
      },
    ])
  );

  const events = eventsResult.rows.map((eventRow) => {
    const actor = actorByAuthUserId.get(eventRow.user_id);
    return {
      ...eventRow,
      actor_name: actor?.full_name || null,
      actor_position: actor?.position || null,
    };
  });

  return { ok: true, events };
}

async function addCompanyKeyEvent({ companyId, keyId, action, message, byAuthUserId }) {
  const normalizedAction = normalizeAction(action);
  if (!allowedActions.includes(normalizedAction)) {
    return { ok: false, error: `Invalid action '${action}'` };
  }

  const keyResult = await selectKeyById({ companyId, keyId });
  if (!keyResult.ok) return { ok: false, error: keyResult.error };
  if (!keyResult.row) return { ok: false, error: 'Key not found' };

  const companyUserResult = await selectCompanyUserIdByAuthUserId({
    companyId,
    authUserId: byAuthUserId,
  });
  if (!companyUserResult.ok) return { ok: false, error: companyUserResult.error };
  if (!companyUserResult.companyUserId) return { ok: false, error: 'Company user not found' };

  const nextStatus = normalizedAction === 'taken' ? 'checked_out' : 'available';

  const keyUpdate = await updateKeyById({
    companyId,
    keyId,
    patch: { status: nextStatus },
  });
  if (!keyUpdate.ok) return { ok: false, error: keyUpdate.error };

  const insertResult = await insertKeyEvent({
    keyId,
    companyId,
    authUserId: byAuthUserId,
    action: normalizedAction,
    message: message ? String(message).trim() : null,
  });
  if (!insertResult.ok) return { ok: false, error: insertResult.error };

  return { ok: true, event: insertResult.row };
}

async function scanCompanyKeyEvent({ accessToken, companyId, qrToken, action, message }) {
  const normalizedAction = normalizeAction(action);
  if (!allowedActions.includes(normalizedAction)) {
    return { ok: false, error: `Invalid action '${action}'` };
  }

  const result = await executeScanKeyEvent({
    accessToken,
    qrToken: String(qrToken || '').trim(),
    action: normalizedAction,
    message: message ? String(message).trim() : null,
  });
  if (!result.ok) return { ok: false, error: result.error };

  if (!result.row) {
    return { ok: false, error: 'Scan key event failed' };
  }

  if (result.row.company_id !== companyId) {
    return { ok: false, error: 'Forbidden company scope for scanned key event' };
  }

  return { ok: true, event: result.row };
}

module.exports = {
  allowedKeyStatuses,
  allowedActions,
  listCompanyKeys,
  getCompanyKey,
  createCompanyKey,
  updateCompanyKey,
  deleteCompanyKey,
  listCompanyKeyEvents,
  addCompanyKeyEvent,
  scanCompanyKeyEvent,
};
