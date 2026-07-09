import { useState } from "react";
import { Plus, BookOpen, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { idb } from "@/lib/db";
import { LibraryBook } from "@/lib/types";

export function ReadTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  const [newTitle, setNewTitle] = useState("");
  const [newStory, setNewStory] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newStatus, setNewStatus] = useState<LibraryBook["status"]>("Draft");

  const getStatusColor = (status: LibraryBook["status"] | undefined) => {
    switch (status) {
      case "Draft": return "bg-slate-500/10 text-slate-500 hover:bg-slate-500/20";
      case "Under Review": return "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20";
      case "Published": return "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20";
      default: return "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"; // default for older books
    }
  };

  const { data: books = [] } = useQuery({
    queryKey: ["library-books"],
    queryFn: () => idb.getAll<LibraryBook>("books").then(books => books.sort((a, b) => b.createdAt - a.createdAt)),
  });

  const { mutateAsync: publishBook } = useMutation({
    mutationFn: async (book: LibraryBook) => {
      await idb.put("books", book);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["library-books"] });
    }
  });

  const handleCreate = async () => {
    if (!newTitle.trim() || !newStory.trim()) {
      toast({ title: "Error", description: "Title and story are required", variant: "destructive" });
      return;
    }
    
    const newBook: LibraryBook = {
      id: crypto.randomUUID(),
      title: newTitle,
      story: newStory,
      imageUrl: newImageUrl,
      status: newStatus,
      createdAt: Date.now()
    };
    
    await publishBook(newBook);
    
    setNewTitle("");
    setNewStory("");
    setNewImageUrl("");
    setNewStatus("Draft");
    setIsCreateOpen(false);
    toast({ title: "Published", description: "Your book has been published to the library." });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reading Library</h2>
          <p className="text-muted-foreground">Read books and stories, or publish your own.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Publish Book
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Publish a Book</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Book title..." />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Image URL (Optional)</label>
                <div className="flex gap-2">
                  <ImageIcon className="w-9 h-9 p-2 border rounded-md text-muted-foreground bg-muted/20" />
                  <Input value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} placeholder="https://..." className="flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as LibraryBook["status"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Under Review">Under Review</SelectItem>
                    <SelectItem value="Published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Story Content</label>
                <Textarea 
                  value={newStory} 
                  onChange={e => setNewStory(e.target.value)} 
                  placeholder="Write your story here..."
                  className="min-h-[200px]"
                />
              </div>
              <Button className="w-full" onClick={handleCreate}>Publish</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {books.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border/50 rounded-xl bg-card/30">
          <BookOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium">No books published yet</h3>
          <p className="text-muted-foreground">Click the + icon to write and publish your first book.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map(book => (
            <Card key={book.id} className="overflow-hidden flex flex-col h-full hover:border-primary/50 transition-colors">
              {book.imageUrl && (
                <div className="h-48 w-full bg-muted overflow-hidden">
                  <img src={book.imageUrl} alt={book.title} className="w-full h-full object-cover" />
                </div>
              )}
              <CardHeader>
                <div className="flex justify-between items-start gap-2 mb-1">
                  <CardTitle className="line-clamp-2 leading-tight">{book.title}</CardTitle>
                  <Badge variant="secondary" className={getStatusColor(book.status)}>
                    {book.status || "Published"}
                  </Badge>
                </div>
                <CardDescription>
                  Updated {new Date(book.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                  {book.story}
                </p>
              </CardContent>
              <div className="p-6 pt-0 mt-auto">
                <Button variant="secondary" className="w-full">Read Book</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
