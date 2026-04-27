# Treino & Vida — App

PWA pessoal de Treino, Dieta e Finanças.

---

## Setup

```bash
npm install
cp .env.example .env.local  # preencher com credenciais do Supabase
npm run dev
```

---

## Configurações Externas (atualizar a cada ambiente)

### Supabase Dashboard
`Authentication → URL Configuration`

| Ambiente | Site URL | Redirect URL |
|---|---|---|
| Local | `http://localhost:5173` | `http://localhost:5173/auth/callback` |
| Produção | `https://seu-dominio.com` | `https://seu-dominio.com/auth/callback` |

### Google Cloud Console
`APIs & Services → Credentials → OAuth 2.0`

| Ambiente | Origem autorizada | URI de redirecionamento |
|---|---|---|
| Local | `http://localhost:5173` | `https://SEU-PROJETO.supabase.co/auth/v1/callback` |
| Produção | `https://seu-dominio.com` | `https://SEU-PROJETO.supabase.co/auth/v1/callback` |

> **Lembrete antes do deploy:** remover as entradas `localhost` e adicionar o domínio de produção nos dois painéis acima.

---

## ⚠️ Pendências antes de ir para produção

### 1. Allowlist de e-mails
Atualmente qualquer conta Google consegue criar sessão. Para restringir o acesso à tabela `emails_permitidos`:

1. Criar função PostgreSQL no Supabase:
```sql
CREATE OR REPLACE FUNCTION verificar_email_permitido()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM emails_permitidos WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Email não autorizado';
  END IF;
END;
$$;
```
2. Registrar em: **Supabase Dashboard → Authentication → Hooks → "before user is created"**
3. Adicionar os e-mails permitidos na tabela `emails_permitidos`

> Impacto no código React: **zero** — é só configuração no Supabase.

---

## Variáveis de Ambiente

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```
