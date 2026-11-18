/**
 * EXTRAIT DE: src/process/database/index.ts
 * LIGNES: 527-620
 * FONCTION: getUserConversations (avec fallback suspect)
 */

  getUserConversations(userId?: string, page = 0, pageSize = 50): IPaginatedResult<TChatConversation> {
    try {
      // ISOLATION FIX: When userId is not provided, use defaultUserId for backwards compatibility
      // This is mainly for admin/system queries where user context is not available
      const finalUserId = userId || this.defaultUserId; // ← SUSPECT: Fallback ici
      console.log(`[Database] getUserConversations called with userId=${userId}, using finalUserId=${finalUserId}`);

      const countResult = this.db.prepare('SELECT COUNT(*) as count FROM conversations WHERE user_id = ?').get(finalUserId) as {
        count: number;
      };

      const rows = this.db
        .prepare(
          `
            SELECT *
            FROM conversations
            WHERE user_id = ?
            ORDER BY updated_at DESC LIMIT ?
            OFFSET ?
          `
        )
        .all(finalUserId, pageSize, page * pageSize) as IConversationRow[];

      return {
        data: rows.map(rowToConversation),
        total: countResult.count,
        page,
        pageSize,
        hasMore: (page + 1) * pageSize < countResult.count,
      };
    } catch (error: any) {
      console.error('[Database] Get conversations error:', error);
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        hasMore: false,
      };
    }
  }

  updateConversation(conversationId: string, updates: Partial<TChatConversation>): IQueryResult<boolean> {
    try {
      const existing = this.getConversation(conversationId);
      if (!existing.success || !existing.data) {
        return {
          success: false,
          error: 'Conversation not found',
        };
      }

      const updated = {
        ...existing.data,
        ...updates,
        modifyTime: Date.now(),
      } as TChatConversation;
      const row = conversationToRow(updated, this.defaultUserId);

      const stmt = this.db.prepare(`
        UPDATE conversations
        SET name       = ?,
            extra      = ?,
            model      = ?,
            status     = ?,
            updated_at = ?
        WHERE id = ?
      `);

      stmt.run(row.name, row.extra, row.model, row.status, row.updated_at, conversationId);

      return {
        success: true,
        data: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  deleteConversation(conversationId: string): IQueryResult<boolean> {
    try {
      const stmt = this.db.prepare('DELETE FROM conversations WHERE id = ?');
      const result = stmt.run(conversationId);

      return {
        success: true,
        data: result.changes > 0,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

/**
 * ANALYSE DU BUG:
 * 
 * Ligne 533: const finalUserId = userId || this.defaultUserId;
 * 
 * Si userId est undefined (race condition dans ChatHistory.tsx),
 * alors finalUserId = 'system_default_user'
 * 
 * Query SQL ligne 541:
 * SELECT * FROM conversations WHERE user_id = 'system_default_user'
 * 
 * Résultat: TOUTES les conversations du premier compte sont retournées,
 * peu importe quel utilisateur fait la requête.
 * 
 * SOLUTION PROPOSÉE:
 * 
 * getUserConversations(userId: string, page = 0, pageSize = 50) { // ← Plus de '?'
 *   if (!userId) {
 *     throw new Error('userId is required');
 *   }
 *   // Pas de fallback
 *   const rows = this.db.prepare(`
 *     SELECT * FROM conversations WHERE user_id = ?
 *   `).all(userId, pageSize, page * pageSize);
 *   // ...
 * }
 */
