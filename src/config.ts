import assert from 'assert';
import dotenv from 'dotenv';

dotenv.config();

function getEnv(envName: string, defaultValue?: string): string {
  const env = process.env[envName] || defaultValue;

  assert.notStrictEqual(env, undefined, `Environment variable ${envName} is not set`);

  return env as string;
}

export default {
  db: {
    port: Number(getEnv('DB_PORT', '5432')),
    host: getEnv('DB_HOST', 'localhost'),
    user: getEnv('DB_USER', 'postgres'),
    password: getEnv('DB_PASSWORD', 'postgres'),
    database: getEnv('DB_DATABASE', 'postgres'),
  },
  gear: {
    node: getEnv('GEAR_NODE', 'ws://localhost:9944'),
    seed: getEnv('ACCOUNT_SEED', '//Alice'),
  },
  voucher: {
    availablePrograms: new Map(
      getEnv('AVAILABLE_PROGRAMS')
        .split(';')
        .map((v) => {
          const [programId, amountAndDuration] = v.split(':');
          const [amount, duration] = amountAndDuration.split(',');
          return [programId, { amount: Number(amount), duration: Number(duration) }];
        }) as [string, { amount: number; duration: number }][],
    ),
  },
};
