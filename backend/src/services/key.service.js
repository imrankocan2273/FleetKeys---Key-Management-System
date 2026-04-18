const {
  resolveCompanyUserIdByAuthUserId,
  insertKey,
  selectKeysByCompanyId,
  selectKeyById,
  updateKeyById,
  deleteKeyById,
} = require('../daos/key.dao');

async function createKey({ companyId, authUserId, keyCode, qrToken, status, note }) {
  const companyUserResult = await resolveCompanyUserIdByAuthUserId({ authUserId });
  if (!companyUserResult.ok) {
    return { ok: false, error: companyUserResult.error };
  }

  return insertKey({
    companyId,
    keyCode,
    qrToken,
    status,
    note,
    createdBy: companyUserResult.companyUserId,
  });
}

async function listKeys({ companyId }) {
  return selectKeysByCompanyId({ companyId });
}

async function getKey({ companyId, keyId }) {
  return selectKeyById({ companyId, keyId });
}

async function patchKey({ companyId, keyId, patch }) {
  return updateKeyById({ companyId, keyId, patch });
}

async function removeKey({ companyId, keyId }) {
  return deleteKeyById({ companyId, keyId });
}

module.exports = {
  createKey,
  listKeys,
  getKey,
  patchKey,
  removeKey,
};

