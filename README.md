# data-ccv

Monitor de vagas no portal [Vistos Online](https://pedidodevistos.mne.gov.pt/VistosOnline/) (MNE Portugal).

O POST ao MNE **corre sozinho**. Não precisa de Swagger, de cron no dashboard da Vercel, nem de `CRON_SECRET`.

1. Push do repo para o GitHub
2. Import na [Vercel](https://vercel.com) (Add New → Project)
3. Colar `VISTOS_COOKIE`, `VISTOS_CAPTCHA` e as variáveis de e-mail no dashboard da Vercel

A GitHub Action `.github/workflows/check-slots.yml` chama `/api/cron/check-slots` **a cada 5 minutos**. A Vercel só precisa de estar online.

Em local, `npm run dev` dispara a primeira consulta ao arrancar e repete a cada `CHECK_INTERVAL_MINUTES`.

Documentação extra (opcional): **`/docs`** (Swagger) · **`/api/openapi`**.

## O que faz

1. GitHub Action (ou o scheduler local) chama `GET /api/cron/check-slots`.
2. O script só consulta o MNE se já tiverem passado `CHECK_INTERVAL_MINUTES`.
3. Sem vagas = `{ "data": {} }`. Qualquer outro JSON (ou HTTP ≠ 200) dispara e-mail.
4. `NOTIFY_COOLDOWN_MINUTES` evita spam se a mesma resposta se repetir.

Cookie e captcha **expiram**. Quando a sessão cair, actualize `VISTOS_COOKIE` e `VISTOS_CAPTCHA` na Vercel.

## Variáveis de ambiente

Copie `.env.example` para `.env` em desenvolvimento. Na Vercel: **Project → Settings → Environment Variables**.

| Variável | Obrigatória | Função |
| --- | --- | --- |
| `VISTOS_COOKIE` | sim | Cookie completo (`Vistos_sid=...; user_consent=1; ...`). |
| `VISTOS_CAPTCHA` | sim | Token `captcha` do formulário. Expira com frequência. |
| `SMTP_USER` | sim (para alerta) | O seu Gmail. |
| `SMTP_APP_PASSWORD` | sim (para alerta) | Senha de aplicação (não a senha normal da conta). |
| `EMAIL_TO` | sim (para alerta) | Destinatário do alerta. |
| `CHECK_INTERVAL_MINUTES` | não | Default `5`. Minutos entre consultas reais ao MNE. |
| `NOTIFY_COOLDOWN_MINUTES` | não | Default `30`. |
| `POSTO_ID` | não | Default `5084`. |
| `SLOTS_BASE_URL` | não | Default `https://pedidodevistos.mne.gov.pt/VistosOnline/slots`. |
| `SMTP_HOST` / `SMTP_PORT` / `EMAIL_FROM` | não | Default Gmail `465` / `SMTP_USER`. |
| `API_KEY` | não | Só para Swagger / API noutros projetos. |
| `CRON_SECRET` | não | Só se quiser proteger `force=true`. O job automático corre sem isto. |

### Senha de aplicação Gmail

1. Active a [verificação em 2 passos](https://myaccount.google.com/security).
2. Abra [Senhas de app](https://myaccount.google.com/apppasswords).
3. Gere uma senha para «Mail».
4. Cole em `SMTP_APP_PASSWORD` (os espaços podem ficar).

## Deploy

```bash
git push
```

Depois, na Vercel, importe o mesmo repositório e defina as variáveis. Sem cron no dashboard.

A Action tenta `https://<nome-do-repo>.vercel.app`. Se o URL da Vercel for outro, defina no GitHub **Settings → Secrets and variables → Actions → Variables**:

```
APP_URL=https://o-seu-projecto.vercel.app
```

Pode disparar já em **Actions → Verificar vagas → Run workflow**. O primeiro schedule do GitHub pode demorar até ~1 hora.

O `vercel.json` tem um cron **diário** (`08:00` UTC) como rede de segurança no plano Hobby. O Hobby **não** permite cron a cada minuto — por isso o relógio real é a GitHub Action.

## Desenvolvimento local

```bash
cp .env.example .env
npm install
npm run dev
```

- UI: [http://localhost:3000](http://localhost:3000)
- O terminal mostra `[slots]` a cada consulta automática

## Segurança

- Não commite `.env` nem cookies reais.
- O captcha e a sessão do portal não são estáveis: trate-os como secrets rotativos.
