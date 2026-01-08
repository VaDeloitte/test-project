// Agent extraction service for converting conversations to workflows using RAG

export interface ExtractedAgentData {
  title: string;
  description: string;
  workflowType: string;
  category: string;
  subcategory: string;
  subsubcategory: string;
  hitCount: number;
  prompt: string;
  uploadRequired: boolean;
  uploadDescription: string;
  tgPublish: string;
  model: string;
  triggers?: string[]; // Array of 3-4 trigger keywords
  citation?: boolean; // Whether citation is enabled (extracted from conversation)
  files?: string[]; // Array of uploaded file names (Azure filenames)
}

const extractWithDirectAzureCall = async (normalizedMessages: any[]): Promise<ExtractedAgentData | null> => {
  try {
    const conversationText = normalizedMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n\n');
    
    const azureResponse = await fetch('https://tgnpdoaiuks.openai.azure.com/openai/deployments/gpt-5-mini/chat/completions?api-version=2025-01-01-preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': 'a8d0a2bcde96415ea589a9a26eda7842'
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: `You are a JSON extraction specialist. Your ONLY task is to analyze conversations and return valid JSON.

CRITICAL RULES:
1. Return ONLY valid JSON - no explanations, no markdown, no other text
2. Analyze the conversation to extract agent information
3. Use these EXACT field names in your JSON response
4. IMPORTANT: Always ask the user for a clear description of what the agent does if it's not explicitly mentioned

REQUIRED JSON STRUCTURE:
{
  "title": "agent name extracted from conversation (max 50 chars)",
  "description": "clear, concise description of what the agent does and its primary purpose (max 200 chars) - MUST be specific and actionable",
  "workflowType": "workflow",
  "category": "General Use Cases", 
  "subcategory": "Communication, Correspondence & Writing",
  "subsubcategory": "",
  "hitCount": 0,
  "prompt": "detailed system prompt for the agent based on conversation context",
  "uploadRequired": false,
  "uploadDescription": "",
  "tgPublish": "false",
  "model": "gpt-5",
  "triggers": ["keyword1", "keyword2", "keyword3", "keyword4"],
  "citation": false
}

EXTRACTION GUIDELINES:
- title: Look for explicit agent names, avoid purpose descriptions
- description: Extract or synthesize a clear summary of the agent's main function and purpose
  * Focus on WHAT the agent does, not HOW it does it
  * Use action-oriented language (e.g., "Analyzes tax documents and generates compliance reports")
  * Keep it concise but informative (1-2 sentences max)
  * Avoid vague phrases - be specific about the agent's capabilities
- prompt: Create comprehensive system instructions
- uploadRequired: Set true only if file uploads are explicitly mentioned
- citation: Set true if user mentions citations, references, sources, or attributions in conversation
- triggers: Extract 3-4 keywords that capture the agent's CORE PURPOSE and PRIMARY FUNCTION
  * PRIORITY 1: Analyze the "prompt" field - what does this agent DO?
  * PRIORITY 2: Extract action-oriented keywords (analyze, generate, calculate, review, draft, process)
  * PRIORITY 3: Include domain/subject matter (tax, legal, email, document, data, code)
  * PRIORITY 4: Include outcome/deliverable (report, summary, insight, recommendation)
  * Keep keywords focused on PURPOSE, not implementation details
  * Keywords should be 1-2 words, lowercase, no duplicates
  * Avoid generic words (assistant, help, agent, bot, AI)
  * Example for tax agent: ["tax", "compliance", "calculation", "filing"]
  * Example for email agent: ["email", "drafting", "communication", "scheduling"]
  * Example for data agent: ["data", "analysis", "visualization", "insights"]
- Return ONLY the JSON object, nothing else`
          },
          {
            role: "user",
            content: `Extract agent information from this conversation and return ONLY the JSON object with triggers included:

CONVERSATION:
${conversationText}

Return ONLY valid JSON with the required structure including the triggers array.`
          }
        ],
        temperature: 1,
        max_completion_tokens: 2000
      })
    });

    if (!azureResponse.ok) {
      const errorText = await azureResponse.text();
      return null;
    }

    const azureResult = await azureResponse.json();
    const extractedContent = azureResult.choices?.[0]?.message?.content;

    if (!extractedContent) {
      return null;
    }

    try {
      let jsonContent = extractedContent.trim();
      
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonContent = jsonMatch[0];
      }
      
      const parsedData = JSON.parse(jsonContent);
      
      //  Ensure triggers exist, fallback if not provided by LLM
      if (!parsedData.triggers || !Array.isArray(parsedData.triggers) || parsedData.triggers.length === 0) {
        console.log('⚠️ No triggers in LLM response, using fallback extraction');
        parsedData.triggers = extractFallbackKeywords(
          parsedData.description || '', 
          parsedData.prompt || ''
        );
      } else {
        console.log(' Triggers extracted from LLM:', parsedData.triggers);
      }
      
      return parsedData;
    } catch (parseError) {
      return null;
    }

  } catch (error) {
    return null;
  }
};

export const extractAgentFromConversation = async (
  conversationId: string,
  messages: any[],
  userToken: string,
  uploadedFiles?: string[] // NEW: Array of uploaded file names (Azure filenames)
): Promise<ExtractedAgentData | null> => {
  try {
    if (!Array.isArray(messages) || messages.length === 0) {
      return {
        title: 'Basic Agent',
        description: 'Agent created without conversation data',
        workflowType: 'workflow',
        category: 'General Use Cases',
        subcategory: 'Communication, Correspondence & Writing',
        subsubcategory: '',
        hitCount: 0,
        prompt: 'You are a helpful AI assistant.',
        uploadRequired: false,
        uploadDescription: '',
        tgPublish: 'false',
        model: 'gpt-5',
        triggers: ['general', 'support', 'query', 'information'], // Purpose-focused default triggers
        citation: false, // NEW: Default citation disabled
        files: uploadedFiles || [] // NEW: Include uploaded files
      };
    }

    const normalizedMessages = messages.map(msg => ({
      role: msg.role || 'user',
      content: msg.content || msg.message || ''
    })).filter(msg => msg.content.trim().length > 0);

      const directExtractionResult = await extractWithDirectAzureCall(normalizedMessages);
      
      if (directExtractionResult) {
        directExtractionResult.tgPublish = directExtractionResult.tgPublish || 'false';
        // NEW: Add uploaded files to the extracted agent data
        directExtractionResult.files = uploadedFiles || [];
        return directExtractionResult;
      }

      const fallbackResult = createIntelligentFallback(normalizedMessages, '');
      if (fallbackResult && typeof fallbackResult === 'object') {
        fallbackResult.tgPublish = fallbackResult.tgPublish || 'false';
        // NEW: Add uploaded files to fallback result
        fallbackResult.files = uploadedFiles || [];
      }
      return fallbackResult;

  } catch (error) {
    return null;
  }
};

export const saveExtractedAgent = async (
  agentData: ExtractedAgentData,
  userToken: string,
  refreshTokenFunction?: any
): Promise<any> => {
  try {
    if (!agentData.title || !agentData.description || !agentData.prompt) {
      throw new Error('Missing required fields: title, description, or prompt');
    }

    const response = await fetch('/api/workflow/agent-extracted', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify(agentData)
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to save workflow: ${response.status} - ${errorData}`);
    }

    const result = await response.json();
    return result;
    
  } catch (error: any) {
    throw error;
  }
};

function createIntelligentFallback(normalizedMessages: any[], rawResponse: string): ExtractedAgentData {
  const conversationContent = normalizedMessages.map(m => m.content).join(' ');
  const firstUserMessage = normalizedMessages.find(m => m.role === 'user')?.content || '';
  
  const description = `Agent created from conversation with ${normalizedMessages.length} messages`;
  const prompt = `You are a helpful AI assistant. Context from conversation: ${conversationContent.substring(0, 500)}...`;
  
  return {
    title: firstUserMessage.substring(0, 50) || 'Generated Agent',
    description: description,
    workflowType: 'workflow',
    category: 'General Use Cases',
    subcategory: 'Communication, Correspondence & Writing',
    subsubcategory: '',
    hitCount: 0,
    prompt: prompt,
    uploadRequired: false,
    uploadDescription: '',
    tgPublish: 'false',
    model: 'gpt-5-mini',
    triggers: extractFallbackKeywords(description, prompt), // Include fallback triggers
    citation: false, // NEW: Default citation disabled
    files: [] // NEW: Files will be added by caller if available
  };
}

/**
 * Fallback keyword extraction using simple text analysis
 * Used when LLM doesn't return triggers or extraction fails
 * Prioritizes prompt over description to focus on agent's purpose
 */
function extractFallbackKeywords(description: string, prompt: string): string[] {
  // PRIORITY 1: Extract from prompt (3x weight) - focuses on what agent DOES
  const promptText = prompt.toLowerCase();
  const descriptionText = description.toLowerCase();
  
  // Combine with prompt weighted more heavily
  const combinedText = `${promptText} ${promptText} ${promptText} ${descriptionText}`;
  
  // Common stop words to ignore
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this',
    'that', 'these', 'those', 'you', 'your', 'it', 'its', 'they', 'their',
    'who', 'what', 'when', 'where', 'why', 'how', 'which', 'all', 'each',
    // Avoid generic agent words
    'assistant', 'agent', 'bot', 'help', 'helpful', 'professional', 'expert'
  ]);
  
  // Extract words (alphanumeric sequences)
  const words = combinedText.match(/\b[a-z]{3,}\b/g) || [];
  
  // Count word frequency
  const wordFreq: { [key: string]: number } = {};
  words.forEach(word => {
    if (!stopWords.has(word)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });
  
  // Sort by frequency and take top 4
  const sortedWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .slice(0, 4);
  
  // If no keywords found, extract from first meaningful phrase in prompt
  if (sortedWords.length === 0) {
    const promptWords = promptText.match(/\b[a-z]{4,}\b/g) || [];
    const filtered = promptWords.filter(w => !stopWords.has(w)).slice(0, 4);
    return filtered.length > 0 ? filtered : ['task', 'work', 'process', 'assist'];
  }
  
  return sortedWords;
}