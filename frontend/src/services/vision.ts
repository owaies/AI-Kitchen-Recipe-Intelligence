const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "");

export type DetectedIngredient = {
  name: string;
  confidence: number;
};

export async function detectIngredientsFromPhoto(imageDataUrl: string): Promise<DetectedIngredient[]> {
  if (!apiBase) throw new Error("AI backend URL is not configured.");
  const response = await fetch(`${apiBase}/api/recipes/vision/ingredients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_data_url: imageDataUrl }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail ?? "Ingredient recognition failed.");
  return Array.isArray(body.ingredients) ? body.ingredients : [];
}
