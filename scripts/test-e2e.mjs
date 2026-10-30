async function runTest() {
  console.log("=== 1. Testing Chat Deals Query ===");
  const res1 = await fetch("http://localhost:3001/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: "What discounts do you have on headphones?" }],
      customerEmail: "sarah.connor@example.com",
    }),
  });
  const data1 = await res1.json();
  console.log("Chat 1 Tool Calls:", data1.toolCalls);
  console.log("Chat 1 Reply Preview:", data1.reply.slice(0, 120));

  console.log("\n=== 2. Testing Chat Refund Request (ORD-1002 Cracked Screen) ===");
  const res2 = await fetch("http://localhost:3001/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        {
          role: "user",
          content: "I want a refund for ORD-1002. The smartwatch arrived with a cracked screen.",
        },
      ],
      customerEmail: "john.wick@example.com",
    }),
  });
  const data2 = await res2.json();
  console.log("Chat 2 Tool Calls:", data2.toolCalls);
  console.log("Chat 2 Refund Data:", data2.refundData);
  console.log("Chat 2 Reply Preview:", data2.reply.slice(0, 180));

  if (data2.refundData && data2.refundData.refundId) {
    const refundId = data2.refundData.refundId;
    console.log(`\n=== 3. Testing Admin Approval for Refund ${refundId} ===`);
    const res3 = await fetch("http://localhost:3001/api/refunds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refundId,
        action: "APPROVE",
      }),
    });
    const data3 = await res3.json();
    console.log("Approval Success:", data3.success);
    console.log("Updated Refund Status:", data3.refund?.adminStatus);
    console.log("Email Dispatched:", data3.emailDispatched);

    console.log("\n=== 4. Checking Admin Email Dispatch History ===");
    const res4 = await fetch("http://localhost:3001/api/admin");
    const data4 = await res4.json();
    console.log("Total Dispatched Emails in Admin:", data4.emails.length);
    if (data4.emails.length > 0) {
      console.log("Latest Dispatched Email Subject:", data4.emails[0].subject);
      console.log("Latest Dispatched Email Recipient:", data4.emails[0].recipient);
    }
  }

  console.log("\n=== 5. Testing Policy Rejection (ORD-1003: 45 Days Expired) ===");
  const res5 = await fetch("http://localhost:3001/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        {
          role: "user",
          content: "Can I return order ORD-1003? I changed my mind about the gaming keyboard.",
        },
      ],
      customerEmail: "alex.mercer@example.com",
    }),
  });
  const data5 = await res5.json();
  console.log("Chat 5 Tool Calls:", data5.toolCalls);
  console.log("Chat 5 Refund Eligible:", data5.refundData?.isEligible);
  console.log("Chat 5 Policy Citation:", data5.refundData?.policyCitation);
  console.log("Chat 5 Reply Preview:", data5.reply.slice(0, 200));
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
