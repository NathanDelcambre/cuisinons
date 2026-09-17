# Sécurité

Lifio (`../Lifio`) a été inspecté **uniquement** pour l’auth et la sécurité.

## Repris de Lifio

- Cookies HttpOnly, host-only (pas de `Domain`), `SameSite=Lax`, path `/`.
- Préfixe `__Host-` lorsque Secure est actif.
- Sessions stockées en base, hash SHA-256 du token opaque, révocation au logout.
- CSRF double-submit : token dans un cookie HttpOnly signé + header `X-CSRF-Token`.
- Vérification Origin / Referer sur les mutations.
- Argon2id + pepper, dummy hash pour éviter l’énumération, messages de login génériques.
- Politique de mot de passe fort (deny-list, séquences).
- Throttle login (IP + hash e-mail).
- Headers : nosniff, Referrer-Policy, Permissions-Policy, CSP, Helmet côté Nest.
- Validation env fail-closed en production.
- La vraie frontière d’autorisation est l’API, pas le chrome UI.

## Adapté (volontairement différent)

- **BFF same-origin** : cookies posés par Next, pas par Nest. Lifio parlait à l’API en cross-origin.
- Un cookie de session opaque (pas de split access/refresh) : le BFF émet un JWT interne de ~45 s.
- Google Authorization Code + PKCE + state (Arctic), pas GIS ID-token.
- Whitelist serveur stricte de deux e-mails.
- Pas d’inscription, pas de forgot-password, pas de reCAPTCHA, pas d’e-mail transactionnel.
- CORS Nest fermé. Pas de token dans `localStorage`.

## Whitelist

Seuls `nathan.delcambre@gmail.com` et `jade.peroch@gmail.com` (normalisés trim + lowercase) peuvent se connecter, y compris via Google (`email_verified` obligatoire).
