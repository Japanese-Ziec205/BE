import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Server } from 'node:http';

/**
 * Bộ khung test tối giản, không dùng thư viện test runner ngoài.
 *
 * Lý do: dự án chạy trên hạ tầng miễn phí và dùng cộng tác viên tình nguyện —
 * càng ít công cụ phải cài đặt và học thì càng dễ có người chạy test.
 * Đổi lại mất một số tiện nghi, nhưng đủ dùng cho mức độ hiện tại.
 */

let passed = 0;
let failed = 0;
const failures: { name: string; error: string }[] = [];
let currentSuite = '';

export function suite(name: string) {
  currentSuite = name;
  console.log(`\n\x1b[1m▌ ${name}\x1b[0m`);
}

export async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    passed += 1;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } catch (err) {
    failed += 1;
    const message = err instanceof Error ? err.message : String(err);
    failures.push({ name: `${currentSuite} → ${name}`, error: message });
    console.log(`  \x1b[31m✗\x1b[0m ${name}`);
    console.log(`    \x1b[31m${message}\x1b[0m`);
  }
}

export function expect(actual: unknown) {
  return {
    toBe(expected: unknown) {
      if (actual !== expected) {
        throw new Error(`Mong đợi ${JSON.stringify(expected)}, nhận được ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected: unknown) {
      const a = JSON.stringify(actual);
      const b = JSON.stringify(expected);
      if (a !== b) throw new Error(`Mong đợi ${b}, nhận được ${a}`);
    },
    toBeTruthy() {
      if (!actual) throw new Error(`Mong đợi giá trị đúng, nhận được ${JSON.stringify(actual)}`);
    },
    toBeFalsy() {
      if (actual) throw new Error(`Mong đợi giá trị sai, nhận được ${JSON.stringify(actual)}`);
    },
    toBeGreaterThan(n: number) {
      if (typeof actual !== 'number' || actual <= n) {
        throw new Error(`Mong đợi > ${n}, nhận được ${actual}`);
      }
    },
    toBeGreaterThanOrEqual(n: number) {
      if (typeof actual !== 'number' || actual < n) {
        throw new Error(`Mong đợi >= ${n}, nhận được ${actual}`);
      }
    },
    toBeLessThan(n: number) {
      if (typeof actual !== 'number' || actual >= n) {
        throw new Error(`Mong đợi < ${n}, nhận được ${actual}`);
      }
    },
    toContain(needle: unknown) {
      const ok = Array.isArray(actual)
        ? actual.includes(needle)
        : typeof actual === 'string' && actual.includes(String(needle));
      if (!ok) throw new Error(`Mong đợi chứa ${JSON.stringify(needle)} trong ${JSON.stringify(actual)}`);
    },
    toHaveLength(n: number) {
      const len = (actual as { length?: number })?.length;
      if (len !== n) throw new Error(`Mong đợi độ dài ${n}, nhận được ${len}`);
    },
  };
}

/** Kiểm tra một hành động ném lỗi với đúng mã lỗi mong đợi. */
export async function expectThrows(fn: () => Promise<unknown>, expectedCode?: string) {
  let thrown: unknown = null;
  try {
    await fn();
  } catch (err) {
    thrown = err;
  }
  if (!thrown) throw new Error('Mong đợi ném lỗi nhưng không có lỗi nào');
  if (expectedCode) {
    const code = (thrown as { code?: string }).code;
    if (code !== expectedCode) {
      throw new Error(`Mong đợi mã lỗi "${expectedCode}", nhận được "${code}"`);
    }
  }
  return thrown;
}

export function report(): number {
  console.log('\n' + '─'.repeat(56));
  if (failures.length) {
    console.log('\x1b[31mCÁC CA THẤT BẠI:\x1b[0m');
    failures.forEach((f) => console.log(`  • ${f.name}\n    ${f.error}`));
    console.log('');
  }
  const total = passed + failed;
  const color = failed === 0 ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}KẾT QUẢ: ${passed}/${total} ca đạt, ${failed} ca trượt\x1b[0m`);
  console.log('─'.repeat(56));
  return failed;
}

// ---------------------------------------------------------------------------
// Hạ tầng test
// ---------------------------------------------------------------------------

let mongo: MongoMemoryServer | null = null;
let server: Server | null = null;

export async function setupTestEnv(port = 5555) {
  mongo = await MongoMemoryServer.create();
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = mongo.getUri('nihongo_test');
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-' + 'a'.repeat(40);
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-' + 'b'.repeat(40);
  process.env.MAIL_PROVIDER = 'console';
  process.env.PORT = String(port);

  const { connectDatabase } = await import('../src/config/db');
  const { createApp } = await import('../src/app');
  await connectDatabase();

  server = createApp().listen(port);
  return { baseUrl: `http://localhost:${port}/api/v1` };
}

export async function teardownTestEnv() {
  server?.close();
  const { disconnectDatabase } = await import('../src/config/db');
  await disconnectDatabase();
  await mongo?.stop();
}

/** Client HTTP nhỏ gọn, tự giữ cookie và access token. */
export function createClient(baseUrl: string) {
  let cookie = '';
  let token: string | null = null;

  return {
    setToken(t: string | null) {
      token = t;
    },
    getToken: () => token,
    async request(method: string, path: string, body?: unknown) {
      const res = await fetch(baseUrl + path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      const setCookies = res.headers.getSetCookie?.() ?? [];
      if (setCookies.length) cookie = setCookies.map((c) => c.split(';')[0]).join('; ');
      const json = await res.json().catch(() => null);
      return { status: res.status, body: json, data: json?.data, error: json?.error };
    },
    get(path: string) {
      return this.request('GET', path);
    },
    post(path: string, body?: unknown) {
      return this.request('POST', path, body);
    },
    patch(path: string, body?: unknown) {
      return this.request('PATCH', path, body);
    },
    del(path: string) {
      return this.request('DELETE', path);
    },
  };
}

export type TestClient = ReturnType<typeof createClient>;

/** Tạo nhanh một người dùng đã kích hoạt với vai trò chỉ định. */
export async function createUser(
  baseUrl: string,
  identifier: string,
  role: 'student' | 'contributor' | 'lecturer' | 'admin' = 'student',
) {
  const { User } = await import('../src/models/User');
  const client = createClient(baseUrl);

  const reg = await client.post('/auth/register', {
    identifier,
    password: 'MatKhauAnToan2026',
    displayName: `Người dùng ${role}`,
    acceptTerms: true,
  });
  if (reg.status !== 201) {
    throw new Error(`Không tạo được người dùng: ${JSON.stringify(reg.body)}`);
  }

  await User.updateOne(
    { _id: reg.data.userId },
    { $set: { role, status: 'active', 'identifiers.0.verifiedAt': new Date() } },
  );

  const login = await client.post('/auth/login', {
    identifier,
    password: 'MatKhauAnToan2026',
  });
  client.setToken(login.data.accessToken);

  return { client, userId: reg.data.userId as string };
}
