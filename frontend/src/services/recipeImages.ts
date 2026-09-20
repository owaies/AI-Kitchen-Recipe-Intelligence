const indianImages = {
  curry: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1000&q=82",
  biryani: "https://images.unsplash.com/photo-1563379091339-03246963d96c?auto=format&fit=crop&w=1000&q=82",
  dosa: "https://images.unsplash.com/photo-1630383249896-424e482df921?auto=format&fit=crop&w=1000&q=82",
  samosa: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1000&q=82",
  thali: "https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=1000&q=82",
  rice: "https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=1000&q=82",
  dessert: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1000&q=82",
  street: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1000&q=82",
  vegetables: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1000&q=82",
};

export function getRecipeImage(title: string, cuisine: string): string {
  const name = title.toLowerCase();
  if (cuisine === "Indian") {
    if (name.includes("biryani") || name.includes("pulao") || name.includes("rice")) return indianImages.biryani;
    if (name.includes("dosa") || name.includes("idli") || name.includes("vada") || name.includes("uttapam") || name.includes("pongal")) return indianImages.dosa;
    if (name.includes("samosa") || name.includes("kachori")) return indianImages.samosa;
    if (name.includes("jalebi") || name.includes("gulab") || name.includes("kheer") || name.includes("halwa") || name.includes("ladoo") || name.includes("modak") || name.includes("rasgulla") || name.includes("shrikhand") || name.includes("payasam") || name.includes("pak") || name.includes("churma")) return indianImages.dessert;
    if (name.includes("pav") || name.includes("puri") || name.includes("poha") || name.includes("pakora") || name.includes("dhokla") || name.includes("bhel") || name.includes("sev") || name.includes("cutlet") || name.includes("roll")) return indianImages.street;
    if (name.includes("salad") || name.includes("avial") || name.includes("poriyal") || name.includes("kootu") || name.includes("vegetable") || name.includes("gobi") || name.includes("bhindi") || name.includes("palak")) return indianImages.vegetables;
    if (name.includes("chicken") || name.includes("mutton") || name.includes("fish") || name.includes("prawn") || name.includes("paneer") || name.includes("dal") || name.includes("rajma") || name.includes("chole") || name.includes("curry") || name.includes("masala")) return indianImages.curry;
    return indianImages.thali;
  }
  return "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1000&q=82";
}