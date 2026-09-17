import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import * as argon2 from 'argon2';
import {
  AUTHORIZED_EMAILS,
  displayNameForEmail,
  isAuthorizedEmail,
  normalizeEmail,
  validatePassword,
} from '@cuisinons/shared';
import './load-env';
import { prisma } from './client';
import { loadDbEnv } from './env';

async function hashPassword(password: string, pepper: string): Promise<string> {
  return argon2.hash(`${password}${pepper}`, { type: argon2.argon2id });
}

async function promptHidden(question: string): Promise<string> {
  const fromEnvKey =
    question.includes('nathan') ? process.env.SEED_NATHAN_PASSWORD : process.env.SEED_JADE_PASSWORD;
  if (fromEnvKey && fromEnvKey.length > 0) {
    return fromEnvKey;
  }
  const rl = createInterface({ input: stdin, output: stdout });
  stdout.write(question);
  const onData = (char: Buffer) => {
    const str = char.toString('utf8');
    if (str === '\n' || str === '\r' || str === '\r\n') {
      stdin.removeListener('data', onData);
    } else {
      stdout.clearLine(0);
      stdout.cursorTo(0);
      stdout.write(question + '********');
    }
  };
  stdin.on('data', onData);
  const answer = await rl.question('');
  rl.close();
  return answer;
}

async function upsertUser(email: string, password: string, pepper: string) {
  const hash = await hashPassword(password, pepper);
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash: hash, passwordChangedAt: new Date() },
    create: {
      email,
      displayName: displayNameForEmail(email),
      passwordHash: hash,
    },
  });
}

async function main() {
  const env = loadDbEnv();
  const emails = [...AUTHORIZED_EMAILS];
  for (const email of emails) {
    if (!isAuthorizedEmail(email)) {
      throw new Error('E-mail non autorisé.');
    }
    const password = await promptHidden(`Mot de passe pour ${email} : `);
    const check = validatePassword(password);
    if (!check.ok) {
      throw new Error(check.message);
    }
    await upsertUser(normalizeEmail(email), password, env.PASSWORD_PEPPER);
    console.log(`Compte mis à jour : ${email}`);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
