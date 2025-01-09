// CommonTools.js

class TokenCounter {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async countTokens(text) {
    const requestOptions = {
      method: 'post',
      headers: {
        'x-api-key': this.apiKey,
        'content-type': 'application/json',
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'token-counting-2024-11-01',
      },
      payload: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          {
            role: 'user',
            content: text,
          },
        ],
      }),
    };

    try {
      const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages/count_tokens', requestOptions);
      const json = JSON.parse(response.getContentText());
      return json.input_tokens;
    } catch (error) {
      console.error('Error counting tokens:', error);
      // Fallback to approximate counting if API fails
      return this.approximateTokenCount(text);
    }
  }

  // Fallback method for when API call fails
  approximateTokenCount(text) {
    const words = text.trim().split(/\s+/).length;
    return Math.ceil(words * 1.3);
  }
}

class CostCalculator {
  constructor() {
    // Claude 3.5 Sonnet costs in USD per 1M tokens
    this.INPUT_COST_PER_1M = 3.0; // $3 per million tokens for input
    this.OUTPUT_COST_PER_1M = 15.0; // $15 per million tokens for output
    this.USD_TO_IDR = 16000;
  }

  calculateCostInRupiah(inputTokens, outputTokens) {
    const inputCostUSD = (inputTokens / 1000000) * this.INPUT_COST_PER_1M;
    const outputCostUSD = (outputTokens / 1000000) * this.OUTPUT_COST_PER_1M;
    const totalCostUSD = inputCostUSD + outputCostUSD;
    return Math.ceil(totalCostUSD * this.USD_TO_IDR);
  }
}

const ANTHROPIC_CONFIG = new AnthropicConfig();

class Anthropic {
  constructor() {
    this.tokenCounter = new TokenCounter(ANTHROPIC_CONFIG.getApiKey());
    this.costCalculator = new CostCalculator();
  }

  callAnthropicAPI(prompt) {
    try {
      // Hitung input tokens - pastikan ini sync, bukan Promise
      const inputTokens = Math.ceil(prompt.length / 4); // simplified estimation

      const requestOptions = {
        method: 'post',
        headers: {
          'x-api-key': ANTHROPIC_CONFIG.getApiKey(),
          'content-type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        payload: JSON.stringify({
          model: ANTHROPIC_CONFIG.getModel(),
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 4096,
        }),
        muteHttpExceptions: true,
      };

      const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', requestOptions);
      const responseData = JSON.parse(response.getContentText());

      // Handle overloaded error
      if (responseData.type === 'error') {
        throw new Error(`API Error: ${responseData.error.message}`);
      }

      if (!responseData.content || !responseData.content[0] || !responseData.content[0].text) {
        throw new Error('Invalid API response format');
      }

      // Ekstrak teks dari response
      const text = responseData.content[0].text;

      // Gunakan usage data dari API response
      const outputTokens = responseData.usage.output_tokens || 0;
      const totalTokens = inputTokens + outputTokens;
      const costInRupiah = this.costCalculator.calculateCostInRupiah(inputTokens, outputTokens);

      const result = {
        text: text,
        stats: {
          inputTokens,
          outputTokens,
          totalTokens,
          costInRupiah,
        },
      };

      console.log('Final processed result:', result);
      return result;
    } catch (error) {
      console.error('Error in callAnthropicAPI:', error);
      throw error;
    }
  }
}

class ExtractInput {
  constructor() {
    this.TAG_PATTERNS = {
      INPUT_RPPH: {
        pattern: /<input_RPPH>([\s\S]*?)<\/input_RPPH>/,
        name: 'input_RPPH',
      },
      INPUT_ACTIVITY_DETAIL: {
        pattern: /<input_Activity_Detail>([\s\S]*?)<\/input_Activity_Detail>/,
        name: 'input_Activity_Detail',
      },
      INPUT_ASSESSMENT: {
        pattern: /<input_Assessment>([\s\S]*?)<\/input_Assessment>/,
        name: 'input_Assessment',
      },
      INPUT_STORY: {
        pattern: /<topik_cerita>([\s\S]*?)<\/topik_cerita>/,
        name: 'topik_cerita',
      },
    };
  }

  // Generic extraction method
  extractContent(body, startElement, endElement, tagType) {
    try {
      const { pattern, name } = this.TAG_PATTERNS[tagType];

      // Get paragraph indices
      const startPara = startElement.getElement().getParent();
      const endPara = endElement.getElement().getParent();
      const startParaIndex = body.getChildIndex(startPara);
      const endParaIndex = body.getChildIndex(endPara);

      // Concatenate text from all paragraphs
      let userInput = '';
      for (let i = startParaIndex; i <= endParaIndex; i++) {
        userInput += body.getChild(i).getText() + '\n';
      }

      // Match content between tags
      const match = userInput.match(pattern);
      if (!match) {
        throw new Error(`Tidak dapat memproses input ${name}. Pastikan format tag sudah benar.`);
      }

      return match[1].trim();
    } catch (error) {
      throw new Error(`Error extracting ${tagType}: ${error.message}`);
    }
  }

  extractRpphInput(body, startElement, endElement) {
    return this.extractContent(body, startElement, endElement, 'INPUT_RPPH');
  }
  extractActivityDetailInput(body, startElement, endElement) {
    return this.extractContent(body, startElement, endElement, 'INPUT_ACTIVITY_DETAIL');
  }
  extractAssessmentInput(body, startElement, endElement) {
    return this.extractContent(body, startElement, endElement, 'INPUT_ASSESSMENT');
  }
  extractStoryInput(body, startElement, endElement) {
    return this.extractContent(body, startElement, endElement, 'INPUT_STORY');
  }
}
