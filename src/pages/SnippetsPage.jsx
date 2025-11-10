import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSnippets, deleteSnippet } from "@/services/snippetService";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trash2, Edit, Play, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function SnippetsPage() {
  const [snippets, setSnippets] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadSnippets();
  }, []);

  const loadSnippets = async () => {
    try {
      setLoading(true);
      const data = await getSnippets();
      setSnippets(data);
    } catch (error) {
      console.error("Error loading snippets:", error);
      toast.error("Failed to load snippets");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this snippet?")) {
      return;
    }

    try {
      await deleteSnippet(id);
      toast.success("Snippet deleted successfully");
      loadSnippets(); // Reload list
    } catch (error) {
      console.error("Error deleting snippet:", error);
      toast.error("Failed to delete snippet");
    }
  };

  const handleEdit = (snippet) => {
    // Navigate to dashboard with snippet data
    navigate("/dashboard", { state: { snippet } });
  };

  const getLanguageColor = (language) => {
    const colors = {
      javascript: "bg-yellow-500",
      python: "bg-blue-500",
      python3: "bg-blue-500",
      java: "bg-red-500",
      cpp: "bg-purple-500",
      "c++": "bg-purple-500",
    };
    return colors[language?.toLowerCase()] || "bg-gray-500";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">My Snippets</h1>
              <p className="text-sm text-muted-foreground">
                {snippets.length}{" "}
                {snippets.length === 1 ? "snippet" : "snippets"} saved
              </p>
            </div>
          </div>
        </div>

        {/* Snippets Grid */}
        {snippets.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground mb-4">
                No snippets saved yet. Start coding and save your first snippet!
              </p>
              <Button onClick={() => navigate("/dashboard")}>
                Go to Code Editor
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {snippets.map((snippet) => (
              <Card
                key={snippet.id}
                className="flex flex-col hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-1">
                        {snippet.title}
                      </CardTitle>
                      {snippet.description && (
                        <CardDescription className="line-clamp-2 mt-1">
                          {snippet.description}
                        </CardDescription>
                      )}
                    </div>
                    <Badge
                      className={`${getLanguageColor(snippet.language)} text-white ml-2`}
                    >
                      {snippet.language}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="flex-1">
                  <pre className="bg-muted p-3 rounded-md text-xs font-mono overflow-hidden">
                    <code className="line-clamp-6">{snippet.code}</code>
                  </pre>

                  <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDate(snippet.updatedAt)}
                  </div>
                </CardContent>

                <CardFooter className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(snippet)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(snippet.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
