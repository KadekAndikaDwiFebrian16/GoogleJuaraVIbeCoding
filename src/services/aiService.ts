export async function askAssistant(question: string, mode: 'chat' | 'sulap' | 'meal-planner' = 'chat') {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, mode }),
    });
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.ui_message || `Server error: ${res.status}`);
    }
    return data.text || "No response tracking.";
  } catch (error) {
    console.error("AI Assistant Error:", error);
    throw error;
  }
}

export async function extractRecipe(text: string, source: string) {
  try {
    const res = await fetch('/api/extract-recipe', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, source }),
    });
    
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || "Failed to extract recipe");
    }
    return data.result;
  } catch (error) {
    console.error("Extract recipe error:", error);
    throw error;
  }
}

export async function extractIngredients(text: string) {
  try {
    const res = await fetch('/api/extract-ingredients', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || "Failed to extract ingredients");
    }
    return data.result as { title: string; ingredients: string[] };
  } catch (error) {
    console.error("Extract ingredients error:", error);
    throw error;
  }
}
