const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

console.log("Script starting...");
try {
  const env = fs.readFileSync('.env', 'utf8');
  const urlMatch = env.match(/VITE_SUPABASE_URL="?(.*?)"?$/m);
  const keyMatch = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="?(.*?)"?$/m);
  
  if (!urlMatch || !keyMatch) {
    console.error("Could not find Supabase credentials in .env");
    process.exit(1);
  }

  const supabase = createClient(urlMatch[1], keyMatch[1]);

  (async () => {
    const { data: allProducts, error } = await supabase
      .from('products')
      .select('*');
    
    if (error) {
      console.error("Supabase error:", error);
      return;
    }
    console.log(`Fetched ${allProducts ? allProducts.length : 0} products`);

    const targetProducts = ['Yoga e Meditação', 'Macacão', 'Dragão'];
    const products = allProducts.filter(p => targetProducts.some(t => p.name.includes(t)));
    console.log(`Found ${products.length} products to test`);

    const normalize = (str) => 
      str.normalize("NFD")
         .replace(/[\u0300-\u036f]/g, "")
         .toLowerCase()
         .replace(/[^a-z0-9]+/g, "-")
         .replace(/(^-|-$)/g, "");

    for (const prod of products) {
      console.log(`\nProduct: ${prod.name} (type: ${prod.type})`);
      const vars = prod.variables || {};
      const prefix = vars.storage_id || normalize(prod.name) || prod.id;
      let folder = "experiencias";
      if (prod.type === "waterfall") folder = "cachoeiras";
      else if (prod.type === "accommodation") folder = "hospedagens";
      else if (prod.type === "service") folder = "serviços";

      const extensions = [".jpg", ".png", ".avif", ".webp"];
      const candidates = [];
      [1, 2, 3, 4, 5].forEach(n => {
        extensions.forEach(ext => {
          candidates.push(`produtos/${folder}/${prefix}/${prefix}-${n}${ext}`);
        });
      });

      console.log(`Testing candidates for folder: ${folder}, prefix: ${prefix}...`);
      let foundCount = 0;
      for (const cand of candidates) {
        const url = `https://assets.atmos.tur.br/${cand}`;
        const res = await fetch(url, { method: 'HEAD' });
        if (res.status === 200) {
          console.log(`  [200 OK] ${cand}`);
          foundCount++;
        }
      }
      console.log(`Found ${foundCount} working candidates.`);
    }
  })();
} catch (err) {
  console.error("Catch block error:", err);
}
