import { Client } from 'node-appwrite';

// 状态码
const CODES = {
  SUCCESS: 0,
  INVALID_PARAM: 400,
  NO_CERTIFICATE: 401,
  MISSING_INTERMEDIATE: 402,
  VALIDATION_FAILED: 403,
  EXPIRED: 404,
  CONNECTION_FAILED: 405,
  TIMEOUT: 406,
  INTERNAL_ERROR: 500,
};

/**
 * 比较两个 DN 是否相等
 */
function isEqualDN(dn1, dn2) {
  const keys = new Set([...Object.keys(dn1), ...Object.keys(dn2)]);
  for (const key of keys) {
    if (dn1[key] !== dn2[key]) return false;
  }
  return true;
}

/**
 * 格式化 DN
 */
function formatDN(dnObj) {
  const allowed = ['CN', 'O', 'OU', 'C', 'L', 'ST'];
  const result = {};
  for (const [key, value] of Object.entries(dnObj)) {
    if (allowed.includes(key)) result[key] = value;
  }
  return result;
}

/**
 * 验证证书链（基于 issuer/subject 匹配）
 */
async function verifyCertificateChain(hostname) {
  return new Promise(async (resolve) => {
    const tls = await import('tls').then(m => m.default);

    const options = {
      host: hostname,
      port: 443,
      servername: hostname,
      rejectUnauthorized: false,
      minVersion: 'TLSv1',
      maxVersion: 'TLSv1.3',
      ciphers: 'DEFAULT@SECLEVEL=1',
    };

    const socket = tls.connect(options, () => {
      const cert = socket.getPeerCertificate(true);
      socket.destroy();

      if (!cert || !cert.raw) {
        return resolve({
          valid: false,
          code: CODES.NO_CERTIFICATE,
          message: 'No certificate presented by server',
        });
      }

      // 检查是否过期
      const now = new Date();
      const validTo = new Date(cert.valid_to);
      if (now > validTo) {
        return resolve({
          valid: false,
          code: CODES.EXPIRED,
          message: `Certificate expired on ${validTo.toISOString()}`,
        });
      }

      // 构建证书链
      const chain = [];
      let current = cert;
      while (current && current.raw) {
        chain.push(current);
        if (current === current.issuerCertificate) break;
        current = current.issuerCertificate;
      }

      if (chain.length < 2) {
        return resolve({
          valid: false,
          code: CODES.MISSING_INTERMEDIATE,
          message: 'Certificate chain is incomplete: missing intermediate certificate(s)',
        });
      }

      try {
        // 1. 验证域名
        tls.checkServerIdentity(hostname, cert);

        // 2. 验证 issuer → subject
        for (let i = 0; i < chain.length - 1; i++) {
          const issuer = chain[i + 1];
          const subject = chain[i];

          if (!isEqualDN(issuer.subject, subject.issuer)) {
            return resolve({
              valid: false,
              code: CODES.VALIDATION_FAILED,
              message: `Issuer/Subject mismatch between certificate ${i} and ${i+1}`,
            });
          }
        }

        // 3. 验证根自签名
        const root = chain[chain.length - 1];
        if (!isEqualDN(root.subject, root.issuer)) {
          return resolve({
            valid: false,
            code: CODES.VALIDATION_FAILED,
            message: 'Root certificate is not self-signed',
          });
        }

        resolve({
          valid: true,
          expiresAt: validTo.toISOString(),
          subject: formatDN(cert.subject),
          issuer: formatDN(cert.issuer),
          fingerprint: cert.fingerprint256,
          chainLength: chain.length,
        });

      } catch (err) {
        resolve({
          valid: false,
          code: CODES.VALIDATION_FAILED,
          message: `Validation error: ${err.message}`,
        });
      }
    });

    socket.on('error', (err) => {
      socket.destroy();
      const msg = {
        ENOTFOUND: `Domain not found: ${hostname}`,
        ECONNREFUSED: `Connection refused: ${hostname}:443`,
        EHOSTUNREACH: `Host unreachable: ${hostname}`,
        ETIMEDOUT: `Connection timed out: ${hostname}:443`,
      }[err.code] || `Connection failed: ${err.message}`;
      resolve({
        valid: false,
        code: CODES.CONNECTION_FAILED,
        message: msg,
      });
    });

    socket.setTimeout(10_000, () => {
      socket.destroy();
      resolve({
        valid: false,
        code: CODES.TIMEOUT,
        message: `Connection timeout (10s) to ${hostname}:443`,
      });
    });
  });
}

// This is your Appwrite function
// It's executed each time we get a request
export default async ({ req, res, log, error }) => {
  if (req.method !== 'GET') {
    return res.json({
      code: CODES.INVALID_PARAM,
      message: 'Method not allowed',
      data: null,
    }, 405);
  }

  const domain = req.query.domain?.trim();
  log(`received domain ${domain}`);

  if (!domain) {
    return res.json({
      code: CODES.INVALID_PARAM,
      message: 'Missing required parameter: domain',
      data: null,
    }, 400);
  }

  // 域名校验
  try {
    new URL(`https://${domain}`);
  } catch {
    return res.json({
      code: CODES.INVALID_PARAM,
      message: 'Invalid domain format',
      data: null,
    }, 400);
  }

  try {
    const result = await verifyCertificateChain(domain);
    log(`verifyCertificateChain result ${result}`);

    if (result.valid) {
      return res.json({
        code: CODES.SUCCESS,
        message: 'ok',
        data: {
          domain,
          ...result,
        },
      }, 200);
    } else {
      return res.json({
        code: result.code || CODES.VALIDATION_FAILED,
        message: result.message,
        data: null,
      }, 200);
    }
  } catch (err) {
    error('Internal error:', err);
    return res.json({
      code: CODES.INTERNAL_ERROR,
      message: 'Internal server error',
      data: null,
    }, 500);
  }
};
