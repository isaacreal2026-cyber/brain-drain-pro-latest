import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Brain, CheckCircle2, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

interface Question {
  id: string;
  text: string;
  category: "openness" | "conscientiousness" | "extraversion" | "agreeableness" | "neuroticism";
}

const QUESTIONS: Question[] = [
  { id: "q1", text: "I have a rich vocabulary and enjoy complex ideas.", category: "openness" },
  { id: "q2", text: "I am always prepared and follow a schedule.", category: "conscientiousness" },
  { id: "q3", text: "I am the life of the party and feel comfortable around people.", category: "extraversion" },
  { id: "q4", text: "I sympathize with others' feelings and make people feel at ease.", category: "agreeableness" },
  { id: "q5", text: "I get stressed out easily and worry about things.", category: "neuroticism" },
  { id: "q6", text: "I spend time reflecting on things and enjoy exploring new concepts.", category: "openness" },
  { id: "q7", text: "I pay attention to details and like order.", category: "conscientiousness" },
];

export function PersonalityTestPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      if (user) {
        try {
          const docRef = doc(db, "personality_tests", user.uid);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            setAnswers(data.answers || {});
            if (data.isCompleted) setIsCompleted(true);
            else setCurrentStep(Object.keys(data.answers || {}).length);
          }
        } catch (e: any) {
          console.error(e);
          toast({ title: "Error", description: "Failed to load test progress.", variant: "destructive" });
        }
      }
      setLoading(false);
    };
    fetchProgress();
  }, [user]);

  const saveProgress = async (newAnswers: Record<string, number>, completed = false) => {
    if (!user) return;
    try {
      await setDoc(doc(db, "personality_tests", user.uid), {
        answers: newAnswers,
        isCompleted: completed,
        updatedAt: Date.now()
      }, { merge: true });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: "Failed to save test progress.", variant: "destructive" });
    }
  };

  const handleAnswer = (score: number) => {
    const qId = QUESTIONS[currentStep].id;
    const newAnswers = { ...answers, [qId]: score };
    setAnswers(newAnswers);
    
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(prev => prev + 1);
      saveProgress(newAnswers);
    } else {
      setIsCompleted(true);
      saveProgress(newAnswers, true);
    }
  };

  const handleReset = () => {
    setAnswers({});
    setCurrentStep(0);
    setIsCompleted(false);
    saveProgress({});
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>;

  if (isCompleted) {
    // Calculate trait scores
    const scores = { openness: 0, conscientiousness: 0, extraversion: 0, agreeableness: 0, neuroticism: 0 };
    Object.entries(answers).forEach(([qId, score]) => {
      const q = QUESTIONS.find(q => q.id === qId);
      if (q) scores[q.category] += score;
    });

    return (
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold">Your Cognitive Profile</h1>
          <p className="text-muted-foreground mt-2">These traits will be used to hyper-personalize your mission recommendations.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(scores).map(([trait, score]) => (
            <Card key={trait} className="overflow-hidden">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="mb-2 flex justify-between items-center">
                  <span className="font-semibold capitalize">{trait}</span>
                  <span className="text-sm font-bold text-primary">{Math.round((score / 10) * 100)}%</span>
                </div>
                <Progress value={(score / 10) * 100} className="h-2" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-center mt-8">
          <Button variant="outline" onClick={handleReset}>Retake Assessment</Button>
        </div>
      </div>
    );
  }

  const question = QUESTIONS[currentStep];

  return (
    <div className="max-w-2xl mx-auto p-6 min-h-[80vh] flex flex-col justify-center">
      <div className="mb-8">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Question {currentStep + 1} of {QUESTIONS.length}</span>
          <span>{Math.round((currentStep / QUESTIONS.length) * 100)}%</span>
        </div>
        <Progress value={(currentStep / QUESTIONS.length) * 100} className="h-2" />
      </div>

      <div className="text-center mb-10">
        <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Brain className="w-6 h-6" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold leading-tight">{question.text}</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 max-w-xl mx-auto w-full">
        <Button variant="outline" className="h-16 flex flex-col items-center justify-center border-red-500/20 hover:bg-red-500/10 hover:text-red-500" onClick={() => handleAnswer(1)}>
          <span className="text-lg">Strongly Disagree</span>
        </Button>
        <Button variant="outline" className="h-16" onClick={() => handleAnswer(2)}>Disagree</Button>
        <Button variant="outline" className="h-16" onClick={() => handleAnswer(3)}>Neutral</Button>
        <Button variant="outline" className="h-16" onClick={() => handleAnswer(4)}>Agree</Button>
        <Button variant="outline" className="h-16 flex flex-col items-center justify-center border-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-500" onClick={() => handleAnswer(5)}>
          <span className="text-lg">Strongly Agree</span>
        </Button>
      </div>

      <div className="flex justify-between mt-12">
        <Button variant="ghost" disabled={currentStep === 0} onClick={() => setCurrentStep(prev => prev - 1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Previous
        </Button>
      </div>
    </div>
  );
}
