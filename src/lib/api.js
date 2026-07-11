export async function streamChat(messages, { onDelta, signal }) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
    signal,
  });

  if (!res.ok || !res.body) {
    let message = "AI bilan bog'lanishda xatolik yuz berdi.";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // response wasn't JSON — keep default message
    }
    throw new Error(message);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    full += chunk;
    onDelta(chunk, full);
  }

  return full;
}

export const SUGGESTED_QUESTIONS = [
  {
    title: "QQS stavkasi",
    text: "O'zbekistonda QQS (qo'shilgan qiymat solig'i) stavkasi qancha va uni qanday hisoblayman?",
  },
  {
    title: "YaTT uchun soliqlar",
    text: "Yakka tartibdagi tadbirkor (YaTT) qanday soliqlarni to'lashi kerak?",
  },
  {
    title: "Ish haqi hisobi",
    text: "Xodimning ish haqidan qanday soliq va ijtimoiy to'lovlar ushlab qolinadi?",
  },
  {
    title: "Balans tuzish",
    text: "Kichik korxona uchun oddiy balans hisobotini qanday tuzish kerak?",
  },
];
