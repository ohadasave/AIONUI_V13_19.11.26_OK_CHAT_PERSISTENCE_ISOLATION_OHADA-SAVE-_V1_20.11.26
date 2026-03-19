# Notes - Gestion de Session

Notes techniques sur la gestion de session dans le système de connexion E-audit.

## 🔑 Clés localStorage

### eaudit_logged_in
- **Type**: `'true' | null`
- **Description**: Indicateur de connexion
- **Durée de vie**: 24 heures

### eaudit_login_time
- **Type**: `string` (timestamp)
- **Description**: Moment de la connexion
- **Utilisation**: Calcul de l'expiration

### eaudit_username
- **Type**: `string`
- **Description**: Nom d'utilisateur
- **Utilisation**: Restauration de session

## ⏱️ Durée de Session

**Constante**: 24 heures (24 * 60 * 60 * 1000 ms)

**Calcul d'expiration**:
```typescript
const elapsed = Date.now() - parseInt(loginTime, 10);
const isExpired = elapsed >= (24 * 60 * 60 * 1000);
```

---

**Dernière mise à jour**: Janvier 2025
