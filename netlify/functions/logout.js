const { json, clearCookie } = require("./_lib/auth");

exports.handler = async () => {
  return json(200, { ok: true }, { "Set-Cookie": clearCookie() });
};
