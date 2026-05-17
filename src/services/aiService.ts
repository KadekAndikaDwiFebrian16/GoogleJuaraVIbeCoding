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
