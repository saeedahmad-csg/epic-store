async function testMultiTurnMemory() {
  console.log("=== Testing Multi-Turn Chat Memory ===");

  // Turn 1: User mentions order ID
  const turn1User = { role: "user", content: "Hi, I have an inquiry about order ORD-1002." };
  const res1 = await fetch("http://localhost:3001/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [turn1User],
      customerEmail: "john.wick@example.com",
    }),
  });
  const data1 = await res1.json();
  console.log("Turn 1 - Agent Response Preview:", data1.reply.slice(0, 100));

  // Turn 2: User asks for refund without mentioning the order ID again
  const turn2User = { role: "user", content: "Can I request a refund for it? The glass arrived shattered on arrival." };
  const res2 = await fetch("http://localhost:3001/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        turn1User,
        { role: "assistant", content: data1.reply },
        turn2User,
      ],
      customerEmail: "john.wick@example.com",
    }),
  });
  const data2 = await res2.json();
  console.log("\nTurn 2 (Without repeating Order ID):");
  console.log("• Memory correctly recalled Order:", data2.refundData?.orderId);
  console.log("• Refund Draft ID:", data2.refundData?.refundId);
  console.log("• Amount:", data2.refundData?.refundAmount);
  console.log("• Policy Citation:", data2.refundData?.policyCitation);
  console.log("• Response Preview:", data2.reply.slice(0, 150));
}

testMultiTurnMemory().catch(console.error);
