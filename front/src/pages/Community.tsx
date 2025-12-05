import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Trophy,
  Heart,
  MessageCircle,
  Image as ImageIcon,
  Send,
  TrendingUp,
  Star,
  Award,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  communityApi,
  type CommunityPost,
  type CommunityComment,
  type CommunityChallenge,
  type RankingEntry,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { LineChart, Line as RechartsLine, ResponsiveContainer } from "recharts";

const Line = RechartsLine as any;
const RANKING_REWARDS: Record<number, number> = {
  1: 500,
  2: 400,
  3: 400,
  4: 300,
  5: 300,
  6: 150,
  7: 150,
  8: 150,
  9: 150,
  10: 150,
};

export default function Community() {
  const [activeTab, setActiveTab] = useState("challenges");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [challengeForm, setChallengeForm] = useState({
    title: "",
    category: "",
    deadline: "",
  });
  const [challenges, setChallenges] = useState<CommunityChallenge[]>([]);

  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postImage, setPostImage] = useState<File | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isPostLoading, setIsPostLoading] = useState(false);

  const [showComments, setShowComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, CommunityComment[]>>(
    {}
  );
  const [newComment, setNewComment] = useState("");
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>(
    {}
  );
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());

  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [rankingLoading, setRankingLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadFeed();
    loadChallenges();
  }, []);

  useEffect(() => {
    if (activeTab === "ranking") {
      if (user) setCurrentUserId(user.id);
      loadRankings();
    }
  }, [activeTab, user]);

  const requireLogin = () => {
    if (!user) {
      toast({ title: "로그인이 필요합니다", variant: "destructive" });
      navigate("/auth");
      return false;
    }
    return true;
  };

  const loadChallenges = async () => {
    try {
      const data = await communityApi.getChallenges();
      setChallenges(data);
    } catch (err) {
      console.error(err);
      toast({
        title: "도전방 로드 실패",
        description: "도전방 정보를 가져오지 못했습니다.",
        variant: "destructive",
      });
    }
  };

  const loadFeed = async () => {
    try {
      const { posts, likeCounts, commentCounts, likedPostIds } =
        await communityApi.getFeed();
      setPosts(posts);
      setLikeCounts(likeCounts);
      setCommentCounts(commentCounts);
      setUserLikes(new Set(likedPostIds));
    } catch (err) {
      console.error(err);
      toast({
        title: "피드 로드 실패",
        description: "피드 정보를 가져오지 못했습니다.",
        variant: "destructive",
      });
    }
  };

  const loadComments = async (postId: string) => {
    try {
      const data = await communityApi.getComments(postId);
      setComments((prev) => ({ ...prev, [postId]: data }));
    } catch (err) {
      console.error(err);
      toast({
        title: "댓글 로드 실패",
        description: "댓글을 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const loadRankings = async () => {
    setRankingLoading(true);
    try {
      const data = await communityApi.getRankings();
      setRankings(data);
    } catch (err) {
      console.error(err);
      toast({
        title: "랭킹 로드 실패",
        description: "랭킹 정보를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setRankingLoading(false);
    }
  };
  const toggleLike = async (postId: string) => {
    if (!requireLogin()) return;

    try {
      const res = await communityApi.toggleLike(postId);

      setUserLikes((prev) => {
        const next = new Set(prev);
        if (res.liked) next.add(postId);
        else next.delete(postId);
        return next;
      });

      setLikeCounts((prev) => ({
        ...prev,
        [postId]: res.likeCount,
      }));
    } catch (err) {
      console.error(err);
      toast({
        title: "좋아요 실패",
        description: "좋아요 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const addComment = async (postId: string) => {
    if (!newComment.trim()) return;
    if (!requireLogin()) return;

    try {
      const created = await communityApi.addComment(postId, newComment.trim());
      setNewComment("");

      setComments((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), created],
      }));
      setCommentCounts((prev) => ({
        ...prev,
        [postId]: (prev[postId] || 0) + 1,
      }));
    } catch (err) {
      console.error(err);
      toast({
        title: "댓글 작성 실패",
        description: "댓글 작성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const toggleComments = (postId: string) => {
    if (showComments === postId) {
      setShowComments(null);
    } else {
      setShowComments(postId);
      if (!comments[postId]) {
        loadComments(postId);
      }
    }
  };

  const handleCreateChallenge = async () => {
    if (!requireLogin()) return;

    if (!challengeForm.title || !challengeForm.category) {
      toast({ title: "모든 필드를 입력해주세요", variant: "destructive" });
      return;
    }

    try {
      const { id } = await communityApi.createChallenge({
        name: challengeForm.title,
        category: challengeForm.category,
        deadline: challengeForm.deadline || null,
      });

      toast({ title: "도전방이 생성되었습니다!" });
      setIsCreateDialogOpen(false);
      setChallengeForm({ title: "", category: "", deadline: "" });
      loadChallenges();
      navigate(`/chat/${id}`);
    } catch (err) {
      console.error(err);
      toast({
        title: "도전방 생성 실패",
        description: "도전방 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleCreatePost = async () => {
    if (!requireLogin()) return;

    if (!postContent.trim()) {
      toast({ title: "내용을 입력해주세요", variant: "destructive" });
      return;
    }

    setIsPostLoading(true);
    try {
      await communityApi.createPost(postContent.trim(), postImage);
      toast({ title: "게시글이 작성되었습니다!" });
      setPostContent("");
      setPostImage(null);
      setIsPostDialogOpen(false);
      await loadFeed();
    } catch (err) {
      console.error(err);
      toast({
        title: "게시글 작성 실패",
        description: "게시글 작성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsPostLoading(false);
    }
  };

  const handleJoinChallenge = async (roomId: string) => {
    if (!requireLogin()) return;
    navigate(`/chat/${roomId}`);
  };
  return (
    <div className="min-h-screen px-4 py-8">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8 animate-slide-up">
          <h1 className="font-pixel text-2xl sm:text-3xl mb-4 text-foreground">
            커뮤니티
          </h1>
          <p className="font-korean text-muted-foreground">
            함께 목표를 달성하고 동기부여를 받아보세요
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-3 h-auto bg-card/50 p-1 border-2 border-border">
            <TabsTrigger
              value="challenges"
              className="font-korean data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              도전방
            </TabsTrigger>
            <TabsTrigger
              value="feed"
              className="font-korean data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              피드
            </TabsTrigger>
            <TabsTrigger
              value="ranking"
              className="font-korean data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              랭킹
            </TabsTrigger>
          </TabsList>

          {/* 도전방 탭 */}
          <TabsContent value="challenges" className="space-y-6">
            <Card className="bg-gradient-primary border-2 border-primary shadow-neon">
              <CardContent className="p-6">
                <Dialog
                  open={isCreateDialogOpen}
                  onOpenChange={setIsCreateDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="hero" size="lg" className="w-full sm:w-auto">
                      <Users className="w-5 h-5" />
                      도전방 만들기
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle className="font-korean text-xl">
                        도전방 만들기
                      </DialogTitle>
                      
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="title" className="font-korean">
                          방 제목
                        </Label>
                        <Input
                          id="title"
                          placeholder="예: 30일 운동 챌린지"
                          value={challengeForm.title}
                          onChange={(e) =>
                            setChallengeForm({
                              ...challengeForm,
                              title: e.target.value,
                            })
                          }
                          className="font-korean"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category" className="font-korean">
                          카테고리
                        </Label>
                        <Input
                          id="category"
                          placeholder="예: 운동, 독서, 공부, 습관"
                          value={challengeForm.category}
                          onChange={(e) =>
                            setChallengeForm({
                              ...challengeForm,
                              category: e.target.value,
                            })
                          }
                          className="font-korean"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="deadline" className="font-korean">
                          마감일 (선택)
                        </Label>
                        <Input
                          id="deadline"
                          type="date"
                          value={challengeForm.deadline}
                          onChange={(e) =>
                            setChallengeForm({
                              ...challengeForm,
                              deadline: e.target.value,
                            })
                          }
                          className="font-korean"
                        />
                      </div>
                      <Button
                        variant="neon"
                        className="w-full"
                        onClick={handleCreateChallenge}
                      >
                        도전방 생성
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {challenges.map((challenge, i) => {
                const daysLeft = challenge.deadline
                  ? Math.ceil(
                      (new Date(challenge.deadline).getTime() -
                        new Date().getTime()) /
                        (1000 * 60 * 60 * 24)
                    )
                  : null;

                return (
                  <Card
                    key={challenge.id}
                    className="bg-card border-2 border-border hover:border-primary transition-all shadow-card hover:shadow-neon cursor-pointer animate-slide-up"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <CardHeader>
                      <div className="flex flex-col gap-2">
                        <div className="text-xl font-bold text-foreground break-words font-korean">
                          {challenge.name || "제목 없음"}
                        </div>
                        {challenge.category && (
                          <div className="self-start inline-block px-2 py-1 bg-primary/10 rounded-sm border border-primary/50">
                            <span className="font-korean text-xs text-primary font-medium">
                              {challenge.category}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm font-korean text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>도전방</span>
                        </div>
                        {daysLeft !== null && <div>D-{daysLeft}</div>}
                      </div>
                      <Button
                        variant="neon"
                        size="sm"
                        className="w-full"
                        onClick={() => handleJoinChallenge(challenge.id)}
                      >
                        참가하기
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* 피드 탭 */}
          <TabsContent value="feed" className="space-y-6">
            <Card className="bg-gradient-primary border-2 border-primary shadow-neon">
              <CardContent className="p-6">
                <Dialog
                  open={isPostDialogOpen}
                  onOpenChange={setIsPostDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="hero" size="lg" className="w-full sm:w-auto">
                      <Send className="w-5 h-5" />
                      피드 작성하기
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle className="font-korean text-xl">
                        새 게시글 작성
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="post-content"
                          className="font-korean"
                        >
                          내용
                        </Label>
                        <Textarea
                          id="post-content"
                          placeholder="무슨 생각을 하고 계신가요?"
                          value={postContent}
                          onChange={(e) => setPostContent(e.target.value)}
                          className="font-korean min-h-[150px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-korean">이미지 (선택)</Label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            setPostImage(e.target.files?.[0] || null)
                          }
                          className="hidden"
                          id="post-image-dialog"
                        />
                        <Label
                          htmlFor="post-image-dialog"
                          className="cursor-pointer"
                        >
                          <div className="flex items-center gap-2 px-4 py-3 border-2 border-border rounded-sm hover:border-primary transition-colors">
                            <ImageIcon className="w-5 h-5" />
                            <span className="font-korean">
                              {postImage ? postImage.name : "이미지 선택"}
                            </span>
                          </div>
                        </Label>
                      </div>
                      <Button
                        variant="neon"
                        className="w-full"
                        onClick={handleCreatePost}
                        disabled={isPostLoading}
                      >
                        {isPostLoading ? "게시 중..." : "게시하기"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {posts.map((post, i) => {
              // ✨ 추가: 내 게시글인지 확인
              const isMyPost = user && post.user_id === user.id; 

              return (
                <Card
                  key={post.id}
                  className="bg-card border-2 border-border shadow-card animate-slide-up"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <Avatar className="w-12 h-12 border-2 border-primary">
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground font-pixel text-sm">
                        {post.display_name?.[0] || "모"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-korean font-bold">
                          {post.display_name || "모험가"}
                        </span>
                      </div>
                      <p className="font-korean text-sm text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString("ko-KR", {
                          timeZone: "Asia/Seoul",
                        })}
                      </p>
                    </div>
                  </div>
                  <p className="font-korean mb-4">{post.content}</p>
                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt="Post"
                      className="w-full rounded-sm border-2 border-border mb-4"
                    />
                  )}
                    <div className="flex items-center gap-4 mb-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isMyPost} 
                        className={`gap-2 ${isMyPost ? "opacity-50 cursor-not-allowed" : ""}`} 
                        onClick={() => {
                          if (!isMyPost) toggleLike(post.id);
                        }}
                      >
                      <Heart
                        className={`w-4 h-4 ${
                          userLikes.has(post.id)
                            ? "fill-primary text-primary"
                            : ""
                        }`}
                      />
                      <span className="font-korean text-sm">
                        {likeCounts[post.id] || 0}
                      </span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2"
                      onClick={() => toggleComments(post.id)}
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="font-korean text-sm">
                        {commentCounts[post.id] || 0}
                      </span>
                    </Button>
                  </div>

                  {showComments === post.id && (
                    <div className="border-t-2 border-border pt-4 mt-4 space-y-3">
                      <div className="space-y-2">
                        {comments[post.id]?.map((comment) => (
                          <div key={comment.id} className="flex gap-2">
                            <Avatar className="w-6 h-6 border border-primary flex-shrink-0">
                              <AvatarFallback className="bg-gradient-secondary text-secondary-foreground font-pixel text-xs">
                                {comment.display_name?.[0] || "모"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 bg-muted/30 rounded-sm p-2">
                              <div className="font-korean font-bold text-xs mb-1">
                                {comment.display_name || "모험가"}
                              </div>
                              <p className="font-korean text-sm">
                                {comment.content}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="댓글을 입력하세요..."
                          className="font-korean"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") addComment(post.id);
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => addComment(post.id)}
                          disabled={!newComment.trim()}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          </TabsContent>

          <TabsContent value="ranking" className="space-y-6">
            <Card className="bg-gradient-secondary border-2 border-secondary shadow-neon mb-2 animate-slide-up">
              <CardHeader>
                <CardTitle className="font-pixel text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-secondary-foreground" />
                  <span className="text-secondary-foreground">보상 안내</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="text-center">
                    <div className="font-pixel text-warning text-xl mb-1">
                      1위
                    </div>
                    <div className="font-korean text-xs text-secondary-foreground">
                      500 가루
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-pixel text-muted-foreground text-lg mb-1">
                      2-3위
                    </div>
                    <div className="font-korean text-xs text-secondary-foreground">
                      400 가루
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-pixel text-accent text-lg mb-1">
                      4-5위
                    </div>
                    <div className="font-korean text-xs text-secondary-foreground">
                      300 가루
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-pixel text-muted text-lg mb-1">
                      6-10위
                    </div>
                    <div className="font-korean text-xs text-secondary-foreground">
                      150 가루
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {rankingLoading ? (
              <Card className="p-8">
                <div className="text-center font-korean text-muted-foreground">
                  로딩 중...
                </div>
              </Card>
            ) : rankings.length === 0 ? (
              <Card className="p-8">
                <div className="text-center font-korean text-muted-foreground">
                  아직 랭킹 데이터가 없습니다.
                </div>
              </Card>
            ) : (
              rankings.map((entry, index) => (
                <Card
                  key={entry.user_id}
                  className={cn(
                    "border-2 transition-all shadow-card hover:shadow-neon animate-slide-up",
                    entry.user_id === currentUserId &&
                      "ring-2 ring-primary ring-offset-2 ring-offset-background",
                    entry.rank === 1 && "border-warning",
                    entry.rank === 2 && "border-muted-foreground",
                    entry.rank === 3 && "border-accent"
                  )}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            "w-12 h-12 rounded-sm flex items-center justify-center",
                            getRankBadgeColor(entry.rank)
                          )}
                        >
                          {getRankIcon(entry.rank)}
                        </div>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10 border-2 border-primary">
                            <AvatarFallback className="bg-gradient-primary text-primary-foreground font-pixel text-sm">
                              {entry.display_name?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-korean font-bold text-foreground">
                              {entry.display_name}
                              {entry.user_id === currentUserId && (
                                <span className="ml-2 text-xs text-primary">
                                  (나)
                                </span>
                              )}
                            </div>
                            <div className="font-korean text-xs text-muted-foreground">
                              {entry.total_exp} 가루
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {entry.daily_exp && entry.daily_exp.length > 0 && (
                          <div className="w-24 flex flex-col justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                                data={entry.daily_exp.map((exp, i) => ({
                                  exp,
                                  day: i,
                                }))}
                              >
                                <Line
                                  type="monotone"
                                  dataKey="exp"
                                  stroke={
                                    entry.user_id === currentUserId
                                      ? "hsl(var(--primary))"
                                      : "hsl(var(--muted-foreground))"
                                  }
                                  strokeWidth={2}
                                  dot={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        )}

                        <div className="text-right">
                          <div className="font-pixel text-lg text-warning">
                            +{entry.reward_garu}
                          </div>
                          <div className="font-korean text-xs text-muted-foreground">
                            가루
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function getRankIcon(rank: number) {
  if (rank === 1)
    return <Trophy className="w-6 h-6 text-warning animate-pulse-glow" />;
  if (rank === 2) return <Award className="w-6 h-6 text-muted-foreground" />;
  if (rank === 3) return <Award className="w-6 h-6 text-accent" />;
  return <Star className="w-5 h-5 text-muted-foreground" />;
}

function getRankBadgeColor(rank: number) {
  if (rank === 1) return "bg-warning text-warning-foreground";
  if (rank === 2) return "bg-muted-foreground text-white";
  if (rank === 3) return "bg-accent text-accent-foreground";
  return "bg-muted text-muted-foreground";
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
