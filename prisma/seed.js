import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const globalProducts = [
  // ==================== FRUITS (5 products) ====================
  {
    name: "Fresh Red Apples",
    brand: "Premium Fruits",
    category: "fruits",
    images: [
      "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400",
      "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=400"
    ],
    tags: ["fresh", "organic", "red", "healthy", "vitamin-c"],
    metadata: {
      origin: "Kashmir",
      shelfLife: "7 days",
      nutritionalInfo: "Rich in Vitamin C and fiber",
      weight: "1kg"
    }
  },
  {
    name: "Fresh Bananas",
    brand: "Organic Valley",
    category: "fruits",
    images: [
      "https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=400",
      "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400"
    ],
    tags: ["fresh", "organic", "yellow", "potassium", "energy"],
    metadata: {
      origin: "Kerala",
      shelfLife: "5 days",
      nutritionalInfo: "High in Potassium and natural sugars",
      weight: "1 dozen"
    }
  },
  {
    name: "Juicy Oranges",
    brand: "Citrus Fresh",
    category: "fruits",
    images: [
      "https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400",
      "https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=400"
    ],
    tags: ["citrus", "vitamin-c", "fresh", "juicy", "immunity"],
    metadata: {
      origin: "Nagpur",
      shelfLife: "10 days",
      nutritionalInfo: "Excellent source of Vitamin C",
      weight: "1kg"
    }
  },
  {
    name: "Sweet Mangoes",
    brand: "Tropical Fruits",
    category: "fruits",
    images: [
      "https://images.unsplash.com/photo-1553279768-865429fa0078?w=400",
      "https://images.unsplash.com/photo-1605616124430-4e9ed881eb7e?w=400"
    ],
    tags: ["sweet", "tropical", "seasonal", "vitamin-a", "summer"],
    metadata: {
      origin: "Alphonso - Maharashtra",
      shelfLife: "4 days",
      nutritionalInfo: "Rich in Vitamin A and antioxidants",
      weight: "1kg"
    }
  },
  {
    name: "Fresh Grapes",
    brand: "Vineyard Fresh",
    category: "fruits",
    images: [
      "https://images.unsplash.com/photo-1423483641154-5411ec9c0ddf?w=400",
      "https://images.unsplash.com/photo-1537640538966-79f369143aa8?w=400"
    ],
    tags: ["fresh", "sweet", "antioxidants", "green", "healthy"],
    metadata: {
      origin: "Maharashtra",
      shelfLife: "5 days",
      nutritionalInfo: "High in antioxidants and natural sugars",
      weight: "500g"
    }
  },

  // ==================== VEGETABLES (5 products) ====================
  {
    name: "Fresh Red Tomatoes",
    brand: "Farm Fresh",
    category: "vegetables",
    images: [
      "https://images.unsplash.com/photo-1546470427-e26a83b90f78?w=400",
      "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400"
    ],
    tags: ["fresh", "red", "cooking", "lycopene", "versatile"],
    metadata: {
      origin: "Punjab",
      shelfLife: "5 days",
      uses: "Cooking, Salads, Curry",
      weight: "1kg"
    }
  },
  {
    name: "White Onions",
    brand: "Fresh Harvest",
    category: "vegetables",
    images: [
      "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400",
      "https://images.unsplash.com/photo-1508747762490-a9dde5312b8f?w=400"
    ],
    tags: ["cooking", "essential", "storage", "white", "pungent"],
    metadata: {
      origin: "Maharashtra",
      shelfLife: "30 days",
      storage: "Cool dry place",
      weight: "1kg"
    }
  },
  {
    name: "Fresh Potatoes",
    brand: "Agri Fresh",
    category: "vegetables",
    images: [
      "https://images.unsplash.com/photo-1583958092906-c41d53e3c6e0?w=400",
      "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400"
    ],
    tags: ["staple", "cooking", "versatile", "carbs", "storage"],
    metadata: {
      origin: "Uttar Pradesh",
      shelfLife: "45 days",
      uses: "Frying, Boiling, Curry",
      weight: "1kg"
    }
  },
  {
    name: "Green Capsicum",
    brand: "Garden Fresh",
    category: "vegetables",
    images: [
      "https://images.unsplash.com/photo-1525607551316-4a8e16d1f9d8?w=400",
      "https://images.unsplash.com/photo-1594282486180-4d51ff3c98d7?w=400"
    ],
    tags: ["green", "bell-pepper", "vitamin-c", "crunchy", "healthy"],
    metadata: {
      origin: "Karnataka",
      shelfLife: "7 days",
      nutritionalInfo: "High in Vitamin C and fiber",
      weight: "500g"
    }
  },
  {
    name: "Fresh Carrots",
    brand: "Root Vegetables Co.",
    category: "vegetables",
    images: [
      "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400",
      "https://images.unsplash.com/photo-1582515073490-39981397c445?w=400"
    ],
    tags: ["orange", "crunchy", "vitamin-a", "healthy", "sweet"],
    metadata: {
      origin: "Himachal Pradesh",
      shelfLife: "15 days",
      nutritionalInfo: "Excellent source of Vitamin A",
      weight: "500g"
    }
  },

  // ==================== DAIRY (5 products) ====================
  {
    name: "Fresh Full Cream Milk",
    brand: "Amul",
    category: "dairy",
    images: [
      "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400",
      "https://images.unsplash.com/photo-1559181567-c3190ca9959b?w=400"
    ],
    tags: ["dairy", "fresh", "protein", "calcium", "full-cream"],
    metadata: {
      fat: "6.0%",
      shelfLife: "2 days",
      storage: "Refrigerate at 4°C",
      volume: "1 Liter"
    }
  },
  {
    name: "Fresh Paneer",
    brand: "Mother Dairy",
    category: "dairy",
    images: [
      "https://images.unsplash.com/photo-1631684421906-de1f2e6bab14?w=400",
      "https://images.unsplash.com/photo-1609501676725-7186f0392dd7?w=400"
    ],
    tags: ["protein", "vegetarian", "fresh", "cottage-cheese", "healthy"],
    metadata: {
      protein: "18g per 100g",
      shelfLife: "3 days",
      storage: "Refrigerate",
      weight: "200g"
    }
  },
  {
    name: "Greek Yogurt",
    brand: "Epigamia",
    category: "dairy",
    images: [
      "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400",
      "https://images.unsplash.com/photo-1571212515416-fef01fc43637?w=400"
    ],
    tags: ["yogurt", "protein", "probiotics", "healthy", "thick"],
    metadata: {
      protein: "10g per 100g",
      shelfLife: "15 days",
      probiotics: "Live cultures",
      weight: "130g"
    }
  },
  {
    name: "Fresh Butter",
    brand: "Amul",
    category: "dairy",
    images: [
      "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400",
      "https://images.unsplash.com/photo-1614451297155-a7c1ba6300bc?w=400"
    ],
    tags: ["butter", "dairy", "cooking", "baking", "spread"],
    metadata: {
      fat: "80%",
      shelfLife: "90 days",
      storage: "Refrigerate",
      weight: "100g"
    }
  },
  {
    name: "Mozzarella Cheese",
    brand: "Britannia",
    category: "dairy",
    images: [
      "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400",
      "https://images.unsplash.com/photo-1586511925558-a4c6376fe65f?w=400"
    ],
    tags: ["cheese", "mozzarella", "protein", "pizza", "melting"],
    metadata: {
      protein: "22g per 100g",
      shelfLife: "30 days",
      storage: "Refrigerate",
      weight: "200g"
    }
  },

  // ==================== GRAINS (5 products) ====================
  {
    name: "Basmati Rice",
    brand: "India Gate",
    category: "grains",
    images: [
      "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400",
      "https://images.unsplash.com/photo-1598965675045-13b23e2ad2e2?w=400"
    ],
    tags: ["rice", "basmati", "long-grain", "aromatic", "premium"],
    metadata: {
      type: "Long grain aged rice",
      origin: "Punjab",
      shelfLife: "2 years",
      weight: "1kg"
    }
  },
  {
    name: "Whole Wheat Flour",
    brand: "Aashirvaad",
    category: "grains",
    images: [
      "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400",
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400"
    ],
    tags: ["flour", "whole-grain", "healthy", "fiber", "rotis"],
    metadata: {
      protein: "12g per 100g",
      fiber: "11g per 100g",
      shelfLife: "6 months",
      weight: "1kg"
    }
  },
  {
    name: "Quinoa",
    brand: "Organic India",
    category: "grains",
    images: [
      "https://images.unsplash.com/photo-1609501676725-7186f0392dd7?w=400",
      "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400"
    ],
    tags: ["superfood", "protein", "gluten-free", "healthy", "organic"],
    metadata: {
      protein: "14g per 100g",
      type: "Complete protein",
      shelfLife: "2 years",
      weight: "500g"
    }
  },
  {
    name: "Brown Rice",
    brand: "24 Mantra",
    category: "grains",
    images: [
      "https://images.unsplash.com/photo-1588701573351-5f90e7cf2a37?w=400",
      "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400"
    ],
    tags: ["brown-rice", "whole-grain", "fiber", "healthy", "organic"],
    metadata: {
      fiber: "3.5g per 100g",
      type: "Whole grain rice",
      shelfLife: "1 year",
      weight: "1kg"
    }
  },
  {
    name: "Rolled Oats",
    brand: "Kellogg's",
    category: "grains",
    images: [
      "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400",
      "https://images.unsplash.com/photo-1491485880348-85d48a9e5312?w=400"
    ],
    tags: ["oats", "breakfast", "fiber", "healthy", "quick-cooking"],
    metadata: {
      fiber: "10g per 100g",
      type: "Rolled oats",
      shelfLife: "2 years",
      weight: "1kg"
    }
  },

  // ==================== SNACKS (5 products) ====================
  {
    name: "Classic Salted Chips",
    brand: "Lay's",
    category: "snacks",
    images: [
      "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400",
      "https://images.unsplash.com/photo-1613919113640-25732ec5e61f?w=400"
    ],
    tags: ["chips", "snack", "crispy", "salted", "ready-to-eat"],
    metadata: {
      flavor: "Classic Salted",
      shelfLife: "6 months",
      weight: "52g",
      ingredients: "Potato, Oil, Salt"
    }
  },
  {
    name: "Glucose Biscuits",
    brand: "Parle-G",
    category: "snacks",
    images: [
      "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400",
      "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400"
    ],
    tags: ["biscuit", "glucose", "tea-time", "energy", "classic"],
    metadata: {
      type: "Glucose biscuit",
      energy: "462 kcal per 100g",
      shelfLife: "8 months",
      weight: "376g"
    }
  },
  {
    name: "Mixed Nuts",
    brand: "Nutraj",
    category: "snacks",
    images: [
      "https://images.unsplash.com/photo-1605033781929-3b67ef5b8b00?w=400",
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400"
    ],
    tags: ["nuts", "healthy", "protein", "mixed", "premium"],
    metadata: {
      type: "Almonds, Cashews, Walnuts",
      protein: "20g per 100g",
      shelfLife: "6 months",
      weight: "200g"
    }
  },
  {
    name: "Chocolate Cookies",
    brand: "Oreo",
    category: "snacks",
    images: [
      "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400",
      "https://images.unsplash.com/photo-1617272219963-bb6afb5a6bb3?w=400"
    ],
    tags: ["cookies", "chocolate", "sweet", "cream", "sandwich"],
    metadata: {
      type: "Chocolate sandwich cookies",
      flavor: "Vanilla cream",
      shelfLife: "12 months",
      weight: "120g"
    }
  },
  {
    name: "Spicy Namkeen",
    brand: "Haldiram's",
    category: "snacks",
    images: [
      "https://images.unsplash.com/photo-1631729371254-42c0e285c2b8?w=400",
      "https://images.unsplash.com/photo-1611416517780-eff3a83ac2e3?w=400"
    ],
    tags: ["namkeen", "spicy", "indian", "mixture", "crunchy"],
    metadata: {
      type: "Spicy mixture",
      spiceLevel: "Medium",
      shelfLife: "4 months",
      weight: "200g"
    }
  },

  // ==================== BEVERAGES (5 products) ====================
  {
    name: "Coca Cola",
    brand: "Coca-Cola",
    category: "beverages",
    images: [
      "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400",
      "https://images.unsplash.com/photo-1527960471264-932f39eb5b9f?w=400"
    ],
    tags: ["cola", "soft-drink", "carbonated", "refreshing", "classic"],
    metadata: {
      type: "Carbonated Soft Drink",
      caffeine: "34mg per 330ml",
      shelfLife: "9 months",
      volume: "330ml"
    }
  },
  {
    name: "Natural Mineral Water",
    brand: "Bisleri",
    category: "beverages",
    images: [
      "https://images.unsplash.com/photo-1559839914-17aae04690c6?w=400",
      "https://images.unsplash.com/photo-1553909489-cd47e0ef937f?w=400"
    ],
    tags: ["water", "mineral", "pure", "natural", "essential"],
    metadata: {
      type: "Natural Mineral Water",
      minerals: "Calcium, Magnesium",
      shelfLife: "2 years",
      volume: "1 Liter"
    }
  },
  {
    name: "Fresh Orange Juice",
    brand: "Tropicana",
    category: "beverages",
    images: [
      "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400",
      "https://images.unsplash.com/photo-1613919113640-25732ec5e61f?w=400"
    ],
    tags: ["juice", "orange", "vitamin-c", "fresh", "no-pulp"],
    metadata: {
      type: "100% Pure Orange Juice",
      vitaminC: "60mg per 200ml",
      shelfLife: "12 months",
      volume: "1 Liter"
    }
  },
  {
    name: "Green Tea",
    brand: "Twinings",
    category: "beverages",
    images: [
      "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400",
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400"
    ],
    tags: ["tea", "green-tea", "antioxidants", "healthy", "premium"],
    metadata: {
      type: "Premium Green Tea",
      antioxidants: "High",
      shelfLife: "2 years",
      servings: "25 tea bags"
    }
  },
  {
    name: "Energy Drink",
    brand: "Red Bull",
    category: "beverages",
    images: [
      "https://images.unsplash.com/photo-1570831739435-6601aa3fa4fb?w=400",
      "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400"
    ],
    tags: ["energy-drink", "caffeine", "taurine", "boost", "sports"],
    metadata: {
      type: "Energy drink with caffeine",
      caffeine: "80mg per 250ml",
      shelfLife: "18 months",
      volume: "250ml"
    }
  }
];

async function main() {
  console.log('🌱 Starting Global Products seed...');
  console.log(`📦 Total products to create: ${globalProducts.length}`);
  
  let created = 0;
  const categories = {};
  
  for (const product of globalProducts) {
    try {
      const createdProduct = await prisma.globalProduct.create({
        data: product,
      });
      
      // Count by category
      if (!categories[product.category]) {
        categories[product.category] = 0;
      }
      categories[product.category]++;
      
      console.log(`✅ [${product.category.toUpperCase()}] Created: ${createdProduct.name}`);
      created++;
    } catch (error) {
      console.error(`❌ Failed to create ${product.name}:`, error.message);
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`✅ Successfully created: ${created} products`);
  console.log('\n📋 Products by category:');
  Object.entries(categories).forEach(([category, count]) => {
    console.log(`   ${category.toUpperCase()}: ${count} products`);
  });
  
  console.log('\n🎉 Global Products seeding completed!');
  console.log('🚀 You can now use these products in your shopkeeper dashboard!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
