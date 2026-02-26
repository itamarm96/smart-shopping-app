export interface ShoppingItem {
  id: string;
  name: string;
  category: string;
  checked: boolean;
}

export interface Category {
  name: string;
  icon: string;
  color: string;
  items: ShoppingItem[];
}

export interface AssistantResponse {
  updatedItems: string[];
  voiceResponse: string;
}

export interface CategorizeResponse {
  categories: Category[];
}
