# Judge0 for programming practice questions

SciPal judges Python and C++ answers with a self-hosted [Judge0 CE](https://github.com/judge0/judge0) 1.13.x. The backend (Vercel) calls it over HTTPS; nothing else may reach it. Without `JUDGE0_URL` the backend answers "code judging is not switched on" and every other question type keeps working.

## 1. The machine

- A Linux VM of its own (2 vCPU / 4 GB is enough to start), Docker and Docker Compose installed.
- **cgroup v1.** Judge0 1.13 does not run on cgroup v2, which is the default on Ubuntu 22.04+. In `/etc/default/grub` set `GRUB_CMDLINE_LINUX="systemd.unified_cgroup_hierarchy=0"`, run `sudo update-grub`, reboot. Check with `stat -fc %T /sys/fs/cgroup` (`tmpfs` = v1).
- Open only port 443 (and 22 for you). Judge0 listens on 127.0.0.1:2358 only.

## 2. Start it

```bash
cd docs/ops/judge0
cp judge0.conf.example judge0.conf   # then replace every CHANGE_ME
docker compose up -d
```

## 3. HTTPS in front of it

Any reverse proxy works. With Caddy (`/etc/caddy/Caddyfile`), which gets the certificate for you:

```
judge.example.com {
  reverse_proxy 127.0.0.1:2358
}
```

## 4. Check it

```bash
curl -s https://judge.example.com/languages -H "X-Auth-Token: <AUTHN_TOKEN>" | head -c 200   # a JSON list
curl -s -o /dev/null -w "%{http_code}\n" https://judge.example.com/languages                  # 401 without the token
```

The Judge0 language ids SciPal uses are Python 71 and C++ 54; both must be in that list.

## 5. Connect the backend

Set in the backend's environment (Vercel project `sci-pal-backend`): `JUDGE0_URL=https://judge.example.com` and `JUDGE0_TOKEN=<AUTHN_TOKEN>`. Then, with the same two variables, run the real-judge test from `backend/`:

```bash
pnpm vitest run judge-integration
```

A submission waits for Judge0 for up to 20 seconds, so the backend's Vercel function limit must be at least that (check the project's function max duration before switching it on).

## Order of rollout

1. Judge0 up and checked (steps 1–4).
2. Apply `supabase/migrations/20261019120000_code_questions.sql` (new question type and the `code_runs` table).
3. Deploy the backend with `JUDGE0_URL` / `JUDGE0_TOKEN`, then the frontend.

Rollback: unset `JUDGE0_URL`. Programming questions then say judging is off; nothing else changes.
