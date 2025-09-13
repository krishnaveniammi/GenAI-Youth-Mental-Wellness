document.addEventListener("DOMContentLoaded", () => {
  const userInput = document.getElementById("userInput");
  const sendButton = document.getElementById("sendButton");
  const greetingBox = document.getElementById("greetingBox");
  const responseBox = document.getElementById("responseBox");

  let typingMsg = null; // for "..." effect

  function addMessage(sender, text) {
    const msg = document.createElement("div");
    msg.classList.add("message", sender);
    msg.textContent = text;
    responseBox.appendChild(msg);
    responseBox.scrollTop = 0; // ✅ always start at top
  }

  // ✅ Show typing animation
  function showTyping() {
    typingMsg = document.createElement("div");
    typingMsg.classList.add("message", "astra", "typing");
    typingMsg.innerHTML = "<span>.</span><span>.</span><span>.</span>";
    responseBox.appendChild(typingMsg);
    responseBox.scrollTop = 0;
  }

  // ✅ Remove typing animation
  function removeTyping() {
    if (typingMsg) {
      typingMsg.remove();
      typingMsg = null;
    }
  }

  async function handleSend() {
    const text = userInput.value.trim();
    if (!text) return;

    if (!responseBox.classList.contains("active")) {
      greetingBox.classList.add("hidden");
      responseBox.classList.remove("hidden");
      responseBox.classList.add("active");
    }

    addMessage("user", text);
    userInput.value = "";

    // ✅ show "..." while waiting
    showTyping();

    // Call backend
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    const data = await res.json();

    // Create audio element
    const audio = new Audio(data.audio);

    // Trigger avatar lipsync
    if (window.currentScene) {
      triggerAvatarSpeaking(window.currentScene, audio, data.reply);
    }

    // Show text only once audio starts
    audio.addEventListener("play", () => {
      removeTyping(); // ✅ remove dots
      addMessage("astra", data.reply);
    });

    audio.play(); // start audio
  }

  sendButton.addEventListener("click", handleSend);
  userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });
});
