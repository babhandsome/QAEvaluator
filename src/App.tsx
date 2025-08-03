import React, { useState, useRef } from 'react';
import './App.css';

interface EvaluationCriteria {
  id: string;
  name: string;
  description: string;
  maxScore: number;
  weight: number;
  keywords?: string[];
  requiredKeywords?: string[];
  category?: string;
}

interface ScoreResult {
  criteriaId: string;
  score: number;
  feedback: string;
}

interface CallAnalysis {
  transcript: string;
  scores: ScoreResult[];
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
}

const App: React.FC = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [analysis, setAnalysis] = useState<CallAnalysis | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [rubricFile, setRubricFile] = useState<File | null>(null);
  const [evaluationCriteria, setEvaluationCriteria] = useState<EvaluationCriteria[]>([]);
  const [isLoadingRubric, setIsLoadingRubric] = useState<boolean>(false);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const rubricFileInputRef = useRef<HTMLInputElement>(null);

  // AssemblyAI configuration
  const TRANSCRIPTION_SERVICE = 'assemblyai';
  const ASSEMBLYAI_API_KEY = '28fd10931fca461ea0af27b64bf90b03';

  // Default evaluation criteria (fallback if no rubric uploaded)
  const defaultEvaluationCriteria: EvaluationCriteria[] = [
    {
      id: 'greeting_script',
      name: 'Greeting & Opening',
      description: 'Agent adhered to greeting script, identified themselves, mentioned company name, and offered assistance',
      maxScore: 25,
      weight: 2.5,
      keywords: ['good morning', 'good afternoon', 'hello', 'my name is', 'thank you for calling', 'how can i help'],
      category: 'Opening'
    },
    {
      id: 'problem_solving',
      name: 'Problem Solving Abilities',
      description: 'Agent took ownership, asked pertinent questions, provided appropriate solutions, and confirmed resolution',
      maxScore: 30,
      weight: 3.0,
      keywords: ['sorry', 'apologize', 'let me help', 'solution', 'resolve', 'fix'],
      category: 'Problem Resolution'
    },
    {
      id: 'closure',
      name: 'Call Closure',
      description: 'Agent followed closure guidelines, asked for additional questions, and thanked customer',
      maxScore: 15,
      weight: 1.5,
      keywords: ['anything else', 'additional questions', 'thank you'],
      category: 'Closing'
    }
  ];

  // Initialize with default criteria
  React.useEffect(() => {
    if (evaluationCriteria.length === 0) {
      setEvaluationCriteria(defaultEvaluationCriteria);
    }
  }, []);

  const handleAudioFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('audio/')) {
        setAudioFile(file);
        const blob = new Blob([file], { type: file.type });
        setAudioBlob(blob);
        setTranscript('');
        setAnalysis(null);
      } else {
        alert('Please upload a valid audio file');
      }
    }
  };

  const handleRubricFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.includes('sheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setRubricFile(file);
        setIsLoadingRubric(true);
        try {
          await parseRubricFile(file);
        } catch (error) {
          console.error('Failed to parse rubric file:', error);
          alert('Failed to parse rubric file. Please check the format and try again.');
        } finally {
          setIsLoadingRubric(false);
        }
      } else {
        alert('Please upload a valid Excel file (.xlsx or .xls)');
      }
    }
  };

  const parseRubricFile = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockParsedCriteria: EvaluationCriteria[] = [
        {
          id: 'custom_greeting',
          name: 'Professional Greeting',
          description: 'Agent provides warm, professional greeting with identification',
          maxScore: 20,
          weight: 2.0,
          keywords: ['good morning', 'good afternoon', 'hello', 'my name is'],
          requiredKeywords: ['thank you for calling'],
          category: 'Opening'
        },
        {
          id: 'custom_empathy',
          name: 'Empathy & Understanding',
          description: 'Agent demonstrates empathy and understanding of customer situation',
          maxScore: 25,
          weight: 2.5,
          keywords: ['sorry', 'understand', 'frustrating', 'apologize'],
          category: 'Soft Skills'
        },
        {
          id: 'custom_resolution',
          name: 'Issue Resolution',
          description: 'Agent effectively resolves customer issue with clear steps',
          maxScore: 30,
          weight: 3.0,
          keywords: ['solution', 'fix', 'resolve', 'steps', 'help'],
          requiredKeywords: ['let me help'],
          category: 'Problem Solving'
        },
        {
          id: 'custom_followup',
          name: 'Follow-up & Closure',
          description: 'Agent ensures customer satisfaction and provides proper closure',
          maxScore: 15,
          weight: 1.5,
          keywords: ['anything else', 'questions', 'satisfied', 'help'],
          category: 'Closing'
        }
      ];

      setEvaluationCriteria(mockParsedCriteria);
      console.log('✅ Custom rubric loaded successfully:', mockParsedCriteria);
      setAnalysis(null);

    } catch (error) {
      console.error('Error parsing rubric file:', error);
      throw error;
    }
  };

  const transcribeAudio = async () => {
    if (!audioBlob) return;

    setIsTranscribing(true);

    try {
      let transcriptText = '';

      switch (TRANSCRIPTION_SERVICE) {
        case 'assemblyai':
          transcriptText = await transcribeWithAssemblyAI(audioBlob);
          break;
        default:
          throw new Error('No transcription service selected');
      }

      setTranscript(transcriptText);
    } catch (error) {
      console.error('Transcription failed:', error);
      alert(`Transcription failed: ${error.message}. Please try again.`);
    } finally {
      setIsTranscribing(false);
    }
  };

  const transcribeWithAssemblyAI = async (audioBlob: Blob): Promise<string> => {
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', audioBlob);

      console.log('Uploading audio file to AssemblyAI...');
      const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
        method: 'POST',
        headers: {
          'authorization': ASSEMBLYAI_API_KEY,
        },
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      const { upload_url } = await uploadResponse.json() as { upload_url: string };
      console.log('Audio uploaded successfully:', upload_url);

      console.log('Requesting transcription...');
      const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: {
          'authorization': ASSEMBLYAI_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          audio_url: upload_url,
          speaker_labels: true,
          punctuate: true,
          format_text: false,
          disfluencies: true,
          boost_param: 'high'
        }),
      });

      if (!transcriptResponse.ok) {
        const errorData = await transcriptResponse.text();
        console.error('Transcription request error:', errorData);
        throw new Error(`Transcription request failed: ${transcriptResponse.status} - ${errorData}`);
      }

      const transcript = await transcriptResponse.json() as any;
      console.log('Transcription requested, ID:', transcript.id);

      return await pollForTranscription(transcript.id);
    } catch (error) {
      console.error('AssemblyAI transcription error:', error);
      throw error;
    }
  };

  const pollForTranscription = async (transcriptId: string): Promise<string> => {
    console.log('Polling for transcription completion...');
    let attempts = 0;
    const maxAttempts = 60;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
          headers: {
            'authorization': ASSEMBLYAI_API_KEY,
          },
        });

        if (!response.ok) {
          throw new Error(`Polling failed: ${response.status}`);
        }

        const transcript = await response.json();
        console.log('Transcription status:', transcript.status);

        if (transcript.status === 'completed') {
          console.log('Transcription completed successfully!');
          console.log('Confidence score:', transcript.confidence);
          console.log('Audio duration:', transcript.audio_duration, 'seconds');

          if (transcript.confidence) {
            const confidencePercentage = (transcript.confidence * 100).toFixed(1);
            console.log(`Transcription confidence: ${confidencePercentage}%`);

            if (transcript.confidence < 0.85) {
              console.warn(`⚠️ Lower confidence detected (${confidencePercentage}%). Consider improving audio quality.`);
            }
          }

          if (transcript.utterances && transcript.utterances.length > 0) {
            console.log('Processing', transcript.utterances.length, 'utterances with speaker labels');

            if (transcript.words && transcript.words.length > 0) {
              const wordConfidences = transcript.words.map((w: any) => w.confidence || 0);
              const avgWordConfidence = wordConfidences.reduce((a: number, b: number) => a + b, 0) / wordConfidences.length;
              console.log(`Average word confidence: ${(avgWordConfidence * 100).toFixed(1)}%`);

              const lowConfidenceWords = transcript.words.filter((w: any) => (w.confidence || 0) < 0.7);
              if (lowConfidenceWords.length > 0) {
                console.warn(`⚠️ ${lowConfidenceWords.length} words with low confidence detected. Consider manual review.`);
                console.log('Low confidence words:', lowConfidenceWords.map((w: any) => `"${w.text}" (${(w.confidence * 100).toFixed(1)}%)`));
              }
            }

            return formatTranscriptWithAgentCustomer(transcript.utterances, transcript.words);
          }

          return transcript.text;
        } else if (transcript.status === 'error') {
          throw new Error(`Transcription failed: ${transcript.error}`);
        }

        await new Promise(resolve => setTimeout(resolve, 3000));
        attempts++;
      } catch (error) {
        console.error('Polling error:', error);
        throw error;
      }
    }

    throw new Error('Transcription timeout - please try again with a shorter audio file');
  };

  const formatTranscriptWithAgentCustomer = (utterances: any[], words?: any[]): string => {
    if (utterances.length === 0) return '';

    console.log('🔍 Analyzing transcript for Agent/Customer identification...');

    const speakerAnalysis: { [key: string]: { 
      wordCount: number, 
      hasGreeting: boolean, 
      hasCompanyName: boolean,
      hasProfessionalTerms: boolean,
      utteranceCount: number,
      avgConfidence: number,
      totalConfidence: number,
      confidenceCount: number
    } } = {};

    const agentKeywords = [
      'thank you for calling', 'my name is', 'how can i help', 'how may i assist',
      'i understand', 'let me help', 'i apologize', 'company', 'our system',
      'i can help you with', 'let me check', 'i see here', 'our records show',
      'i would be happy to', 'is there anything else', 'thank you for your patience',
      'um let me', 'uh i can', 'so what i can do', 'okay so'
    ];

    const greetingWords = ['good morning', 'good afternoon', 'good evening', 'hello', 'hi there'];
    const companyIndicators = ['calling', 'support', 'service', 'company', 'department'];

    utterances.forEach(utterance => {
      const speaker = utterance.speaker;
      const text = utterance.text.toLowerCase();

      if (!speakerAnalysis[speaker]) {
        speakerAnalysis[speaker] = {
          wordCount: 0,
          hasGreeting: false,
          hasCompanyName: false,
          hasProfessionalTerms: false,
          utteranceCount: 0,
          avgConfidence: 0,
          totalConfidence: 0,
          confidenceCount: 0
        };
      }

      const wordCount = utterance.words ? utterance.words.length : utterance.text.split(' ').length;
      speakerAnalysis[speaker].wordCount += wordCount;
      speakerAnalysis[speaker].utteranceCount++;

      if (utterance.confidence) {
        speakerAnalysis[speaker].totalConfidence += utterance.confidence;
        speakerAnalysis[speaker].confidenceCount++;
        speakerAnalysis[speaker].avgConfidence = speakerAnalysis[speaker].totalConfidence / speakerAnalysis[speaker].confidenceCount;
      }

      if (greetingWords.some(word => text.includes(word))) {
        speakerAnalysis[speaker].hasGreeting = true;
      }

      if (companyIndicators.some(word => text.includes(word))) {
        speakerAnalysis[speaker].hasCompanyName = true;
      }

      if (agentKeywords.some(phrase => text.includes(phrase))) {
        speakerAnalysis[speaker].hasProfessionalTerms = true;
      }
    });

    let agentSpeaker = '';
    let maxAgentScore = -1;

    Object.keys(speakerAnalysis).forEach(speaker => {
      const analysis = speakerAnalysis[speaker];
      let agentScore = 0;

      if (analysis.hasGreeting) agentScore += 3;
      if (analysis.hasCompanyName) agentScore += 4;
      if (analysis.hasProfessionalTerms) agentScore += 5;

      const avgWordsPerUtterance = analysis.wordCount / analysis.utteranceCount;
      if (avgWordsPerUtterance > 15) agentScore += 2;

      if (speaker === utterances[0].speaker) agentScore += 2;

      console.log(`👤 Speaker ${speaker} analysis:`, {
        score: agentScore,
        confidence: `${(analysis.avgConfidence * 100).toFixed(1)}%`,
        ...analysis,
        avgWordsPerUtterance: avgWordsPerUtterance.toFixed(1)
      });

      if (agentScore > maxAgentScore) {
        maxAgentScore = agentScore;
        agentSpeaker = speaker;
      }
    });

    console.log(`✅ Identified Agent: Speaker ${agentSpeaker} (confidence-weighted)`);

    const formattedTranscript = utterances.map((utterance, index) => {
      const label = utterance.speaker === agentSpeaker ? 'Agent' : 'Customer';
      return `${label}: ${utterance.text}`;
    }).join('\n\n');

    const totalUtterances = utterances.length;
    const avgConfidence = utterances.reduce((sum, u) => sum + (u.confidence || 0), 0) / totalUtterances;

    console.log(`📊 Transcript Quality Summary:
    - Total utterances: ${totalUtterances}
    - Average confidence: ${(avgConfidence * 100).toFixed(1)}%
    - Agent speaker: ${agentSpeaker}
    - Customer speaker: ${Object.keys(speakerAnalysis).find(s => s !== agentSpeaker) || 'Unknown'}`);

    return formattedTranscript;
  };

  const analyzeTranscript = () => {
    if (!transcript) return;
    if (evaluationCriteria.length === 0) {
      alert('Please upload a scoring rubric first');
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      const scores: ScoreResult[] = evaluationCriteria.map(criteria => {
        let score = 0;
        let feedback = '';

        // Advanced scoring logic based on criteria analysis
        switch (criteria.id) {
          case 'greeting_script':
          case 'custom_greeting':
            score = analyzeGreeting(transcript);
            feedback = generateGreetingFeedback(transcript, score, criteria.maxScore);
            break;

          case 'problem_solving':
          case 'custom_resolution':
            score = analyzeProblemSolving(transcript, criteria.maxScore);
            feedback = generateProblemSolvingFeedback(transcript, score, criteria.maxScore);
            break;

          case 'closure':
          case 'custom_followup':
            score = analyzeClosure(transcript, criteria.maxScore);
            feedback = generateClosureFeedback(transcript, score, criteria.maxScore);
            break;

          case 'custom_empathy':
            score = analyzeEmpathy(transcript, criteria.maxScore);
            feedback = generateEmpathyFeedback(transcript, score, criteria.maxScore);
            break;

          default:
            // Generic analysis for any custom criteria
            score = performGenericAnalysis(transcript, criteria);
            feedback = generateGenericFeedback(transcript, criteria, score);
            break;
        }

        return {
          criteriaId: criteria.id,
          score: Math.min(score, criteria.maxScore),
          feedback
        };
      });

      const totalScore = scores.reduce((sum, score) => sum + score.score, 0);
      const maxPossibleScore = evaluationCriteria.reduce((sum, criteria) => sum + criteria.maxScore, 0);
      const percentage = Math.round((totalScore / maxPossibleScore) * 100);

      setAnalysis({
        transcript,
        scores,
        totalScore,
        maxPossibleScore,
        percentage
      });

      setIsProcessing(false);
    }, 1500);
  };

  // Advanced analysis functions
  const analyzeGreeting = (text: string): number => {
    const lowerText = text.toLowerCase();
    const firstPortion = text.substring(0, Math.min(text.length, 500)); // First ~500 characters
    const agentLines = extractAgentLines(text);

    if (agentLines.length === 0) return 5; // Minimal score if no agent detected

    const firstAgentLine = agentLines[0].toLowerCase();
    let score = 0;

    // Professional greeting elements (0-25 points)
    if (firstAgentLine.includes('good morning') || firstAgentLine.includes('good afternoon') || 
        firstAgentLine.includes('good evening') || firstAgentLine.includes('hello')) {
      score += 5;
    }

    if (firstAgentLine.includes('thank you for calling') || firstAgentLine.includes('thanks for calling')) {
      score += 8;
    }

    if (firstAgentLine.includes('my name is') || firstAgentLine.includes('this is')) {
      score += 5;
    }

    if (firstAgentLine.includes('how can i help') || firstAgentLine.includes('how may i assist') || 
        firstAgentLine.includes('what can i do for you')) {
      score += 7;
    }

    return score;
  };

  const analyzeProblemSolving = (text: string, maxScore: number): number => {
    const agentLines = extractAgentLines(text);
    const customerLines = extractCustomerLines(text);

    if (agentLines.length === 0) return Math.round(maxScore * 0.1);

    let score = 0;
    const maxPossible = maxScore;

    // Empathy and acknowledgment (20% of max score)
    const empathyIndicators = ['sorry', 'apologize', 'understand', 'frustrating', 'inconvenience'];
    const hasEmpathy = agentLines.some(line => 
      empathyIndicators.some(indicator => line.toLowerCase().includes(indicator))
    );
    if (hasEmpathy) score += maxPossible * 0.2;

    // Taking ownership (15% of max score)
    const ownershipPhrases = ['let me help', 'i can help', 'i\'ll take care', 'let me see what i can do'];
    const showsOwnership = agentLines.some(line => 
      ownershipPhrases.some(phrase => line.toLowerCase().includes(phrase))
    );
    if (showsOwnership) score += maxPossible * 0.15;

    // Asking diagnostic questions (25% of max score)
    const questionWords = ['what', 'when', 'how', 'why', 'where', 'can you tell me', 'could you'];
    const questionCount = agentLines.filter(line => 
      questionWords.some(q => line.toLowerCase().includes(q + ' '))
    ).length;
    score += Math.min(questionCount * (maxPossible * 0.05), maxPossible * 0.25);

    // Providing solutions (25% of max score)
    const solutionIndicators = ['here\'s what', 'what we can do', 'solution', 'fix', 'resolve', 'try this'];
    const providesSolutions = agentLines.some(line => 
      solutionIndicators.some(indicator => line.toLowerCase().includes(indicator))
    );
    if (providesSolutions) score += maxPossible * 0.25;

    // Confirmation of resolution (15% of max score)
    const confirmationPhrases = ['does that work', 'is that better', 'resolved', 'fixed', 'working now'];
    const confirmsResolution = agentLines.some(line => 
      confirmationPhrases.some(phrase => line.toLowerCase().includes(phrase))
    );
    if (confirmsResolution) score += maxPossible * 0.15;

    return Math.round(score);
  };

  const analyzeClosure = (text: string, maxScore: number): number => {
    const agentLines = extractAgentLines(text);
    const lastPortion = text.substring(Math.max(0, text.length - 800)); // Last ~800 characters

    if (agentLines.length === 0) return Math.round(maxScore * 0.1);

    let score = 0;

    // Check for additional questions inquiry (40% of max score)
    const additionalQuestions = ['anything else', 'other questions', 'additional questions', 'else i can help'];
    const asksForMore = lastPortion.toLowerCase().includes('anything else') || 
                       agentLines.some(line => additionalQuestions.some(phrase => line.toLowerCase().includes(phrase)));
    if (asksForMore) score += maxScore * 0.4;

    // Check for thank you at end (30% of max score)
    const thanksAtEnd = lastPortion.toLowerCase().includes('thank you') || 
                       lastPortion.toLowerCase().includes('thanks');
    if (thanksAtEnd) score += maxScore * 0.3;

    // Check for professional closing (30% of max score)
    const closingPhrases = ['have a great', 'have a good', 'take care', 'goodbye', 'good day'];
    const hasClosing = agentLines.some(line => 
      closingPhrases.some(phrase => line.toLowerCase().includes(phrase))
    );
    if (hasClosing) score += maxScore * 0.3;

    return Math.round(score);
  };

  const analyzeEmpathy = (text: string, maxScore: number): number => {
    const agentLines = extractAgentLines(text);

    if (agentLines.length === 0) return Math.round(maxScore * 0.1);

    let score = 0;

    // Strong empathy indicators (high value)
    const strongEmpathy = ['i\'m sorry to hear', 'that must be frustrating', 'i understand how', 'i can imagine'];
    const hasStrongEmpathy = agentLines.some(line => 
      strongEmpathy.some(phrase => line.toLowerCase().includes(phrase))
    );
    if (hasStrongEmpathy) score += maxScore * 0.4;

    // Basic empathy indicators (medium value)
    const basicEmpathy = ['sorry', 'apologize', 'understand', 'frustrating'];
    const empathyCount = agentLines.filter(line => 
      basicEmpathy.some(word => line.toLowerCase().includes(word))
    ).length;
    score += Math.min(empathyCount * (maxScore * 0.15), maxScore * 0.45);

    // Tone and manner indicators (remaining points)
    const positiveLanguage = ['absolutely', 'certainly', 'of course', 'definitely', 'glad to help'];
    const hasPositiveTone = agentLines.some(line => 
      positiveLanguage.some(phrase => line.toLowerCase().includes(phrase))
    );
    if (hasPositiveTone) score += maxScore * 0.15;

    return Math.round(score);
  };

  const performGenericAnalysis = (text: string, criteria: EvaluationCriteria): number => {
    const agentLines = extractAgentLines(text);
    const customerLines = extractCustomerLines(text);

    if (agentLines.length === 0) return Math.round(criteria.maxScore * 0.1);

    // Use keywords if provided, otherwise use content analysis
    if (criteria.keywords && criteria.keywords.length > 0) {
      let keywordScore = 0;
      const totalKeywords = criteria.keywords.length;

      criteria.keywords.forEach(keyword => {
        if (text.toLowerCase().includes(keyword.toLowerCase())) {
          keywordScore++;
        }
      });

      return Math.round((keywordScore / totalKeywords) * criteria.maxScore);
    }

    // Generic content quality assessment
    const agentWordCount = agentLines.join(' ').split(' ').length;
    const customerWordCount = customerLines.join(' ').split(' ').length;
    const interactionRatio = agentWordCount / Math.max(customerWordCount, 1);

    // Score based on interaction quality
    let score = criteria.maxScore * 0.5; // Base score

    if (interactionRatio > 0.8 && interactionRatio < 3) { // Good balance
      score += criteria.maxScore * 0.3;
    }

    if (agentLines.length > 2) { // Multiple interactions
      score += criteria.maxScore * 0.2;
    }

    return Math.round(score);
  };

  // Helper functions to extract agent and customer lines
  const extractAgentLines = (text: string): string[] => {
    return text.split('\n').filter(line => line.trim().startsWith('Agent:')).map(line => line.replace('Agent:', '').trim());
  };

  const extractCustomerLines = (text: string): string[] => {
    return text.split('\n').filter(line => line.trim().startsWith('Customer:')).map(line => line.replace('Customer:', '').trim());
  };

  // Feedback generation functions
  const generateGreetingFeedback = (text: string, score: number, maxScore: number): string => {
    const percentage = (score / maxScore) * 100;
    const agentLines = extractAgentLines(text);

    if (agentLines.length === 0) {
      return "No agent greeting detected in the conversation.";
    }

    const firstLine = agentLines[0].toLowerCase();
    let feedback = "";

    if (percentage >= 80) {
      feedback = "Excellent professional greeting with most required elements present.";
    } else if (percentage >= 60) {
      feedback = "Good greeting with some professional elements, but could be enhanced.";
    } else {
      feedback = "Basic greeting present but missing several professional elements.";
    }

    // Add specific observations
    if (firstLine.includes('thank you for calling')) {
      feedback += " ✓ Thanked customer for calling.";
    } else {
      feedback += " ✗ Consider adding 'thank you for calling'.";
    }

    return feedback;
  };

  const generateProblemSolvingFeedback = (text: string, score: number, maxScore: number): string => {
    const percentage = (score / maxScore) * 100;
    const agentLines = extractAgentLines(text);

    let feedback = "";

    if (percentage >= 80) {
      feedback = "Excellent problem-solving approach with comprehensive customer support.";
    } else if (percentage >= 60) {
      feedback = "Good problem-solving skills demonstrated with room for improvement.";
    } else {
      feedback = "Basic problem-solving approach - consider more structured methodology.";
    }

    // Add specific observations
    const hasEmpathy = agentLines.some(line => ['sorry', 'understand', 'apologize'].some(word => line.toLowerCase().includes(word)));
    const hasQuestions = agentLines.some(line => ['what', 'when', 'how'].some(word => line.toLowerCase().includes(word)));
    const hasSolutions = agentLines.some(line => ['solution', 'fix', 'resolve'].some(word => line.toLowerCase().includes(word)));

    if (hasEmpathy) feedback += " ✓ Showed empathy.";
    if (hasQuestions) feedback += " ✓ Asked diagnostic questions.";
    if (hasSolutions) feedback += " ✓ Provided solutions.";

    return feedback;
  };

  const generateClosureFeedback = (text: string, score: number, maxScore: number): string => {
    const percentage = (score / maxScore) * 100;
    const lastPortion = text.substring(Math.max(0, text.length - 500));

    let feedback = "";

    if (percentage >= 80) {
      feedback = "Excellent call closure with proper wrap-up elements.";
    } else if (percentage >= 60) {
      feedback = "Good call closure with some professional elements present.";
    } else {
      feedback = "Basic call closure - consider adding more comprehensive wrap-up.";
    }

    if (lastPortion.toLowerCase().includes('anything else')) {
      feedback += " ✓ Asked for additional questions.";
    }
    if (lastPortion.toLowerCase().includes('thank you')) {
      feedback += " ✓ Thanked customer.";
    }

    return feedback;
  };

  const generateEmpathyFeedback = (text: string, score: number, maxScore: number): string => {
    const percentage = (score / maxScore) * 100;
    const agentLines = extractAgentLines(text);

    let feedback = "";

    if (percentage >= 80) {
      feedback = "Excellent empathy and rapport building throughout the conversation.";
    } else if (percentage >= 60) {
      feedback = "Good empathy demonstrated with positive customer connection.";
    } else {
      feedback = "Basic empathy shown - consider more emotional connection with customer.";
    }

    const empathyCount = agentLines.filter(line => 
      ['sorry', 'understand', 'apologize', 'frustrating'].some(word => line.toLowerCase().includes(word))
    ).length;

    if (empathyCount > 2) {
      feedback += " ✓ Multiple empathetic responses.";
    } else if (empathyCount > 0) {
      feedback += " ✓ Some empathetic language used.";
    }

    return feedback;
  };

  const generateGenericFeedback = (text: string, criteria: EvaluationCriteria, score: number): string => {
    const percentage = (score / criteria.maxScore) * 100;

    if (percentage >= 80) {
      return `Excellent performance in ${criteria.name.toLowerCase()} with strong evidence of quality service.`;
    } else if (percentage >= 60) {
      return `Good performance in ${criteria.name.toLowerCase()} with room for enhancement.`;
    } else {
      return `Basic performance in ${criteria.name.toLowerCase()} - consider improvement strategies.`;
    }
  };

  const resetApp = () => {
    setAudioFile(null);
    setAudioBlob(null);
    setTranscript('');
    setAnalysis(null);
    if (audioFileInputRef.current) {
      audioFileInputRef.current.value = '';
    }
  };

  const getScoreColor = (percentage: number): string => {
    if (percentage >= 80) return '#22c55e';
    if (percentage >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getGrade = (percentage: number): string => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>📞 Call Recording Scorer</h1>
        <p>Upload, transcribe, and score customer service calls</p>
      </header>

      <main className="main-content">
        {/* Rubric Upload Section */}
        <section className="upload-section">
          <h2>1. Upload Scoring Rubric</h2>
          <div className="upload-area">
            <input
              ref={rubricFileInputRef}
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={handleRubricFileUpload}
              className="file-input"
            />
            {isLoadingRubric && (
              <div className="loading-info">
                <p>🔄 Loading and parsing rubric file...</p>
              </div>
            )}
            {rubricFile && !isLoadingRubric && (
              <div className="file-info">
                <p>✅ Rubric uploaded: {rubricFile.name}</p>
                <p>Criteria loaded: {evaluationCriteria.length} items</p>
                <div className="rubric-preview">
                  <h4>📋 Current Scoring Criteria:</h4>
                  {evaluationCriteria.map((criteria, index) => (
                    <div key={criteria.id} className="criteria-preview">
                      <span className="criteria-name">{criteria.name}</span>
                      <span className="criteria-score">{criteria.maxScore} pts</span>
                      {criteria.category && <span className="criteria-category">[{criteria.category}]</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!rubricFile && !isLoadingRubric && (
              <div className="rubric-info">
                <p>📋 Using default rubric ({evaluationCriteria.length} criteria)</p>
                <p className="info-text">
                  Upload an Excel file with custom scoring criteria to use your own rubric.
                  <br />
                  <strong>Expected columns:</strong> Name, Description, Max Score, Weight, Keywords, Category
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Audio Upload Section */}
        <section className="upload-section">
          <h2>2. Upload Audio File</h2>
          <div className="upload-area">
            <input
              ref={audioFileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleAudioFileUpload}
              className="file-input"
            />
            {audioFile && (
              <div className="file-info">
                <p>✅ File uploaded: {audioFile.name}</p>
                <p>Size: {(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
                <audio controls src={URL.createObjectURL(audioFile)} className="audio-player" />
              </div>
            )}
          </div>
        </section>

        {/* Transcription Section */}
        {audioFile && (
          <section className="transcription-section">
            <h2>3. Transcribe Audio</h2>
            <button 
              onClick={transcribeAudio} 
              disabled={isTranscribing}
              className="btn btn-primary"
            >
              {isTranscribing ? '🔄 Transcribing...' : '🎤 Start Transcription'}
            </button>

            {transcript && (
              <div className="transcript-result">
                <h3>Transcript:</h3>
                <div className="transcript-text">
                  {transcript}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Analysis Section */}
        {transcript && (
          <section className="analysis-section">
            <h2>4. Analyze & Score</h2>
            <div className="analysis-info">
              <p>📊 Ready to analyze using <strong>{evaluationCriteria.length} criteria</strong></p>
              <p>Total possible score: <strong>{evaluationCriteria.reduce((sum, c) => sum + c.maxScore, 0)} points</strong></p>
            </div>
            <button 
              onClick={analyzeTranscript} 
              disabled={isProcessing || evaluationCriteria.length === 0}
              className="btn btn-primary"
            >
              {isProcessing ? '⚡ Analyzing...' : '📊 Analyze Call'}
            </button>
            {evaluationCriteria.length === 0 && (
              <p className="warning-text">⚠️ Please upload a scoring rubric first</p>
            )}
          </section>
        )}

        {/* Results Section */}
        {analysis && (
          <section className="results-section">
            <h2>📈 Scoring Results</h2>

            <div className="score-summary">
              <div className="total-score" style={{ color: getScoreColor(analysis.percentage) }}>
                <span className="score-number">{analysis.percentage}%</span>
                <span className="score-grade">Grade: {getGrade(analysis.percentage)}</span>
              </div>
              <p>{analysis.totalScore} / {analysis.maxPossibleScore} points</p>
              <p className="rubric-used">Using: {rubricFile ? rubricFile.name : 'Default Rubric'}</p>
            </div>

            <div className="detailed-scores">
              <h3>Detailed Evaluation:</h3>
              {analysis.scores.map((scoreResult) => {
                const criteria = evaluationCriteria.find(c => c.id === scoreResult.criteriaId)!;
                const percentage = Math.round((scoreResult.score / criteria.maxScore) * 100);

                return (
                  <div key={scoreResult.criteriaId} className="score-item">
                    <div className="score-header">
                      <h4>{criteria.name}</h4>
                      <span className="score-points" style={{ color: getScoreColor(percentage) }}>
                        {scoreResult.score}/{criteria.maxScore}
                      </span>
                    </div>
                    <p className="criteria-description">{criteria.description}</p>
                    <p className="score-feedback">💬 {scoreResult.feedback}</p>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: getScoreColor(percentage)
                        }}
                      />
                    </div>
                    {criteria.keywords && criteria.keywords.length > 0 && (
                      <div className="keywords-info">
                        <small>Keywords: {criteria.keywords.join(', ')}</small>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="action-buttons">
              <button onClick={resetApp} className="btn btn-secondary">
                🔄 Analyze New Call
              </button>
              <button onClick={() => window.print()} className="btn btn-secondary">
                🖨️ Print Report
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default App;