import { Router } from "express";
import { db } from "../db/db.js";
import { snippet } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "../auth.js";

const router = Router();

// ✅ Middleware to verify authentication
const requireAuth = async (req, res, next) => {
  try {
    // Get session from Better Auth
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.user = session.user;
    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(401).json({ error: "Unauthorized" });
  }
};

// ✅ GET /api/snippets - Get all snippets for current user
router.get("/", requireAuth, async (req, res) => {
  try {
    const userSnippets = await db
      .select()
      .from(snippet)
      .where(eq(snippet.userId, req.user.id))
      .orderBy(desc(snippet.updatedAt));

    res.json({ snippets: userSnippets });
  } catch (error) {
    console.error("Error fetching snippets:", error);
    res.status(500).json({ error: "Failed to fetch snippets" });
  }
});

// ✅ GET /api/snippets/:id - Get single snippet
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const snippetId = parseInt(req.params.id);

    const [userSnippet] = await db
      .select()
      .from(snippet)
      .where(and(eq(snippet.id, snippetId), eq(snippet.userId, req.user.id)));

    if (!userSnippet) {
      return res.status(404).json({ error: "Snippet not found" });
    }

    res.json({ snippet: userSnippet });
  } catch (error) {
    console.error("Error fetching snippet:", error);
    res.status(500).json({ error: "Failed to fetch snippet" });
  }
});

// ✅ POST /api/snippets - Create new snippet
router.post("/", requireAuth, async (req, res) => {
  try {
    const { title, description, code, language, output, isPublic, tags } =
      req.body;

    if (!title || !code || !language) {
      return res.status(400).json({
        error: "Title, code, and language are required",
      });
    }

    const [newSnippet] = await db
      .insert(snippet)
      .values({
        title,
        description: description || null,
        code,
        language,
        output: output || null,
        isPublic: isPublic || false,
        tags: tags || null,
        userId: req.user.id,
      })
      .returning();

    res.status(201).json({ snippet: newSnippet });
  } catch (error) {
    console.error("Error creating snippet:", error);
    res.status(500).json({ error: "Failed to create snippet" });
  }
});

// ✅ PUT /api/snippets/:id - Update snippet
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const snippetId = parseInt(req.params.id);
    const { title, description, code, language, output, isPublic, tags } =
      req.body;

    // Verify ownership
    const [existingSnippet] = await db
      .select()
      .from(snippet)
      .where(and(eq(snippet.id, snippetId), eq(snippet.userId, req.user.id)));

    if (!existingSnippet) {
      return res.status(404).json({ error: "Snippet not found" });
    }

    const [updatedSnippet] = await db
      .update(snippet)
      .set({
        title: title || existingSnippet.title,
        description:
          description !== undefined ? description : existingSnippet.description,
        code: code || existingSnippet.code,
        language: language || existingSnippet.language,
        output: output !== undefined ? output : existingSnippet.output,
        isPublic: isPublic !== undefined ? isPublic : existingSnippet.isPublic,
        tags: tags !== undefined ? tags : existingSnippet.tags,
        updatedAt: new Date(),
      })
      .where(eq(snippet.id, snippetId))
      .returning();

    res.json({ snippet: updatedSnippet });
  } catch (error) {
    console.error("Error updating snippet:", error);
    res.status(500).json({ error: "Failed to update snippet" });
  }
});

// ✅ DELETE /api/snippets/:id - Delete snippet
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const snippetId = parseInt(req.params.id);

    // Verify ownership
    const [existingSnippet] = await db
      .select()
      .from(snippet)
      .where(and(eq(snippet.id, snippetId), eq(snippet.userId, req.user.id)));

    if (!existingSnippet) {
      return res.status(404).json({ error: "Snippet not found" });
    }

    await db.delete(snippet).where(eq(snippet.id, snippetId));

    res.json({ message: "Snippet deleted successfully" });
  } catch (error) {
    console.error("Error deleting snippet:", error);
    res.status(500).json({ error: "Failed to delete snippet" });
  }
});

// ✅ GET /api/snippets/public - Get public snippets (no auth required)
router.get("/public/all", async (req, res) => {
  try {
    const publicSnippets = await db
      .select({
        id: snippet.id,
        title: snippet.title,
        description: snippet.description,
        code: snippet.code,
        language: snippet.language,
        tags: snippet.tags,
        createdAt: snippet.createdAt,
        updatedAt: snippet.updatedAt,
        // Also get user info
        userName: user.name,
        userImage: user.image,
      })
      .from(snippet)
      .leftJoin(user, eq(snippet.userId, user.id))
      .where(eq(snippet.isPublic, true))
      .orderBy(desc(snippet.updatedAt))
      .limit(50);

    res.json({ snippets: publicSnippets });
  } catch (error) {
    console.error("Error fetching public snippets:", error);
    res.status(500).json({ error: "Failed to fetch public snippets" });
  }
});

export default router;
