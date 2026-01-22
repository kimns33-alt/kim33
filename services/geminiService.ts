import { GoogleGenAI } from '@google/genai';
import { InventoryItem } from '../types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || (process.env.API_KEY as string);

let genAI: GoogleGenAI | null = null;

const initGenAI = () => {
  if (!genAI && API_KEY) {
    genAI = new GoogleGenAI({ apiKey: API_KEY });
  }
  return genAI;
};

export const getInventoryInsights = async (items: InventoryItem[]): Promise<string> => {
  try {
    const ai = initGenAI();
    if (!ai) {
      return 'API 키가 설정되지 않았습니다. VITE_GEMINI_API_KEY를 설정해주세요.';
    }

    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
다음은 재고 관리 시스템의 품목 데이터입니다. 각 품목은 브랜드, 품명, 사이즈, 컬러 등 세부 규격으로 구분됩니다.

${items.map(item =>
  `- ${item.brand} ${item.name} (${item.size}/${item.color}): 현재고 ${item.quantity}, 안전재고 ${item.minQuantity}, 적정재고 ${item.optimalQuantity}, 단가 ${item.price}원`
).join('\n')}

위 데이터를 분석하여 다음을 제공해주세요:
1. 긴급 발주가 필요한 품목 (현재고가 안전재고의 50% 이하)
2. 발주 시점이 임박한 품목
3. 브랜드/카테고리별 재고 건전성 분석
4. 구체적인 발주 수량 및 금액 제안

간단명료하게 한국어로 답변해주세요.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('AI Insights Error:', error);
    return '분석 중 오류가 발생했습니다. API 키를 확인하고 다시 시도해주세요.';
  }
};

export const parseBulkInventory = async (text: string): Promise<any[] | null> => {
  try {
    const ai = initGenAI();
    if (!ai) {
      return null;
    }

    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
다음 텍스트에서 재고 품목 정보를 추출하여 JSON 배열로 변환해주세요.
각 품목은 다음 필드를 포함해야 합니다: brand(브랜드), name(품명), size(사이즈), color(컬러), quantity(수량), price(가격), category(카테고리)

텍스트:
${text}

반드시 유효한 JSON 배열만 반환하고, 다른 설명은 포함하지 마세요.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonText = response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Bulk Parse Error:', error);
    return null;
  }
};

export const parseCSVTransactions = async (csvText: string): Promise<any[] | null> => {
  try {
    const ai = initGenAI();
    if (!ai) {
      return null;
    }

    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
다음 CSV 데이터를 입출고 거래 정보로 파싱해주세요.
각 거래는 다음 필드를 포함해야 합니다: sku 또는 name, type(IN 또는 OUT), quantity

CSV:
${csvText}

반드시 유효한 JSON 배열만 반환하고, 다른 설명은 포함하지 마세요.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonText = response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('CSV Parse Error:', error);
    return null;
  }
};
