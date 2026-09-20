// Curated high-resolution e-commerce images mapped by category and product slug keywords

const CATEGORY_IMAGES: Record<string, string> = {
  "Smart Home": "https://images.unsplash.com/photo-1558002038-1055907df827?w=600&auto=format&fit=crop&q=80",
  "Kitchen": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop&q=80",
  "Monitors": "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&auto=format&fit=crop&q=80",
  "Bags": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80",
  "Laptops": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&auto=format&fit=crop&q=80",
  "Audio": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
  "Wearables": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
  "Peripherals": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80",
  "Power": "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&auto=format&fit=crop&q=80",
  "Footwear": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80"
};

const SPECIFIC_KEYWORD_IMAGES: Array<{ pattern: RegExp; url: string }> = [
  { pattern: /doorbell/i, url: "https://images.unsplash.com/photo-1558002038-1055907df827?w=600&auto=format&fit=crop&q=80" },
  { pattern: /bottle/i, url: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop&q=80" },
  { pattern: /ultrawide|monitor|display/i, url: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&auto=format&fit=crop&q=80" },
  { pattern: /hardshell|case|bag|backpack/i, url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80" },
  { pattern: /laptop|notebook|ultrabook|workstation|convertible/i, url: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&auto=format&fit=crop&q=80" },
  { pattern: /headphone|earbud|speaker|soundbar|audio/i, url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80" },
  { pattern: /watch|band|tracker|wearable/i, url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80" },
  { pattern: /keyboard|mouse|webcam|peripheral/i, url: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80" },
  { pattern: /power|charger|bank|cable/i, url: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&auto=format&fit=crop&q=80" },
  { pattern: /shoe|sneaker|boot|footwear/i, url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80" }
];

export function getProductImage(category: string, name?: string, sku?: string): string {
  if (name) {
    for (const item of SPECIFIC_KEYWORD_IMAGES) {
      if (item.pattern.test(name)) {
        return item.url;
      }
    }
  }

  if (category && CATEGORY_IMAGES[category]) {
    return CATEGORY_IMAGES[category];
  }

  // Fallback generic tech product
  return "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=600&auto=format&fit=crop&q=80";
}
