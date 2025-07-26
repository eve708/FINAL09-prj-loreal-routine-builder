/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");

/* Store selected products in an array */
let selectedProducts = [];

// Helper: Save selected products to localStorage
function saveSelectedProducts() {
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
}

// Helper: Load selected products from localStorage
function loadSelectedProducts() {
  const saved = localStorage.getItem("selectedProducts");
  if (saved) {
    try {
      selectedProducts = JSON.parse(saved);
    } catch {
      selectedProducts = [];
    }
  }
}

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

// Helper function to shorten description to max 2 sentences
function getShortDescription(text) {
  if (!text) return "";
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (!sentences) return text;
  return sentences.slice(0, 2).join(" ").trim();
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map((product) => {
      // Check if product is selected
      const isSelected = selectedProducts.some((p) => p.id === product.id);
      return `
    <div class="product-card${isSelected ? " selected" : ""}" data-id="${
        product.id
      }">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
        <button class="product-desc-toggle" data-id="${
          product.id
        }" aria-expanded="false">
          Show Description
        </button>
      </div>
    </div>
  `;
    })
    .join("");

  // Add click event listeners to product cards for selection
  const cards = productsContainer.querySelectorAll(".product-card");
  cards.forEach((card) => {
    card.addEventListener("click", (event) => {
      // Prevent selection if clicking the description button or overlay
      if (
        event.target.classList.contains("product-desc-toggle") ||
        event.target.classList.contains("product-desc-overlay")
      ) {
        return;
      }
      const productId = card.getAttribute("data-id");
      const product = products.find((p) => p.id == productId);

      // Toggle selection
      const index = selectedProducts.findIndex((p) => p.id == productId);
      if (index === -1) {
        selectedProducts.push(product);
      } else {
        selectedProducts.splice(index, 1);
      }
      saveSelectedProducts(); // Save to localStorage
      displayProducts(products);
      updateSelectedProductsList();
    });
  });

  // Add event listeners for description toggle buttons
  const descBtns = productsContainer.querySelectorAll(".product-desc-toggle");
  descBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const productId = btn.getAttribute("data-id");
      const card = btn.closest(".product-card");
      // If overlay already exists, remove it
      const existingOverlay = card.querySelector(".product-desc-overlay");
      if (existingOverlay) {
        existingOverlay.remove();
        btn.setAttribute("aria-expanded", "false");
        btn.textContent = "Show Description";
        return;
      }
      // Find product and create overlay
      const product = products.find((p) => p.id == productId);
      // Use short description for overlay
      const shortDesc = getShortDescription(product.description);
      const overlay = document.createElement("div");
      overlay.className = "product-desc-overlay";
      overlay.innerHTML = `
        <div>
          <strong>Description:</strong><br>
          ${shortDesc}
          <br><br>
          <button class="product-desc-toggle" style="background:var(--loreal-red);" aria-expanded="true">Close</button>
        </div>
      `;
      // Close overlay on button click
      overlay
        .querySelector(".product-desc-toggle")
        .addEventListener("click", (ev) => {
          ev.stopPropagation();
          overlay.remove();
          btn.setAttribute("aria-expanded", "false");
          btn.textContent = "Show Description";
        });
      card.appendChild(overlay);
      btn.setAttribute("aria-expanded", "true");
      btn.textContent = "Hide Description";
    });
  });
}

/* Update the Selected Products section */
function updateSelectedProductsList() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = `<div class="placeholder-message">No products selected.</div>`;
    // Remove clear button if present
    const clearBtn = document.getElementById("clearSelectedProducts");
    if (clearBtn) clearBtn.remove();
    return;
  }
  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
      <div class="selected-product-item" data-id="${product.id}">
        <span>${product.name}</span>
        <button class="selected-product-remove" title="Remove" aria-label="Remove ${product.name}">&times;</button>
      </div>
    `
    )
    .join("");

  // Add "Clear All" button if not present
  if (!document.getElementById("clearSelectedProducts")) {
    const clearBtn = document.createElement("button");
    clearBtn.id = "clearSelectedProducts";
    clearBtn.textContent = "Clear All";
    clearBtn.style.marginTop = "16px";
    clearBtn.style.background = "var(--loreal-red)";
    clearBtn.style.color = "#fff";
    clearBtn.style.border = "none";
    clearBtn.style.padding = "10px 18px";
    clearBtn.style.borderRadius = "6px";
    clearBtn.style.cursor = "pointer";
    clearBtn.style.fontWeight = "500";
    clearBtn.addEventListener("click", () => {
      selectedProducts = [];
      saveSelectedProducts();
      updateSelectedProductsList();
      // Optionally, re-render products grid to remove highlights
      const selectedCategory = categoryFilter.value;
      if (selectedCategory) {
        loadProducts().then((products) => {
          const filteredProducts = products.filter(
            (product) => product.category === selectedCategory
          );
          displayProducts(filteredProducts);
        });
      }
    });
    selectedProductsList.parentElement.appendChild(clearBtn);
  }

  // Add event listeners for remove buttons
  const removeBtns = selectedProductsList.querySelectorAll(
    ".selected-product-remove"
  );
  removeBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const parent = btn.closest(".selected-product-item");
      const productId = parent.getAttribute("data-id");
      selectedProducts = selectedProducts.filter((p) => p.id != productId);
      saveSelectedProducts(); // Save to localStorage
      // Re-render both lists
      // If a category is selected, reload and re-render products for that category
      const selectedCategory = categoryFilter.value;
      if (selectedCategory) {
        loadProducts().then((products) => {
          const filteredProducts = products.filter(
            (product) => product.category === selectedCategory
          );
          displayProducts(filteredProducts);
        });
      }
      updateSelectedProductsList();
    });
  });
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

/* Chat form submission handler - placeholder for OpenAI integration */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  chatWindow.innerHTML = "Connect to the OpenAI API for a response!";
});

// Get reference to the "Generate Routine" button
const generateRoutineBtn = document.getElementById("generateRoutine");

// Store the chat history for follow-up questions
let chatHistory = [];

// Function to add a message to the chat history
function addToChatHistory(role, content) {
  chatHistory.push({ role, content });
}

// Function to display the chat history in the chat window with bubbles
function renderChatHistory() {
  chatWindow.innerHTML = chatHistory
    .map((msg) => {
      if (msg.role === "user") {
        // User message bubble, right side
        return `<div class="chat-message user">${msg.content.replace(
          /\n/g,
          "<br>"
        )}</div>`;
      } else if (msg.role === "assistant") {
        // Advisor message bubble, left side
        return `<div class="chat-message assistant">${msg.content.replace(
          /\n/g,
          "<br>"
        )}</div>`;
      } else {
        return "";
      }
    })
    .join("");

  // Scroll chat window so the latest message is at the top of the visible area
  const lastMsg = chatWindow.lastElementChild;
  if (lastMsg) {
    lastMsg.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// Function to generate a personalized routine using OpenAI
async function generateRoutineWithAI(selectedProducts) {
  // Show loading message with spinner
  chatWindow.innerHTML = `<div>Generating your personalized routine... <span class="chat-loading-spinner"></span></div>`;

  // Prepare product data for the AI
  const productData = selectedProducts.map((product) => ({
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: getShortDescription(product.description),
  }));

  // Start a new chat history for the routine, including a system message
  chatHistory = [
    {
      role: "system",
      content:
        "You are a helpful beauty advisor. Only answer questions about the generated routine, skincare, haircare, makeup, fragrance, or other beauty topics. If asked about anything else, politely decline.",
    },
    {
      role: "user",
      content: `Here are the selected products:\n${JSON.stringify(
        productData,
        null,
        2
      )}\nPlease generate a personalized routine using these products.`,
    },
  ];

  try {
    // Make the API request to OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: chatHistory,
        max_tokens: 400,
      }),
    });

    const data = await response.json();

    // Check if the response contains the assistant's message
    if (
      data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      // Add the assistant's routine to the chat history
      addToChatHistory("assistant", data.choices[0].message.content);
      renderChatHistory();
    } else {
      chatWindow.innerHTML =
        "<div>Sorry, I couldn't generate a routine. Please try again.</div>";
    }
  } catch (error) {
    chatWindow.innerHTML =
      "<div>There was an error connecting to the AI. Please try again later.</div>";
  }
}

// Add event listener to the "Generate Routine" button
generateRoutineBtn.addEventListener("click", async () => {
  if (selectedProducts.length === 0) {
    chatWindow.innerHTML =
      "<div>Please select at least one product to generate a routine.</div>";
    return;
  }

  // Scroll to the chatbox and center it in the viewport
  const chatbox = document.querySelector(".chatbox");
  if (chatbox) {
    chatbox.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  await generateRoutineWithAI(selectedProducts);
});

// Chat form submission handler for follow-up questions
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const userInputElem = document.getElementById("userInput");
  const userInput = userInputElem.value.trim();
  if (!userInput) return;

  // Clear the input field immediately after sending
  userInputElem.value = "";

  // Add user's question to chat history
  addToChatHistory("user", userInput);
  renderChatHistory();

  // Show advisor typing indicator bubble with animated dots
  const typingBubble = document.createElement("div");
  typingBubble.className = "chat-typing-indicator";
  typingBubble.innerHTML = `<span class="chat-typing-dots">
    <span class="chat-typing-dot"></span>
    <span class="chat-typing-dot"></span>
    <span class="chat-typing-dot"></span>
  </span>`;
  chatWindow.appendChild(typingBubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  try {
    // Send the full chat history to OpenAI, so it remembers the conversation
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: chatHistory,
        max_tokens: 400,
      }),
    });

    // Remove typing indicator after response
    typingBubble.remove();

    const data = await response.json();

    if (
      data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      // Add assistant's reply to chat history
      addToChatHistory("assistant", data.choices[0].message.content);
      renderChatHistory();
    } else {
      chatWindow.innerHTML +=
        "<div>Sorry, I couldn't answer that. Please try again.</div>";
    }
  } catch (error) {
    typingBubble.remove();
    chatWindow.innerHTML +=
      "<div>There was an error connecting to the AI. Please try again later.</div>";
  }
});

// On page load, restore selected products from localStorage
loadSelectedProducts();
updateSelectedProductsList();

// Initialize selected products list on page load
updateSelectedProductsList();

// RTL support: function to set direction
function setDirection(isRTL) {
  if (isRTL) {
    document.documentElement.setAttribute("dir", "rtl");
    document.body.setAttribute("dir", "rtl");
  } else {
    document.documentElement.setAttribute("dir", "ltr");
    document.body.setAttribute("dir", "ltr");
  }
}

// Example: Detect RTL language (like Arabic or Hebrew) and set direction
// You can call setDirection(true) for RTL, setDirection(false) for LTR
// For demo, add a simple toggle button:
const rtlToggleBtn = document.createElement("button");
rtlToggleBtn.textContent = "Toggle RTL";
rtlToggleBtn.style.position = "fixed";
rtlToggleBtn.style.top = "10px";
rtlToggleBtn.style.right = "10px";
rtlToggleBtn.style.zIndex = "1000";
rtlToggleBtn.style.background = "var(--loreal-gold)";
rtlToggleBtn.style.color = "#fff";
rtlToggleBtn.style.border = "none";
rtlToggleBtn.style.padding = "8px 14px";
rtlToggleBtn.style.borderRadius = "6px";
rtlToggleBtn.style.cursor = "pointer";
rtlToggleBtn.style.fontWeight = "500";
document.body.appendChild(rtlToggleBtn);

let isRTL = false;
rtlToggleBtn.addEventListener("click", () => {
  isRTL = !isRTL;
  setDirection(isRTL);
});
