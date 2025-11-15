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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EXP_CONSTANTS, checkLevelUp, getExpRequiredForNextLevel } from "@/utils/petLevel";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface RankingEntry {
  user_id: string;
  total_exp: number;
  rank: number;
  reward_garu: number;
  display_name?: string;
  daily_exp?: number[];
}

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

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [challengeForm, setChallengeForm] = useState({
    title: "",
    category: "",
    deadline: "",
  });

  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postImage, setPostImage] = useState<File | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [isPostLoading, setIsPostLoading] = useState(false);

  const [showComments, setShowComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [newComment, setNewComment] = useState("");
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());

  const [challenges, setChallenges] = useState<any[]>([]);

  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [rankingLoading, setRankingLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadPosts();
    loadChallenges();
    loadUserLikes();
  }, []);

  useEffect(() => {
    if (activeTab === "ranking") {
      loadCurrentSession();
      loadRankings();
    }
  }, [activeTab]);

  const loadCurrentSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setCurrentUserId(session?.user?.id ?? null);
  };

  const loadChallenges = async () => {
    const { data, error } = await supabase
      .from("chat_rooms")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setChallenges(data);
    }
  };

  const loadUserLikes = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", session.user.id);

    if (data) {
      setUserLikes(new Set(data.map((like) => like.post_id)));
    }
  };

  const loadPosts = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading posts:", error);
      return;
    }

    if (!data) {
      setPosts([]);
      return;
    }

    const userIds = [...new Set(data.map((p) => p.user_id))];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", userIds);

    const profilesMap = new Map(profilesData?.map((p) => [p.user_id, p]) || []);
    const enrichedPosts = data.map((post) => ({
      ...post,
      profiles: profilesMap.get(post.user_id),
    }));

    setPosts(enrichedPosts);

    const postIds = data.map((p) => p.id);
    loadLikeCounts(postIds);
    loadCommentCounts(postIds);
  };

  const loadLikeCounts = async (postIds: string[]) => {
    const { data } = await supabase
      .from("post_likes")
      .select("post_id")
      .in("post_id", postIds);

    if (data) {
      const counts: Record<string, number> = {};
      data.forEach((like) => {
        counts[like.post_id] = (counts[like.post_id] || 0) + 1;
      });
      setLikeCounts(counts);
    }
  };

  const loadCommentCounts = async (postIds: string[]) => {
    const { data } = await supabase
      .from("post_comments")
      .select("post_id")
      .in("post_id", postIds);

    if (data) {
      const counts: Record<string, number> = {};
      data.forEach((comment) => {
        counts[comment.post_id] = (counts[comment.post_id] || 0) + 1;
      });
      setCommentCounts(counts);
    }
  };

  const loadComments = async (postId: string) => {
    const { data, error } = await supabase
      .from("post_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading comments:", error);
      return;
    }
    if (!data) return;

    const userIds = [...new Set(data.map((c) => c.user_id))];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", userIds);

    const profilesMap = new Map(profilesData?.map((p) => [p.user_id, p]) || []);
    const enrichedComments = data.map((comment) => ({
      ...comment,
      profiles: profilesMap.get(comment.user_id),
    }));
    setComments((prev) => ({ ...prev, [postId]: enrichedComments }));
  };

  const toggleLike = async (postId: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      toast({ title: "로그인이 필요합니다", variant: "destructive" });
      navigate("/auth");
      return;
    }

    const isLiked = userLikes.has(postId);

    if (isLiked) {
      await supabase
        .from("post_likes")
        .delete()
        .eq("user_id", session.user.id)
        .eq("post_id", postId);

      setUserLikes((prev) => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
      setLikeCounts((prev) => ({
        ...prev,
        [postId]: Math.max(0, (prev[postId] || 0) - 1),
      }));
    } else {
      await supabase.from("post_likes").insert({
        user_id: session.user.id,
        post_id: postId,
      });

      setUserLikes((prev) => new Set(prev).add(postId));
      setLikeCounts((prev) => ({
        ...prev,
        [postId]: (prev[postId] || 0) + 1,
      }));

      const { data: post } = await supabase
        .from("posts")
        .select("user_id")
        .eq("id", postId)
        .single();

      if (post && post.user_id !== session.user.id) {
        const today = new Date().toISOString().split("T")[0];

        const { data: postExp } = await supabase
          .from("post_like_exp")
          .select("exp_gained")
          .eq("post_id", postId)
          .eq("user_id", post.user_id)
          .eq("exp_date", today)
          .maybeSingle();

        const { data: allPostsExp } = await supabase
          .from("post_like_exp")
          .select("exp_gained")
          .eq("user_id", post.user_id)
          .eq("exp_date", today);

        const totalDailyExp =
          allPostsExp?.reduce((sum, record) => sum + record.exp_gained, 0) || 0;
        const postDailyExp = postExp?.exp_gained || 0;

        if (
          postDailyExp < EXP_CONSTANTS.POST_DAILY_LIMIT &&
          totalDailyExp < EXP_CONSTANTS.DAILY_FEED_LIMIT
        ) {
          const expToAdd = EXP_CONSTANTS.POST_LIKE;
          const today = new Date().toISOString().split("T")[0];

          if (postExp) {
            await supabase
              .from("post_like_exp")
              .update({ exp_gained: postDailyExp + expToAdd })
              .eq("post_id", postId)
              .eq("user_id", post.user_id)
              .eq("exp_date", today);
          } else {
            const { error: insertErr } = await supabase
              .from("post_like_exp")
              .insert({
                post_id: postId,
                user_id: post.user_id,
                exp_gained: expToAdd,
                exp_date: today,
              });

            if (insertErr) {
              console.error(insertErr);
              toast({ title: "경험치 기록 실패", variant: "destructive" });
            }
          }
          const { data: mainPet } = await supabase
            .from("pets")
            .select("id, experience, level")
            .eq("user_id", post.user_id)
            .eq("is_main", true)
            .maybeSingle();

          if (mainPet) {
            const newExp = mainPet.experience + expToAdd;
            const { newLevel, totalReward } = checkLevelUp(newExp, mainPet.level);

            if (newLevel > mainPet.level) {
              const expRequired = getExpRequiredForNextLevel(mainPet.level);
              await supabase
                .from("pets")
                .update({
                  experience: newExp - expRequired,
                  level: newLevel,
                })
                .eq("id", mainPet.id);

              const { data: powderData } = await supabase
                .from("user_powder")
                .select("amount")
                .eq("user_id", post.user_id)
                .single();

              if (powderData) {
                await supabase
                  .from("user_powder")
                  .update({ amount: powderData.amount + totalReward })
                  .eq("user_id", post.user_id);
              }
            } else {
              await supabase
                .from("pets")
                .update({ experience: newExp })
                .eq("id", mainPet.id);
            }
          }
        }
      }
    }
  };

  const addComment = async (postId: string) => {
    if (!newComment.trim()) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      toast({ title: "로그인이 필요합니다", variant: "destructive" });
      navigate("/auth");
      return;
    }

    const { error } = await supabase.from("post_comments").insert({
      user_id: session.user.id,
      post_id: postId,
      content: newComment.trim(),
    });

    if (error) {
      toast({ title: "댓글 작성 실패", variant: "destructive" });
      return;
    }

    setNewComment("");
    loadComments(postId);
    setCommentCounts((prev) => ({
      ...prev,
      [postId]: (prev[postId] || 0) + 1,
    }));
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

  const loadRankings = async () => {
    setRankingLoading(true);

    try {
      const now = new Date();

      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

      const { data: petClickData } = await supabase
        .from("pet_clicks")
        .select("pet_id, clicked_by_user_id, click_date")
        .gte("click_date", sevenDaysAgoStr);

      const { data: postLikeData } = await supabase
        .from("post_like_exp")
        .select("user_id, exp_gained, exp_date")
        .gte("exp_date", sevenDaysAgoStr);

      const userExpMap = new Map<string, number>();
      const userDailyExpMap = new Map<string, number[]>();

      if (petClickData && petClickData.length > 0) {
        const petIds = [...new Set(petClickData.map((c) => c.pet_id))];
        const { data: petsData } = await supabase
          .from("pets")
          .select("id, user_id")
          .in("id", petIds);

        const petOwnerMap = new Map(petsData?.map((p) => [p.id, p.user_id]) || []);
        const dailyExpByUser = new Map<string, Map<string, number>>();

        petClickData.forEach((click) => {
          const ownerId = petOwnerMap.get(click.pet_id);
          if (!ownerId) return;

          userExpMap.set(ownerId, (userExpMap.get(ownerId) || 0) + 5);

          if (!dailyExpByUser.has(ownerId)) {
            dailyExpByUser.set(ownerId, new Map());
          }
          const userDailyMap = dailyExpByUser.get(ownerId)!;
          userDailyMap.set(click.click_date, (userDailyMap.get(click.click_date) || 0) + 5);
        });

        dailyExpByUser.forEach((dailyMap, userId) => {
          const dailyArray: number[] = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            const dateStr = d.toISOString().split("T")[0];
            dailyArray.push(dailyMap.get(dateStr) || 0);
          }
          userDailyExpMap.set(userId, dailyArray);
        });
      }

      if (postLikeData && postLikeData.length > 0) {
        postLikeData.forEach((like) => {
          userExpMap.set(like.user_id, (userExpMap.get(like.user_id) || 0) + like.exp_gained);

          if (!userDailyExpMap.has(like.user_id)) {
            userDailyExpMap.set(like.user_id, new Array(7).fill(0));
          }
          const diffDays = Math.floor(
            (now.getTime() - new Date(like.exp_date).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (diffDays >= 0 && diffDays < 7) {
            const arr = userDailyExpMap.get(like.user_id)!;
            arr[6 - diffDays] += like.exp_gained;
          }
        });
      }

      const sortedUsers = Array.from(userExpMap.entries())
        .map(([user_id, total_exp]) => ({ user_id, total_exp }))
        .sort((a, b) => b.total_exp - a.total_exp)
        .slice(0, 10);

      const userIds = sortedUsers.map((u) => u.user_id);
      let profileMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", userIds);
        profileMap = new Map(profilesData?.map((p) => [p.user_id, p.display_name]) || []);
      }

      const rankingEntries: RankingEntry[] = sortedUsers.map((u, idx) => ({
        user_id: u.user_id,
        total_exp: u.total_exp,
        rank: idx + 1,
        reward_garu: RANKING_REWARDS[idx + 1] || 0,
        display_name: profileMap.get(u.user_id) || "알 수 없음",
        daily_exp: userDailyExpMap.get(u.user_id) || new Array(7).fill(0),
      }));

      setRankings(rankingEntries);
    } catch (e) {
      console.error("Error loading rankings:", e);
      toast({
        title: "랭킹 로드 실패",
        description: "랭킹 정보를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setRankingLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-warning animate-pulse-glow" />;
    if (rank === 2) return <Award className="w-6 h-6 text-muted-foreground" />;
    if (rank === 3) return <Award className="w-6 h-6 text-accent" />;
    return <Star className="w-5 h-5 text-muted-foreground" />;
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return "bg-warning text-warning-foreground";
    if (rank === 2) return "bg-muted-foreground text-white";
    if (rank === 3) return "bg-accent text-accent-foreground";
    return "bg-muted text-muted-foreground";
  };

  const handleCreateChallenge = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      toast({ title: "로그인이 필요합니다", variant: "destructive" });
      navigate("/auth");
      return;
    }

    if (!challengeForm.title || !challengeForm.category) {
      toast({ title: "모든 필드를 입력해주세요", variant: "destructive" });
      return;
    }

    const { data: newRoom, error } = await supabase
      .from("chat_rooms")
      .insert({
        challenge_id: challengeForm.title,
        name: challengeForm.title,
        category: challengeForm.category,
        deadline: challengeForm.deadline || null,
      })
      .select("id")
      .single();

    if (error) {
      toast({ title: "도전방 생성 실패", variant: "destructive" });
      return;
    }

    toast({ title: "도전방이 생성되었습니다!" });
    setIsCreateDialogOpen(false);
    setChallengeForm({ title: "", category: "", deadline: "" });
    loadChallenges();
    navigate(`/chat/${newRoom.id}`);
  };

  const handleCreatePost = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      toast({ title: "로그인이 필요합니다", variant: "destructive" });
      navigate("/auth");
      return;
    }

    if (!postContent.trim()) {
      toast({ title: "내용을 입력해주세요", variant: "destructive" });
      return;
    }

    setIsPostLoading(true);

    let imageUrl: string | null = null;
    if (postImage) {
      const fileExt = postImage.name.split(".").pop();
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(fileName, postImage);

      if (uploadError) {
        toast({ title: "이미지 업로드 실패", variant: "destructive" });
        setIsPostLoading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("post-images")
        .getPublicUrl(fileName);

      imageUrl = urlData.publicUrl;
    }

    const { error } = await supabase.from("posts").insert({
      user_id: session.user.id,
      content: postContent,
      image_url: imageUrl,
    });

    if (error) {
      toast({ title: "게시글 작성 실패", variant: "destructive" });
    } else {
      toast({ title: "게시글이 작성되었습니다!" });
      setPostContent("");
      setPostImage(null);
      setIsPostDialogOpen(false);
      loadPosts();
    }

    setIsPostLoading(false);
  };

  const handleJoinChallenge = async (roomId: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      toast({ title: "로그인이 필요합니다", variant: "destructive" });
      navigate("/auth");
      return;
    }

    navigate(`/chat/${roomId}`);
  };

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8 animate-slide-up">
          <h1 className="font-pixel text-2xl sm:text-3xl mb-4 text-foreground">커뮤니티</h1>
          <p className="font-korean text-muted-foreground">함께 목표를 달성하고 동기부여를 받아보세요</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-auto bg-card/50 p-1 border-2 border-border">
            <TabsTrigger value="challenges" className="font-korean data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              도전방
            </TabsTrigger>
            <TabsTrigger value="feed" className="font-korean data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              피드
            </TabsTrigger>
            <TabsTrigger value="ranking" className="font-korean data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              랭킹
            </TabsTrigger>
          </TabsList>

          <TabsContent value="challenges" className="space-y-6">
            <Card className="bg-gradient-primary border-2 border-primary shadow-neon">
              <CardContent className="p-6">
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="hero" size="lg" className="w-full sm:w-auto">
                      <Users className="w-5 h-5" />
                      도전방 만들기
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle className="font-korean text-xl">도전방 만들기</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="title" className="font-korean">방 제목</Label>
                        <Input
                          id="title"
                          placeholder="예: 30일 운동 챌린지"
                          value={challengeForm.title}
                          onChange={(e) => setChallengeForm({ ...challengeForm, title: e.target.value })}
                          className="font-korean"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category" className="font-korean">카테고리</Label>
                        <Input
                          id="category"
                          placeholder="예: 운동, 독서, 공부, 습관"
                          value={challengeForm.category}
                          onChange={(e) => setChallengeForm({ ...challengeForm, category: e.target.value })}
                          className="font-korean"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="deadline" className="font-korean">마감일 (선택)</Label>
                        <Input
                          id="deadline"
                          type="date"
                          value={challengeForm.deadline}
                          onChange={(e) => setChallengeForm({ ...challengeForm, deadline: e.target.value })}
                          className="font-korean"
                        />
                      </div>
                      <Button variant="neon" className="w-full" onClick={handleCreateChallenge}>
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
                  ? Math.ceil((new Date(challenge.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  : null;

                return (
                  <Card
                    key={challenge.id}
                    className="bg-card border-2 border-border hover:border-primary transition-all shadow-card hover:shadow-neon cursor-pointer animate-slide-up"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="font-korean text-lg mb-2">{challenge.name}</CardTitle>
                          {challenge.category && (
                            <div className="inline-block px-2 py-1 bg-primary/20 rounded-sm border border-primary">
                              <span className="font-korean text-xs text-primary">{challenge.category}</span>
                            </div>
                          )}
                        </div>
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
                      <Button variant="neon" size="sm" className="w-full" onClick={() => handleJoinChallenge(challenge.id)}>
                        참가하기
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="feed" className="space-y-6">
            <Card className="bg-gradient-primary border-2 border-primary shadow-neon">
              <CardContent className="p-6">
                <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="hero" size="lg" className="w-full sm:w-auto">
                      <Send className="w-5 h-5" />
                      피드 작성하기
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle className="font-korean text-xl">새 게시글 작성</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="post-content" className="font-korean">내용</Label>
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
                          onChange={(e) => setPostImage(e.target.files?.[0] || null)}
                          className="hidden"
                          id="post-image-dialog"
                        />
                        <Label htmlFor="post-image-dialog" className="cursor-pointer">
                          <div className="flex items-center gap-2 px-4 py-3 border-2 border-border rounded-sm hover:border-primary transition-colors">
                            <ImageIcon className="w-5 h-5" />
                            <span className="font-korean">{postImage ? postImage.name : "이미지 선택"}</span>
                          </div>
                        </Label>
                      </div>
                      <Button variant="neon" className="w-full" onClick={handleCreatePost} disabled={isPostLoading}>
                        {isPostLoading ? "게시 중..." : "게시하기"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {posts.map((post, i) => (
              <Card
                key={post.id}
                className="bg-card border-2 border-border shadow-card animate-slide-up"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <Avatar className="w-12 h-12 border-2 border-primary">
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground font-pixel text-sm">
                        {post.profiles?.display_name?.[0] || "모"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-korean font-bold">{post.profiles?.display_name || "모험가"}</span>
                      </div>
                      <p className="font-korean text-sm text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
                      </p>
                    </div>
                  </div>
                  <p className="font-korean mb-4">{post.content}</p>
                  {post.image_url && (
                    <img src={post.image_url} alt="Post" className="w-full rounded-sm border-2 border-border mb-4" />
                  )}
                  <div className="flex items-center gap-4 mb-4">
                    <Button variant="ghost" size="sm" className="gap-2" onClick={() => toggleLike(post.id)}>
                      <Heart className={`w-4 h-4 ${userLikes.has(post.id) ? "fill-primary text-primary" : ""}`} />
                      <span className="font-korean text-sm">{likeCounts[post.id] || 0}</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-2" onClick={() => toggleComments(post.id)}>
                      <MessageCircle className="w-4 h-4" />
                      <span className="font-korean text-sm">{commentCounts[post.id] || 0}</span>
                    </Button>
                  </div>

                  {showComments === post.id && (
                    <div className="border-t-2 border-border pt-4 mt-4 space-y-3">
                      <div className="space-y-2">
                        {comments[post.id]?.map((comment) => (
                          <div key={comment.id} className="flex gap-2">
                            <Avatar className="w-6 h-6 border border-primary flex-shrink-0">
                              <AvatarFallback className="bg-gradient-secondary text-secondary-foreground font-pixel text-xs">
                                {comment.profiles?.display_name?.[0] || "모"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 bg-muted/30 rounded-sm p-2">
                              <div className="font-korean font-bold text-xs mb-1">
                                {comment.profiles?.display_name || "모험가"}
                              </div>
                              <p className="font-korean text-sm">{comment.content}</p>
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
                          onKeyPress={(e) => {
                            if (e.key === "Enter") addComment(post.id);
                          }}
                        />
                        <Button size="sm" onClick={() => addComment(post.id)} disabled={!newComment.trim()}>
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
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
                    <div className="font-pixel text-warning text-xl mb-1">1위</div>
                    <div className="font-korean text-xs text-secondary-foreground">500 가루</div>
                  </div>
                  <div className="text-center">
                    <div className="font-pixel text-muted-foreground text-lg mb-1">2-3위</div>
                    <div className="font-korean text-xs text-secondary-foreground">400 가루</div>
                  </div>
                  <div className="text-center">
                    <div className="font-pixel text-accent text-lg mb-1">4-5위</div>
                    <div className="font-korean text-xs text-secondary-foreground">300 가루</div>
                  </div>
                  <div className="text-center">
                    <div className="font-pixel text-muted text-lg mb-1">6-10위</div>
                    <div className="font-korean text-xs text-secondary-foreground">150 가루</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {rankingLoading ? (
              <Card className="p-8">
                <div className="text-center font-korean text-muted-foreground">로딩 중...</div>
              </Card>
            ) : rankings.length === 0 ? (
              <Card className="p-8">
                <div className="text-center font-korean text-muted-foreground">아직 랭킹 데이터가 없습니다.</div>
              </Card>
            ) : (
              rankings.map((entry, index) => (
                <Card
                  key={entry.user_id}
                  className={cn(
                    "border-2 transition-all shadow-card hover:shadow-neon animate-slide-up",
                    entry.user_id === currentUserId && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                    entry.rank === 1 && "border-warning",
                    entry.rank === 2 && "border-muted-foreground",
                    entry.rank === 3 && "border-accent"
                  )}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn("w-12 h-12 rounded-sm flex items-center justify-center", getRankBadgeColor(entry.rank))}>
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
                                <span className="ml-2 text-xs text-primary">(나)</span>
                              )}
                            </div>
                            <div className="font-korean text-xs text-muted-foreground">{entry.total_exp} EXP</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {entry.daily_exp && entry.daily_exp.length > 0 && (
                          <div className="w-24 h-12">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={entry.daily_exp.map((exp, i) => ({ exp, day: i }))}>
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
                            <div className="text-center mt-1">
                              <span className="font-korean text-xs text-muted-foreground">
                                오늘:{" "}
                                <span className={cn("font-bold", entry.user_id === currentUserId && "text-primary")}>
                                  {entry.daily_exp[6]}
                                </span>
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="text-right">
                          <div className="font-pixel text-lg text-warning">+{entry.reward_garu}</div>
                          <div className="font-korean text-xs text-muted-foreground">가루</div>
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

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
