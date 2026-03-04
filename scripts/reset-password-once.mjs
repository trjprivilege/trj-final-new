import { createClient } from '@supabase/supabase-js';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
}

async function findUserByEmail(admin, email) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users ?? [];
    const match = users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
    if (match) return match;

    if (users.length < perPage) return null;
    page += 1;
  }
}

async function main() {
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const rl = createInterface({ input, output });

  try {
    const email = (await rl.question('Email to reset: ')).trim();
    const password = (await rl.question('New password (min 6 chars): ')).trim();

    if (!email) throw new Error('Email is required.');
    if (password.length < 6) throw new Error('Password must be at least 6 characters.');

    const confirm = (await rl.question("Type RESET to continue: ")).trim();
    if (confirm !== 'RESET') throw new Error('Confirmation failed. Aborted.');

    const user = await findUserByEmail(supabase.auth.admin, email);
    if (!user) throw new Error(`No user found for email: ${email}`);

    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password,
    });
    if (updateError) throw updateError;

    output.write(`Password reset successful for ${email}\n`);
    output.write('Delete this script after use if you do not need it anymore.\n');
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
