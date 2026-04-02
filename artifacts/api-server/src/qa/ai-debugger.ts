import { AIInsight } from './types';

interface AIIssueInput {
  type: string;
  message: string;
  selector?: string;
}

const cache = new Map<string, AIInsight>();

export async function getAIDebugInsight(
  issue: AIIssueInput,
  enableAI: boolean,
  openaiApiKey?: string,
  model = 'gpt-4o-mini'
): Promise<AIInsight | undefined> {
  if (!enableAI || !openaiApiKey || openaiApiKey === 'your_openai_key_here') {
    return getFallbackInsight(issue);
  }

  // Cache by issue type + message (to handle different messages for same type)
  const cacheKey = `${issue.type}:${issue.message}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const prompt = `You are an expert web debugging assistant.

Explain the following issue in simple, non-technical language.
Then provide:

1. Why this problem occurs
2. A simple fix (beginner-friendly)
3. Optional step-by-step instructions

Issue:
Type: ${issue.type}
Description: ${issue.message}
${issue.selector ? `Selector: ${issue.selector}` : ''}

Keep explanation short, clear, and practical.
IMPORTANT: Respond with JSON only in the following format:
{
  "explanation": "...",
  "rootCause": "...",
  "fix": "...",
  "steps": ["step 1", "step 2", ...]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a professional QA and web development debugger. Always return JSON.'
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 300,
        temperature: 0.3,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      console.error(`AI Insight Error: ${response.statusText}`);
      return getFallbackInsight(issue);
    }

    const data = (await response.json()) as any;
    const content = data.choices[0]?.message?.content;
    
    if (content) {
      const parsed = JSON.parse(content) as AIInsight;
      cache.set(cacheKey, parsed);
      return parsed;
    }

    return getFallbackInsight(issue);
  } catch (error) {
    console.error('AI Insight Exception:', error);
    return getFallbackInsight(issue);
  }
}

function getFallbackInsight(issue: AIIssueInput): AIInsight {
  const type = issue.type.toLowerCase();
  
  if (type.includes('link') || type.includes('404')) {
    return {
      explanation: "A link on your page points to a destination that doesn't exist.",
      rootCause: "The target URL might have been deleted, moved, or entered incorrectly.",
      fix: "Update the link's href attribute to point to the correct URL.",
      steps: [
        "Go to the code for the source page",
        "Find the link element with the incorrect URL",
        "Verify the correct target URL matches your intention",
        "Update the 'href' attribute with the correct URL"
      ]
    };
  }

  if (type.includes('ui') || type.includes('styling') || type.includes('overflow')) {
    return {
      explanation: "A visual element on your page isn't appearing or behaving as expected.",
      rootCause: "This usually happens due to CSS conflicts or layout constraints (like container sizes).",
      fix: "Adjust the CSS properties like width, height, or overflow of the affected element.",
      steps: [
        "Inspect the element using browser developer tools",
        "Check for overlapping elements or inherited styles",
        "Try adjusting padding, margins, or relative positioning",
        "Ensure the element fits within its parent container"
      ]
    };
  }

  if (type.includes('form') || type.includes('validation')) {
    return {
      explanation: "A form element is missing a label or has a validation issue.",
      rootCause: "Forms require specific attributes for accessibility and proper data submission.",
      fix: "Add missing labels or correct the input types to match required data.",
      steps: [
        "Identify the form field mentioned in the report",
        "Ensure every <input> has a corresponding <label>",
        "Check for 'required' attributes or custom validation logic",
        "Test the form submission flow manually"
      ]
    };
  }

  return {
    explanation: "Something went wrong with this part of your web page.",
    rootCause: "The automated scanner detected an anomaly that might affect user experience.",
    fix: "Review the technical details provided and inspect the element in your editor.",
    steps: [
      "Open your source code",
      "Find the element using the provided selector",
      "Compare the current state with your design specifications",
      "Apply the necessary correction based on standard web practices"
    ]
  };
}
